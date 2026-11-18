// App de estudio offline. El contenido está en data.js; el progreso se guarda en localStorage.
(() => {
  const CLAVE = "estudio-de-progreso-v1";
  const temas = window.TEMAS;
  let estado = JSON.parse(localStorage.getItem(CLAVE) || "{}");
  // estado: { tarjetas: {"tema:i": "sabida"|"repasar"}, ejercicios: {"tema:i": true}, tests: {"tema": mejorNota}, codigo: {"tema:i": "..."} }
  for (const k of ["tarjetas", "ejercicios", "tests", "codigo"]) estado[k] ??= {};
  const guardar = () => { localStorage.setItem(CLAVE, JSON.stringify(estado)); pintarMenu(); };

  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const barajar = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  let temaActual = null, pestanaActual = "teoria";

  function progresoTema(t) {
    const total = t.tarjetas.length + t.ejercicios.length + (t.test.length ? 1 : 0);
    let hecho = t.tarjetas.filter((_, i) => estado.tarjetas[`${t.id}:${i}`] === "sabida").length;
    hecho += t.ejercicios.filter((_, i) => estado.ejercicios[`${t.id}:${i}`]).length;
    if (t.test.length && estado.tests[t.id] === t.test.length) hecho += 1;
    return { hecho, total, pct: Math.round((100 * hecho) / total) };
  }

  function pintarMenu() {
    let html = "", grupo = null, H = 0, T = 0;
    for (const t of temas) {
      if (t.grupo !== grupo) { grupo = t.grupo; html += `<div class="grupo">${esc(grupo)}</div>`; }
      const p = progresoTema(t); H += p.hecho; T += p.total;
      html += `<div class="tema-link ${temaActual === t.id ? "activo" : ""}" data-id="${t.id}">
        <span>${esc(t.titulo)}</span><small>${p.pct}%</small></div>`;
    }
    $("#lista-temas").innerHTML = html;
    document.querySelectorAll(".tema-link").forEach((el) => (el.onclick = () => abrirTema(el.dataset.id)));
    const pct = T ? Math.round((100 * H) / T) : 0;
    $("#progreso-global").innerHTML = `Progreso total: <b>${pct}%</b><div class="barra"><div style="width:${pct}%"></div></div>`;
  }

  function abrirTema(id, pestana = "teoria") {
    temaActual = id; pestanaActual = pestana;
    location.hash = id;
    const t = temas.find((x) => x.id === id);
    const tabs = [["teoria", "📖 Teoría"], ["tarjetas", `🃏 Tarjetas (${t.tarjetas.length})`],
                  ["ejercicios", `🛠️ Ejercicios (${t.ejercicios.length})`], ["test", `✅ Test (${t.test.length})`]];
    $("#contenido").innerHTML = `<h2>${esc(t.titulo)}</h2>
      <div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${k === pestana ? "activo" : ""}" data-k="${k}">${n}</button>`).join("")}</div>
      <div id="panel"></div>`;
    document.querySelectorAll(".tab").forEach((b) => (b.onclick = () => abrirTema(id, b.dataset.k)));
    ({ teoria: verTeoria, tarjetas: verTarjetas, ejercicios: verEjercicios, test: verTest })[pestana](t);
    pintarMenu();
    window.scrollTo(0, 0);
  }

  const verTeoria = (t) => ($("#panel").innerHTML = `<div class="card">${t.teoria}</div>`);

  // ---------- Tarjetas ----------
  function sesionTarjetas(lista, titulo) {
    // lista: [{tema, i, q, a}] → primero las marcadas "repasar", luego las no vistas, luego las sabidas
    const peso = (c) => ({ repasar: 0, undefined: 1, sabida: 2 }[estado.tarjetas[`${c.tema}:${c.i}`]]);
    const cola = barajar(lista).sort((a, b) => peso(a) - peso(b));
    let n = 0, girada = false;
    const pintar = () => {
      if (n >= cola.length) {
        $("#panel").innerHTML = `<div class="card">🎉 Has terminado ${esc(titulo)}.<div class="fila"><button id="otra">Otra vuelta</button></div></div>`;
        $("#otra").onclick = () => sesionTarjetas(lista, titulo); return;
      }
      const c = cola[n], marca = estado.tarjetas[`${c.tema}:${c.i}`];
      $("#panel").innerHTML = `<p class="muted">${n + 1} / ${cola.length}${marca ? ` · última vez: ${marca === "sabida" ? "✔ la sabías" : "↻ para repasar"}` : ""}</p>
        <div class="card flash" id="flash">${girada ? `<div><div class="muted">${esc(c.q)}</div><p class="resp">${esc(c.a)}</p></div>` : `<div>${esc(c.q)}<p class="muted">(clic para ver la respuesta)</p></div>`}</div>
        <div class="fila">${girada ? `<button id="mal">↻ Repasar</button><button id="bien">✔ La sabía</button>` : ""}</div>`;
      $("#flash").onclick = () => { girada = !girada; pintar(); };
      if (girada) {
        const marcar = (v) => { estado.tarjetas[`${c.tema}:${c.i}`] = v; guardar(); n++; girada = false; pintar(); };
        $("#mal").onclick = () => marcar("repasar"); $("#bien").onclick = () => marcar("sabida");
      }
    };
    pintar();
  }
  const verTarjetas = (t) => sesionTarjetas(t.tarjetas.map(([q, a], i) => ({ tema: t.id, i, q, a })), "este tema");

  // ---------- Ejercicios ----------
  function verEjercicios(t) {
    $("#panel").innerHTML = t.ejercicios.map((e, i) => {
      const k = `${t.id}:${i}`;
      return `<div class="card" data-i="${i}">
        <h3>${estado.ejercicios[k] ? "✅ " : ""}${esc(e.titulo)}</h3>
        <p>${e.enunciado}</p>
        ${e.datos ? `<p class="muted">Datos de entrada</p><pre>${esc(e.datos)}</pre>` : ""}
        ${e.esperado ? `<p class="muted">Resultado esperado</p><pre>${esc(e.esperado)}</pre>` : ""}
        ${e.archivo ? `<p class="muted">▶ Ejecutable en local: <code>${esc(e.archivo)}</code></p>` : ""}
        <p class="muted">Tu solución (se guarda sola en este navegador):</p>
        <textarea class="codigo" placeholder="Escribe aquí tu código o razonamiento antes de mirar la solución…">${esc(estado.codigo[k] || "")}</textarea>
        <div class="pistas"></div>
        <div class="fila">
          <button class="btn-pista">💡 Pista (${e.pistas.length})</button>
          <button class="btn-sol">👀 Ver solución</button>
          <button class="btn-hecho">${estado.ejercicios[k] ? "Desmarcar" : "✔ Marcar como resuelto"}</button>
        </div>
        <div class="sol" hidden><pre><code>${esc(e.solucion)}</code></pre><p>${esc(e.explicacion)}</p></div>
      </div>`;
    }).join("");
    document.querySelectorAll("#panel .card").forEach((card) => {
      const i = +card.dataset.i, e = t.ejercicios[i], k = `${t.id}:${i}`;
      let pistasVistas = 0;
      card.querySelector(".codigo").oninput = (ev) => { estado.codigo[k] = ev.target.value; localStorage.setItem(CLAVE, JSON.stringify(estado)); };
      card.querySelector(".btn-pista").onclick = (ev) => {
        if (pistasVistas >= e.pistas.length) return;
        card.querySelector(".pistas").insertAdjacentHTML("beforeend", `<p>💡 ${esc(e.pistas[pistasVistas++])}</p>`);
        ev.target.textContent = `💡 Pista (${e.pistas.length - pistasVistas})`;
      };
      card.querySelector(".btn-sol").onclick = () => {
        const sol = card.querySelector(".sol");
        if (sol.hidden && !(estado.codigo[k] || "").trim() &&
            !confirm("Aún no has escrito nada. ¿Seguro que quieres ver la solución? Intentarlo primero es lo que hace que se te quede.")) return;
        sol.hidden = !sol.hidden;
      };
      card.querySelector(".btn-hecho").onclick = () => { estado.ejercicios[k] = !estado.ejercicios[k]; guardar(); verEjercicios(t); };
    });
  }

  // ---------- Test ----------
  function verTest(t) {
    let aciertos = 0, respondidas = 0;
    $("#panel").innerHTML = t.test.map((q, i) => `<div class="card" data-i="${i}"><p><b>${i + 1}.</b> ${esc(q.p)}</p>
      ${q.o.map((o, j) => `<button class="opcion" data-j="${j}">${esc(o)}</button>`).join("")}<p class="exp"></p></div>`).join("")
      + `<p id="nota" class="muted">${estado.tests[t.id] != null ? `Mejor nota anterior: ${estado.tests[t.id]}/${t.test.length}` : ""}</p>`;
    document.querySelectorAll("#panel .card").forEach((card) => {
      const q = t.test[+card.dataset.i];
      card.querySelectorAll(".opcion").forEach((b) => (b.onclick = () => {
        if (card.dataset.hecha) return; card.dataset.hecha = 1; respondidas++;
        const j = +b.dataset.j, bien = j === q.c; if (bien) aciertos++;
        card.querySelectorAll(".opcion")[q.c].classList.add("correcta");
        if (!bien) b.classList.add("incorrecta");
        card.querySelector(".exp").innerHTML = `<span class="${bien ? "ok" : "mal"}">${bien ? "¡Correcto!" : "No."}</span> ${esc(q.x)}`;
        if (respondidas === t.test.length) {
          estado.tests[t.id] = Math.max(estado.tests[t.id] ?? 0, aciertos); guardar();
          $("#nota").innerHTML = `Resultado: <b>${aciertos}/${t.test.length}</b> <button id="rep">Repetir</button>`;
          $("#rep").onclick = () => verTest(t);
        }
      }));
    });
  }

  // ---------- Global ----------
  $("#btn-repaso").onclick = () => {
    temaActual = null; pintarMenu(); location.hash = "repaso";
    $("#contenido").innerHTML = `<h2>🔀 Repaso aleatorio</h2><p class="muted">Tarjetas de todos los temas. Primero salen las que marcaste para repasar.</p><div id="panel"></div>`;
    sesionTarjetas(temas.flatMap((t) => t.tarjetas.map(([q, a], i) => ({ tema: t.id, i, q, a }))), "el repaso");
  };
  $("#btn-reset").onclick = () => { if (confirm("¿Borrar todo tu progreso y tus soluciones guardadas?")) { localStorage.removeItem(CLAVE); location.reload(); } };

  const inicial = location.hash.slice(1);
  if (temas.some((t) => t.id === inicial)) abrirTema(inicial);
  else if (inicial === "repaso") $("#btn-repaso").click();
  else abrirTema(temas[0].id);
})();
