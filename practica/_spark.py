"""Crea una SparkSession local con Delta Lake para practicar sin Databricks.

Instalación (una vez):
    python -m venv .venv && source .venv/bin/activate
    pip install "pyspark==3.5.3" "delta-spark==3.2.1"
Requiere Java 11 o 17 instalado.
"""
import shutil
import tempfile

from delta import configure_spark_with_delta_pip
from pyspark.sql import SparkSession


def get_spark(app_name: str = "estudio") -> SparkSession:
    warehouse = tempfile.mkdtemp(prefix="spark-warehouse-")
    builder = (
        SparkSession.builder.appName(app_name)
        .master("local[2]")
        .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
        .config("spark.sql.catalog.spark_catalog",
                "org.apache.spark.sql.delta.catalog.DeltaCatalog")
        .config("spark.sql.warehouse.dir", warehouse)
        .config("spark.sql.shuffle.partitions", "2")
        .config("spark.ui.enabled", "false")
    )
    spark = configure_spark_with_delta_pip(builder).getOrCreate()
    spark.sparkContext.setLogLevel("ERROR")
    return spark
