// ============================================================
//  CONTENIDO DE ESTUDIO. Para añadir temas, copia un bloque
//  { id, titulo, ... } y rellénalo. No hace falta tocar app.js.
// ============================================================
window.TEMAS = [
// ------------------------------------------------------------
{
  id: "grain", titulo: "1. Grain: qué representa una fila", grupo: "Lógica de tablas",
  teoria: `
<p>El <b>grain</b> (granularidad) es la respuesta a: <i>«una fila de esta tabla representa exactamente…»</i>.
Escríbelo en una frase <b>antes</b> de escribir código: «una fila por línea de pedido», «una fila por cliente y día».</p>
<p>Del grain se deriva todo lo demás:</p>
<ul>
<li><b>La clave</b>: las columnas que identifican una fila de forma única.</li>
<li><b>Los joins</b>: unir dos tablas de distinto grain multiplica filas (<i>fan-out</i>).</li>
<li><b>Las métricas</b>: una métrica que vive a nivel pedido no se puede sumar a nivel línea.</li>
</ul>
<p><b>Checklist antes de un join:</b> ¿cuál es el grain de cada lado? ¿la relación es 1:1, 1:N o N:M? ¿el resultado debe tener el grain de cuál de las dos?</p>`,
  tarjetas: [
    ["¿Qué es el grain de una tabla?", "El nivel de detalle: qué representa exactamente una fila (p. ej. una línea de ticket)."],
    ["¿Qué es el fan-out?", "Cuando un join 1:N repite las filas del lado «1». Si luego sumas una métrica del lado «1», sale inflada."],
    ["¿Cómo compruebo en PySpark que (a, b) es el grain real?", "df.groupBy('a','b').count().filter('count > 1') debe devolver 0 filas."],
    ["Tengo métricas a nivel pedido y a nivel línea. ¿Qué hago antes de unirlas?", "Agregar la tabla de más detalle al grain de la otra (líneas → pedido) y después hacer el join."],
  ],
  ejercicios: [{
    titulo: "Ventas infladas", archivo: "practica/ej01_grain_ventas_infladas.py",
    enunciado: `Calcula por <b>cliente</b> el total de productos y el total de gastos de envío.`,
    datos: `pedidos                          lineas
pedido_id | cliente | envio        pedido_id | producto | importe
1         | A       | 5            1         | camiseta | 20
2         | A       | 3            1         | gorra    | 10
3         | B       | 0            2         | libro    | 15
                                   3         | taza     | 8`,
    esperado: `cliente | total_productos | total_envio
A       | 45              | 8
B       | 8               | 0`,
    pistas: ["¿Cuál es el grain de cada tabla?", "Si haces join directamente, ¿cuántas veces aparece el envío del pedido 1?", "Agrega las líneas por pedido_id antes del join."],
    solucion: `lineas_por_pedido = (lineas.groupBy("pedido_id")
    .agg(F.sum("importe").alias("importe_productos")))

res = (pedidos.join(lineas_por_pedido, "pedido_id", "left")
    .groupBy("cliente_id")
    .agg(F.sum("importe_productos").alias("total_productos"),
         F.sum("gasto_envio").alias("total_envio")))`,
    explicacion: `El join directo da envío = 5+5+3 = 13 para A, porque el pedido 1 tiene 2 líneas y su envío se repite. Al agregar primero las líneas, ambas tablas quedan con grain «pedido» y el join es 1:1.`
  }],
  test: [
    { p: "fact_ventas tiene una fila por línea de ticket. ¿Cuál es su clave?", o: ["ticket_id", "(ticket_id, num_linea)", "producto_id", "fecha"], c: 1, x: "Un ticket tiene varias líneas, así que ticket_id solo no es único." },
    { p: "Unes clientes (1 fila/cliente) con pedidos (N filas/cliente) y cuentas clientes con count(*). ¿Qué pasa?", o: ["Sale bien", "Cuenta pedidos, no clientes", "Da error"], c: 1, x: "El join cambia el grain a «pedido». Usa countDistinct('cliente_id') o agrega antes." },
  ]
},
// ------------------------------------------------------------
{
  id: "claves", titulo: "2. Claves naturales y surrogate", grupo: "Lógica de tablas",
  teoria: `
<ul>
<li><b>Clave natural (de negocio)</b>: viene del sistema origen (DNI, email, código de producto). Puede cambiar, tener formatos distintos o repetirse entre sistemas.</li>
<li><b>Clave surrogate</b>: la generas tú (entero o hash). Es estable y no tiene significado de negocio. Imprescindible en SCD2, donde la clave natural se repite en cada versión.</li>
</ul>
<p>Toda clave debe validarse: <b>única</b> y <b>no nula</b>. Si no, cualquier join o MERGE posterior falla o duplica.</p>
<p>Formas de generar surrogate en Databricks: <code>BIGINT GENERATED ALWAYS AS IDENTITY</code> en la tabla Delta, o un hash determinista: <code>sha2(concat_ws('||', cliente_id, valid_from), 256)</code>.</p>`,
  tarjetas: [
    ["Clave natural vs surrogate", "Natural: viene del negocio/origen. Surrogate: generada en el data warehouse, estable y sin significado."],
    ["¿Por qué SCD2 necesita surrogate key?", "Porque el mismo cliente_id aparece en varias versiones; hace falta un identificador único por versión."],
    ["¿Sirve monotonically_increasing_id() como surrogate key?", "No como clave estable: el valor depende de las particiones y cambia entre ejecuciones."],
    ["Antes de usar un email como clave…", "Normalízalo: lower(trim(email)). 'Luis@x.com ' y 'luis@x.com' son la misma persona."],
  ],
  ejercicios: [{
    titulo: "Validar una clave", archivo: "practica/ej02_claves_validar.py",
    enunciado: `Comprueba si <code>cliente_id</code> es una clave válida: lista los ids duplicados y cuenta los nulos. Extra: detecta emails duplicados tras normalizar.`,
    datos: `cliente_id | email
1          | ana@x.com
2          | luis@x.com
2          | LUIS@x.com␣
NULL       | sin@id.com
3          | eva@x.com`,
    esperado: `duplicados: [2]   nulos: 1   email duplicado: luis@x.com`,
    pistas: ["groupBy + count + filter(count > 1)", "Excluye los nulos al buscar duplicados", "F.lower(F.trim('email'))"],
    solucion: `duplicados = (clientes.filter(F.col("cliente_id").isNotNull())
    .groupBy("cliente_id").count()
    .filter(F.col("count") > 1))

n_nulos = clientes.filter(F.col("cliente_id").isNull()).count()

emails_dup = (clientes.withColumn("email_norm", F.lower(F.trim("email")))
    .groupBy("email_norm").count().filter("count > 1"))`,
    explicacion: `Estas dos comprobaciones (unicidad y no-nulos) son el «test mínimo» que deberías poner a toda tabla silver antes de publicarla.`
  }],
  test: [
    { p: "¿Cuál es la mejor surrogate key para una dimensión en Delta?", o: ["monotonically_increasing_id()", "GENERATED ALWAYS AS IDENTITY o un hash determinista", "rand()"], c: 1, x: "Identity la gestiona Delta; el hash es reproducible entre ejecuciones." },
  ]
},
// ------------------------------------------------------------
{
  id: "dedup", titulo: "3. Deduplicación con window functions", grupo: "Lógica de tablas",
  teoria: `
<p>Patrón universal: <b>numera las filas de cada clave por orden de prioridad y quédate con la 1</b>.</p>
<pre>w = Window.partitionBy("clave").orderBy(F.col("updated_at").desc(), F.col("ingest_ts").desc())
df.withColumn("rn", F.row_number().over(w)).filter("rn = 1").drop("rn")</pre>
<p>En Databricks SQL: <code>QUALIFY ROW_NUMBER() OVER (PARTITION BY clave ORDER BY updated_at DESC) = 1</code>.</p>
<ul>
<li>Usa <b>row_number</b>, no rank: <code>rank</code> da el mismo número a los empates y te quedarías con 2 filas.</li>
<li>Añade siempre un <b>desempate</b> (ingest_ts, id de evento…) para que el resultado sea <b>determinista</b>.</li>
<li><code>dropDuplicates(["id"])</code> no garantiza qué fila conserva.</li>
</ul>`,
  tarjetas: [
    ["row_number vs rank vs dense_rank con empate (10, 10, 8)", "row_number: 1,2,3 · rank: 1,1,3 · dense_rank: 1,1,2"],
    ["¿Qué fila conserva dropDuplicates(['id'])?", "Una cualquiera: no es determinista. Usa row_number con orderBy."],
    ["¿Qué es QUALIFY?", "Cláusula SQL (Databricks) para filtrar por el resultado de una window function sin subconsulta."],
  ],
  ejercicios: [{
    titulo: "Última versión de cada cliente", archivo: "practica/ej03_dedup_ultima_version.py",
    enunciado: `Quédate con la versión más reciente por <code>cliente_id</code> según <code>updated_at</code>; si empata, gana el <code>ingest_ts</code> más reciente.`,
    datos: `cliente_id | email    | updated_at | ingest_ts
1          | a@x.com  | 2024-01-01 | 2024-01-02 10:00
1          | a2@x.com | 2024-03-01 | 2024-03-01 09:00
2          | b@x.com  | 2024-02-01 | 2024-02-01 08:00
2          | b2@x.com | 2024-02-01 | 2024-02-01 12:00`,
    esperado: `1 → a2@x.com     2 → b2@x.com (empate en updated_at, decide ingest_ts)`,
    pistas: ["Window.partitionBy('cliente_id')", "orderBy con dos columnas en desc()", "row_number y filtrar rn = 1"],
    solucion: `w = (Window.partitionBy("cliente_id")
     .orderBy(F.col("updated_at").desc(), F.col("ingest_ts").desc()))

ultimo = (df.withColumn("rn", F.row_number().over(w))
            .filter("rn = 1").drop("rn"))

-- SQL (Databricks)
SELECT * FROM clientes_raw
QUALIFY ROW_NUMBER() OVER (PARTITION BY cliente_id
                           ORDER BY updated_at DESC, ingest_ts DESC) = 1`,
    explicacion: `Sin el desempate por ingest_ts, el cliente 2 podría salir con b@ o b2@ según la ejecución.`
  }],
  test: [
    { p: "Usas rank() y dos filas del mismo cliente empatan en fecha. Al filtrar = 1…", o: ["Queda 1 fila", "Quedan 2 filas", "Quedan 0 filas"], c: 1, x: "rank asigna 1 a ambas. Usa row_number + desempate." },
  ]
},
// ------------------------------------------------------------
{
  id: "incremental", titulo: "4. Cargas incrementales, MERGE e idempotencia", grupo: "Lógica de tablas",
  teoria: `
<ul>
<li><b>Full load</b>: recalcular todo. Simple, pero caro en tablas grandes.</li>
<li><b>Incremental</b>: procesar solo lo nuevo o cambiado desde la última ejecución (<i>watermark</i>: max(updated_at) procesado). Deja una ventana de solape para datos que llegan tarde.</li>
<li><b>Idempotente</b>: ejecutar el proceso 2 veces deja el mismo resultado que 1. <code>append</code> NO lo es (duplica); <code>MERGE</code> y <code>replaceWhere</code> sí.</li>
</ul>
<pre>MERGE INTO silver.clientes t
USING actualizaciones s
ON t.cliente_id = s.cliente_id
WHEN MATCHED AND s.updated_at > t.updated_at THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *</pre>
<p>⚠️ La <b>source debe estar deduplicada</b> por la clave del ON. Si no, falla con <i>multiple source rows matched</i>.</p>`,
  tarjetas: [
    ["¿Qué significa que un proceso sea idempotente?", "Que re-ejecutarlo no cambia el resultado (no duplica, no corrompe)."],
    ["¿Por qué df.write.mode('append') no es idempotente?", "Si el job falla y se relanza, vuelve a insertar las mismas filas."],
    ["Error MERGE: 'multiple source rows matched'", "La tabla origen tiene duplicados por la clave del ON. Deduplica antes (tema 3)."],
    ["¿Para qué sirve la condición s.updated_at > t.updated_at?", "Para no pisar un dato más nuevo con uno más viejo (reprocesos o datos desordenados)."],
    ["¿Qué hace replaceWhere?", "Sobrescribe solo las filas que cumplen un predicado (p. ej. una fecha): recarga idempotente de una partición."],
  ],
  ejercicios: [{
    titulo: "Upsert idempotente", archivo: "practica/ej04_merge_upsert.py",
    enunciado: `Aplica las actualizaciones a la tabla <code>clientes</code>. Un dato más viejo no debe pisar uno más nuevo y ejecutar dos veces no debe cambiar nada.`,
    datos: `clientes (destino)             actualizaciones
1 | Madrid  | 2024-01-01       1 | Bilbao   | 2024-06-01
2 | Sevilla | 2024-05-01       2 | Cádiz    | 2024-04-01  (más vieja)
                               3 | Valencia | 2024-06-01`,
    esperado: `1 Bilbao · 2 Sevilla (no cambia) · 3 Valencia`,
    pistas: ["DeltaTable.forName(spark, 'clientes').merge(...)", "whenMatchedUpdateAll acepta un condition", "whenNotMatchedInsertAll para los nuevos"],
    solucion: `from delta.tables import DeltaTable

t = DeltaTable.forName(spark, "clientes")
(t.alias("t")
   .merge(src.alias("s"), "t.cliente_id = s.cliente_id")
   .whenMatchedUpdateAll(condition="s.updated_at > t.updated_at")
   .whenNotMatchedInsertAll()
   .execute())`,
    explicacion: `La condición en WHEN MATCHED protege contra datos viejos. Como MERGE actualiza en lugar de insertar, relanzarlo es seguro.`
  }],
  test: [
    { p: "Tu job diario hace append y ayer falló a mitad y se relanzó. ¿Riesgo?", o: ["Ninguno", "Filas duplicadas", "Pérdida de datos"], c: 1, x: "append no es idempotente. Usa MERGE o replaceWhere por fecha." },
  ]
},
// ------------------------------------------------------------
{
  id: "scd", titulo: "5. SCD tipo 1 y tipo 2", grupo: "Lógica de tablas",
  teoria: `
<ul>
<li><b>SCD1</b>: sobrescribe el valor. No guarda historial. Es un MERGE normal (tema 4).</li>
<li><b>SCD2</b>: guarda cada versión con <code>valid_from</code>, <code>valid_to</code> e <code>is_current</code>.</li>
</ul>
<p><b>Lógica SCD2 paso a paso:</b></p>
<ol>
<li>Compara la entrada con la versión vigente (<code>is_current = true</code>).</li>
<li>Si un atributo rastreado cambió: <b>cierra</b> la versión vigente (valid_to = fecha del cambio, is_current = false)…</li>
<li>…e <b>inserta</b> una versión nueva (valid_from = fecha del cambio, valid_to = NULL, is_current = true).</li>
<li>Si la clave es nueva: insértala. Si no hay cambios: no hagas nada.</li>
</ol>
<p>Consultar el estado a una fecha d: <code>valid_from &lt;= d AND (valid_to &gt; d OR valid_to IS NULL)</code>.</p>
<p>En Databricks también existe <b>AUTO CDC / APPLY CHANGES</b> en Lakeflow Declarative Pipelines (antes DLT), con <code>STORED AS SCD TYPE 2</code>, que hace esto automáticamente. Aun así, conviene saber hacerlo a mano.</p>`,
  tarjetas: [
    ["SCD1 vs SCD2", "SCD1 sobrescribe (sin historia). SCD2 añade una fila nueva por cada cambio y cierra la anterior."],
    ["Columnas típicas de SCD2", "surrogate_key, clave natural, atributos, valid_from, valid_to, is_current (a veces hash de atributos)."],
    ["¿Por qué en un MERGE SCD2 hay que meter la fila cambiada dos veces?", "Una (con merge_key = clave) hace match para CERRAR la versión vigente; otra (con merge_key NULL) no hace match y se INSERTA como versión nueva."],
    ["Comparar atributos que pueden ser NULL", "Usa <=> (null-safe equal) o eqNullSafe; con = un NULL nunca es igual y detectarías cambios falsos o los perderías."],
  ],
  ejercicios: [{
    titulo: "Dimensión cliente SCD2", archivo: "practica/ej05_scd2.py",
    enunciado: `Aplica las actualizaciones a <code>dim_cliente</code> como SCD2. Debe ser idempotente.`,
    datos: `dim_cliente
id | ciudad  | valid_from | valid_to | is_current
1  | Madrid  | 2024-01-01 | NULL     | true
2  | Sevilla | 2024-01-01 | NULL     | true

updates (fecha_cambio = 2024-06-01)
1 | Bilbao     ← cambia
2 | Sevilla    ← igual
3 | Valencia   ← nuevo`,
    esperado: `1 | Madrid   | 2024-01-01 | 2024-06-01 | false
1 | Bilbao   | 2024-06-01 | NULL       | true
2 | Sevilla  | 2024-01-01 | NULL       | true
3 | Valencia | 2024-06-01 | NULL       | true`,
    pistas: ["Un MERGE solo puede actualizar o insertar UNA vez por fila de la source.", "Busca el patrón «staged updates»: union de las updates con merge_key=id + las cambiadas con merge_key=NULL.", "ON t.cliente_id = s.merge_key AND t.is_current"],
    solucion: `actual = dim.toDF().filter("is_current")

cambiados = (updates.alias("s").join(actual.alias("t"), "cliente_id")
    .where(~F.col("s.ciudad").eqNullSafe(F.col("t.ciudad")))
    .select("s.*")
    .withColumn("merge_key", F.lit(None).cast("int")))

staged = (updates.withColumn("merge_key", F.col("cliente_id"))
                 .unionByName(cambiados))

(dim.alias("t")
   .merge(staged.alias("s"), "t.cliente_id = s.merge_key AND t.is_current")
   .whenMatchedUpdate(
       condition="NOT (t.ciudad <=> s.ciudad)",
       set={"is_current": "false", "valid_to": "s.fecha_cambio"})
   .whenNotMatchedInsert(values={
       "cliente_id": "s.cliente_id", "ciudad": "s.ciudad",
       "valid_from": "s.fecha_cambio", "valid_to": "NULL",
       "is_current": "true"})
   .execute())`,
    explicacion: `Cliente 1: la fila con merge_key=1 cierra Madrid; la fila con merge_key=NULL inserta Bilbao. Cliente 2: hace match pero la condición es falsa → nada. Cliente 3: no hace match → se inserta. Segunda ejecución: Bilbao ya es la vigente → no hay cambios.`
  }],
  test: [
    { p: "Quieres saber en qué ciudad vivía un cliente cuando hizo una compra. Necesitas…", o: ["SCD1", "SCD2", "Da igual"], c: 1, x: "SCD1 solo guarda el valor actual." },
    { p: "Filtro correcto para la versión vigente en la fecha d:", o: ["valid_from = d", "valid_from <= d AND (valid_to > d OR valid_to IS NULL)", "is_current = true"], c: 1, x: "is_current solo sirve para HOY, no para una fecha pasada." },
  ]
},
// ------------------------------------------------------------
{
  id: "estrella", titulo: "6. Modelo estrella: hechos y dimensiones", grupo: "Lógica de tablas",
  teoria: `
<ul>
<li><b>Hechos (fact)</b>: eventos medibles (ventas, clics). Grain fino, métricas numéricas y claves de dimensiones.</li>
<li><b>Dimensiones (dim)</b>: contexto descriptivo (cliente, producto, fecha). Pocas filas, muchas columnas.</li>
</ul>
<p><b>Tipos de métricas:</b> aditivas (importe: se suman en todo), semi-aditivas (saldo: no se suman en el tiempo, se toma el último), no aditivas (ratios: guarda numerador y denominador y divide al final).</p>
<p><b>Lookup point-in-time:</b> la fact debe apuntar a la versión de la dimensión vigente en la fecha del hecho.</p>
<p><b>Late-arriving dimension:</b> llega una venta de un cliente que aún no está en la dimensión. No la descartes: asígnale el miembro «desconocido» (sk = -1) o crea un <i>inferred member</i> y corrígelo después.</p>`,
  tarjetas: [
    ["¿Qué guarda una fact table?", "Claves de dimensiones (surrogate), métricas y fechas, al grain del evento."],
    ["Métrica semi-aditiva: ejemplo", "Saldo de cuenta o stock: se puede sumar entre cuentas pero no entre días."],
    ["¿Cómo guardo un ratio (tasa de conversión)?", "Guarda numerador y denominador; calcula el ratio después de agregar."],
    ["¿Qué hacer con una venta cuyo cliente aún no existe en la dimensión?", "Asignar sk = -1 (desconocido) o un inferred member; nunca perder la venta con un inner join."],
  ],
  ejercicios: [{
    titulo: "Lookup point-in-time", archivo: "practica/ej06_lookup_point_in_time.py",
    enunciado: `Asigna a cada venta el <code>cliente_sk</code> vigente en la fecha de la venta. Si no existe, -1. La fact debe tener las mismas filas que ventas.`,
    datos: `dim_cliente
sk | id | ciudad  | valid_from | valid_to
10 | 1  | Madrid  | 2024-01-01 | 2024-06-01
11 | 1  | Bilbao  | 2024-06-01 | NULL
20 | 2  | Sevilla | 2024-01-01 | NULL

ventas
100 | cliente 1 | 2024-03-15
101 | cliente 1 | 2024-06-01
102 | cliente 2 | 2024-07-01
103 | cliente 9 | 2024-07-01`,
    esperado: `100 → 10 · 101 → 11 · 102 → 20 · 103 → -1`,
    pistas: ["Left join (para no perder ventas)", "Condición de rango: fecha >= valid_from y (valid_to NULL o fecha < valid_to)", "coalesce(cliente_sk, -1)"],
    solucion: `v, d = ventas.alias("v"), dim.alias("d")
cond = ((F.col("v.cliente_id") == F.col("d.cliente_id"))
    & (F.col("v.fecha") >= F.col("d.valid_from"))
    & (F.col("d.valid_to").isNull() | (F.col("v.fecha") < F.col("d.valid_to"))))

fact = (v.join(d, cond, "left")
    .select("v.venta_id",
            F.coalesce(F.col("d.cliente_sk"), F.lit(-1)).alias("cliente_sk"),
            "v.fecha", "v.importe"))`,
    explicacion: `El intervalo es cerrado-abierto [valid_from, valid_to): así una fecha nunca cae en dos versiones. Comprueba siempre que fact.count() == ventas.count().`
  }],
  test: [
    { p: "Quieres el saldo total del banco a fin de mes. Con el saldo diario por cuenta haces…", o: ["Sumar todos los días del mes", "Tomar el saldo del último día y sumar entre cuentas", "Media de todo"], c: 1, x: "El saldo es semi-aditivo." },
    { p: "Usar inner join contra la dimensión al construir la fact…", o: ["Es lo correcto", "Puede perder hechos de clientes que aún no existen"], c: 1, x: "Usa left join + miembro desconocido." },
  ]
},
// ------------------------------------------------------------
{
  id: "medallion", titulo: "7. Arquitectura medallion", grupo: "Arquitectura",
  teoria: `
<table class="tabla">
<tr><th>Capa</th><th>Qué contiene</th><th>Lógica típica</th></tr>
<tr><td><b>Bronze</b></td><td>Datos crudos tal cual llegan, append-only</td><td>Ingesta (Auto Loader), metadatos <code>_ingest_ts</code>, <code>_source_file</code>. Sin limpiar.</td></tr>
<tr><td><b>Silver</b></td><td>Datos limpios y conformados, una fila por entidad/evento</td><td>Tipado, deduplicación, claves, nulos, MERGE/SCD, joins de enriquecimiento.</td></tr>
<tr><td><b>Gold</b></td><td>Modelo para negocio</td><td>Modelo estrella, agregados, KPIs, tablas para BI/ML.</td></tr>
</table>
<p>En Unity Catalog todo se nombra como <code>catalogo.esquema.tabla</code>, p. ej. <code>dev.silver.clientes</code>.</p>
<p><b>Regla de oro:</b> bronze conserva el dato original para poder <b>reprocesar</b> silver y gold si cambias la lógica.</p>`,
  tarjetas: [
    ["¿Por qué bronze guarda el dato sin limpiar?", "Para poder reprocesar desde el origen si la lógica de silver cambia o tenía un bug."],
    ["¿Dónde se deduplica?", "En silver."],
    ["¿Dónde va el modelo estrella y los agregados?", "En gold."],
    ["Nombre de tres niveles en Unity Catalog", "catalogo.esquema.tabla"],
  ],
  ejercicios: [{
    titulo: "Clasifica la lógica por capa", archivo: null,
    enunciado: `¿En qué capa va cada transformación?<br>a) añadir _ingest_ts · b) cast de string a date · c) ventas por mes y región · d) row_number para quedarse con la última versión · e) leer JSON de un volumen · f) SCD2 de clientes · g) fact_ventas con claves de dimensiones`,
    datos: "", esperado: "",
    pistas: ["Bronze = ingesta sin transformar", "Silver = limpiar, tipar, deduplicar, historizar", "Gold = consumo de negocio"],
    solucion: `Bronze: a, e
Silver: b, d, f
Gold:   c, g`,
    explicacion: `SCD2 a veces se ubica en gold como dimensión del modelo. Lo importante es ser consistente en el equipo.`
  }],
  test: [
    { p: "Descubres un bug en la limpieza de silver de hace 3 meses. ¿Desde dónde reprocesas?", o: ["Desde gold", "Desde bronze", "No se puede"], c: 1, x: "Por eso bronze guarda el crudo." },
  ]
},
// ------------------------------------------------------------
{
  id: "calidad", titulo: "8. Calidad y rendimiento de tablas", grupo: "Arquitectura",
  teoria: `
<p><b>Calidad</b></p>
<ul>
<li>Constraints Delta: <code>NOT NULL</code> y <code>CHECK (importe &gt;= 0)</code>. Rechazan la escritura entera si una fila falla.</li>
<li>Expectations en Lakeflow Declarative Pipelines: <code>CONSTRAINT x EXPECT (cond) ON VIOLATION DROP ROW</code> (o FAIL UPDATE, o solo registrar).</li>
<li>Tests mínimos: unicidad de clave, nulos y nº de filas esperado (p. ej. que la fact tenga tantas filas como la entrada).</li>
</ul>
<p><b>Rendimiento</b></p>
<ul>
<li><b>Liquid clustering</b> (<code>CLUSTER BY (fecha, cliente_id)</code>): la opción recomendada hoy en Databricks para tablas nuevas.</li>
<li><b>Particionado</b>: solo en tablas muy grandes y por columnas de baja cardinalidad (fecha). Si particionas por cliente_id → millones de ficheros pequeños.</li>
<li><code>OPTIMIZE</code> compacta ficheros pequeños; <code>ZORDER BY</code> es la alternativa clásica al clustering.</li>
<li>Joins: <code>F.broadcast(dim_pequeña)</code> evita el shuffle.</li>
</ul>`,
  tarjetas: [
    ["¿Qué pasa si insertas una fila que viola un CHECK constraint en Delta?", "Falla toda la escritura (transacción); no se escribe nada."],
    ["¿Cuándo particionar una tabla Delta?", "Casi nunca en tablas pequeñas/medianas. Para tablas nuevas, mejor liquid clustering."],
    ["¿Qué problema causa particionar por una columna de alta cardinalidad?", "Demasiadas particiones y ficheros pequeños → lecturas lentas."],
    ["¿Qué hace OPTIMIZE?", "Compacta ficheros pequeños en otros más grandes (y aplica clustering/Z-order)."],
  ],
  ejercicios: [{
    titulo: "Tabla con constraints", archivo: "practica/ej08_constraints.py",
    enunciado: `Crea <code>ventas</code> con venta_id y fecha obligatorios, importe no negativo y liquid clustering por fecha.`,
    datos: "", esperado: "Insertar importe = -5 debe fallar.",
    pistas: ["NOT NULL en la definición de columna", "ALTER TABLE ... ADD CONSTRAINT ... CHECK", "CLUSTER BY al final del CREATE"],
    solucion: `CREATE TABLE silver.ventas (
  venta_id BIGINT NOT NULL,
  fecha    DATE   NOT NULL,
  importe  DECIMAL(12,2),
  CONSTRAINT importe_no_negativo CHECK (importe >= 0)
) CLUSTER BY (fecha);`,
    explicacion: `En Spark OSS local se añade el CHECK con ALTER TABLE (lo hace el script de práctica). En Databricks puedes declararlo en el CREATE.`
  }],
  test: [
    { p: "Tabla de 10 M de clientes. ¿Particionar por cliente_id?", o: ["Sí, acelera todo", "No: demasiadas particiones pequeñas"], c: 1, x: "Usa clustering por cliente_id si filtras mucho por él." },
  ]
},
// ------------------------------------------------------------
{
  id: "pyspark", titulo: "9. PySpark esencial", grupo: "Herramientas",
  teoria: `
<ul>
<li><b>Lazy evaluation</b>: las transformaciones (select, filter, join…) solo construyen un plan. Se ejecuta al llamar a una <b>acción</b> (count, show, write, collect).</li>
<li><b>Narrow vs wide</b>: filter y select no mueven datos; groupBy, join y orderBy provocan un <b>shuffle</b> entre nodos, que es lo caro.</li>
<li>DataFrame API y Spark SQL usan el mismo motor: elige la que te resulte más legible.</li>
<li><code>cache()</code> solo si reutilizas un DataFrame caro varias veces.</li>
<li>Evita <code>collect()</code> sobre datos grandes, porque lo trae todo al driver.</li>
<li>Para ver el plan: <code>df.explain()</code>.</li>
</ul>
<pre>from pyspark.sql import functions as F
from pyspark.sql.window import Window</pre>`,
  tarjetas: [
    ["Transformación vs acción", "Transformación: devuelve otro DataFrame (lazy). Acción: dispara la ejecución (count, show, write)."],
    ["¿Qué es un shuffle?", "Redistribuir datos entre particiones/nodos (groupBy, join, orderBy). Es la operación más cara."],
    ["¿Cuándo usar F.broadcast(df)?", "Al unir una tabla grande con una pequeña: se envía la pequeña a todos los nodos y se evita el shuffle."],
    ["withColumn dentro de un bucle de 100 columnas…", "Genera un plan enorme y lento. Mejor un solo select con todas las expresiones."],
    ["¿Cómo ves el plan de ejecución?", "df.explain() (o explain('formatted'))."],
  ],
  ejercicios: [{
    titulo: "Top 2 productos por categoría", archivo: "practica/ej07_top_n_por_grupo.py",
    enunciado: `Obtén los 2 productos con más ventas totales de cada categoría.`,
    datos: `categoria | producto | importe
ropa      | camiseta | 20   (x2)
ropa      | gorra    | 10
ropa      | pantalón | 35
libros    | novela   | 15   (x2)
libros    | cómic    | 8
libros    | ensayo   | 12`,
    esperado: `libros: novela (30), ensayo (12)
ropa:   camiseta (40), pantalón (35)`,
    pistas: ["Primero agrega a grain (categoria, producto)", "Luego window por categoría ordenada por total desc", "row_number <= 2"],
    solucion: `por_producto = (ventas.groupBy("categoria", "producto")
    .agg(F.sum("importe").alias("total")))

w = (Window.partitionBy("categoria")
     .orderBy(F.col("total").desc(), F.col("producto")))

top2 = (por_producto.withColumn("pos", F.row_number().over(w))
        .filter("pos <= 2"))`,
    explicacion: `Es el mismo patrón que la deduplicación (tema 3), pero con filter(pos <= N). Hay dos pasos de grain: venta → producto → top por categoría.`
  }],
  test: [
    { p: "¿Cuál de estas es una acción?", o: ["filter", "withColumn", "count", "join"], c: 2, x: "count dispara la ejecución." },
    { p: "¿Qué operación provoca shuffle?", o: ["select", "filter", "groupBy", "withColumn"], c: 2, x: "groupBy necesita juntar las filas de cada clave." },
  ]
},
// ------------------------------------------------------------
{
  id: "databricks", titulo: "10. Databricks y Delta Lake", grupo: "Herramientas",
  teoria: `
<ul>
<li><b>Delta Lake</b> = ficheros Parquet + un log de transacciones (<code>_delta_log</code>). Aporta ACID, time travel, schema enforcement y MERGE.</li>
<li><b>Time travel</b>: <code>SELECT * FROM t VERSION AS OF 3</code> · <code>DESCRIBE HISTORY t</code> · <code>RESTORE TABLE t TO VERSION AS OF 3</code>.</li>
<li><b>VACUUM</b> borra los ficheros antiguos (por defecto conserva 7 días): después ya no puedes viajar a esas versiones.</li>
<li><b>Unity Catalog</b>: gobierno y permisos. Nombres catalogo.esquema.tabla y volúmenes en /Volumes/... para ficheros.</li>
<li><b>Auto Loader</b> (<code>cloudFiles</code>): ingesta incremental de ficheros nuevos, con checkpoint.</li>
<li><b>Lakeflow Jobs</b> (antes Workflows) orquesta notebooks y scripts. <b>Lakeflow Declarative Pipelines</b> (antes DLT) define tablas de forma declarativa.</li>
<li><b>Cómputo</b>: all-purpose clusters (desarrollo), job clusters, SQL warehouses y serverless.</li>
</ul>
<p>Para practicar gratis: <b>Databricks Free Edition</b>.</p>`,
  tarjetas: [
    ["¿Qué añade Delta sobre Parquet?", "Un log de transacciones: ACID, time travel, MERGE, schema enforcement."],
    ["¿Cómo ves el historial de una tabla Delta?", "DESCRIBE HISTORY tabla"],
    ["¿Qué hace VACUUM y qué riesgo tiene?", "Borra ficheros no referenciados más antiguos que la retención; pierdes el time travel a esas versiones."],
    ["¿Para qué sirve el checkpointLocation en streaming?", "Recordar qué se ha procesado ya, para no reprocesar ni perder datos (exactly-once)."],
    ["trigger(availableNow=True)", "Procesa todo lo pendiente y se para: streaming usado como batch incremental."],
  ],
  ejercicios: [{
    titulo: "Ingesta a bronze con Auto Loader", archivo: null,
    enunciado: `Escribe la ingesta incremental de ficheros JSON de <code>/Volumes/main/raw/landing/pedidos/</code> a <code>main.bronze.pedidos</code>, añadiendo fecha de ingesta y fichero de origen. Debe procesar lo pendiente y parar.`,
    datos: "", esperado: "",
    pistas: ["spark.readStream.format('cloudFiles')", "cloudFiles.schemaLocation es obligatorio para inferir el esquema", "_metadata.file_path da el fichero de origen", "writeStream ... trigger(availableNow=True).toTable(...)"],
    solucion: `base = "/Volumes/main/raw/_checkpoints/pedidos"

(spark.readStream.format("cloudFiles")
    .option("cloudFiles.format", "json")
    .option("cloudFiles.schemaLocation", f"{base}/schema")
    .load("/Volumes/main/raw/landing/pedidos/")
    .withColumn("_ingest_ts", F.current_timestamp())
    .withColumn("_source_file", F.col("_metadata.file_path"))
 .writeStream
    .option("checkpointLocation", f"{base}/chk")
    .trigger(availableNow=True)
    .toTable("main.bronze.pedidos"))`,
    explicacion: `El checkpoint hace que cada fichero se procese una sola vez: puedes programar este job cada hora y es idempotente. Este ejercicio necesita Databricks (Free Edition sirve).`
  }],
  test: [
    { p: "Borraste filas por error hace 2 horas. ¿Qué usas?", o: ["VACUUM", "RESTORE TABLE ... VERSION AS OF n", "OPTIMIZE"], c: 1, x: "Time travel / RESTORE, mira la versión con DESCRIBE HISTORY." },
  ]
},
// ------------------------------------------------------------
{
  id: "git", titulo: "11. Git y GitHub", grupo: "Herramientas",
  teoria: `
<p><b>Flujo de trabajo diario:</b></p>
<pre>git switch -c feature/scd2-clientes   # rama nueva
# ... editar ...
git status                            # qué ha cambiado
git add practica/ej05_scd2.py
git commit -m "Añade SCD2 de clientes"
git push -u origin feature/scd2-clientes
# en GitHub: abrir Pull Request → revisión → merge</pre>
<ul>
<li><code>git pull</code> = <code>fetch</code> + <code>merge</code> (traer cambios del remoto).</li>
<li><code>git revert &lt;commit&gt;</code> deshace creando un commit nuevo (seguro en ramas compartidas). <code>git reset</code> reescribe la historia (solo en local).</li>
<li><code>.gitignore</code>: nunca subas secretos, <code>.venv</code>, datos ni <code>spark-warehouse</code>.</li>
<li>En Databricks: <b>Git folders</b> (antes Repos) conectan tu workspace con GitHub. Para desplegar jobs como código: <b>Databricks Asset Bundles</b>.</li>
</ul>`,
  tarjetas: [
    ["merge vs rebase", "merge une historias con un commit de merge; rebase reescribe tus commits encima de la otra rama (historia lineal). No hagas rebase de ramas compartidas."],
    ["revert vs reset", "revert crea un commit que deshace (seguro). reset mueve la rama hacia atrás (reescribe historia)."],
    ["¿Qué es un Pull Request?", "Una petición para fusionar tu rama en otra, con revisión y comentarios antes del merge."],
    ["Subiste un token por error a GitHub. ¿Qué haces primero?", "Revocar/rotar el token. Borrarlo del repo no basta: sigue en la historia."],
  ],
  ejercicios: [{
    titulo: "Tu primer PR", archivo: null,
    enunciado: `Crea una rama <code>ejercicio/dedup</code>, añade un fichero <code>notas/dedup.md</code> con lo que aprendiste, súbela y abre un PR hacia main.`,
    datos: "", esperado: "",
    pistas: ["git switch -c", "git add / commit / push -u origin", "GitHub muestra un botón «Compare & pull request»"],
    solucion: `git switch main && git pull
git switch -c ejercicio/dedup
mkdir -p notas && printf "# Dedup\\nrow_number + desempate\\n" > notas/dedup.md
git add notas/dedup.md
git commit -m "Notas sobre deduplicación"
git push -u origin ejercicio/dedup
# Abrir PR en GitHub → revisar → Merge`,
    explicacion: `Trabajar siempre en ramas + PR (aunque estés tú solo) es la práctica estándar y te prepara para trabajar en equipo.`
  }],
  test: [
    { p: "Quieres deshacer un commit que ya está en main y que otros han descargado.", o: ["git reset --hard", "git revert", "Borrar el repo"], c: 1, x: "revert no reescribe la historia compartida." },
  ]
},
];
