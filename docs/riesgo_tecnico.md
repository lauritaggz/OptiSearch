# Riesgo Técnico RT-001 — Mitigación mediante HU0

## 1. Ficha del riesgo

| Campo | Detalle |
|---|---|
| **ID** | RT-001 |
| **Nombre** | Riesgo de extracción e intervención del DOM de Google Search |
| **Tipo** | Integración / Tecnológico |
| **Probabilidad** | Alta |
| **Impacto** | Alto |
| **Nivel** | Crítico |
| **Estado** | Mitigado mediante prototipo HU0 |

---

## 2. Descripción del riesgo

OptiSearch depende de leer el DOM renderizado de Google Search para:
1. Extraer los resultados orgánicos (título, URL, descripción).
2. Insertar elementos visuales (etiquetas de categoría, panel de refinamiento) sin alterar los enlaces ni la estructura original.

Google no provee una API pública gratuita para sus resultados de búsqueda. La única alternativa viable es parsear el HTML del DOM. Este DOM no tiene un contrato estable: Google puede modificar sus clases CSS, nombres de atributos, estructura de contenedores y lógica de carga en cualquier despliegue, sin aviso previo ni documentación.

**Si este riesgo se materializa sin mitigación**, el sistema OptiSearch quedaría inoperante con cada actualización mayor de Google, lo que lo haría inviable en producción.

---

## 3. Hipótesis técnica a validar en HU0

> *"Una extensión de navegador puede extraer de forma suficientemente robusta el título, URL y descripción de los resultados orgánicos de Google Search, mediante una estrategia que no dependa exclusivamente de clases CSS frágiles, e insertar etiquetas visuales sin interferir con la funcionalidad original de la página."*

---

## 4. Estrategia de mitigación

### 4.1 DOMAdapter tolerante a cambios

El módulo `src/domAdapter.js` encapsula toda la lógica de extracción y aplica estrategias por niveles:

| Nivel | Estrategia | Fragilidad |
|---|---|---|
| 1 (principal) | Extracción estructural: `h3` + `a[href]` más cercano | Baja |
| 2 (fallback) | Selectores CSS conocidos: `div.g`, `.MjjYud`, etc. | Alta |
| 3 (emergencia) | Sugerencias basadas en el parámetro `q=` de la URL | Ninguna |

### 4.2 Aislamiento del riesgo

Toda la lógica que depende de selectores del DOM de Google está concentrada en `domAdapter.js`. Si Google cambia su estructura, el impacto se contiene en un solo archivo, sin afectar la lógica de categorización, estilos ni coordinación.

### 4.3 Observación dinámica

`MutationObserver` detecta la carga asíncrona de resultados (Google usa JavaScript para renderizar resultados de forma diferida). El observer tiene un timeout de 4 segundos para evitar loops infinitos.

### 4.4 Inserción no destructiva

Los badges se insertan con `insertAdjacentElement('afterend', badge)` después del `<h3>`, sin envolver ni reemplazar el enlace original. Los badges tienen `pointer-events: none` para ser transparentes a los clics del usuario.

### 4.5 Diagnóstico observable

Todos los eventos relevantes (estrategia usada, número de resultados, timeout) se registran con el módulo `Logger` prefijados con `[OptiSearch]`. El desarrollador o evaluador puede observar en tiempo real qué estrategia fue necesaria.

---

## 5. Descripción del prototipo HU0

El prototipo implementa una extensión de navegador con Manifest V3 que:

- Se carga localmente en Opera/Chrome como extensión descomprimida.
- Se ejecuta en páginas `google.com/search*` y `google.cl/search*`.
- Extrae resultados usando la estrategia estructural de `h3` + `a[href]`.
- Categoriza los resultados con reglas heurísticas (sin IA).
- Inserta etiquetas visuales de color junto a cada resultado.
- Muestra en consola una tabla con los resultados procesados y el tiempo de ejecución.
- Activa un panel de refinamiento cuando la extracción falla.

---

## 6. Criterios de aceptación

| # | Criterio | Estado |
|---|---|---|
| 1 | La extensión carga en Opera/Chrome como descomprimida | Implementado |
| 2 | El content script se ejecuta en Google Search | Implementado |
| 3 | El DOMAdapter no depende solo de `div.g` | Implementado |
| 4 | Estrategia principal basada en `h3` + enlaces | Implementado |
| 5 | Se extraen resultados visibles cuando existen | Implementado |
| 6 | Cada resultado se categoriza heurísticamente | Implementado |
| 7 | Se insertan etiquetas sin romper enlaces | Implementado |
| 8 | Logs de diagnóstico claros en consola | Implementado |
| 9 | Fallback activo cuando la extracción falla | Implementado |
| 10 | Pruebas unitarias para Categorizer y DOMAdapter | Implementado |
| 11 | Documentación técnica de riesgo, investigación y ambiente | Implementado |
| 12 | Código simple, modular y defendible académicamente | Implementado |

---

## 7. Evidencia empírica del riesgo durante el desarrollo

Durante las pruebas del prototipo (junio 2026) se observó en Firefox 151 que:

- El selector `div.g` retornó **0 resultados** en una búsqueda de Google.
- La estrategia estructural (`h3` + enlace) extrajo resultados correctamente en el mismo DOM.

Esto constituye evidencia empírica directa de la materialización parcial del RT-001 y valida la decisión de no depender de `div.g` como estrategia principal.

---

## 8. Riesgos residuales

| Riesgo residual | Probabilidad | Mitigación disponible |
|---|---|---|
| Google elimina el `<h3>` de los títulos | Muy baja | Actualizar selector en `domAdapter.js` |
| Google ofusca los `href` en los anchors | Baja | Adaptar `isValidResultLink()` |
| Google carga resultados completamente fuera del DOM visible | Media | Extender timeout del MutationObserver |
| Google bloquea extensiones que modifican su DOM | Muy baja (extensiones locales) | No aplicable en fase HU0 |

---

## 9. Conclusión de mitigación

El prototipo HU0 demuestra que es **técnicamente viable** construir una extensión que:
- Extrae resultados de Google usando una estrategia tolerante a cambios de DOM.
- Inserta elementos visuales de forma no destructiva.
- Maneja fallos con fallbacks y logs de diagnóstico.

El riesgo RT-001 **no se elimina** (Google puede siempre cambiar su DOM), pero queda **mitigado** al nivel aceptable para continuar el desarrollo: el punto de falla está aislado en un único módulo y el sistema nunca falla silenciosamente.
