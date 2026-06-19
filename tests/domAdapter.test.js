/**
 * domAdapter.test.js
 * Pruebas unitarias para el módulo DOMAdapter usando DOM simulado (jsdom).
 *
 * Ejecutar:
 *   npm test                         (todos los tests)
 *   npm run test:dom                 (solo este archivo)
 *
 * Requiere Jest con entorno jsdom (configurado en package.json).
 * NO hace peticiones a Google real. Usa HTML construido en memoria.
 */

const fs = require('fs');
const path = require('path');

// ────────────────────────────────────────────────────────────────────
// Bootstrap: Mock del Logger y carga de DOMAdapter
// ────────────────────────────────────────────────────────────────────

// El DOMAdapter depende de Logger. Definimos un mock silencioso.
globalThis.Logger = {
  info:  () => {},
  warn:  () => {},
  error: () => {},
  debug: () => {}
};

const domAdapterSrc = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'domAdapter.js'),
  'utf8'
);

new Function(domAdapterSrc + '\nglobalThis.DOMAdapter = DOMAdapter;')();
const DOMAdapter = globalThis.DOMAdapter;

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

function setHTML(html) {
  document.body.innerHTML = html;
}

// ────────────────────────────────────────────────────────────────────
// Tests: isValidResultLink
// ────────────────────────────────────────────────────────────────────

describe('DOMAdapter.isValidResultLink', () => {

  test('Acepta URL externa válida con https', () => {
    expect(DOMAdapter.isValidResultLink('https://ejemplo.com/pagina')).toBe(true);
  });

  test('Acepta URL externa con http', () => {
    expect(DOMAdapter.isValidResultLink('http://sitio.org/nota')).toBe(true);
  });

  test('Rechaza enlace interno de Google (google.com/search)', () => {
    expect(DOMAdapter.isValidResultLink('https://www.google.com/search?q=algo')).toBe(false);
  });

  test('Rechaza enlace interno de Google (google.cl)', () => {
    expect(DOMAdapter.isValidResultLink('https://www.google.cl/search?q=test')).toBe(false);
  });

  test('Rechaza anchor vacío (#)', () => {
    expect(DOMAdapter.isValidResultLink('#')).toBe(false);
  });

  test('Rechaza javascript: URI', () => {
    expect(DOMAdapter.isValidResultLink('javascript:void(0)')).toBe(false);
  });

  test('Rechaza cadena vacía', () => {
    expect(DOMAdapter.isValidResultLink('')).toBe(false);
  });

  test('Rechaza null sin lanzar excepción', () => {
    expect(DOMAdapter.isValidResultLink(null)).toBe(false);
  });

});

// ────────────────────────────────────────────────────────────────────
// Tests: extractByStructuralStrategy
// ────────────────────────────────────────────────────────────────────

describe('DOMAdapter.extractByStructuralStrategy', () => {

  beforeEach(() => setHTML(''));

  test('Extrae un resultado con h3 directo dentro de un anchor', () => {
    setHTML(`
      <div>
        <a href="https://recetas.cl/pollo">
          <h3>Receta de pollo al horno</h3>
        </a>
        <span>Una receta deliciosa con ingredientes simples.</span>
      </div>
    `);

    const resultados = DOMAdapter.extractByStructuralStrategy();
    expect(resultados.length).toBeGreaterThan(0);
    expect(resultados[0].titulo).toBe('Receta de pollo al horno');
    expect(resultados[0].enlace).toContain('recetas.cl');
    expect(resultados[0]._estrategia).toBe('estructural');
  });

  test('Extrae múltiples resultados independientes', () => {
    setHTML(`
      <div>
        <a href="https://sitio1.com/pagina"><h3>Resultado uno</h3></a>
      </div>
      <div>
        <a href="https://sitio2.com/pagina"><h3>Resultado dos</h3></a>
      </div>
    `);

    const resultados = DOMAdapter.extractByStructuralStrategy();
    expect(resultados.length).toBe(2);
  });

  test('Ignora enlaces internos de Google', () => {
    setHTML(`
      <div>
        <a href="https://www.google.com/search?q=pollo">
          <h3>Buscar más sobre pollo en Google</h3>
        </a>
      </div>
    `);

    const resultados = DOMAdapter.extractByStructuralStrategy();
    expect(resultados.length).toBe(0);
  });

  test('Devuelve lista vacía si no hay h3 con enlaces válidos', () => {
    setHTML('<div><p>Texto sin resultados</p><span>Sin h3 ni enlaces</span></div>');
    const resultados = DOMAdapter.extractByStructuralStrategy();
    expect(resultados.length).toBe(0);
  });

  test('Cada resultado tiene las propiedades requeridas', () => {
    setHTML(`
      <a href="https://ejemplo.com/articulo">
        <h3>Título del artículo</h3>
      </a>
    `);

    const resultados = DOMAdapter.extractByStructuralStrategy();
    expect(resultados.length).toBeGreaterThan(0);
    expect(resultados[0]).toHaveProperty('titulo');
    expect(resultados[0]).toHaveProperty('enlace');
    expect(resultados[0]).toHaveProperty('descripcion');
    expect(resultados[0]).toHaveProperty('_anchor');
    expect(resultados[0]).toHaveProperty('_estrategia');
  });

});

