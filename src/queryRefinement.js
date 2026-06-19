/**
 * queryRefinement.js
 * Responsabilidad: generar sugerencias de refinamiento de búsqueda.
 *
 * Se activa cuando el DOMAdapter no puede extraer resultados, o como
 * apoyo adicional al usuario para reformular su consulta.
 *
 * Las sugerencias son términos complementarios que, añadidos a la
 * consulta original, tienden a producir resultados más específicos.
 *
 * No usa IA ni APIs externas. Las sugerencias son estáticas y heurísticas.
 */

const QueryRefinement = (() => {

  /**
   * Grupos de refinamiento definidos por palabras clave disparadoras.
   * Si la consulta del usuario contiene alguna de las `palabras`,
   * se ofrecen las `sugerencias` asociadas.
   */
  const GRUPOS = [
    {
      palabras: ['receta', 'cocina', 'comida', 'ingrediente', 'platillo', 'pizza'],
      sugerencias: ['rápida', 'sin gluten', 'saludable', 'barata', 'fácil', 'casera', 'vegetariana']
    },
    {
      palabras: ['notebook', 'laptop', 'computador', 'celular', 'smartphone', 'procesador', 'tablet'],
      sugerencias: ['calidad precio', 'estudiante', '16GB RAM', 'Ryzen', 'mejor 2025', 'comparativa', 'menos de 500']
    },
    {
      palabras: ['veterinaria', 'clínica', 'clinica', 'hospital', 'médico', 'medico', 'dentista', 'psicólogo'],
      sugerencias: ['24 horas', 'urgencia', 'cerca de mí', 'precio consulta', 'sin cita previa', 'online']
    },
    {
      palabras: ['hotel', 'alojamiento', 'hostal', 'viaje', 'vuelo', 'pasaje'],
      sugerencias: ['económico', 'familiar', 'con desayuno', 'cancelación gratis', 'centro ciudad']
    },
    {
      palabras: ['curso', 'carrera', 'universidad', 'instituto', 'postítulo', 'diplomado'],
      sugerencias: ['online', 'con certificado', 'gratuito', 'en línea', 'modalidad mixta']
    }
  ];

  /**
   * Normaliza el texto para comparación (minúsculas, sin tildes).
   * @param {string} texto
   * @returns {string}
   */
  function normalizar(texto) {
    return String(texto)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Devuelve sugerencias de refinamiento para una consulta dada.
   * Retorna máximo 4 sugerencias para no sobrecargar la interfaz.
   *
   * @param {string} query - Consulta de búsqueda extraída de la URL
   * @returns {string[]} Lista de términos sugeridos
   */
  function getSuggestions(query) {
    if (!query || typeof query !== 'string') return [];

    const q = normalizar(query);

    for (const grupo of GRUPOS) {
      const coincide = grupo.palabras.some(p => q.includes(normalizar(p)));
      if (coincide) {
        return grupo.sugerencias.slice(0, 4);
      }
    }

    return [];
  }

  return { getSuggestions };
})();
