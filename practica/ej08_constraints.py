"""Ejercicio 08 · Calidad: constraints en Delta que rechazan datos malos."""
from _spark import get_spark

spark = get_spark()
spark.sql("""
CREATE TABLE ventas (
  venta_id BIGINT NOT NULL,
  fecha    DATE   NOT NULL,
  importe  DECIMAL(12,2)
) USING DELTA""")
# En Databricks añadirías al final: CLUSTER BY (fecha)  -> liquid clustering
spark.sql("ALTER TABLE ventas ADD CONSTRAINT importe_no_negativo CHECK (importe >= 0)")

spark.sql("INSERT INTO ventas VALUES (1, DATE'2024-01-01', 10.50)")
try:
    spark.sql("INSERT INTO ventas VALUES (2, DATE'2024-01-02', -5)")
    raise SystemExit("❌ Debería haber fallado")
except Exception as e:
    print("Rechazado como se esperaba:", type(e).__name__)

assert spark.table("ventas").count() == 1
print("OK ✔")
