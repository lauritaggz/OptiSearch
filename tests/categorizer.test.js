/**
 * categorizer.test.js
 * Pruebas unitarias para el módulo Categorizer.
 *
 * Ejecutar:
 *   npm test                                     (todos los tests)
 *   npm run test:categorizer                     (solo este archivo)
 *   npx jest tests/categorizer.test.js --verbose (sin instalar globalmente)
 *
 * No requiere DOM ni navegador. Usa Node.js puro + Jest.
 */

const fs = require('fs');
const path = require('path');

// ────────────────────────────────────────────────────────────────────
// Carga del módulo Categorizer en el contexto de Jest
// ────────────────────────────────────────────────────────────────────

const categorizerSrc = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'categorizer.js'),
  'utf8'
);

// new Function evalúa el IIFE en el scope global de Node.js,
// exponiéndolo en globalThis donde Jest puede accederlo.
new Function(categorizerSrc + '\nglobalThis.Categorizer = Categorizer;')();

const Categorizer = globalThis.Categorizer;

// ────────────────────────────────────────────────────────────────────
// Tests: clasificar() — casos individuales
// ────────────────────────────────────────────────────────────────────

describe('Categorizer.clasificar — Casos individuales', () => {

  test('Caso 1 — Recetas: titulo con "receta" e "ingredientes"', () => {
    const resultado = {
      titulo: 'Receta de pollo al curry con arroz basmati',
      descripcion: 'Aprende a preparar este platillo con ingredientes fáciles.'
    };
    expect(Categorizer.clasificar(resultado)).toBe('Recetas');
  });

  test('Caso 2 — Tecnología: titulo con "notebook" y "review"', () => {
    const resultado = {
      titulo: 'Review: Notebook Lenovo IdeaPad 2025',
      descripcion: 'Análisis de procesador, RAM y precio de este modelo.'
    };
    expect(Categorizer.clasificar(resultado)).toBe('Tecnología');
  });

  test('Caso 3 — Salud / Servicios: "clínica" y "urgencia"', () => {
    const resultado = {
      titulo: 'Clínica San Roque — Atención de urgencias 24 horas',
      descripcion: 'Consulta médica y atención de emergencias disponibles.'
    };
    expect(Categorizer.clasificar(resultado)).toBe('Salud / Servicios');
  });

  test('Caso 4 — General: sin coincidencia con ninguna categoría', () => {
    const resultado = {
      titulo: 'Historia del Imperio Romano en 10 datos',
      descripcion: 'Los hechos más relevantes del período clásico antiguo.'
    };
    expect(Categorizer.clasificar(resultado)).toBe('General');
  });

  test('Caso 5 — Recetas: coincidencia por descripción (no título)', () => {
    const resultado = {
      titulo: 'La mejor web de gastronomía',
      descripcion: 'Recetas de cocina fáciles y rápidas para cada día.'
    };
    expect(Categorizer.clasificar(resultado)).toBe('Recetas');
  });

  test('Caso 6 — Tecnología: palabras con tilde normalizadas', () => {
    const resultado = {
      titulo: 'Comparativa de tecnología móvil 2025',
      descripcion: 'Análisis y comparativa de los mejores smartphones del año.'
    };
    expect(Categorizer.clasificar(resultado)).toBe('Tecnología');
  });

  test('Caso 7 — Salud / Servicios: "veterinaria" en título', () => {
    const resultado = {
      titulo: 'Veterinaria Los Pinos — Atención a domicilio',
      descripcion: 'Salud animal, consulta y atención de urgencias.'
    };
    expect(Categorizer.clasificar(resultado)).toBe('Salud / Servicios');
  });

  test('Caso 8 — General: objeto con campos vacíos', () => {
    const resultado = { titulo: '', descripcion: '' };
    expect(Categorizer.clasificar(resultado)).toBe('General');
  });

});

// ────────────────────────────────────────────────────────────────────
// Tests: clasificarTodos() — array mixto
// ────────────────────────────────────────────────────────────────────

describe('Categorizer.clasificarTodos — Array mixto', () => {

  const resultados = [
    { titulo: 'Receta de torta de chocolate casera',  descripcion: 'Cocina este postre con ingredientes básicos.' },
    { titulo: 'Precio del iPhone 16 en Chile',        descripcion: 'Review del nuevo celular de Apple.' },
    { titulo: 'Clínica Santa María — Urgencias',      descripcion: 'Atención médica de urgencias sin cita.' },
    { titulo: 'Noticias del día en el mundo',         descripcion: 'Los eventos más importantes de hoy.' }
  ];

  let categorizados;

  beforeAll(() => {
    categorizados = Categorizer.clasificarTodos(resultados);
  });

  test('Devuelve el mismo número de elementos que la entrada', () => {
    expect(categorizados).toHaveLength(resultados.length);
  });

  test('Índice 0 → Recetas', () => {
    expect(categorizados[0].categoria).toBe('Recetas');
  });

  test('Índice 1 → Tecnología', () => {
    expect(categorizados[1].categoria).toBe('Tecnología');
  });

  test('Índice 2 → Salud / Servicios', () => {
    expect(categorizados[2].categoria).toBe('Salud / Servicios');
  });

  test('Índice 3 → General', () => {
    expect(categorizados[3].categoria).toBe('General');
  });

  test('Cada elemento enriquecido conserva las propiedades originales', () => {
    expect(categorizados[0].titulo).toBe(resultados[0].titulo);
    expect(categorizados[0].descripcion).toBe(resultados[0].descripcion);
  });

});

// ────────────────────────────────────────────────────────────────────
// Tests: normalizar() — función utilitaria
// ────────────────────────────────────────────────────────────────────

describe('Categorizer.normalizar', () => {

  test('Convierte a minúsculas', () => {
    expect(Categorizer.normalizar('RECETA')).toBe('receta');
  });

  test('Elimina tildes', () => {
    expect(Categorizer.normalizar('Técnología')).toBe('tecnologia');
  });

  test('Maneja cadena vacía sin error', () => {
    expect(Categorizer.normalizar('')).toBe('');
  });

});
