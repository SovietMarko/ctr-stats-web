// PODERES, JUGADORES, leer/escribir, etc. están en datos.js

const DELAY_MS = 500;          // anti-repetición
const LONG_PRESS_MS = 600;     // mantener pulsada una tarjeta = borrar

// Botones del mando (se pueden cambiar en ⚙️)
let config = { David: 7, Marco: 2, borrar: 5, voz: true };

// Autoguardado en el navegador
let stats = leerStats();
let eventos = leerEventos();
config = { ...config, ...(leer(CLAVE_CONFIG) || {}) };

function guardarTodo(jugador, poder, delta) {
    eventos.push({ t: Date.now(), j: jugador, p: poder, d: delta });
    escribir(CLAVE_DATOS, stats);
    escribir(CLAVE_EVENTOS, eventos);
}

// =============================
// VOZ
// =============================

function hablar(texto) {
    if (!config.voz || !("speechSynthesis" in window)) return;
    const m = new SpeechSynthesisUtterance(texto);
    m.lang = "es-ES";
    m.rate = 1.3;
    speechSynthesis.speak(m);
}

// =============================
// INTERFAZ
// =============================

function idSeguro(texto) { return texto.replace(/\s+/g, "_"); }

function nombreTecla(t) {
    return { Enter: "Enter", Control: "Ctrl", AltGraph: "AltGr" }[t] || t;
}

function crearInterfaz(jugador) {
    const grid = document.getElementById(`grid-${jugador}`);
    PODERES.forEach(p => {
        const card = document.createElement("div");
        card.className = "card";
        card.id = `card-${jugador}-${idSeguro(p.id)}`;
        card.title = `Clic: sumar · Mantener: borrar`;
        card.innerHTML = `
            <span class="tecla">${nombreTecla(p.tecla)}</span>
            <img src="img/${p.img}" alt="${p.id}">
            <span class="nombre">${p.id}</span>
            <span class="cuenta">${stats[jugador][p.id]}</span>`;

        // Clic = sumar, mantener pulsado = borrar
        let timer = null, borrado = false;
        card.addEventListener("pointerdown", () => {
            borrado = false;
            timer = setTimeout(() => { borrado = true; restar(jugador, p.id); }, LONG_PRESS_MS);
        });
        const cancelar = () => clearTimeout(timer);
        card.addEventListener("pointerup", cancelar);
        card.addEventListener("pointerleave", cancelar);
        card.addEventListener("click", () => { if (!borrado) sumar(jugador, p.id); });
        card.addEventListener("contextmenu", e => e.preventDefault());

        grid.appendChild(card);
    });
    actualizarTotal(jugador);
}

function refrescar(jugador, poder, clase) {
    const card = document.getElementById(`card-${jugador}-${idSeguro(poder)}`);
    card.querySelector(".cuenta").textContent = stats[jugador][poder];
    card.classList.remove("suma", "resta");
    void card.offsetWidth; // reinicia la animación
    card.classList.add(clase);
    actualizarTotal(jugador);
}

function actualizarTotal(jugador) {
    const total = Object.values(stats[jugador]).reduce((a, b) => a + b, 0);
    document.getElementById(`total-${jugador}`).textContent = total;
}

function registrar(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    const reg = document.getElementById("registro");
    reg.prepend(div);
    setTimeout(() => div.remove(), 3000);
}

// =============================
// SUMAR / BORRAR
// =============================

function sumar(jugador, poder) {
    stats[jugador][poder]++;
    guardarTodo(jugador, poder, +1);
    refrescar(jugador, poder, "suma");
    registrar(`✅ ${jugador} → ${poder} = ${stats[jugador][poder]}`);
    hablar(`${jugador}, ${poder}`);
    if (navigator.vibrate) navigator.vibrate(20);
}

function restar(jugador, poder) {
    if (stats[jugador][poder] === 0) {
        registrar(`⚠️ ${jugador} → ${poder} ya está en 0`);
        return;
    }
    stats[jugador][poder]--;
    guardarTodo(jugador, poder, -1);
    refrescar(jugador, poder, "resta");
    registrar(`🗑️ ${jugador} → ${poder} = ${stats[jugador][poder]} (borrado)`);
    hablar(`${jugador}, borrado ${poder}`);
    if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
}

// =============================
// MANDO (Gamepad API) + TECLADO
// =============================

function botonesPulsados() {
    const pulsados = new Set();
    for (const gp of navigator.getGamepads ? navigator.getGamepads() : []) {
        if (!gp) continue;
        gp.buttons.forEach((b, i) => { if (b.pressed) pulsados.add(i); });
    }
    return pulsados;
}

const ultimo = {};
let ctrlPendiente = null;

