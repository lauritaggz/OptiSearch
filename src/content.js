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
 *   3. Registrar tiempo de inicio (performance.now).
 *   4. Esperar resultados con MutationObserver (DOMAdapter).
 *   5a. Si hay resultados: categorizar, insertar etiquetas, mostrar tabla.
 *   5b. Si no hay resultados: activar panel de refinamiento.
 *   6. Actualizar panel de evidencia RT-001 con métricas del proceso.
 */

(function () {
  'use strict';

  // Atributo centinela que evita insertar etiquetas duplicadas
  const ETIQUETA_ATTR = 'data-optisearch-badge';

  // ID del panel de refinamiento (evita insertar el panel dos veces)
  const PANEL_REFINAMIENTO_ID = 'os-refinement-panel';

  // ID del panel de evidencia técnica RT-001
  const PANEL_EVIDENCIA_ID = 'os-evidence-panel';

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
   * @returns {boolean}        - true si se insertó, false si ya existía
   */
  function insertarBadge(anchor, categoria) {
    if (!anchor) return false;
    if (anchor.querySelector(`[${ETIQUETA_ATTR}]`)) return false;

    const h3 = anchor.querySelector('h3');
    if (!h3) return false;

    const badge = document.createElement('span');
    badge.setAttribute(ETIQUETA_ATTR, categoria);
    badge.className = `os-badge ${CLASE_POR_CATEGORIA[categoria] || 'os-badge--general'}`;
    badge.textContent = `OptiSearch · ${categoria}`;

    h3.insertAdjacentElement('afterend', badge);
    return true;
  }

  // ──────────────────────────────────────────────────────────────────
  // Panel de refinamiento (fallback cuando no hay resultados)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Muestra un panel con sugerencias de refinamiento cuando no se encuentran
   * resultados. El panel se inserta al inicio del área de búsqueda y no
   * altera los resultados existentes.
   *
   * @param {string} query - Consulta de búsqueda original
   */
  function mostrarPanelRefinamiento(query) {
    if (document.getElementById(PANEL_REFINAMIENTO_ID)) return;

    const sugerencias = QueryRefinement.getSuggestions(query);
    if (sugerencias.length === 0) {
      Logger.info('Sin sugerencias de refinamiento para esta consulta.');
      return;
    }

    const panel = document.createElement('div');
    panel.id = PANEL_REFINAMIENTO_ID;
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
  // Panel de evidencia técnica RT-001
  // ──────────────────────────────────────────────────────────────────

  /**
   * Crea o actualiza el panel de evidencia técnica del prototipo RT-001.
   *
   * El panel es un overlay fijo en la esquina inferior derecha de la pantalla.
   * No empuja ni desplaza contenido de Google. Si ya existe (ejecución repetida),
   * limpia su contenido y lo reconstruye con los datos actualizados.
   *
   * @param {{
   *   detectados:          number,
   *   normalizados:        number,
   *   etiquetados:         number,
   *   duplicadosIgnorados: number,
   *   tiempoMs:            string,
   *   estrategia:          string,
   *   operativo:           boolean
   * }} stats
   */
  function actualizarPanelEvidencia(stats) {
    // Eliminar panel anterior si existe (permite actualización limpia)
    const existente = document.getElementById(PANEL_EVIDENCIA_ID);
    if (existente) existente.remove();

    const panel = document.createElement('div');
    panel.id = PANEL_EVIDENCIA_ID;
    panel.className = 'os-evidence-panel';
    panel.setAttribute('aria-label', 'Panel de evidencia OptiSearch RT-001');

    // Encabezado
    const header = document.createElement('div');
    header.className = 'os-ep-header';
    header.textContent = '⚙ OptiSearch — Prototipo RT-001';
    panel.appendChild(header);

    // Filas de métricas
    const filas = [
      ['Detectados',           stats.detectados],
      ['Normalizados',         stats.normalizados],
      ['Etiquetados',          stats.etiquetados],
      ['Duplicados ignorados', stats.duplicadosIgnorados],
      ['Estrategia',           stats.estrategia],
      ['Tiempo total',         `${stats.tiempoMs} ms`]
    ];

    filas.forEach(([label, valor]) => {
      const fila = document.createElement('div');
      fila.className = 'os-ep-row';

      const lbl = document.createElement('span');
      lbl.className = 'os-ep-label';
      lbl.textContent = label;

      const val = document.createElement('span');
      val.className = 'os-ep-value';
      val.textContent = valor;

      fila.appendChild(lbl);
      fila.appendChild(val);
      panel.appendChild(fila);
    });

    // Estado del DOM Adapter
    const estado = document.createElement('div');
    estado.className = `os-ep-status ${stats.operativo ? 'os-ep-status--ok' : 'os-ep-status--fail'}`;
    estado.textContent = stats.operativo
      ? '✓ DOM Adapter operativo'
      : '✗ DOM Adapter sin resultados';
    panel.appendChild(estado);

    document.body.appendChild(panel);
    Logger.info('Panel de evidencia RT-001 insertado/actualizado');
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
    const t_inicio = performance.now();

    const query = getQueryFromURL();
    Logger.info(`Consulta detectada: "${query}"`);

    DOMAdapter.waitForResultsWithObserver((resultadosCrudos) => {
      try {
        const t_extraccion = performance.now();

        // ── Caso: no se encontraron resultados ──────────────────────
        if (resultadosCrudos.length === 0) {
          Logger.warn('Extracción fallida. Activando panel de refinamiento.');
          mostrarPanelRefinamiento(query);

          const stats = DOMAdapter.getLastStats();
          actualizarPanelEvidencia({
            detectados:          stats.candidatos,
            normalizados:        0,
            etiquetados:         0,
            duplicadosIgnorados: stats.duplicadosIgnorados,
            tiempoMs:            (performance.now() - t_inicio).toFixed(1),
            estrategia:          stats.estrategia,
            operativo:           false
          });
          return;
        }

        // ── Caso: resultados encontrados ────────────────────────────

        // Paso 1: Categorizar
        const resultadosCategorizados = Categorizer.clasificarTodos(resultadosCrudos);
        const t_categorizacion = performance.now();

        // Paso 2: Insertar etiquetas visuales y contar las nuevas
        let etiquetados = 0;
        resultadosCategorizados.forEach((resultado) => {
          if (insertarBadge(resultado._anchor, resultado.categoria)) {
            etiquetados++;
          }
        });
        const t_renderizado = performance.now();

        // Paso 3: Logs de trazabilidad
        Logger.info(`${resultadosCategorizados.length} resultado(s) extraídos y categorizados`);
        Logger.info(`Estrategia utilizada: "${resultadosCrudos[0]._estrategia || 'desconocida'}"`);
        Logger.info(`Tiempo categorización: ${(t_categorizacion - t_extraccion).toFixed(1)} ms`);
        Logger.info(`Tiempo renderizado:    ${(t_renderizado - t_categorizacion).toFixed(1)} ms`);
        Logger.info(`Tiempo total:          ${(t_renderizado - t_inicio).toFixed(1)} ms`);

        // Paso 4: Tabla de resultados normalizados en consola
        const tabla = resultadosCategorizados.map((r) => ({
          Título:      r.titulo.substring(0, 55)      + (r.titulo.length > 55      ? '…' : ''),
          Categoría:   r.categoria,
          Enlace:      r.enlace.substring(0, 45)      + (r.enlace.length > 45      ? '…' : ''),
          Descripción: r.descripcion.substring(0, 70) + (r.descripcion.length > 70 ? '…' : '')
        }));
        console.table(tabla);

        // Paso 5: Panel de evidencia RT-001
        const stats = DOMAdapter.getLastStats();
        actualizarPanelEvidencia({
          detectados:          stats.candidatos,
          normalizados:        resultadosCrudos.length,
          etiquetados,
          duplicadosIgnorados: stats.duplicadosIgnorados,
          tiempoMs:            (t_renderizado - t_inicio).toFixed(1),
          estrategia:          stats.estrategia,
          operativo:           true
        });

      } catch (err) {
        Logger.error(`Error inesperado en el flujo principal: ${err.message}`);
      }

    }, 4000);
  }

  // Iniciar cuando el DOM esté disponible
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    main();
  } else {
    document.addEventListener('DOMContentLoaded', main);
  }

})();
