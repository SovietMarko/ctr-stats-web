// =============================
// DATOS COMPARTIDOS (contador e historial)
// =============================

// Poder, tecla (e.key del navegador), icono y tipo
const PODERES = [
    { id: "COMBO 3 MISILES",  tecla: "9",        img: "3misiles.png",      tipo: "Misiles" },
    { id: "COMBO 3 BOMBAS",   tecla: "*",        img: "3bombas.png",       tipo: "Bombas" },
    { id: "BOMBA ATRAS",      tecla: ".",        img: "bomba_atras.png",   tipo: "Bombas" },
    { id: "BURBUJAZO",        tecla: "5",        img: "burbuja.png",       tipo: "Burbujas" },
    { id: "BURBUJAZO ATRAS",  tecla: "4",        img: "burbuja_atras.png", tipo: "Burbujas" },
    { id: "MISIL ATRAS",      tecla: "2",        img: "misil_atras.png",   tipo: "Misiles" },
    { id: "MISIL",            tecla: "1",        img: "misil.png",         tipo: "Misiles" },
    { id: "BOMBA",            tecla: "0",        img: "bomba.png",         tipo: "Bombas" },
    { id: "MASCARA",          tecla: "Enter",    img: "mascara.png",       tipo: "Especiales" },
    { id: "RAYO",             tecla: "3",        img: "rayo.png",          tipo: "Especiales" },
    { id: "DIMETAZO VOLADOR", tecla: "7",        img: "dimetazo.png",      tipo: "Otros" },
    { id: "ESPICHADA",        tecla: "8",        img: "espichada.png",     tipo: "Otros" },
    { id: "RELOJAZO",         tecla: "6",        img: "reloj.png",         tipo: "Especiales" },
    { id: "NITRAZO KAMIKAZE", tecla: "Control",  img: "nitro.png",         tipo: "Trampas" },
    { id: "TNT VOLADOR",      tecla: "AltGraph", img: "tnt.png",           tipo: "Trampas" },
];

const TIPOS = ["Misiles", "Bombas", "Burbujas", "Trampas", "Especiales", "Otros"];
const JUGADORES = ["David", "Marco"];

const CLAVE_DATOS = "ctr-stats";        // contadores de la partida actual
const CLAVE_EVENTOS = "ctr-eventos";    // cada suma/borrado de la partida actual (con hora)
const CLAVE_PARTIDAS = "ctr-partidas";  // partidas terminadas
const CLAVE_CONFIG = "ctr-config";

function leer(clave) {
    try { return JSON.parse(localStorage.getItem(clave)); } catch { return null; }
}
function escribir(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
}

function statsVacias() {
    const s = {};
    JUGADORES.forEach(j => { s[j] = {}; PODERES.forEach(p => s[j][p.id] = 0); });
    return s;
}

// Contadores de la partida actual (validados)
function leerStats() {
    const s = statsVacias();
    const g = leer(CLAVE_DATOS);
    if (g) {
        JUGADORES.forEach(j => PODERES.forEach(p => {
            const v = g[j] && g[j][p.id];
            if (Number.isInteger(v) && v >= 0) s[j][p.id] = v;
        }));
    }
    return s;
}

function leerEventos() { return Array.isArray(leer(CLAVE_EVENTOS)) ? leer(CLAVE_EVENTOS) : []; }
function leerPartidas() { return Array.isArray(leer(CLAVE_PARTIDAS)) ? leer(CLAVE_PARTIDAS) : []; }

function totalJugador(stats, j) {
    return Object.values(stats[j]).reduce((a, b) => a + b, 0);
}

// Resume una partida a partir de sus contadores y eventos
function resumenPartida(stats, eventos) {
    const tiempos = eventos.map(e => e.t);
    return {
        inicio: tiempos.length ? Math.min(...tiempos) : Date.now(),
        fin: tiempos.length ? Math.max(...tiempos) : Date.now(),
        stats,
        borrados: {
            David: eventos.filter(e => e.j === "David" && e.d < 0).length,
            Marco: eventos.filter(e => e.j === "Marco" && e.d < 0).length,
        },
    };
}
