# OptiSearch — Prototipo HU0 · Mitigación RT-001

Prototipo académico mínimo y funcional para validar el **Riesgo Técnico RT-001**:

> *¿Puede una extensión de navegador extraer resultados del DOM de Google Search de forma robusta, sin depender de selectores CSS frágiles, e insertar etiquetas visuales sin romper la interfaz original?*

---

## Qué hace este prototipo

Al navegar a cualquier página de resultados de Google (`google.com/search?q=...`), la extensión:

1. Detecta que es una página de Google Search.
2. Lee la consulta del parámetro `q=` de la URL.
3. Espera a que los resultados estén en el DOM (MutationObserver).
4. Extrae resultados usando una estrategia basada en `<h3>` + `<a href>` (tolerante a cambios de DOM).
5. Clasifica cada resultado en una categoría mediante reglas heurísticas.
6. Inserta una etiqueta de color junto al título de cada resultado.
7. Muestra en consola una tabla con todos los resultados procesados y el tiempo de ejecución.
8. Si la extracción falla, muestra un panel con sugerencias de refinamiento.

### Categorías y colores

| Categoría | Color | Palabras clave ejemplo |
|---|---|---|
| Recetas | Verde | receta, ingredientes, cocina, pizza |
| Tecnología | Azul | notebook, celular, procesador, review |
| Salud / Servicios | Amarillo | clínica, salud, urgencia, consulta |
| General | Gris | (cuando no coincide ninguna regla) |

---

## Estructura

```
OptiSearch/
├── manifest.json              ← Manifest V3
├── package.json               ← Jest para pruebas
│
├── src/
│   ├── logger.js              ← Logs centralizados [OptiSearch]
│   ├── domAdapter.js          ← Extracción robusta del DOM (núcleo RT-001)
│   ├── categorizer.js         ← Clasificación heurística
│   ├── queryRefinement.js     ← Sugerencias de refinamiento
│   ├── content.js             ← Coordinador del flujo
│   └── styles.css             ← Estilos no invasivos
│
├── tests/
│   ├── categorizer.test.js
│   └── domAdapter.test.js
│
└── docs/
    ├── investigacion_dom_google.md
    ├── riesgo_tecnico.md
    └── ambiente_desarrollo.md
```

---

## Cargar en Chrome u Opera

1. Ir a `chrome://extensions/` (Chrome) u `opera://extensions/` (Opera)
2. Activar **Modo desarrollador**
3. Clic en **"Cargar descomprimida"** → seleccionar esta carpeta
4. Buscar en Google, por ejemplo: `https://www.google.com/search?q=receta+de+pollo`

---

## Ejecutar pruebas

```bash
npm install       # solo la primera vez
npm test          # ejecuta todos los tests
```

Resultado esperado: todos los tests en verde.

---

## Estrategia de mitigación del RT-001

El módulo `domAdapter.js` aplica tres estrategias en cascada:

| Nivel | Estrategia | Resistencia a cambios de Google |
|---|---|---|
| 1 | `<h3>` + `<a href>` (semántica HTML) | Alta |
| 2 | Selectores CSS conocidos (`div.g`, etc.) | Baja |
| 3 | Panel de refinamiento basado en `q=` | Ninguna (no depende del DOM) |

Ver análisis completo en [`docs/investigacion_dom_google.md`](docs/investigacion_dom_google.md)  
Ver ficha del riesgo en [`docs/riesgo_tecnico.md`](docs/riesgo_tecnico.md)

---

## Restricciones de esta etapa

- Sin backend, base de datos, login ni sincronización.
- Sin IA ni APIs externas.
- Sin publicación en Chrome Web Store.
- Alcance limitado a HU0 (mitigación RT-001).
