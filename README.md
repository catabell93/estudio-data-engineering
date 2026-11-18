# 🧱 Estudio de ingeniería de datos

Material para aprender **lógica de desarrollo de tablas**, PySpark, Databricks / Delta Lake y Git.
Se estudia **sin IA y sin consumir tokens**.

## 1. App de estudio (offline)
Abre `app/index.html` en el navegador (doble clic). No necesita internet ni instalar nada.

- 📖 **Teoría** breve por tema
- 🃏 **Tarjetas** de repaso: las que marques como «repasar» vuelven a salir primero
- 🛠️ **Ejercicios** con datos de entrada, resultado esperado, pistas progresivas y solución
- ✅ **Tests** con explicación de cada respuesta
- 🔀 **Repaso aleatorio** de todos los temas

El progreso se guarda en tu navegador (localStorage).

| # | Tema | Bloque |
|---|------|--------|
| 1 | Grain: qué representa una fila | Lógica de tablas |
| 2 | Claves naturales y surrogate | Lógica de tablas |
| 3 | Deduplicación con window functions | Lógica de tablas |
| 4 | Cargas incrementales, MERGE e idempotencia | Lógica de tablas |
| 5 | SCD tipo 1 y tipo 2 | Lógica de tablas |
| 6 | Modelo estrella: hechos y dimensiones | Lógica de tablas |
| 7 | Arquitectura medallion | Arquitectura |
| 8 | Calidad y rendimiento de tablas | Arquitectura |
| 9 | PySpark esencial | Herramientas |
| 10 | Databricks y Delta Lake | Herramientas |
| 11 | Git y GitHub | Herramientas |

## 2. Práctica real con PySpark (local)
Requiere Python 3.10+ y Java 11 o 17.

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install "pyspark==3.5.3" "delta-spark==3.2.1"
cd practica
python ej01_grain_ventas_infladas.py
```

Cada script termina en `OK ✔` si la solución es correcta. Para practicar, **borra la parte de la
solución e intenta escribirla tú**; los `assert` te dirán si lo has conseguido.

También puedes copiar el código a un notebook de **Databricks Free Edition**: quita el
`from _spark import get_spark` y usa directamente el `spark` del notebook.

## 3. Usar Claude Code solo cuando te atasques
El archivo `CLAUDE.md` le explica a Claude cómo debe ayudarte (como tutor, en español, razonando
grain → clave → tipo de carga → capa → validaciones). Consejos para gastar pocos tokens:

- Pregunta cosas concretas: «¿por qué mi MERGE da *multiple source rows matched*?».
- Usa `/clear` al cambiar de tema.
- Pídele **ampliar el material** («añade un tema sobre CDC con 2 ejercicios») en vez de
  explicaciones largas en el chat: así lo que genera se queda guardado para estudiar gratis.
