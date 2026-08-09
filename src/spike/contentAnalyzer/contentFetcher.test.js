/**
 * contentFetcher.test.js
 * Pruebas unitarias para el módulo contentFetcher.js (SPIKE P01).
 *
 * Cobertura de casos:
 *  1. URL inválida o malformada.
 *  2. Protocolos no permitidos (ftp, file, javascript).
 *  3. Respuesta HTML válida simulada (HTTP 200 + text/html).
 *  4. Respuesta XHTML válida simulada (HTTP 200 + application/xhtml+xml).
 *  5. Respuesta no HTML (application/json, image/png).
 *  6. Error de red simulado.
 *  7. Timeout / AbortError.
 *  8. Respuesta HTTP 404.
 *  9. Respuesta HTTP 500.
 * 10. HTTP 200 + text/html + body vacío o insustancial.
 * 11. HTTP 200 + HTML válido + contenido sustancial.
 */

const ContentFetcher = require('./contentFetcher');
const fetchPageContent = ContentFetcher.fetchPageContent;

describe('contentFetcher — SPIKE P01 Proof of Access', () => {

  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // Helper para construir respuestas de fetch mockeadas
  function mockFetchResponse({ status = 200, ok = true, contentType = 'text/html; charset=utf-8', text = '<html><body><h1>Test Content Document Page for OptiSearch Spike P01</h1></body></html>' }) {
    global.fetch = jest.fn().mockResolvedValue({
      ok,
      status,
      headers: {
        get: (header) => (header.toLowerCase() === 'content-type' ? contentType : null)
      },
      text: () => Promise.resolve(text)
    });
  }

  // 1. URL inválida
  test('Caso 1 — Rechaza URL vacía o no válida', async () => {
    const res = await fetchPageContent('');
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/inválida o vacía/i);
    expect(res.html).toBeNull();
    expect(res.hasHtmlContent).toBe(false);
  });

  // 2. Protocolo no permitido
  test('Caso 2 — Rechaza protocolos no HTTP/HTTPS (ftp, file, javascript)', async () => {
    const ftpRes = await fetchPageContent('ftp://example.com/file.txt');
    expect(ftpRes.ok).toBe(false);
    expect(ftpRes.error).toMatch(/Protocolo no permitido: ftp:/i);

    const fileRes = await fetchPageContent('file:///C:/test.html');
    expect(fileRes.ok).toBe(false);
    expect(fileRes.error).toMatch(/Protocolo no permitido: file:/i);

    const jsRes = await fetchPageContent('javascript:alert(1)');
    expect(jsRes.ok).toBe(false);
    expect(jsRes.error).toMatch(/Protocolo no permitido: javascript:/i);
  });

  // 3. Respuesta HTML válida
  test('Caso 3 — Respuesta HTML válida simulada (HTTP 200 + text/html)', async () => {
    const sampleHtml = '<html><head><title>Receta de Pollo</title></head><body><h1>Pollo al Curry con Arroz</h1><p>Ingredientes necesarios...</p></body></html>';
    mockFetchResponse({
      status: 200,
      ok: true,
      contentType: 'text/html; charset=utf-8',
      text: sampleHtml
    });

    const res = await fetchPageContent('https://recetas.example.com/pollo-curry');
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.contentType).toContain('text/html');
    expect(res.html).toBe(sampleHtml);
    expect(res.sizeBytes).toBeGreaterThan(50);
    expect(res.hasHtmlContent).toBe(true);
    expect(res.error).toBeNull();
    expect(res.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  // 4. Respuesta XHTML válida
  test('Caso 4 — Respuesta XHTML válida simulada (HTTP 200 + application/xhtml+xml)', async () => {
    const sampleXhtml = '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>XHTML Page Test Document</title></head><body><p>Contenido XHTML de prueba.</p></body></html>';
    mockFetchResponse({
      status: 200,
      ok: true,
      contentType: 'application/xhtml+xml',
      text: sampleXhtml
    });

    const res = await fetchPageContent('https://example.com/page.xhtml');
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.contentType).toBe('application/xhtml+xml');
    expect(res.hasHtmlContent).toBe(true);
    expect(res.error).toBeNull();
  });

  // 5. Respuesta no HTML
  test('Caso 5 — Rechaza respuestas que no son HTML (application/json, image/png)', async () => {
    mockFetchResponse({
      status: 200,
      ok: true,
      contentType: 'application/json',
      text: '{"result": "data"}'
    });

    const res = await fetchPageContent('https://api.example.com/data.json');
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Contenido no HTML/i);
    expect(res.html).toBeNull();
    expect(res.hasHtmlContent).toBe(false);
  });

  // 6. Error de red simulado
  test('Caso 6 — Maneja error de red simulado sin lanzar excepción', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Failed to fetch'));

    const res = await fetchPageContent('https://offline.example.com');
    expect(res.ok).toBe(false);
    expect(res.status).toBeNull();
    expect(res.error).toBe('Failed to fetch');
    expect(res.html).toBeNull();
    expect(res.hasHtmlContent).toBe(false);
  });

  // 7. Timeout / AbortError
  test('Caso 7 — Maneja timeout / AbortError', async () => {
    const abortErr = new Error('The user aborted a request.');
    abortErr.name = 'AbortError';
    global.fetch = jest.fn().mockRejectedValue(abortErr);

    const res = await fetchPageContent('https://slow.example.com', { timeoutMs: 100 });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Timeout alcanzado \(100ms\)/i);
    expect(res.html).toBeNull();
    expect(res.hasHtmlContent).toBe(false);
  });

  // 8. Respuesta HTTP 404
  test('Caso 8 — Maneja error HTTP 404', async () => {
    mockFetchResponse({
      status: 404,
      ok: false,
      contentType: 'text/html',
      text: '<html><body>404 Not Found</body></html>'
    });

    const res = await fetchPageContent('https://example.com/not-found');
    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
    expect(res.error).toBe('Error HTTP 404');
    expect(res.html).toBeNull();
    expect(res.hasHtmlContent).toBe(false);
  });

  // 9. Respuesta HTTP 500
  test('Caso 9 — Maneja error HTTP 500', async () => {
    mockFetchResponse({
      status: 500,
      ok: false,
      contentType: 'text/html',
      text: '<html><body>500 Internal Error</body></html>'
    });

    const res = await fetchPageContent('https://example.com/server-error');
    expect(res.ok).toBe(false);
    expect(res.status).toBe(500);
    expect(res.error).toBe('Error HTTP 500');
    expect(res.html).toBeNull();
    expect(res.hasHtmlContent).toBe(false);
  });

  // 10. HTTP 200 + text/html + body vacío / insustancial
  test('Caso 10 — HTTP 200 + text/html + body vacío o insustancial (< 50 chars) resulta en ok: false, hasHtmlContent: false', async () => {
    mockFetchResponse({
      status: 200,
      ok: true,
      contentType: 'text/html',
      text: '<html></html>'
    });

    const res = await fetchPageContent('https://example.com/empty-page');
    expect(res.ok).toBe(false);
    expect(res.status).toBe(200);
    expect(res.hasHtmlContent).toBe(false);
    expect(res.error).toMatch(/Contenido HTML vacío o no sustancial/i);
  });

  // 11. HTTP 200 + HTML válido + size > 0
  test('Caso 11 — HTTP 200 + HTML válido y sustancial resulta en ok: true, hasHtmlContent: true', async () => {
    const validBody = '<!DOCTYPE html><html><head><title>Página Sustancial</title></head><body><main>Contenido relevante de la página de prueba.</main></body></html>';
    mockFetchResponse({
      status: 200,
      ok: true,
      contentType: 'text/html; charset=utf-8',
      text: validBody
    });

    const res = await fetchPageContent('https://example.com/valid-page');
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.hasHtmlContent).toBe(true);
    expect(res.sizeBytes).toBeGreaterThan(50);
    expect(res.error).toBeNull();
  });

});
