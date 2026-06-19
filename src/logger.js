/**
 * logger.js
 * Responsabilidad: centralizar todos los mensajes de diagnóstico de OptiSearch.
 *
 * Todos los mensajes llevan el prefijo [OptiSearch] para identificarlos
 * fácilmente en la consola del navegador entre los mensajes propios de Google.
 *
 * Niveles disponibles:
 *   - info  → flujo normal de ejecución
 *   - warn  → situación inesperada pero recuperable (ej: selector no encontrado)
 *   - error → fallo que impide el funcionamiento (ej: excepción no capturada)
 *   - debug → detalle técnico de bajo nivel (desactivado por defecto en producción)
 */

const Logger = (() => {
  const PREFIX = '[OptiSearch]';

  /**
   * Cambiar a true para ver mensajes de nivel DEBUG durante el desarrollo.
   * Mantener en false para la entrega final y presentación académica.
   */
  const DEBUG_MODE = true;

  return {
    info(msg) {
      console.log(`${PREFIX} INFO  ${msg}`);
    },

    warn(msg) {
      console.warn(`${PREFIX} WARN  ${msg}`);
    },

    error(msg) {
      console.error(`${PREFIX} ERROR ${msg}`);
    },

    debug(msg) {
      if (DEBUG_MODE) {
        console.debug(`${PREFIX} DEBUG ${msg}`);
      }
    }
  };
})();
