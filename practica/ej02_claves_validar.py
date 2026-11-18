"""Ejercicio 02 · Claves: valida que cliente_id es una clave válida (única y no nula)."""
from pyspark.sql import functions as F
from _spark import get_spark

spark = get_spark()
clientes = spark.createDataFrame(
    [(1, "ana@x.com"), (2, "luis@x.com"), (2, "LUIS@x.com "), (None, "sin@id.com"), (3, "eva@x.com")],
    "cliente_id INT, email STRING")

duplicados = (clientes.filter(F.col("cliente_id").isNotNull())
              .groupBy("cliente_id").count()
              .filter(F.col("count") > 1))
n_nulos = clientes.filter(F.col("cliente_id").isNull()).count()

duplicados.show()
print("Nulos en la clave:", n_nulos)

# Extra: el email como clave natural necesita normalizarse
emails_dup = (clientes.withColumn("email_norm", F.lower(F.trim("email")))
              .groupBy("email_norm").count().filter("count > 1"))
emails_dup.show()

assert [r.cliente_id for r in duplicados.collect()] == [2]
assert n_nulos == 1
assert [r.email_norm for r in emails_dup.collect()] == ["luis@x.com"]
print("OK ✔")
