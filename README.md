# OptiSearch - Prototipo de Riesgo Técnico

OptiSearch es una extensión de navegador orientada a mejorar la experiencia de búsqueda en Google mediante la organización, categorización y apoyo visual sobre los resultados visibles. El proyecto busca reducir la sobrecarga cognitiva del usuario al momento de revisar múltiples resultados, entregando una capa de apoyo que facilite la identificación de información relevante.

Este repositorio corresponde a la etapa inicial del proyecto, enfocada en la creación del ambiente de desarrollo y en la validación del riesgo técnico principal mediante un prototipo funcional mínimo.

---

## Objetivo del prototipo

El objetivo de este prototipo es validar si una extensión de navegador puede interactuar correctamente con una página de resultados de Google, extraer información visible, categorizarla mediante reglas heurísticas simples e insertar elementos visuales sin afectar el funcionamiento original del buscador.

Esta prueba de concepto no representa el sistema final ni el MVP completo. Su propósito es mitigar el riesgo técnico principal antes de avanzar al desarrollo de funcionalidades más completas.

---

## Riesgo técnico principal

**RT-001 - Riesgo de extracción e intervención del DOM de Google**

Existe el riesgo de que la extensión no pueda leer correctamente los resultados de búsqueda de Google o que la intervención visual sobre la página afecte su funcionamiento, debido a la dependencia de la estructura HTML del buscador.

### Tipo de riesgo

* Integración
* Tecnológico

### Componente afectado

* Content Script
* DOMAdapter
* Motor de categorización heurística
* Inyección visual en la página

### Estrategia de mitigación

Construir un prototipo funcional mínimo que permita:

* Detectar una página de resultados de Google.
* Extraer resultados visibles desde el DOM.
* Obtener título, enlace y descripción de cada resultado.
* Clasificar los resultados mediante reglas heurísticas simples.
* Insertar etiquetas visuales sin modificar los enlaces originales.
* Medir la ejecución mediante logs en consola.
* Documentar evidencia de funcionamiento.

---

## Estado del proyecto

Actualmente el proyecto se encuentra en etapa de **Sprint 0 - Ambiente y validación técnica**.

La historia principal de esta etapa es:

**HU0 - Prototipo de mitigación del riesgo técnico principal**

---

## Funcionalidades del prototipo

El prototipo inicial contempla las siguientes funcionalidades:

* Carga local de la extensión en modo desarrollador.
* Ejecución de un content script en páginas de búsqueda de Google.
* Extracción de resultados visibles.
* Categorización básica de resultados.
* Inserción de etiquetas visuales en la interfaz.
* Registro de resultados en consola.
* Medición simple del tiempo de ejecución.

---

## Tecnologías utilizadas

| Elemento             | Tecnología             |
| -------------------- | ---------------------- |
| Navegador de prueba  | Opera / Google Chrome  |
| Tipo de aplicación   | Extensión de navegador |
| Manifest             | Manifest V3            |
| Lenguaje             | JavaScript             |
| Estilos              | CSS                    |
| Control de versiones | Git + GitHub           |
| Gestión del proyecto | Taiga                  |
| Documentación        | Markdown               |

---

## Estructura inicial del proyecto

```text
OptiSearch-Prototipo-RiesgoTecnico/
│
├── manifest.json
├── content.js
├── styles.css
├── README.md
│
└── docs/
    ├── ambiente_desarrollo.md
    └── riesgo_tecnico.md
```

---

## Instalación y ejecución local

Este prototipo no requiere publicación en Chrome Web Store ni pago de registro como desarrollador. La extensión se ejecuta localmente mediante el modo desarrollador del navegador.

### Pasos para cargar la extensión

1. Descargar o clonar este repositorio.

```bash
git clone URL_DEL_REPOSITORIO
```

2. Abrir Opera o Google Chrome.

3. Ir a la página de extensiones:

```text
opera://extensions/
```

o en Chrome:

```text
chrome://extensions/
```

