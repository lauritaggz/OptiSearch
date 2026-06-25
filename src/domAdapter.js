/**
 * domAdapter.js
 * Responsabilidad: extraer resultados orgánicos del DOM de Google Search.
 *
 * CONTEXTO DEL RIESGO RT-001
 * ─────────────────────────────────────────────────────────────────────
 * Google no expone una API pública para sus resultados de búsqueda.
 * La única opción técnicamente viable para una extensión de navegador es
 * leer el DOM renderizado. El problema es que Google actualiza frecuentemente
 * sus clases CSS, nombres de atributos y estructura de contenedores sin
 * previo aviso. Depender de un único selector como `div.g` convierte
 * cualquier actualización de Google en un punto de falla total.
 *
 * ESTRATEGIA DE MITIGACIÓN (por qué este módulo es el núcleo del prototipo)
 * ─────────────────────────────────────────────────────────────────────
 * En lugar de depender de clases CSS frágiles como `.g`, `.MjjYud`, `#rso`,
 * este módulo aplica una estrategia estructural basada en elementos semánticos
 * que son históricamente más estables:
 *
 *   - El elemento <h3> como señal de título de resultado orgánico.
 *   - El enlace <a href> que envuelve el <h3> como fuente de la URL.
 *   - El contenedor ascendente como proveedor del snippet (descripción).
 *
 * Esta estrategia tolera mejor los cambios de Google porque no depende de
 * nomenclaturas internas de la interfaz, sino de la semántica del HTML.
 *
 * ESTRUCTURA DE ESTRATEGIAS
 * ─────────────────────────────────────────────────────────────────────
 * 1. extractByStructuralStrategy() — estrategia principal (h3 + enlaces)
 * 2. extractByFallbackSelectors()  — intenta selectores CSS conocidos
 * 3. waitForResultsWithObserver()  — espera carga dinámica con MutationObserver
 * 4. deduplicateResults()          — elimina duplicados por URL
 */

