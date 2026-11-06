/**
 * Conector a Google Apps Script: lee cupos (GET + polling) y envía inscripciones (POST).
 * Base: GameOver, js/main.js → initializeSlotsPolling, cargarCupos, actualizarDOM,
 * submit de .embedded-reg-form, sanitizeQuantity, calcularSubtotal, formatearPrecio.
 */

// URL de la aplicación web de Apps Script ("Implementar → Aplicación web", termina en /exec).
// Vacía = usa el servidor simulado de mock-servidor.js (no se envía nada a ningún lado).
const API_URL = "";
const TIEMPO_REFRESCO = 40000; // 40 s

// Precios congelados en JS: el subtotal nunca se lee del DOM (se podría editar).
const BASE_PRICES = Object.freeze({ lol: 10000, valorant: 0 });
const MAX_POR_INSCRIPCION = Object.freeze({ lol: 2, valorant: 5 });

// Transporte: fetch real contra Apps Script, o el simulado con el mismo contrato.
const request = (url, options) => (API_URL ? fetch(url, options) : window.MockAppsScript.fetch(url, options));

/* =====================================================================
   LECTURA DE CUPOS (GET + POLLING)
   ===================================================================== */
function initializeSlotsPolling() {
  if (!document.querySelector(".tourney-slots")) return;
  cargarCupos();
  setInterval(() => { if (!document.hidden) cargarCupos(true); }, TIEMPO_REFRESCO);
  // Al volver a la pestaña, refrescar enseguida (el intervalo se salteó mientras estaba oculta).
  document.addEventListener("visibilitychange", () => { if (!document.hidden) cargarCupos(true); });
}

async function cargarCupos(silencioso = false) {
  setPollStatus("Consultando…");
  try {
    // ?t= evita que el navegador o Google devuelvan una respuesta cacheada.
    const response = await request(API_URL + "?t=" + Date.now());
    if (!response.ok) throw new Error("Error en la red: " + response.status);
    const data = await response.json();
    if (!silencioso) console.log("[cupos] recibidos:", data);
    actualizarDOM(data);
    setPollStatus("Actualizado " + new Date().toLocaleTimeString("es-AR") + " · próximo en 40 s");
  } catch (error) {
    console.error("[cupos] falló la carga:", error);
    setPollStatus("No se pudieron cargar los cupos");
  }
}

/** Escribe cada contador solo si su texto cambió (sin repintar de más). */
function actualizarDOM(dataCupos) {
  for (const [juego, datos] of Object.entries(dataCupos)) {
    const elemento = document.getElementById("slots-" + juego);
    if (!elemento) continue;
    const agotado = datos.restantes <= 0;
    const textoNuevo = agotado ? "🚫 CUPOS AGOTADOS" : `👥 ${datos.restantes} plazas disponibles`;
    if (elemento.textContent !== textoNuevo) {
      elemento.textContent = textoNuevo;
      elemento.classList.toggle("is-full", agotado);
    }
  }
}

function setPollStatus(text) {
  const el = document.getElementById("poll-status");
  if (el) el.textContent = text;
}

/* =====================================================================
   PRECIOS Y CANTIDADES (estado fuera del DOM)
   ===================================================================== */
function sanitizeQuantity(val, min = 1, max = 5) {
  const num = parseInt(val, 10);
  if (isNaN(num) || num < min) return min;
  return Math.min(num, max);
}
function calcularSubtotal(gameId, cantidad) {
  return (BASE_PRICES[gameId] ?? 0) * sanitizeQuantity(cantidad, 1, MAX_POR_INSCRIPCION[gameId] ?? 5);
}
function formatearPrecio(monto) {
  return monto === 0 ? "Gratis" : `$${monto.toLocaleString("es-AR")} ARS`;
}
function handleQuantityChange(input) {
  const form = input.closest(".embedded-reg-form");
  const gameId = form?.dataset.game;
  const strong = form?.querySelector(".subtotal-box strong");
  if (gameId && strong) strong.textContent = formatearPrecio(calcularSubtotal(gameId, input.value));
}

