/**
 * src/spike/contentAnalyzer/backgroundFetcher.js
 * Service Worker / Background Script para SPIKE P01 — Proof of Access.
 *
 * Responsabilidad: Escuchar peticiones de fetch de páginas externas enviadas desde
 * content.js, ejecutar ContentFetcher.fetchPageContent() en el contexto privilegiado del Service Worker
 * (evitando restricciones de CORS), eliminar la propiedad `html` y responder únicamente
 * con el objeto de telemetría normalizado.
 *
 * Soporta compatibilidad cruzada entre Chrome (Service Worker) y Firefox (Background Script).
 */

if (typeof ContentFetcher === 'undefined' && typeof importScripts === 'function') {
  try {
    importScripts('./contentFetcher.js');
  } catch (e) {
    // importScripts no disponible o ya cargado previamente
  }
}

const MESSAGE_TYPE = 'OPTISEARCH_SPIKE_FETCH_PAGE';

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === MESSAGE_TYPE) {
      const url = message.url;
      const options = message.options || {};

      ContentFetcher.fetchPageContent(url, options)
        .then((fullResult) => {
          // Descartar el cuerpo HTML antes de transferir telemetría a content.js
          const { html, ...telemetry } = fullResult;
          sendResponse(telemetry);
        })
        .catch((err) => {
          sendResponse({
            ok: false,
            url: url || '',
            status: null,
            contentType: null,
            sizeBytes: 0,
            elapsedMs: 0,
            hasHtmlContent: false,
            error: err.message || String(err)
          });
        });

      // Indica respuesta asíncrona a chrome.runtime.onMessage
      return true;
    }
  });
}
