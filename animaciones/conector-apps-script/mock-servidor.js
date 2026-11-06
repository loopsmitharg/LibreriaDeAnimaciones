/**
 * Servidor SIMULADO con el mismo contrato que el Apps Script de GameOver.
 * Solo se usa cuando API_URL (script.js) está vacío: la demo funciona offline
 * y nunca escribe en una planilla real.
 *
 * Contrato:
 *   GET  → { lol: { restantes }, valorant: { restantes }, ... }
 *   POST → body JSON (text/plain) { game, nombre, ..., cantidad }
 *          ← { status: "success", nuevos_cupos } | { status: "error", message }
 *
 * Devuelve objetos Response reales, así el conector usa exactamente el mismo
 * código (response.ok, response.json()) que contra el servidor de verdad.
 */
window.MockAppsScript = (function () {
  "use strict";
  const MAX = { lol: 16, valorant: 16 };
  const inscriptos = { lol: 13, valorant: 4 }; // estado inicial de ejemplo

  const cupos = () => Object.fromEntries(Object.keys(MAX).map((g) => [g, { restantes: Math.max(0, MAX[g] - inscriptos[g]) }]));
  const reply = (data) => new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  const latency = () => new Promise((r) => setTimeout(r, 450 + Math.random() * 500)); // como la red real

  // Otro "usuario" se inscribe de vez en cuando: así se ve cambiar el polling.
  setInterval(() => {
    const g = Math.random() < 0.5 ? "lol" : "valorant";
    if (inscriptos[g] < MAX[g] && Math.random() < 0.35) inscriptos[g] += 1;
  }, 15000);

  async function fetch(url, options = {}) {
    await latency();
    if ((options.method || "GET").toUpperCase() === "GET") return reply(cupos());

    // doPost: valida como debería validar el servidor real.
    let data;
    try { data = JSON.parse(options.body); } catch (_) { return reply({ status: "error", message: "JSON inválido" }); }
    if (!(data.game in MAX)) return reply({ status: "error", message: "Torneo inexistente" });
    if (!data.nombre || !data.email) return reply({ status: "error", message: "Faltan datos obligatorios" });
    if (inscriptos[data.game] >= MAX[data.game]) return reply({ status: "error", message: "Cupos agotados" });
    inscriptos[data.game] += 1; // una inscripción = un cupo (equipo o dúo)
    return reply({ status: "success", nuevos_cupos: cupos() });
  }

  return { fetch };
})();