/* =====================================================================
   ENVÍO DE INSCRIPCIÓN (POST)
   ===================================================================== */
document.addEventListener("submit", async (e) => {
  const form = e.target.closest(".embedded-reg-form");
  if (!form) return;
  e.preventDefault();

  const button = form.querySelector('button[type="submit"]');
  const originalHtml = button.innerHTML;
  button.disabled = true;
  button.innerHTML = "Enviando...";
  removeFormAlert(form);

  try {
    const gameId = form.dataset.game;
    if (!gameId) throw new Error("Falta el identificador del torneo (data-game).");
    const formData = new FormData(form);
    const payload = {
      game: gameId,
      nombre: (formData.get("nombre") || "").trim(),
      nombreDuo: (formData.get("nombreDuo") || "").trim(),
      email: (formData.get("email") || "").trim(),
      celular: (formData.get("celular") || "").trim(),
      cantidad: sanitizeQuantity(formData.get("cantidad"), 1, MAX_POR_INSCRIPCION[gameId] ?? 5),
    };

    // text/plain = "simple request": sin preflight OPTIONS (Apps Script no lo responde).
    // redirect: follow = Apps Script contesta con un 302 a script.googleusercontent.com.
    const response = await request(API_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Error en la red: ${response.status}`);
    const data = await response.json();
    if (data.status !== "success") throw new Error(data.message || "Error desconocido en el servidor");

    showFormAlert(form, "success", "¡Inscripción enviada! Te contactamos por email.");
    if (data.nuevos_cupos) actualizarDOM(data.nuevos_cupos); // sin esperar al polling

    // 5 s de feedback, después se limpia.
    setTimeout(() => {
      removeFormAlert(form);
      form.reset();
      handleQuantityChange(form.querySelector('input[name="cantidad"]'));
      button.disabled = false;
      button.innerHTML = originalHtml;
    }, 5000);
  } catch (error) {
    console.error("[inscripción] falló:", error);
    showFormAlert(form, "error", "Hubo un error: " + error.message);
    setTimeout(() => {
      removeFormAlert(form);
      button.disabled = false;
      button.innerHTML = originalHtml;
    }, 5000);
  }
});

function showFormAlert(form, type, message) {
  removeFormAlert(form);
  const alert = document.createElement("div");
  alert.className = `form-alert alert-${type}`;
  alert.setAttribute("role", "alert");
  alert.textContent = message;
  form.append(alert);
}
function removeFormAlert(form) {
  form.querySelector(".form-alert")?.remove();
}

/* =====================================================================
   DEMO: cambio de torneo, refresco manual y cantidad en vivo
   ===================================================================== */
document.addEventListener("input", (e) => {
  const qty = e.target.closest('.embedded-reg-form input[name="cantidad"]');
  if (qty) handleQuantityChange(qty);
});
document.addEventListener("click", (e) => {
  if (e.target.closest('[data-action="refresh-slots"]')) return cargarCupos();
  const sw = e.target.closest("[data-switch-game]");
  if (!sw) return;
  const game = sw.dataset.switchGame;
  document.querySelectorAll("[data-switch-game]").forEach((b) => {
    b.classList.toggle("is-active", b === sw);
    b.setAttribute("aria-pressed", String(b === sw));
  });
  const form = document.querySelector(".embedded-reg-form");
  form.dataset.game = game;
  const qty = form.querySelector('input[name="cantidad"]');
  qty.max = String(MAX_POR_INSCRIPCION[game]);
  qty.value = String(Math.min(Number(qty.value) || 1, MAX_POR_INSCRIPCION[game]));
  handleQuantityChange(qty);
});

document.addEventListener("DOMContentLoaded", () => {
  const mode = document.getElementById("api-mode");
  if (mode && API_URL) {
    mode.textContent = "Conectado a Apps Script";
    mode.classList.add("is-live");
  }
  initializeSlotsPolling();
});
