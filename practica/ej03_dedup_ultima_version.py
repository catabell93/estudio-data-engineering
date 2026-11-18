"""Ejercicio 03 · Deduplicación: quédate con la última versión de cada cliente.

Orden: updated_at más reciente; si empata, gana el ingest_ts más reciente.
"""
from pyspark.sql import functions as F
from pyspark.sql.window import Window
from _spark import get_spark

spark = get_spark()
df = spark.createDataFrame([
    (1, "a@x.com",  "2024-01-01", "2024-01-02 10:00:00"),
    (1, "a2@x.com", "2024-03-01", "2024-03-01 09:00:00"),
    (2, "b@x.com",  "2024-02-01", "2024-02-01 08:00:00"),
    (2, "b2@x.com", "2024-02-01", "2024-02-01 12:00:00"),
], "cliente_id INT, email STRING, updated_at STRING, ingest_ts STRING") \
    .withColumn("updated_at", F.to_date("updated_at")) \
    .withColumn("ingest_ts", F.to_timestamp("ingest_ts"))

w = Window.partitionBy("cliente_id").orderBy(F.col("updated_at").desc(), F.col("ingest_ts").desc())
ultimo = df.withColumn("rn", F.row_number().over(w)).filter("rn = 1").drop("rn")
ultimo.orderBy("cliente_id").show()

# Lo mismo en SQL (QUALIFY funciona en Databricks; aquí usamos subconsulta para Spark OSS)
df.createOrReplaceTempView("clientes_raw")
spark.sql("""
  SELECT * FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY cliente_id
                                 ORDER BY updated_at DESC, ingest_ts DESC) AS rn
    FROM clientes_raw) WHERE rn = 1
""").show()

assert {r.cliente_id: r.email for r in ultimo.collect()} == {1: "a2@x.com", 2: "b2@x.com"}
print("OK ✔")