const DOMAdapter = (() => {

  /**
   * Estadísticas de la última extracción ejecutada.
   * Se actualizan en cada llamada a extractSearchResults().
   * Permiten que content.js muestre métricas en el panel de evidencia
   * sin que ningún otro módulo deba conocer los detalles internos del adapter.
   */
  let _lastStats = {
    estrategia:          'ninguna',
    candidatos:          0,
    deduplicados:        0,
    duplicadosIgnorados: 0
  };

  /**
   * Lista de patrones de hostname que identifican recursos internos de Google.
   * Un resultado cuyo enlace apunte a cualquiera de estos dominios se descarta.
   */
  const GOOGLE_INTERNAL_HOSTS = [
    'google.com',
    'google.cl',
    'google.co',
    'google.es',
    'google.com.ar',
    'googleusercontent.com',
    'googleapis.com',
    'gstatic.com',
    'accounts.google',
    'support.google',
    'policies.google',
    'maps.google'
  ];

  /**
   * Selectores secundarios conocidos de Google Search.
   * Se usan SOLO como fallback, nunca como estrategia principal.
   * Pueden dejar de funcionar en cualquier actualización de Google.
   */
  const FALLBACK_SELECTORS = [
    'div.g',
    '#rso > div',
    '.MjjYud',
    '[data-sokoban-container]',
    '.tF2Cxc'
  ];

  /**
   * Número máximo de resultados a procesar.
   * Limita el impacto en rendimiento de la página.
   */
  const MAX_RESULTS = 15;

  // ──────────────────────────────────────────────────────────────────
  // Funciones de validación
  // ──────────────────────────────────────────────────────────────────

  /**
   * Determina si un href es un enlace externo válido (no Google, no vacío,
   * no javascript:, no anchor).
   *
   * Esta función es la puerta de entrada de la estrategia de validación.
   * Un resultado solo se incluye si su enlace pasa esta verificación.
   *
   * @param {string} href
   * @returns {boolean}
   */
  function isValidResultLink(href) {
    if (!href || typeof href !== 'string') return false;
    if (href.startsWith('#')) return false;
    if (href.startsWith('javascript:')) return false;

    try {
      const url = new URL(href, 'https://www.google.com');

      if (!['http:', 'https:'].includes(url.protocol)) return false;

      // Descarta cualquier dominio de Google (interno)
      if (GOOGLE_INTERNAL_HOSTS.some(h => url.hostname.includes(h))) return false;

      return true;
    } catch {
      // URL malformada
      return false;
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Funciones de extracción de texto
  // ──────────────────────────────────────────────────────────────────

  /**
   * Devuelve el texto visible de un elemento, o cadena vacía si no existe.
   * @param {Element|null} el
   * @returns {string}
   */
  function safeText(el) {
    if (!el) return '';
    return (el.innerText || el.textContent || '').trim();
  }

  /**
   * Encuentra el snippet (descripción) de un resultado.
   * Intenta primero selectores CSS conocidos de Google. Si ninguno funciona,
   * busca el bloque de texto más largo dentro del contenedor.
   *
   * @param {Element} contenedor - Contenedor raíz del resultado
   * @param {string} tituloTexto - Para excluirlo de la búsqueda de snippet
   * @returns {string}
   */
  function extractSnippet(contenedor, tituloTexto) {
    if (!contenedor) return '';

    // Selectores conocidos (frágiles, pueden cambiar — usados como pista, no como única opción)
    const SNIPPET_SELECTORS = ['[data-sncf]', '.VwiC3b', '.lEBKkf', '[data-snf]', '.IsZvec'];
    for (const sel of SNIPPET_SELECTORS) {
      try {
        const el = contenedor.querySelector(sel);
        if (el) {
          const texto = safeText(el);
          if (texto.length > 10) return texto.substring(0, 250);
        }
      } catch { /* selector inválido en esta versión del DOM */ }
    }

    // Fallback estructural: busca el bloque de texto más largo que no sea el título
    const candidatos = contenedor.querySelectorAll('span, div');
    let mejorTexto = '';
    for (const el of candidatos) {
      // Solo considera nodos hoja o casi hoja (sin descendencia profunda)
      if (el.children.length > 3) continue;
      const texto = safeText(el);
      if (
        texto.length > 40 &&
        texto.length > mejorTexto.length &&
        !tituloTexto.startsWith(texto.substring(0, 15))
      ) {
        mejorTexto = texto;
      }
    }

    return mejorTexto.substring(0, 250);
  }

  // ──────────────────────────────────────────────────────────────────
  // Funciones de navegación del DOM
  // ──────────────────────────────────────────────────────────────────

  /**
   * Encuentra el anchor más cercano que contiene o es ascendiente de un <h3>.
   *
   * La búsqueda usa `closest()` primero (caso más común: h3 dentro de a),
   * y luego sube manualmente si es necesario (caso alternativo).
   *
   * @param {Element} h3
   * @returns {HTMLAnchorElement|null}
   */
  function findNearestAnchor(h3) {
    // Caso 1: h3 es descendiente directo de un <a>
    const ancestor = h3.closest('a[href]');
    if (ancestor) return ancestor;

    // Caso 2: el <a> es un elemento hermano o primo cercano
    const parent = h3.parentElement;
    if (!parent) return null;

    const sibling = parent.querySelector('a[href]');
    if (sibling) return sibling;

    const grandParent = parent.parentElement;
    if (grandParent) {
      const gpAnchor = grandParent.querySelector('a[href]');
      if (gpAnchor) return gpAnchor;
    }

    return null;
  }

  /**
   * Sube por el árbol DOM desde el anchor para encontrar el contenedor raíz
   * del resultado completo (que incluye título + URL + descripción).
   *
   * Un contenedor suficientemente representativo tiene al menos 5 descendientes.
   * Se limita la búsqueda a 8 niveles para no capturar bloques demasiado grandes.
   *
   * @param {Element} anchor
   * @returns {Element}
   */
  function findNearestResultContainer(anchor) {
    let node = anchor.parentElement;
    for (let i = 0; i < 8; i++) {
      if (!node || node === document.body) break;
      if (node.querySelectorAll('*').length >= 5) return node;
      node = node.parentElement;
    }
    return anchor.parentElement || anchor;
  }

  // ──────────────────────────────────────────────────────────────────
  // Estrategia 1: Extracción estructural (PRINCIPAL)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Estrategia principal de extracción.
   *
   * Lógica:
   *   1. Obtiene todos los <h3> del DOM.
   *   2. Para cada <h3>, busca el <a href> más cercano.
   *   3. Valida que el enlace sea externo y útil.
   *   4. Encuentra el contenedor del resultado.
   *   5. Extrae título, URL y descripción.
   *
   * Esta estrategia NO depende de clases CSS de Google.
   * Depende únicamente de la semántica HTML: h3 como título, a como enlace.
   *
   * @returns {Array<{titulo, enlace, descripcion, _anchor, _estrategia}>}
   */
  function extractByStructuralStrategy() {
    const h3Elements = Array.from(document.querySelectorAll('h3'));
    Logger.debug(`Estrategia estructural: encontrados ${h3Elements.length} elementos h3`);

    const resultados = [];

    for (const h3 of h3Elements) {
      const anchor = findNearestAnchor(h3);
      if (!anchor) {
        Logger.debug(`h3 sin anchor: "${safeText(h3).substring(0, 40)}"`);
        continue;
      }

      const href = anchor.href || anchor.getAttribute('href') || '';
      if (!isValidResultLink(href)) {
        Logger.debug(`Enlace descartado: ${href.substring(0, 60)}`);
        continue;
      }

      const titulo = safeText(h3);
      if (!titulo || titulo.length < 3) continue;

      const contenedor = findNearestResultContainer(anchor);
      const descripcion = extractSnippet(contenedor, titulo);

      resultados.push({
        titulo,
        enlace: href,
        descripcion,
        _anchor: anchor,
        _estrategia: 'estructural'
      });
    }

    Logger.debug(`Estrategia estructural: ${resultados.length} candidatos antes de deduplicar`);
    return resultados;
  }

  // ──────────────────────────────────────────────────────────────────
  // Estrategia 2: Fallback por selectores CSS conocidos
  // ──────────────────────────────────────────────────────────────────

  /**
   * Estrategia de fallback.
   *
   * Se usa cuando la estrategia estructural no encuentra resultados.
   * Intenta una lista de selectores CSS conocidos de Google (frágiles).
   * Registra en consola qué selector se usó para trazabilidad académica.
   *
   * @returns {Array<{titulo, enlace, descripcion, _anchor, _estrategia}>}
   */
  function extractByFallbackSelectors() {
    Logger.warn('Estrategia estructural sin resultados. Intentando selectores de fallback.');

    for (const selector of FALLBACK_SELECTORS) {
      try {
        const contenedores = document.querySelectorAll(selector);
        if (contenedores.length === 0) {
          Logger.debug(`Selector fallback "${selector}": 0 elementos`);
          continue;
        }

        Logger.debug(`Selector fallback "${selector}": ${contenedores.length} elementos`);
        const resultados = [];

        contenedores.forEach((contenedor) => {
          const h3 = contenedor.querySelector('h3');
          if (!h3) return;

          const anchor = contenedor.querySelector('a[href]');
          if (!anchor) return;

          const href = anchor.href || anchor.getAttribute('href') || '';
          if (!isValidResultLink(href)) return;

          const titulo = safeText(h3);
          if (!titulo) return;

          resultados.push({
            titulo,
            enlace: href,
            descripcion: extractSnippet(contenedor, titulo),
            _anchor: anchor,
            _estrategia: `fallback:${selector}`
          });
        });

        if (resultados.length > 0) {
          Logger.warn(`Fallback exitoso con selector: "${selector}"`);
          return resultados;
        }
      } catch (e) {
        Logger.debug(`Selector fallback "${selector}" lanzó excepción: ${e.message}`);
      }
    }

    Logger.error('Todos los selectores de fallback fallaron. DOM de Google incompatible.');
    return [];
  }

  // ──────────────────────────────────────────────────────────────────
  // Estrategia 3: Deduplicación
  // ──────────────────────────────────────────────────────────────────

  /**
   * Elimina resultados duplicados comparando por URL normalizada.
   * Conserva siempre la primera aparición.
   *
   * @param {Array} resultados
   * @returns {Array}
   */
  function deduplicateResults(resultados) {
    const seen = new Set();
    return resultados.filter((r) => {
      const url = (r.enlace || '').split('?')[0]; // normaliza ignorando query params
      if (seen.has(url)) {
        Logger.debug(`Duplicado eliminado: ${url.substring(0, 50)}`);
        return false;
      }
      seen.add(url);
      return true;
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Función principal de extracción
  // ──────────────────────────────────────────────────────────────────

  /**
   * Punto de entrada principal para extraer resultados.
   *
   * Aplica las estrategias en cascada y registra en consola qué estrategia
   * se usó. Este log es evidencia directa de la mitigación del RT-001.
   *
   * @returns {Array<{titulo, enlace, descripcion, _anchor, _estrategia}>}
   */
  function extractSearchResults() {
    Logger.info('Iniciando extracción de resultados');

    let resultados = extractByStructuralStrategy();
    Logger.info(`Estrategia estructural: ${resultados.length} resultado(s)`);

    if (resultados.length === 0) {
      resultados = extractByFallbackSelectors();
      Logger.info(`Estrategia fallback: ${resultados.length} resultado(s)`);
    }

    if (resultados.length === 0) {
      Logger.warn('Ambas estrategias fallaron. No se encontraron resultados en esta página.');
      _lastStats = { estrategia: 'ninguna', candidatos: 0, deduplicados: 0, duplicadosIgnorados: 0 };
      return [];
    }

    const candidatosAntes  = resultados.length;
    const deduplicados     = deduplicateResults(resultados).slice(0, MAX_RESULTS);

    _lastStats = {
      estrategia:          resultados[0]._estrategia || 'desconocida',
      candidatos:          candidatosAntes,
      deduplicados:        deduplicados.length,
      duplicadosIgnorados: candidatosAntes - deduplicados.length
    };

    Logger.info(`Total final: ${deduplicados.length} resultado(s) únicos procesados`);
    return deduplicados;
  }

  // ──────────────────────────────────────────────────────────────────
  // Estrategia 4: Observación dinámica (MutationObserver)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Espera a que el DOM contenga resultados usando MutationObserver.
   *
   * Google Search carga muchos componentes de forma asíncrona (React/JS).
   * En algunos casos, cuando el content script se ejecuta, los resultados
   * todavía no están en el DOM. Este observer detecta cambios y reintenta.
   *
   * Garantías:
   *   - El callback se llama exactamente UNA vez.
   *   - El observer se desconecta después de procesar o al agotar el timeout.
   *   - Si el timeout se agota sin resultados, llama al callback con [].
   *
   * @param {function} callback - Recibe el array de resultados (puede ser vacío)
   * @param {number} timeoutMs  - Tiempo máximo de espera en milisegundos
   */
  function waitForResultsWithObserver(callback, timeoutMs) {
    const MAX_WAIT = typeof timeoutMs === 'number' ? timeoutMs : 4000;
    let processed = false;
    let timer;
    let observer;

    function tryProcess() {
      if (processed) return;
      const resultados = extractSearchResults();
      if (resultados.length > 0) {
        processed = true;
        if (observer) observer.disconnect();
        clearTimeout(timer); // clearTimeout(undefined) es seguro y no lanza error
        Logger.info(`Observer: resultados encontrados (${resultados.length}), procesando`);
        callback(resultados);
      }
    }

    // Intentar de inmediato antes de esperar al observer
    tryProcess();
    if (processed) return;

    // Observa cambios en el árbol del DOM para resultados de carga dinámica
    observer = new MutationObserver(() => {
      tryProcess();
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    timer = setTimeout(() => {
      observer.disconnect();
      if (!processed) {
        processed = true;
        Logger.warn(`Observer: timeout de ${MAX_WAIT}ms alcanzado sin resultados`);
        callback([]);
      }
    }, MAX_WAIT);
  }

  // ──────────────────────────────────────────────────────────────────
  // API pública del módulo
  // ──────────────────────────────────────────────────────────────────

  return {
    extractSearchResults,
    extractByStructuralStrategy,
    extractByFallbackSelectors,
    findNearestResultContainer,
    isValidResultLink,
    deduplicateResults,
    waitForResultsWithObserver,
    /** Devuelve una copia de las estadísticas de la última extracción. */
    getLastStats: () => ({ ..._lastStats })
  };

})();
