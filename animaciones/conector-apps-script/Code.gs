/**
 * PLANTILLA del lado servidor (Google Apps Script) para el conector de esta carpeta.
 *
 * OJO: es una reconstrucción a partir del contrato que usa el JS de GameOver.
 * El .gs real de GameOver no está en su repositorio; revisalo antes de copiar
 * esto encima de un proyecto que ya funciona.
 *
 * Contrato:
 *   GET  → { lol: { restantes: n }, valorant: { restantes: n }, ... }
 *   POST → body (text/plain) con JSON { game, nombre, nombreDuo, email, celular, cantidad }
 *          ← { status: "success", nuevos_cupos } | { status: "error", message }
 *
 * Puesta en marcha:
 *   1. Planilla de Google → Extensiones → Apps Script → pegar este archivo.
 *   2. Crear una hoja llamada "Inscripciones" (la primera fila, encabezados).
 *   3. Implementar → Nueva implementación → Aplicación web.
 *      Ejecutar como: yo. Quién tiene acceso: cualquier persona.
 *   4. Copiar la URL /exec en API_URL de script.js.
 *   Cada cambio en el .gs necesita una NUEVA versión de la implementación.
 */

const SHEET_NAME = "Inscripciones";
const CUPOS_MAX = { lol: 16, valorant: 16 };       // inscripciones por torneo
const PRECIOS = { lol: 10000, valorant: 0 };        // por jugador
const MAX_JUGADORES = { lol: 2, valorant: 5 };

function doGet() {
  return json_(cuposRestantes_());
}

function doPost(e) {
  // El lock evita que dos inscripciones simultáneas se lleven el último cupo.
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    const game = String(data.game || "");
    if (!(game in CUPOS_MAX)) return json_({ status: "error", message: "Torneo inexistente" });
    if (!data.nombre || !data.email) return json_({ status: "error", message: "Faltan datos obligatorios" });

    if (cuposRestantes_()[game].restantes <= 0) return json_({ status: "error", message: "Cupos agotados" });

    // El servidor recalcula cantidad y monto: nunca confiar en lo que manda el cliente.
    const cantidad = Math.min(Math.max(parseInt(data.cantidad, 10) || 1, 1), MAX_JUGADORES[game]);
    const monto = PRECIOS[game] * cantidad;

    sheet_().appendRow([
      new Date(), game,
      clean_(data.nombre), clean_(data.nombreDuo), clean_(data.nombreJugador2),
      clean_(data.email), clean_(data.celular),
      cantidad, monto,
    ]);

    return json_({ status: "success", nuevos_cupos: cuposRestantes_() });
  } catch (err) {
    return json_({ status: "error", message: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

/** Cuenta filas por torneo (columna B) y las resta del máximo. */
function cuposRestantes_() {
  const rows = sheet_().getDataRange().getValues().slice(1); // sin encabezados
  const usados = {};
  rows.forEach((r) => { usados[r[1]] = (usados[r[1]] || 0) + 1; });
  const out = {};
  Object.keys(CUPOS_MAX).forEach((g) => { out[g] = { restantes: Math.max(0, CUPOS_MAX[g] - (usados[g] || 0)) }; });
  return out;
}

function sheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

/** Evita inyección de fórmulas en la planilla (=, +, -, @ al inicio). */
function clean_(value) {
  const s = String(value || "").trim().slice(0, 200);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
