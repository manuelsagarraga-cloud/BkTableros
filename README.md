# BkTableros

Tableros de seguimiento de obra de Bauvek Construcciones. Sitio estático publicado en GitHub Pages:
https://manuelsagarraga-cloud.github.io/BkTableros/

| Página | Qué muestra | De dónde lee |
|---|---|---|
| `index.html` | Portada con acceso a las herramientas | — |
| `buildplan.html` | Cronogramas: Gantt por obra, Gantt de obras (portfolio), vencidas por responsable, semáforo, materiales | XML de MS Project en `data/projects/` + `data/Proyectos_Bauvek.xlsx` + Supabase de Cómputo (materiales, con login) |
| `pagos.html` | Programación de pagos a proveedores | Excel en el Supabase de Cómputo, bucket privado `pagos` (login con usuario de Cómputo: empresa bauvek o admin) |

## Cómo se actualiza

**Cronograma de una obra**
1. En MS Project: Archivo → Guardar como → XML.
2. Subir el `.xml` a `data/projects/` (Add file → Upload files). Si ya existe, reemplazarlo con el mismo nombre.
3. El deploy corre solo (~1 min): regenera `data/manifest.json`, arma copias livianas para BuildPlan y publica.
4. Si el XML tiene problemas (tareas sin nombre, sin línea base, caracteres inválidos), el deploy los marca como aviso en la pestaña Actions y en la tarjeta de la obra.

**Datos de las obras (estado, comitente, ubicación, código)**
Editar `data/Proyectos_Bauvek.xlsx`. La columna `Archivo XML` vincula cada fila con su cronograma; la columna `Código` (RR, JS, LM…) tiene prioridad sobre los códigos cargados en el código.

**Excel de pagos**
Entrar a `pagos.html` → **↑ Actualizar Excel** → elegir el archivo. Reemplaza al anterior para todos. El Excel ya no se sube al repo: el repo es público.

## Reglas

- Nombres de archivo de los XML: como se llama la obra (`Vivienda Apellido.xml`), sin mayúsculas raras.
- Nada con datos de clientes o importes en el repo: todo lo que está acá lo puede descargar cualquiera.
- Cada herramienta es un único `.html` (React por CDN, sin build). Los cambios van directo en ese archivo.

## Scripts

- `scripts/generate-manifest.js` — índice de cronogramas con huella (`hash`) y avisos de calidad.
- `scripts/build-lite.js` — copia de los XML sin `TimephasedData` (~4 veces más livianos) para BuildPlan. Los originales quedan intactos porque los usa Cómputo de Obras.
