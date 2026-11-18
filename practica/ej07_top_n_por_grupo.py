"""Ejercicio 07 · PySpark: top 2 productos por categoría según ventas totales."""
from pyspark.sql import functions as F
from pyspark.sql.window import Window
from _spark import get_spark

spark = get_spark()
ventas = spark.createDataFrame([
    ("ropa", "camiseta", 20.0), ("ropa", "camiseta", 20.0), ("ropa", "gorra", 10.0),
    ("ropa", "pantalón", 35.0), ("libros", "novela", 15.0), ("libros", "cómic", 8.0),
    ("libros", "novela", 15.0), ("libros", "ensayo", 12.0),
], "categoria STRING, producto STRING, importe DOUBLE")

por_producto = ventas.groupBy("categoria", "producto").agg(F.sum("importe").alias("total"))
w = Window.partitionBy("categoria").orderBy(F.col("total").desc(), F.col("producto"))
top2 = (por_producto.withColumn("pos", F.row_number().over(w))
        .filter("pos <= 2"))
top2.orderBy("categoria", "pos").show()

assert [(r.categoria, r.producto) for r in top2.orderBy("categoria", "pos").collect()] == [
    ("libros", "novela"), ("libros", "ensayo"), ("ropa", "camiseta"), ("ropa", "pantalón")]
print("OK ✔")
