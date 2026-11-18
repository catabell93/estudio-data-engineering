"""Ejercicio 01 · Grain: ventas infladas por fan-out.

Calcula por cliente: total de productos y total de gastos de envío.
Trampa: los gastos de envío están a nivel PEDIDO y los importes a nivel LÍNEA.
"""
from pyspark.sql import functions as F
from _spark import get_spark

spark = get_spark()

pedidos = spark.createDataFrame(
    [(1, "A", 5.0), (2, "A", 3.0), (3, "B", 0.0)],
    "pedido_id INT, cliente_id STRING, gasto_envio DOUBLE")
lineas = spark.createDataFrame(
    [(1, "camiseta", 20.0), (1, "gorra", 10.0), (2, "libro", 15.0), (3, "taza", 8.0)],
    "pedido_id INT, producto STRING, importe DOUBLE")

# ❌ Versión con el error: el join repite gasto_envio en cada línea
mal = (pedidos.join(lineas, "pedido_id")
       .groupBy("cliente_id")
       .agg(F.sum("importe").alias("total_productos"),
            F.sum("gasto_envio").alias("total_envio")))
print("Versión INCORRECTA (envío de A = 13, debería ser 8):")
mal.orderBy("cliente_id").show()

# ✅ Solución: llevar las líneas al grain de pedido ANTES del join
lineas_por_pedido = lineas.groupBy("pedido_id").agg(F.sum("importe").alias("importe_productos"))
bien = (pedidos.join(lineas_por_pedido, "pedido_id", "left")
        .groupBy("cliente_id")
        .agg(F.sum("importe_productos").alias("total_productos"),
             F.sum("gasto_envio").alias("total_envio")))
print("Versión CORRECTA:")
bien.orderBy("cliente_id").show()

assert {r.cliente_id: (r.total_productos, r.total_envio) for r in bien.collect()} == {
    "A": (45.0, 8.0), "B": (8.0, 0.0)}
print("OK ✔")
