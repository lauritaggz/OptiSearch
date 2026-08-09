/**
 * src/spike/contentAnalyzer/contentFetcher.js
 * Módulo experimental aislado para SPIKE P01 — Proof of Access.
 *
 * Responsabilidad: Intentar recuperar y medir de forma controlada el contenido
 * HTML de una URL externa de forma segura y aislada.
 */

const ContentFetcher = (() => {
  /**
   * Recupera y evalúa el contenido de una URL dada.
   *
   * @param {string} url - URL externa a consultar.
   * @param {Object} [options] - Opciones de configuración.
   * @param {number} [options.timeoutMs=5000] - Tiempo máximo de espera en ms.
   * @returns {Promise<{
   *   ok: boolean,
   *   url: string,
   *   status: number|null,
   *   contentType: string|null,
   *   html: string|null,
   *   sizeBytes: number,
   *   elapsedMs: number,
   *   hasHtmlContent: boolean,
   *   error: string|null
   * }>}
   */
  async function fetchPageContent(url, options = {}) {
    const startTime = performance.now();
    const timeoutMs = typeof options?.timeoutMs === 'number' ? options.timeoutMs : 5000;

    const buildResult = (ok, status, contentType, html, sizeBytes, hasHtmlContent, error) => ({
      ok,
      url: typeof url === 'string' ? url : String(url || ''),
      status: status ?? null,
      contentType: contentType ?? null,
      html: html ?? null,
      sizeBytes: sizeBytes ?? 0,
      elapsedMs: Math.round(performance.now() - startTime),
      hasHtmlContent: Boolean(hasHtmlContent),
      error: error ?? null
    });

    // 1. Validación de URL y protocolo
    let parsedUrl;
    try {
      if (typeof url !== 'string' || !url.trim()) {
        return buildResult(false, null, null, null, 0, false, 'URL inválida o vacía');
      }
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return buildResult(false, null, null, null, 0, false, `Protocolo no permitido: ${parsedUrl.protocol}`);
      }
    } catch (err) {
      return buildResult(false, null, null, null, 0, false, `URL malformada: ${err.message}`);
    }

    // 2. Configuración de AbortController para timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(parsedUrl.href, {
        signal: controller.signal,
        redirect: 'follow'
      });
      clearTimeout(timer);

      const status = response.status;
      const contentType = response.headers.get('content-type') || '';

      // 3. Verificar status HTTP
      if (!response.ok) {
        return buildResult(
          false,
          status,
          contentType,
          null,
          0,
          false,
          `Error HTTP ${status}`
        );
      }

      // 4. Verificar que Content-Type sea HTML
      const isHtml = /text\/html|application\/xhtml\+xml/i.test(contentType);
      if (!isHtml) {
        return buildResult(
          false,
          status,
          contentType,
          null,
          0,
          false,
          `Contenido no HTML (Content-Type: ${contentType})`
        );
      }

      // 5. Leer contenido HTML como texto
      const htmlText = await response.text();
      const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
      const sizeBytes = encoder ? encoder.encode(htmlText).length : Buffer.byteLength(htmlText, 'utf8');

      // 6. Verificar contenido sustancial (hasHtmlContent)
      const trimmed = htmlText.trim();
      const hasHtmlContent = trimmed.length >= 50;

      if (!hasHtmlContent) {
        return buildResult(
          false,
          status,
          contentType,
          null,
          sizeBytes,
          false,
          'Contenido HTML vacío o no sustancial'
        );
      }

      return buildResult(
        true,
        status,
        contentType,
        htmlText,
        sizeBytes,
        true,
        null
      );

    } catch (err) {
      clearTimeout(timer);
      let errorMsg = err.message || String(err);
      if (err.name === 'AbortError') {
        errorMsg = `Timeout alcanzado (${timeoutMs}ms)`;
      }
      return buildResult(
        false,
        null,
        null,
        null,
        0,
        false,
        errorMsg
      );
    }
  }

  return { fetchPageContent };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentFetcher;
}
if (typeof globalThis !== 'undefined') {
  globalThis.ContentFetcher = ContentFetcher;
}
if (typeof self !== 'undefined') {
  self.ContentFetcher = ContentFetcher;
}
