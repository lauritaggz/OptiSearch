# Investigación del DOM de Google Search — OptiSearch HU0

## 1. Contexto del riesgo

OptiSearch es una extensión de navegador que actúa como capa visual sobre los resultados de Google Search. Para funcionar, debe leer el HTML renderizado de la página (DOM) y modificarlo de forma no destructiva.

Google no ofrece una API pública gratuita para acceder a sus resultados orgánicos. La única alternativa técnicamente viable para una extensión de navegador es parsear el DOM de la página renderizada. Esto introduce el **Riesgo Técnico RT-001**: la fragilidad inherente de depender de una estructura HTML que Google puede cambiar en cualquier momento sin previo aviso.

---

## 2. Por qué depender del DOM de Google es riesgoso

Google Search utiliza una arquitectura frontend compleja basada en:

- **Generación dinámica del DOM**: los resultados no son HTML estático. Se cargan y actualizan mediante JavaScript (similares a una SPA).
- **Clases CSS ofuscadas y generadas automáticamente**: nombres como `.VwiC3b`, `.MjjYud`, `.tF2Cxc`, `.lEBKkf` no tienen significado semántico y son regenerados en cada despliegue de Google.
- **Módulos especiales variables**: la página puede incluir módulos como AI Overview, carruseles de recetas, paneles de conocimiento, mapas, shopping o preguntas frecuentes que no comparten la misma estructura que los resultados orgánicos.
- **Despliegues frecuentes**: Google actualiza su interfaz con regularidad. Se estima que el DOM puede cambiar significativamente en ciclos de semanas o meses.

**Consecuencia directa para OptiSearch**: un selector como `div.g` que funcionaba en 2022 puede devolver 0 resultados en 2025 sin que haya cambiado ninguna línea del código de la extensión.

---

## 3. Elementos potencialmente más estables

La investigación y el diseño de la estrategia de mitigación se centran en identificar los elementos del DOM de Google que históricamente han sido más resistentes a los cambios:

### 3.1 El elemento `<h3>`

El título de cada resultado orgánico de Google está marcado consistentemente con un elemento `<h3>`. Este es el elemento semántico más estable encontrado en los resultados:
- Existe en versiones de Google de 2019 a 2026.
- No depende del sistema de clases CSS de Google.
- Es el único `<h3>` visible dentro de su bloque de resultado.

### 3.2 El enlace `<a href>`

Los resultados orgánicos de Google siempre tienen un enlace que apunta al sitio externo. Características estables:
- El `href` contiene la URL del resultado (no una URL de redirección en los resultados más recientes).
- El enlace envuelve el título (`<a> > <h3>`) o está adyacente al bloque del título.
- Se puede distinguir de los enlaces internos de Google validando el hostname.

### 3.3 Contenedores estructurales cercanos

El bloque de contenido del resultado (título + URL + descripción) siempre está contenido en un div ascendiente. Aunque el nombre de clase de ese div cambia, la estructura jerárquica de que existe un contenedor con múltiples elementos descendientes es consistente.

### 3.4 El parámetro `q` de la URL

La URL de cualquier búsqueda de Google contiene el parámetro `q=` con la consulta del usuario. Este parámetro es completamente estable y permite extraer la intención de búsqueda como fallback cuando la extracción del DOM falla.

```
https://www.google.com/search?q=receta+pollo+al+horno
                                   ↑
                             siempre disponible
```

---

## 4. Elementos frágiles (NO usados como estrategia principal)

Los siguientes elementos existen en el DOM de Google pero son considerados frágiles y no se usan como estrategia principal:

