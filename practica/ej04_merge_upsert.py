"""Ejercicio 04 · Carga incremental idempotente con MERGE (upsert)."""
from delta.tables import DeltaTable
from pyspark.sql import functions as F
from _spark import get_spark

spark = get_spark()
spark.sql("""CREATE TABLE clientes (cliente_id INT, ciudad STRING, updated_at DATE) USING DELTA""")
spark.sql("""INSERT INTO clientes VALUES
  (1, 'Madrid', DATE'2024-01-01'), (2, 'Sevilla', DATE'2024-05-01')""")

actualizaciones = spark.createDataFrame([
    (1, "Bilbao",   "2024-06-01"),   # más nueva -> actualiza
    (2, "Cádiz",    "2024-04-01"),   # MÁS VIEJA que la que ya tenemos -> no debe pisar
    (3, "Valencia", "2024-06-01"),   # nueva -> inserta
], "cliente_id INT, ciudad STRING, updated_at STRING").withColumn("updated_at", F.to_date("updated_at"))


def cargar(src):
    t = DeltaTable.forName(spark, "clientes")
    (t.alias("t")
       .merge(src.alias("s"), "t.cliente_id = s.cliente_id")
       .whenMatchedUpdateAll(condition="s.updated_at > t.updated_at")
       .whenNotMatchedInsertAll()
       .execute())


cargar(actualizaciones)
cargar(actualizaciones)  # re-ejecutar NO cambia nada: idempotente
res = spark.table("clientes").orderBy("cliente_id")
res.show()

assert [(r.cliente_id, r.ciudad) for r in res.collect()] == [(1, "Bilbao"), (2, "Sevilla"), (3, "Valencia")]
print("OK ✔")