window.addEventListener("keydown", e => {
    const poder = PODERES.find(p => p.tecla === e.key);
    if (!poder || e.repeat || e.target.tagName === "INPUT") return;
    e.preventDefault();

    // En Windows, AltGr envía primero un Ctrl falso: esperamos un instante
    // y si llega AltGraph, ignoramos ese Ctrl.
    if (e.key === "Control") {
        ctrlPendiente = setTimeout(() => procesar(poder), 40);
        return;
    }
    if (e.key === "AltGraph") clearTimeout(ctrlPendiente);
    procesar(poder);
});

function procesar(poder) {
    const pulsados = botonesPulsados();
    const modoBorrar = pulsados.has(config.borrar);

    // PRIORIDAD: David y Marco a la vez => SOLO David
    let jugador = null;
    if (pulsados.has(config.David)) jugador = "David";
    else if (pulsados.has(config.Marco)) jugador = "Marco";
    if (!jugador) return;

    const clave = `${jugador}_${poder.id}`;
    const ahora = Date.now();
    if (ultimo[clave] && ahora - ultimo[clave] < DELAY_MS) return;
    ultimo[clave] = ahora;

    modoBorrar ? restar(jugador, poder.id) : sumar(jugador, poder.id);
}

// Estado del mando y botones en vivo (para configurar)
const estado = document.getElementById("estado-mando");
const vivo = document.getElementById("botones-vivo");

function bucleMando() {
    const gps = (navigator.getGamepads ? [...navigator.getGamepads()] : []).filter(Boolean);
    if (gps.length) {
        estado.textContent = `🎮 ${gps[0].id.slice(0, 40)}`;
        estado.classList.add("ok");
    } else {
        estado.textContent = "🎮 Sin mando (pulsa un botón)";
        estado.classList.remove("ok");
    }
    const p = [...botonesPulsados()];
    vivo.textContent = p.length ? p.join(", ") : "—";
    requestAnimationFrame(bucleMando);
}

// =============================
// EXCEL
// =============================

function descargarExcel() {
    const filas = PODERES.map(p => ({ Poder: p.id, David: stats.David[p.id], Marco: stats.Marco[p.id] }));
    filas.push({
        Poder: "TOTAL",
        David: filas.reduce((a, f) => a + f.David, 0),
        Marco: filas.reduce((a, f) => a + f.Marco, 0),
    });
    const ws = XLSX.utils.json_to_sheet(filas);
    ws["!cols"] = [{ wch: 20 }, { wch: 8 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CTR");
    const fecha = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
    XLSX.writeFile(wb, `estadisticas_CTR_${fecha}.xlsx`);
}

// =============================
// CONFIGURACIÓN Y BOTONES DEL PIE
// =============================

const dlg = document.getElementById("dlg-config");

function pintarConfig() {
    document.querySelectorAll(".lbl-boton").forEach(el => el.textContent = config[el.dataset.jugador]);
}

document.getElementById("btn-config").onclick = () => {
    document.getElementById("cfg-David").value = config.David;
    document.getElementById("cfg-Marco").value = config.Marco;
    document.getElementById("cfg-borrar").value = config.borrar;
    document.getElementById("cfg-voz").checked = config.voz;
    dlg.showModal();
};

document.getElementById("cfg-guardar").onclick = () => {
    const num = id => parseInt(document.getElementById(id).value, 10);
    config = {
        David: num("cfg-David"),
        Marco: num("cfg-Marco"),
        borrar: num("cfg-borrar"),
        voz: document.getElementById("cfg-voz").checked,
    };
    escribir(CLAVE_CONFIG, config);
    pintarConfig();
};

document.getElementById("btn-excel").onclick = descargarExcel;

document.getElementById("btn-reset").onclick = () => {
    const hayDatos = JUGADORES.some(j => totalJugador(stats, j) > 0);
    if (!confirm(hayDatos
        ? "¿Terminar esta partida y empezar una nueva?\nLa partida se guarda en el historial (📊)."
        : "¿Empezar una partida nueva?")) return;

    if (hayDatos) {
        const partidas = leerPartidas();
        partidas.push(resumenPartida(stats, eventos));
        escribir(CLAVE_PARTIDAS, partidas);
    }
    stats = statsVacias();
    eventos = [];
    escribir(CLAVE_DATOS, stats);
    escribir(CLAVE_EVENTOS, eventos);
    JUGADORES.forEach(j => {
        PODERES.forEach(p => {
            document.querySelector(`#card-${j}-${idSeguro(p.id)} .cuenta`).textContent = 0;
        });
        actualizarTotal(j);
    });
};

// =============================
// INICIO
// =============================

JUGADORES.forEach(crearInterfaz);
pintarConfig();
bucleMando();
