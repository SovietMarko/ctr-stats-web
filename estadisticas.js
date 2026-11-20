// =============================
// ESTADÍSTICAS E HISTORIAL (usa datos.js)
// =============================

const $ = id => document.getElementById(id);
const IMG = Object.fromEntries(PODERES.map(p => [p.id, `img/${p.img}`]));

function fecha(t) {
    return new Date(t).toLocaleString("es", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function minutos(p) { return Math.max(0, (p.fin - p.inicio) / 60000); }
function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }

// ---------- Datos según el periodo elegido ----------

function partidaActual() {
    const ev = leerEventos();
    return resumenPartida(leerStats(), ev);
}

function sumarPartidas(lista) {
    const stats = statsVacias();
    const borrados = { David: 0, Marco: 0 };
    let dur = 0;
    lista.forEach(p => {
        JUGADORES.forEach(j => {
            PODERES.forEach(po => stats[j][po.id] += (p.stats[j] && p.stats[j][po.id]) || 0);
            borrados[j] += (p.borrados && p.borrados[j]) || 0;
        });
        dur += minutos(p);
    });
    return { stats, borrados, dur, n: lista.length };
}

function datosPeriodo(valor) {
    const partidas = leerPartidas();
    const actual = partidaActual();
    const actualTieneDatos = JUGADORES.some(j => totalJugador(actual.stats, j) > 0);

    if (valor === "actual") return { ...sumarPartidas([actual]), lista: [] };
    if (valor === "todas") {
        const todas = actualTieneDatos ? [...partidas, actual] : partidas;
        return { ...sumarPartidas(todas), lista: todas };
    }
    const p = partidas[Number(valor)];
    return { ...sumarPartidas(p ? [p] : []), lista: [] };
}

// ---------- Filtro ----------

function llenarFiltro() {
    const sel = $("periodo");
    const previo = sel.value;
    const partidas = leerPartidas();
    sel.innerHTML = `
        <option value="actual">Partida actual</option>
        <option value="todas">Todas las partidas (histórico)</option>
        ${partidas.map((p, i) => `<option value="${i}">Partida ${i + 1} · ${fecha(p.inicio)}</option>`).reverse().join("")}`;
    sel.value = [...sel.options].some(o => o.value === previo) ? previo :
        (JUGADORES.some(j => totalJugador(leerStats(), j) > 0) || !partidas.length ? "actual" : "todas");
}

// ---------- Tiles de resumen ----------

function favoritos(stats, j) {
    return PODERES.map(p => ({ ...p, n: stats[j][p.id] })).sort((a, b) => b.n - a.n);
}

function tipoFavorito(stats, j) {
    const porTipo = TIPOS.map(t => ({ t, n: PODERES.filter(p => p.tipo === t).reduce((a, p) => a + stats[j][p.id], 0) }));
    return porTipo.sort((a, b) => b.n - a.n)[0];
}

function pintarTiles(d) {
    const otro = { David: "Marco", Marco: "David" };
    $("tiles").innerHTML = JUGADORES.map(j => {
        const total = totalJugador(d.stats, j);
        const fav = favoritos(d.stats, j)[0];
        const usados = PODERES.filter(p => d.stats[j][p.id] > 0).length;
        const ritmo = d.dur >= 1 ? (total / d.dur).toFixed(1) : "—";
        const tipo = tipoFavorito(d.stats, j);
        const ventaja = total - totalJugador(d.stats, otro[j]);

        let extra = "";
        if (d.n > 1) {
            const ganadas = d.lista.filter(p => totalJugador(p.stats, j) > totalJugador(p.stats, otro[j])).length;
            extra = `<div class="metrica"><div class="v">${ganadas}/${d.n}</div><div class="k">Partidas con más poderes</div></div>`;
        }

        return `
        <div class="tile-jugador ${j.toLowerCase()}">
            <h2>${j}</h2>
            ${total ? `
            <div class="favorito">
                <img src="${IMG[fav.id]}" alt="">
                <div>
                    <div class="etq">PODER FAVORITO</div>
                    <div class="nom">${fav.id}</div>
                    <div class="det">${fav.n} veces · ${pct(fav.n, total)}% de sus poderes</div>
                </div>
            </div>` : `<p class="sub">Sin poderes en este periodo</p>`}
            <div class="metricas">
                <div class="metrica"><div class="v">${total}</div><div class="k">Poderes usados</div></div>
                <div class="metrica"><div class="v">${ventaja > 0 ? "+" : ""}${ventaja}</div><div class="k">Diferencia vs ${otro[j]}</div></div>
                <div class="metrica"><div class="v">${ritmo}</div><div class="k">Poderes por minuto</div></div>
                <div class="metrica"><div class="v">${usados}/${PODERES.length}</div><div class="k">Variedad de poderes</div></div>
                <div class="metrica"><div class="v">${tipo && tipo.n ? tipo.t : "—"}</div><div class="k">Tipo preferido</div></div>
                <div class="metrica"><div class="v">${d.borrados[j]}</div><div class="k">Correcciones (borrados)</div></div>
                ${extra}
            </div>
        </div>`;
    }).join("");
}

// ---------- Ranking por jugador ----------

function pintarRanking(d, j) {
    const lista = favoritos(d.stats, j);
    const usados = lista.filter(p => p.n > 0);
    const total = totalJugador(d.stats, j);
    const max = usados.length ? usados[0].n : 1;
    const cls = j.toLowerCase();

    $(`rank-${j}`).innerHTML = usados.map((p, i) => `
        <div class="fila-barra" tabindex="0"
             data-tip="<b>${p.id}</b>${j}: ${p.n} (${pct(p.n, total)}%)<br>Puesto #${i + 1}">
            <img src="${IMG[p.id]}" alt="">
            <span class="nombre">${p.id}</span>
            <div class="pista"><div class="linea">
                <div class="barra ${cls}" style="width:calc((100% - 40px) * ${p.n / max})"></div>
                <span class="valor">${p.n}</span>
            </div></div>
        </div>`).join("") || `<p class="sub">Sin datos</p>`;

    const sinUso = lista.filter(p => p.n === 0);
    $(`sinuso-${j}`).innerHTML = sinUso.length && usados.length
        ? `Nunca usados: ${sinUso.map(p => `<img src="${IMG[p.id]}" alt="${p.id}" title="${p.id}">`).join("")}`
        : "";
}

// ---------- Cara a cara ----------

function pintarCara(d) {
    const filas = PODERES
        .map(p => ({ ...p, a: d.stats.David[p.id], b: d.stats.Marco[p.id] }))
        .filter(p => p.a + p.b > 0)
        .sort((x, y) => (y.a + y.b) - (x.a + x.b));
    const max = Math.max(1, ...filas.flatMap(p => [p.a, p.b]));

    $("cara").innerHTML = filas.map(p => {
        const lider = p.a > p.b ? "David usa más" : p.b > p.a ? "Marco usa más" : "Empate";
        return `
        <div class="fila-cara" tabindex="0"
             data-tip="<b>${p.id}</b><div class='t-fila'><i class='muestra david'></i>David: ${p.a}</div><div class='t-fila'><i class='muestra marco'></i>Marco: ${p.b}</div>${lider}">
            <div class="lado izq">
                <span class="valor">${p.a}</span>
                <div class="barra david" style="width:calc((100% - 34px) * ${p.a / max})"></div>
            </div>
            <div class="centro"><img src="${IMG[p.id]}" alt=""><span>${p.id}</span></div>
            <div class="lado der">
                <div class="barra marco" style="width:calc((100% - 34px) * ${p.b / max})"></div>
                <span class="valor">${p.b}</span>
            </div>
        </div>`;
    }).join("") || `<p class="sub">Sin datos</p>`;
}

// ---------- Por tipo ----------

function pintarTipos(d) {
    const filas = TIPOS.map(t => {
        const ids = PODERES.filter(p => p.tipo === t).map(p => p.id);
        const suma = j => ids.reduce((a, id) => a + d.stats[j][id], 0);
        return { t, ids, a: suma("David"), b: suma("Marco") };
    });
    const max = Math.max(1, ...filas.flatMap(f => [f.a, f.b]));
    const tD = totalJugador(d.stats, "David"), tM = totalJugador(d.stats, "Marco");

    $("tipos").innerHTML = filas.map(f => `
        <div class="fila-barra sin-icono" tabindex="0"
             data-tip="<b>${f.t}</b><div class='t-fila'><i class='muestra david'></i>David: ${f.a} (${pct(f.a, tD)}%)</div><div class='t-fila'><i class='muestra marco'></i>Marco: ${f.b} (${pct(f.b, tM)}%)</div><span style='color:var(--tinta-muted)'>${f.ids.join(", ")}</span>">
            <span class="nombre">${f.t}</span>
            <div class="pista">
                <div class="linea"><div class="barra david" style="width:calc((100% - 40px) * ${f.a / max})"></div><span class="valor">${f.a}</span></div>
                <div class="linea"><div class="barra marco" style="width:calc((100% - 40px) * ${f.b / max})"></div><span class="valor">${f.b}</span></div>
            </div>
        </div>`).join("");
}

// ---------- Historial ----------

function pintarHistorial() {
    const partidas = leerPartidas();
    $("tarjeta-historial").hidden = partidas.length === 0;
    if (!partidas.length) return;

    const ultimas = partidas.map((p, i) => ({ ...p, i })).slice(-20);
    const max = Math.max(1, ...ultimas.flatMap(p => JUGADORES.map(j => totalJugador(p.stats, j))));
    const maxGlobal = Math.max(...ultimas.flatMap(p => JUGADORES.map(j => totalJugador(p.stats, j))));

    $("historial").innerHTML = ultimas.map(p => {
        const a = totalJugador(p.stats, "David"), b = totalJugador(p.stats, "Marco");
        const favD = favoritos(p.stats, "David")[0], favM = favoritos(p.stats, "Marco")[0];
        // Etiqueta solo en el valor más alto del historial (el resto en tooltip y tabla)
        const etq = v => v === maxGlobal ? `<span class="valor">${v}</span>` : "";
        return `
        <div class="grupo-col" tabindex="0"
             data-tip="<b>Partida ${p.i + 1} · ${fecha(p.inicio)}</b><div class='t-fila'><i class='muestra david'></i>David: ${a}${a ? ` · fav. ${favD.id}` : ""}</div><div class='t-fila'><i class='muestra marco'></i>Marco: ${b}${b ? ` · fav. ${favM.id}` : ""}</div>Duración: ${Math.round(minutos(p))} min">
            <div class="par">
                <div class="col david" style="height:${(a / max) * 100}%">${etq(a)}</div>
                <div class="col marco" style="height:${(b / max) * 100}%">${etq(b)}</div>
            </div>
            <div class="etq-x">P${p.i + 1}</div>
        </div>`;
    }).join("");

    $("tabla-partidas").innerHTML = `
        <tr><th>#</th><th>Fecha</th><th class="num">Min</th><th class="num">David</th><th class="num">Marco</th>
            <th>Favorito David</th><th>Favorito Marco</th><th></th></tr>
        ${partidas.map((p, i) => {
            const a = totalJugador(p.stats, "David"), b = totalJugador(p.stats, "Marco");
            return `<tr>
                <td>${i + 1}</td><td>${fecha(p.inicio)}</td><td class="num">${Math.round(minutos(p))}</td>
                <td class="num">${a}</td><td class="num">${b}</td>
                <td>${a ? favoritos(p.stats, "David")[0].id : "—"}</td>
                <td>${b ? favoritos(p.stats, "Marco")[0].id : "—"}</td>
                <td><button class="btn-borrar" data-borrar="${i}" title="Borrar partida">🗑️</button></td>
            </tr>`;
        }).reverse().join("")}`;
}

// ---------- Tabla completa ----------

function pintarTabla(d) {
    const tD = totalJugador(d.stats, "David"), tM = totalJugador(d.stats, "Marco");
    $("tabla-poderes").innerHTML = `
        <tr><th>Poder</th><th>Tipo</th><th class="num">David</th><th class="num">%</th><th class="num">Marco</th><th class="num">%</th></tr>
        ${PODERES.map(p => `<tr><td>${p.id}</td><td>${p.tipo}</td>
            <td class="num">${d.stats.David[p.id]}</td><td class="num">${pct(d.stats.David[p.id], tD)}%</td>
            <td class="num">${d.stats.Marco[p.id]}</td><td class="num">${pct(d.stats.Marco[p.id], tM)}%</td></tr>`).join("")}
        <tr><th>TOTAL</th><th></th><th class="num">${tD}</th><th></th><th class="num">${tM}</th><th></th></tr>`;
}

// ---------- Pintar todo ----------

function pintar() {
    const d = datosPeriodo($("periodo").value);
    const hay = JUGADORES.some(j => totalJugador(d.stats, j) > 0);
    $("vacio").hidden = hay;
    [...$("contenido").children].forEach(el => { if (el.id !== "tarjeta-historial") el.hidden = !hay; });

    if (hay) {
        pintarTiles(d);
        JUGADORES.forEach(j => pintarRanking(d, j));
        pintarCara(d);
        pintarTipos(d);
        pintarTabla(d);
    }
    pintarHistorial();
}

// ---------- Tooltip (ratón y teclado) ----------

const tip = $("tooltip");
function mostrarTip(el, x, y) {
    tip.innerHTML = el.dataset.tip;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = Math.min(x + 12, innerWidth - r.width - 8) + "px";
    tip.style.top = Math.max(8, y - r.height - 12) + "px";
}
document.addEventListener("pointermove", e => {
    const el = e.target.closest("[data-tip]");
    el ? mostrarTip(el, e.clientX, e.clientY) : (tip.hidden = true);
});
document.addEventListener("focusin", e => {
    const el = e.target.closest("[data-tip]");
    if (!el) return;
    const r = el.getBoundingClientRect();
    mostrarTip(el, r.left + r.width / 2, r.top);
});
document.addEventListener("focusout", () => tip.hidden = true);

// ---------- Acciones ----------

$("periodo").addEventListener("change", pintar);

document.addEventListener("click", e => {
    const b = e.target.closest("[data-borrar]");
    if (!b) return;
    const i = Number(b.dataset.borrar);
    if (!confirm(`¿Borrar la partida ${i + 1} del historial? No se puede deshacer.`)) return;
    const partidas = leerPartidas();
    partidas.splice(i, 1);
    escribir(CLAVE_PARTIDAS, partidas);
    llenarFiltro();
    pintar();
});

$("btn-excel-hist").addEventListener("click", () => {
    const wb = XLSX.utils.book_new();

    // Hoja 1: resumen del periodo elegido
    const d = datosPeriodo($("periodo").value);
    const resumen = PODERES.map(p => ({ Poder: p.id, Tipo: p.tipo, David: d.stats.David[p.id], Marco: d.stats.Marco[p.id] }));
    resumen.push({ Poder: "TOTAL", Tipo: "", David: totalJugador(d.stats, "David"), Marco: totalJugador(d.stats, "Marco") });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), "Resumen");

    // Hoja 2: una fila por partida con cada poder
    const filas = leerPartidas().map((p, i) => {
        const f = { Partida: i + 1, Fecha: fecha(p.inicio), Minutos: Math.round(minutos(p)) };
        JUGADORES.forEach(j => {
            f[`${j} TOTAL`] = totalJugador(p.stats, j);
            PODERES.forEach(po => f[`${j} ${po.id}`] = p.stats[j][po.id] || 0);
        });
        return f;
    });
    if (filas.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), "Partidas");

    XLSX.writeFile(wb, "historial_CTR.xlsx");
});

// Si el contador está abierto en otra pestaña, refrescar al volver
window.addEventListener("storage", () => { llenarFiltro(); pintar(); });

llenarFiltro();
pintar();
