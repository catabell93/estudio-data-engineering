"""Ejercicio 05 · SCD tipo 2 con MERGE (patrón 'staged updates')."""
from delta.tables import DeltaTable
from pyspark.sql import functions as F
from _spark import get_spark

spark = get_spark()
spark.sql("""CREATE TABLE dim_cliente (
  cliente_id INT, ciudad STRING, valid_from DATE, valid_to DATE, is_current BOOLEAN) USING DELTA""")
spark.sql("""INSERT INTO dim_cliente VALUES
  (1, 'Madrid',  DATE'2024-01-01', NULL, true),
  (2, 'Sevilla', DATE'2024-01-01', NULL, true)""")

updates = spark.createDataFrame([
    (1, "Bilbao",   "2024-06-01"),   # cambia de ciudad
    (2, "Sevilla",  "2024-06-01"),   # sin cambios
    (3, "Valencia", "2024-06-01"),   # cliente nuevo
], "cliente_id INT, ciudad STRING, fecha_cambio STRING").withColumn("fecha_cambio", F.to_date("fecha_cambio"))


def aplicar_scd2(updates):
    dim = DeltaTable.forName(spark, "dim_cliente")
    actual = dim.toDF().filter("is_current")

    # 1) Clientes cuyo atributo ha cambiado: necesitan una fila NUEVA (merge_key NULL => nunca hace match)
    cambiados = (updates.alias("s")
                 .join(actual.alias("t"), "cliente_id")
                 .where(~F.col("s.ciudad").eqNullSafe(F.col("t.ciudad")))
                 .select("s.*")
                 .withColumn("merge_key", F.lit(None).cast("int")))
    # 2) Todas las updates con merge_key = clave: sirven para CERRAR la versión vigente o insertar nuevos
    staged = updates.withColumn("merge_key", F.col("cliente_id")).unionByName(cambiados)

    (dim.alias("t")
        .merge(staged.alias("s"), "t.cliente_id = s.merge_key AND t.is_current")
        .whenMatchedUpdate(
            condition="NOT (t.ciudad <=> s.ciudad)",
            set={"is_current": "false", "valid_to": "s.fecha_cambio"})
        .whenNotMatchedInsert(values={
            "cliente_id": "s.cliente_id", "ciudad": "s.ciudad",
            "valid_from": "s.fecha_cambio", "valid_to": "NULL", "is_current": "true"})
        .execute())


aplicar_scd2(updates)
aplicar_scd2(updates)  # idempotente: la segunda vez no hay cambios
res = spark.table("dim_cliente").orderBy("cliente_id", "valid_from")
res.show()

assert [(r.cliente_id, r.ciudad, r.is_current, str(r.valid_to)) for r in res.collect()] == [
    (1, "Madrid", False, "2024-06-01"),
    (1, "Bilbao", True, "None"),
    (2, "Sevilla", True, "None"),
    (3, "Valencia", True, "None"),
]
print("OK ✔")
