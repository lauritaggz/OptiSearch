# Ambiente de Desarrollo — OptiSearch HU0

## 1. Stack tecnológico

| Tecnología | Versión | Propósito |
|---|---|---|
| JavaScript puro (ES2020) | — | Lógica de la extensión (sin frameworks) |
| Manifest V3 | 3 | Estándar de extensiones para Chrome/Opera/Edge |
| Node.js | v18+ | Ejecutar las pruebas unitarias localmente |
| Jest | ^29.7 | Framework de pruebas unitarias |
| jest-environment-jsdom | ^29.7 | Simulación de DOM para tests de DOMAdapter |

**No se usan**: React, Vue, TypeScript, Webpack, Babel, Firebase, APIs externas, backend.

---

## 2. IDE recomendado

**Visual Studio Code** con las extensiones:
- ESLint (análisis de código)
- Prettier (formato)
- Extension Manifest Editor (vista del manifest.json)

---

## 3. Navegadores de prueba

| Navegador | Soporte MV3 | Cómo cargar |
|---|---|---|
| **Google Chrome** | Completo | `chrome://extensions/` |
| **Opera** | Completo | `opera://extensions/` |
| **Microsoft Edge** | Completo | `edge://extensions/` |
| Firefox | Parcial (MV3 en progreso) | `about:debugging` (temporal) |

**Esta HU0 se desarrolla y prueba principalmente en Chrome u Opera.**

---

## 4. Estructura del proyecto

```
OptiSearch/
│
├── manifest.json              ← Manifest V3 (punto de entrada de la extensión)
├── package.json               ← Dependencias de desarrollo y scripts de test
├── README.md
│
├── src/
│   ├── logger.js              ← Módulo de logs centralizado
│   ├── domAdapter.js          ← Extracción e intervención del DOM (núcleo RT-001)
│   ├── categorizer.js         ← Clasificación heurística de resultados
│   ├── queryRefinement.js     ← Sugerencias de refinamiento de búsqueda
│   ├── content.js             ← Coordinador principal del flujo
│   └── styles.css             ← Estilos de badges y panel de refinamiento
│
├── tests/
│   ├── categorizer.test.js    ← Tests de clasificación (sin DOM)
│   └── domAdapter.test.js     ← Tests de extracción (jsdom simulado)
│
└── docs/
    ├── ambiente_desarrollo.md     ← Este archivo
    ├── investigacion_dom_google.md ← Análisis técnico del DOM de Google
    └── riesgo_tecnico.md          ← Ficha completa RT-001
```

---

## 5. Cómo cargar la extensión localmente

### En Google Chrome

1. Navegar a `chrome://extensions/`
2. Activar **"Modo desarrollador"** (interruptor superior derecho)
3. Clic en **"Cargar descomprimida"**
4. Seleccionar la carpeta raíz del proyecto (`OptiSearch/`)
5. Verificar que aparece la tarjeta **"OptiSearch - Prototipo RT-001"** sin errores

### En Opera

1. Navegar a `opera://extensions/`
2. Activar **"Modo desarrollador"**
3. Clic en **"Cargar extensión descomprimida"**
4. Seleccionar la carpeta raíz del proyecto

### Recargar tras cambios en el código

1. Ir a `chrome://extensions/` u `opera://extensions/`
2. Clic en el ícono de recarga (⟳) de la tarjeta OptiSearch
3. Recargar la pestaña de Google Search con `F5`

---

## 6. Verificar el funcionamiento

1. Navegar a `https://www.google.com/search?q=receta+de+pollo`
2. Observar etiquetas de color junto a los resultados orgánicos:
   - Verde → Recetas
   - Azul → Tecnología
   - Amarillo → Salud / Servicios
   - Gris → General
3. Abrir consola (`F12` → Console):
   - Buscar mensajes con prefijo `[OptiSearch]`
   - Ver la tabla con `console.table`
   - Ver el tiempo de ejecución con `console.timeEnd`

---

## 7. Comandos de prueba

### Instalar dependencias (solo la primera vez)

```bash
npm install
```

### Ejecutar todos los tests

```bash
npm test
```

### Ejecutar solo un archivo de tests

```bash
npm run test:categorizer
npm run test:dom
```

### Ver output detallado

```bash
npx jest --verbose
```

**Resultado esperado**: todos los tests pasando (sin errores en rojo).

---

## 8. Reglas de versionamiento Git

```
feat: nueva funcionalidad
fix: corrección de bug
test: adición o corrección de tests
docs: actualización de documentación
refactor: cambio interno sin cambio de comportamiento
```

Ejemplo de commit: `feat: implementar estrategia estructural en DOMAdapter`

---

## 9. Restricciones de esta etapa (HU0)

- La extensión **no se publica** en Chrome Web Store ni Opera Add-ons.
- No hay backend, base de datos, login ni sincronización.
- No se usa IA ni APIs externas.
- El alcance está limitado a la mitigación del RT-001.

---

## 10. Capturas de evidencia para el informe académico

| Código | Qué capturar | Cómo obtenerla |
|---|---|---|
| **E-01** | Extensión cargada sin errores | Captura de `chrome://extensions/` con la tarjeta activa |
| **E-02** | SERP con badges de colores visibles | Captura del navegador con resultados etiquetados |
| **E-03** | Tabla `console.table` en consola | F12 → Console con la tabla expandida |
| **E-04** | Tiempo de ejecución (`timeEnd`) | Misma consola, línea `[OptiSearch]` con ms |
| **E-05** | Logs de estrategia utilizada | Mensajes `INFO`, `WARN`, `DEBUG` en consola |
| **E-06** | Panel de refinamiento (si aplica) | Captura con el panel azul visible en la página |
| **E-07** | Tests pasando en terminal | Salida de `npm test` con todos en verde |
