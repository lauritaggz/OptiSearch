/**
 * categorizer.js
 * Responsabilidad: clasificar resultados de búsqueda mediante reglas heurísticas.
 *
 * No usa inteligencia artificial, APIs externas ni modelos de lenguaje.
 * La clasificación se basa exclusivamente en palabras clave presentes
 * en el título y la descripción de cada resultado.
 *
 * El orden de las categorías en REGLAS es significativo:
 * la primera categoría que coincida se asigna y se detiene la búsqueda.
 */

const Categorizer = (() => {

  /**
   * Definición de categorías y sus palabras clave.
   * Las palabras se comparan después de normalizar el texto (sin tildes, minúsculas).
   */
  const REGLAS = [
    {
      categoria: 'Recetas',
      palabras: [
        'receta', 'cocina', 'ingredientes', 'preparación', 'preparacion',
        'comida', 'platillo', 'sabor', 'cocinar', 'pizza', 'postre',
        'almuerzo', 'cena', 'desayuno', 'hornear', 'masa', 'salsas'
      ]
    },
    {
      categoria: 'Tecnología',
      palabras: [
        'notebook', 'celular', 'procesador', 'tecnología', 'tecnologia',
        'precio', 'review', 'laptop', 'computador', 'smartphone',
        'software', 'hardware', 'gpu', 'cpu', 'ram', 'comparativa',
        'benchmark', 'monitor', 'teclado', 'auriculares', 'tablet'
      ]
    },
    {
      categoria: 'Salud / Servicios',
      palabras: [
        'clínica', 'clinica', 'veterinaria', 'salud', 'consulta',
        'atención', 'atencion', 'urgencia', 'médico', 'medico',
        'hospital', 'farmacia', 'tratamiento', 'especialista',
        'dentista', 'psicólogo', 'psicologo', 'nutricionista', 'kinesiólogo'
      ]
    }
  ];

  const CATEGORIA_GENERAL = 'General';

  /**
   * Normaliza un texto para comparación:
   * convierte a minúsculas y elimina diacríticos (tildes, etc.).
   *
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
   * Clasifica un resultado según su título y descripción.
   *
   * @param {{titulo: string, descripcion: string}} resultado
   * @returns {string} Nombre de la categoría asignada
   */
  function clasificar(resultado) {
    const textoBase = normalizar(`${resultado.titulo || ''} ${resultado.descripcion || ''}`);

    for (const regla of REGLAS) {
      for (const palabra of regla.palabras) {
        if (textoBase.includes(normalizar(palabra))) {
          return regla.categoria;
        }
      }
    }

    return CATEGORIA_GENERAL;
  }

  /**
   * Aplica clasificación a un array completo de resultados.
   * Retorna cada resultado enriquecido con el campo `categoria`.
   *
   * @param {Array<{titulo: string, enlace: string, descripcion: string}>} resultados
   * @returns {Array<{titulo, enlace, descripcion, categoria, ...}>}
   */
  function clasificarTodos(resultados) {
    return resultados.map((r) => ({
      ...r,
      categoria: clasificar(r)
    }));
  }

  return { clasificar, clasificarTodos, normalizar };
})();
