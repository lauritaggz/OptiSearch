/**
 * content.js
 * Responsabilidad: coordinar el flujo principal de OptiSearch.
 *
 * Este módulo actúa como orquestador. No contiene lógica de extracción
 * ni de clasificación; delega esas responsabilidades a DOMAdapter y Categorizer.
 *
 * Flujo de ejecución:
 *   1. Verificar que la página actual es Google Search.
 *   2. Leer la consulta desde la URL.
 *   3. Iniciar medición de tiempo.
 *   4. Esperar resultados con MutationObserver (DOMAdapter).
 *   5a. Si hay resultados: categorizar, insertar etiquetas, mostrar tabla.
 *   5b. Si no hay resultados: activar panel de refinamiento de consulta.
 *   6. Finalizar medición de tiempo.
 */

(function () {
  'use strict';

  // Atributo centinela que evita insertar etiquetas duplicadas
  const ETIQUETA_ATTR = 'data-optisearch-badge';

  // ID del panel de refinamiento (evita insertar el panel dos veces)
  const PANEL_ID = 'os-refinement-panel';

  /**
   * Mapeo de categoría → clase CSS definida en styles.css.
   */
  const CLASE_POR_CATEGORIA = {
    'Recetas':           'os-badge--recetas',
    'Tecnología':        'os-badge--tecnologia',
    'Salud / Servicios': 'os-badge--salud',
    'General':           'os-badge--general'
  };

  // ──────────────────────────────────────────────────────────────────
  // Verificación de contexto
  // ──────────────────────────────────────────────────────────────────

  /**
   * Verifica que la URL actual sea una página de resultados de Google Search.
   * Cubre los dominios configurados en el manifest (google.com y google.cl).
   * @returns {boolean}
   */
  function isGoogleSearchPage() {
    return /^https:\/\/www\.google\.(com|cl)\/search/.test(window.location.href);
  }

  /**
   * Extrae la consulta de búsqueda del parámetro `q` de la URL.
   * @returns {string}
   */
  function getQueryFromURL() {
    try {
      return new URLSearchParams(window.location.search).get('q') || '';
    } catch {
      return '';
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Inserción de etiquetas visuales
  // ──────────────────────────────────────────────────────────────────

  /**
   * Inserta una etiqueta de categoría (badge) junto al título del resultado.
   *
   * La etiqueta se coloca inmediatamente después del <h3> dentro del <a>
   * que contiene el título. Usa el atributo centinela para evitar duplicados.
   * El badge tiene pointer-events: none (definido en CSS) para no interferir
   * con los clics en el enlace original.
   *
   * @param {Element} anchor   - El elemento <a> que contiene el <h3>
   * @param {string} categoria - Nombre de la categoría asignada
   */
  function insertarBadge(anchor, categoria) {
    if (!anchor) return;
    if (anchor.querySelector(`[${ETIQUETA_ATTR}]`)) return;

    const h3 = anchor.querySelector('h3');
    if (!h3) return;

    const badge = document.createElement('span');
    badge.setAttribute(ETIQUETA_ATTR, categoria);
    badge.className = `os-badge ${CLASE_POR_CATEGORIA[categoria] || 'os-badge--general'}`;
    badge.textContent = categoria;

    h3.insertAdjacentElement('afterend', badge);
  }

  // ──────────────────────────────────────────────────────────────────
  // Panel de refinamiento (fallback)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Muestra un panel con sugerencias de refinamiento cuando no se encuentran
   * resultados. El panel se inserta al inicio del área de búsqueda y no
   * altera los resultados existentes.
   *
   * @param {string} query - Consulta de búsqueda original
   */
  function mostrarPanelRefinamiento(query) {
    if (document.getElementById(PANEL_ID)) return; // Ya existe

    const sugerencias = QueryRefinement.getSuggestions(query);
    if (sugerencias.length === 0) {
      Logger.info('Sin sugerencias de refinamiento para esta consulta.');
      return;
    }

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'os-refinement-panel';

    const titulo = document.createElement('span');
    titulo.className = 'os-refinement-title';
    titulo.textContent = 'OptiSearch — Sugerencias para refinar la búsqueda:';
    panel.appendChild(titulo);

    sugerencias.forEach((sugerencia) => {
      const chip = document.createElement('a');
      chip.className = 'os-suggestion-chip';
      const encodedQuery = encodeURIComponent(`${query} ${sugerencia}`);
      chip.href = `https://www.google.com/search?q=${encodedQuery}`;
      chip.textContent = `${query} ${sugerencia}`;
      panel.appendChild(chip);
    });

    // Insertar en el área principal de resultados
    const targetAreas = ['#search', '#main', '#rcnt', 'body'];
    for (const selector of targetAreas) {
      const target = document.querySelector(selector);
      if (target) {
        target.insertAdjacentElement('afterbegin', panel);
        Logger.info(`Panel de refinamiento insertado en "${selector}"`);
        break;
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Función principal
  // ──────────────────────────────────────────────────────────────────

  function main() {
    if (!isGoogleSearchPage()) {
      Logger.debug('No es una página de Google Search. Content script detenido.');
      return;
    }

    Logger.info('Content script iniciado');
    console.time('[OptiSearch] Tiempo total de ejecución');

    const query = getQueryFromURL();
    Logger.info(`Consulta detectada: "${query}"`);

    // Esperar resultados con MutationObserver (maneja carga dinámica)
    DOMAdapter.waitForResultsWithObserver((resultadosCrudos) => {

      // ── Caso: no se encontraron resultados ──────────────────────
      if (resultadosCrudos.length === 0) {
        Logger.warn('Extracción fallida. Activando panel de refinamiento.');
        mostrarPanelRefinamiento(query);
        console.timeEnd('[OptiSearch] Tiempo total de ejecución');
        return;
      }

      // ── Caso: resultados encontrados ────────────────────────────

      // Paso 1: Categorizar
      const resultadosCategorizados = Categorizer.clasificarTodos(resultadosCrudos);

      // Paso 2: Insertar etiquetas visuales
      resultadosCategorizados.forEach((resultado) => {
        insertarBadge(resultado._anchor, resultado.categoria);
      });

      // Paso 3: Reporte en consola
      Logger.info(`${resultadosCategorizados.length} resultado(s) extraídos y categorizados`);
      Logger.info(`Estrategia utilizada: "${resultadosCrudos[0]._estrategia || 'desconocida'}"`);

      const tabla = resultadosCategorizados.map((r) => ({
        Título:      r.titulo.substring(0, 55)      + (r.titulo.length > 55      ? '…' : ''),
        Categoría:   r.categoria,
        Enlace:      r.enlace.substring(0, 45)      + (r.enlace.length > 45      ? '…' : ''),
        Descripción: r.descripcion.substring(0, 70) + (r.descripcion.length > 70 ? '…' : '')
      }));

      console.table(tabla);
      console.timeEnd('[OptiSearch] Tiempo total de ejecución');

    }, 4000);
  }

  // Iniciar cuando el DOM esté disponible
  // run_at: document_idle en manifest.json garantiza esto,
  // pero se agrega la guarda por seguridad.
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    main();
  } else {
    document.addEventListener('DOMContentLoaded', main);
  }

})();
