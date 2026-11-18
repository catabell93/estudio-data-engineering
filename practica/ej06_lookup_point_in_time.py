"""Ejercicio 06 · Fact table: lookup point-in-time contra una dimensión SCD2.

Cada venta debe apuntar a la versión del cliente VIGENTE en la fecha de la venta.
Si no existe, usamos el miembro desconocido (-1).
"""
from pyspark.sql import functions as F
from _spark import get_spark

spark = get_spark()
dim = spark.createDataFrame([
    (10, 1, "Madrid", "2024-01-01", "2024-06-01"),
    (11, 1, "Bilbao", "2024-06-01", None),
    (20, 2, "Sevilla", "2024-01-01", None),
], "cliente_sk INT, cliente_id INT, ciudad STRING, valid_from STRING, valid_to STRING") \
    .withColumn("valid_from", F.to_date("valid_from")).withColumn("valid_to", F.to_date("valid_to"))

ventas = spark.createDataFrame([
    (100, 1, "2024-03-15", 50.0),   # Madrid
    (101, 1, "2024-06-01", 30.0),   # justo el día del cambio -> Bilbao
    (102, 2, "2024-07-01", 20.0),   # Sevilla
    (103, 9, "2024-07-01", 10.0),   # cliente que aún no existe en la dimensión
], "venta_id INT, cliente_id INT, fecha STRING, importe DOUBLE").withColumn("fecha", F.to_date("fecha"))

v, d = ventas.alias("v"), dim.alias("d")
cond = ((F.col("v.cliente_id") == F.col("d.cliente_id"))
        & (F.col("v.fecha") >= F.col("d.valid_from"))
        & (F.col("d.valid_to").isNull() | (F.col("v.fecha") < F.col("d.valid_to"))))

fact = (v.join(d, cond, "left")
        .select("v.venta_id",
                F.coalesce(F.col("d.cliente_sk"), F.lit(-1)).alias("cliente_sk"),
                "v.fecha", "v.importe"))
fact.orderBy("venta_id").show()

assert {r.venta_id: r.cliente_sk for r in fact.collect()} == {100: 10, 101: 11, 102: 20, 103: -1}
assert fact.count() == ventas.count()  # el grain no cambia
print("OK ✔")