| Selector / Elemento | Por qué es frágil |
|---|---|
| `div.g` | Clase CSS que Google ha eliminado y reintroducido en distintas versiones. Devuelve 0 resultados en versiones recientes. |
| `#rso` | ID del contenedor principal. Funcional pero no siempre presente en todas las variantes de la interfaz. |
| `.MjjYud`, `.tF2Cxc` | Clases ofuscadas, regeneradas en cada despliegue. |
| `.VwiC3b`, `.lEBKkf` | Selectores de snippet conocidos pero histórica y frecuentemente renombrados. |
| `[data-sokoban-container]` | Atributo de datos interno de Google, no documentado. |
| **Módulos especiales** | AI Overview, carruseles, mapas, shopping, preguntas frecuentes tienen estructuras completamente distintas a los resultados orgánicos y generan falsos positivos. |

---

## 5. Estrategias implementadas en el prototipo

### 5.1 Extracción estructural (estrategia principal)

**Archivo**: `src/domAdapter.js` → función `extractByStructuralStrategy()`

**Lógica**:
1. Obtener todos los elementos `<h3>` del DOM.
2. Para cada `<h3>`, buscar el `<a href>` más cercano usando `closest('a[href]')`.
3. Validar que el href no sea un enlace interno de Google (`isValidResultLink()`).
4. Subir por el árbol DOM para encontrar el contenedor del resultado (`findNearestResultContainer()`).
5. Extraer el snippet buscando primero selectores conocidos y luego aplicando una heurística de texto más largo.

**Ventaja**: no depende de ninguna clase CSS de Google. Solo requiere que los títulos estén marcados con `<h3>` y los enlaces con `<a>`, lo que es semánticamente obligatorio.

### 5.2 Validación de enlaces (`isValidResultLink`)

Descarta sistemáticamente:
- `#anchors`
- `javascript:` URIs
- URLs con protocolo no HTTP/HTTPS
- URLs cuyo hostname contiene dominios de Google

### 5.3 Deduplicación (`deduplicateResults`)

Normaliza las URLs descartando el query string para detectar resultados que apuntan al mismo recurso con diferentes parámetros de tracking.

### 5.4 Fallback por selectores CSS (`extractByFallbackSelectors`)

Si la estrategia estructural devuelve 0 resultados, se intenta una lista de selectores CSS conocidos de Google en orden de preferencia. Registra en consola qué selector funcionó (evidencia de RT-001).

### 5.5 Observación dinámica (`waitForResultsWithObserver`)

Usa `MutationObserver` para detectar cambios en el DOM durante la carga asíncrona de resultados. Garantiza que el procesamiento se ejecute exactamente una vez y aplica un timeout máximo de 4 segundos.

### 5.6 Fallback por consulta (`QueryRefinement`)

Si ninguna estrategia encuentra resultados, se extrae la consulta del parámetro `q=` de la URL y se generan sugerencias de refinamiento. El usuario puede hacer clic en cualquier sugerencia para reformular su búsqueda.

---

## 6. Decisión técnica final

El DOMAdapter de OptiSearch adopta una estrategia de **extracción tolerante a cambios** basada en los siguientes principios:

1. **No depender de clases CSS de Google como estrategia principal**. Usarlas solo como pistas secundarias.
2. **Preferir semántica HTML** (`<h3>`, `<a>`) sobre nomenclatura interna de Google.
3. **Aplicar estrategias en cascada**: si la principal falla, intentar alternativas.
4. **Nunca fallar silenciosamente**: registrar en consola qué estrategia se usó o por qué falló.
5. **Encapsular toda la lógica de extracción en un único módulo** (`domAdapter.js`) para que cuando Google cambie su DOM, el impacto se contenga en un solo archivo.

Este diseño acepta que el riesgo RT-001 no puede eliminarse completamente (Google puede siempre cambiar su DOM), pero lo mitiga al máximo dentro del alcance académico de HU0.

---

## 7. Evidencia observable del riesgo RT-001

Durante las pruebas del prototipo se observó que:

- El selector `div.g` devolvía **0 resultados** en Firefox 151 con Google Search (junio 2026).
- La estrategia estructural basada en `<h3>` extrajo resultados correctamente en el mismo DOM.

Esto constituye **evidencia empírica directa** de la materialización del riesgo RT-001 y demuestra la efectividad de la estrategia de mitigación.