4. Activar el **modo de desarrollador**.

5. Presionar **Cargar descomprimida** o **Load unpacked**.

6. Seleccionar la carpeta raíz del proyecto, donde se encuentra el archivo `manifest.json`.

7. Abrir Google y realizar una búsqueda de prueba.

---

## Búsquedas sugeridas para probar

Se recomienda validar el prototipo con consultas de distintos dominios:

```text
receta de pizza sin gluten
```

```text
mejor notebook calidad precio
```

```text
veterinaria cerca de mí
```

---

## Evidencia esperada

Durante la ejecución del prototipo se debe evidenciar:

* La extensión cargada correctamente en el navegador.
* La ejecución del content script.
* Resultados extraídos desde Google.
* Categorías asignadas a los resultados.
* Etiquetas visuales insertadas en la página.
* Logs visibles en consola.
* Tiempo de ejecución registrado.

Para revisar los logs se puede abrir la consola del navegador con:

```text
Ctrl + Shift + J
```

---

## Criterios de aceptación de la HU0

La HU0 se considerará terminada cuando se cumplan los siguientes criterios:

1. El repositorio del proyecto está creado en GitHub.
2. La extensión puede cargarse localmente en modo desarrollador.
3. El content script se ejecuta correctamente en una página de resultados de Google.
4. El prototipo extrae al menos 5 resultados visibles.
5. Cada resultado contiene, cuando está disponible, título, enlace y descripción.
6. Los resultados se clasifican en categorías mediante reglas heurísticas.
7. Se insertan etiquetas o elementos visuales sin romper los enlaces originales.
8. Se registran logs de ejecución en consola.
9. Se documenta la mitigación del riesgo técnico.
10. Se guardan capturas o evidencias de la ejecución exitosa.

---

## Limitaciones actuales

* El prototipo depende de la estructura HTML actual de Google.
* No se publica en Chrome Web Store durante esta etapa.
* No incluye backend ni base de datos.
* No utiliza inteligencia artificial en esta versión inicial.
* La categorización se realiza mediante reglas heurísticas simples.
* La validación está enfocada solo en la mitigación del riesgo técnico principal.
* La compatibilidad inicial se prueba en Opera y Google Chrome.

---

## Documentación del proyecto

La documentación técnica se encontrará en la carpeta `/docs`.

Archivos sugeridos:

```text
docs/ambiente_desarrollo.md
docs/riesgo_tecnico.md
```

### Documentos pendientes

* Definición formal del ambiente de desarrollo.
* Ficha del riesgo técnico principal.
* Evidencia de ejecución del prototipo.
* Resultados de pruebas.
* Conclusión de mitigación.

---

## Gestión del proyecto

La gestión del proyecto se realiza mediante Taiga, utilizando un flujo Scrum inicial.

### Sprint actual

**Sprint 0 - Ambiente y validación técnica**

### Historia principal

**HU0 - Prototipo de mitigación del riesgo técnico principal**

### Flujo de trabajo sugerido

```text
Nueva → Lista → En desarrollo → En pruebas → Terminada
```

---

## Próximos pasos

* Completar la documentación del ambiente de desarrollo.
* Ejecutar pruebas con búsquedas de distintos dominios.
* Guardar evidencia visual y logs del prototipo.
* Documentar la conclusión de mitigación del riesgo técnico.
* Refinar el DOMAdapter para hacerlo más mantenible.
* Separar la lógica de extracción, categorización e interfaz en módulos independientes.
* Avanzar hacia el MVP de OptiSearch.

---

## Autor

Proyecto desarrollado por:

**Laura Gonzalez Vergara**

Asignatura:

**Portafolio de Proyectos**

Universidad Andrés Bello
Facultad de Ingeniería
Ingeniería en Computación e Informática
2026

---

## Licencia

Este repositorio corresponde a un proyecto académico. Su uso, modificación o distribución queda sujeto a los criterios definidos por el equipo del proyecto y la asignatura.