// ────────────────────────────────────────────────────────────────────
// Tests: deduplicateResults
// ────────────────────────────────────────────────────────────────────

describe('DOMAdapter.deduplicateResults', () => {

  test('Elimina resultados con la misma URL (exacta)', () => {
    const resultados = [
      { titulo: 'A', enlace: 'https://ejemplo.com/pagina', descripcion: '' },
      { titulo: 'B', enlace: 'https://ejemplo.com/pagina', descripcion: '' },
      { titulo: 'C', enlace: 'https://otro.com/pagina',    descripcion: '' }
    ];

    const dedup = DOMAdapter.deduplicateResults(resultados);
    expect(dedup).toHaveLength(2);
    expect(dedup[0].titulo).toBe('A'); // conserva la primera aparición
    expect(dedup[1].titulo).toBe('C');
  });

  test('Elimina duplicados con diferente query string (normaliza por pathname)', () => {
    const resultados = [
      { titulo: 'X', enlace: 'https://ejemplo.com/pagina?ref=1', descripcion: '' },
      { titulo: 'Y', enlace: 'https://ejemplo.com/pagina?ref=2', descripcion: '' }
    ];

    const dedup = DOMAdapter.deduplicateResults(resultados);
    expect(dedup).toHaveLength(1);
  });

  test('Devuelve lista vacía para entrada vacía', () => {
    expect(DOMAdapter.deduplicateResults([])).toEqual([]);
  });

  test('Conserva todos los resultados si no hay duplicados', () => {
    const resultados = [
      { titulo: 'A', enlace: 'https://uno.com', descripcion: '' },
      { titulo: 'B', enlace: 'https://dos.com', descripcion: '' },
      { titulo: 'C', enlace: 'https://tres.com', descripcion: '' }
    ];

    expect(DOMAdapter.deduplicateResults(resultados)).toHaveLength(3);
  });

});

// ────────────────────────────────────────────────────────────────────
// Tests: extractSearchResults (integración)
// ────────────────────────────────────────────────────────────────────

describe('DOMAdapter.extractSearchResults — Integración', () => {

  beforeEach(() => setHTML(''));

  test('Retorna resultados únicos y bien formados', () => {
    setHTML(`
      <div>
        <a href="https://gourmet.cl/pollo">
          <h3>Receta de pollo fácil</h3>
        </a>
        <span>Ingredientes y preparación paso a paso.</span>
      </div>
      <div>
        <a href="https://tecnologia.cl/notebook">
          <h3>Notebook HP 2025</h3>
        </a>
        <span>Análisis de precio y rendimiento.</span>
      </div>
    `);

    const resultados = DOMAdapter.extractSearchResults();
    expect(resultados.length).toBeGreaterThanOrEqual(1);

    const urls = resultados.map(r => r.enlace);
    const uniqueUrls = new Set(urls.map(u => u.split('?')[0]));
    expect(urls.length).toBe(uniqueUrls.size); // sin duplicados
  });

  test('Devuelve [] cuando no hay resultados válidos en el DOM', () => {
    setHTML('<div><p>Texto plano sin resultados.</p></div>');
    const resultados = DOMAdapter.extractSearchResults();
    expect(resultados).toEqual([]);
  });

});

// ────────────────────────────────────────────────────────────────────
// Tests: waitForResultsWithObserver
// ────────────────────────────────────────────────────────────────────

describe('DOMAdapter.waitForResultsWithObserver', () => {

  test('Llama al callback inmediatamente si hay resultados en el DOM', (done) => {
    setHTML(`
      <div>
        <a href="https://ejemplo.com/resultado">
          <h3>Resultado disponible de inmediato</h3>
        </a>
      </div>
    `);

    DOMAdapter.waitForResultsWithObserver((resultados) => {
      expect(resultados.length).toBeGreaterThan(0);
      done();
    }, 2000);
  });

  test('Llama al callback con [] si el timeout expira sin resultados', (done) => {
    setHTML('<div><p>Sin resultados válidos</p></div>');

    DOMAdapter.waitForResultsWithObserver((resultados) => {
      expect(resultados).toEqual([]);
      done();
    }, 150); // timeout muy corto para que el test sea rápido
  }, 5000);

});
