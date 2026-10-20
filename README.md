# BkTableros

Tableros de seguimiento de obra de Bauvek Construcciones. Sitio estático publicado en GitHub Pages:
https://manuelsagarraga-cloud.github.io/BkTableros/

| Página | Qué muestra | De dónde lee |
|---|---|---|
| `index.html` | Portada con acceso a las herramientas | `data/manifest.json` (fecha de publicación) |
| `buildplan.html` | Cronogramas: Inicio por gravedad, obra (Resumen, Semana, Gantt, Abastecimiento, Curva S y demoras), Portfolio | Supabase de Cómputo, bucket privado `cronogramas`, carpeta de la empresa del usuario (login con usuario de Cómputo; el admin elige la empresa) |
| `pagos.html` | Programación de pagos a proveedores de Bauvek | Supabase de Cómputo, bucket privado `pagos` (empresa bauvek o admin) |

Links públicos sin login: `buildplan.html?v=<token>` muestra la vista de cliente de una obra o la agenda de un contratista. Se crean desde **Compartir** (obra) o **Link** (Portfolio → Próximas 3 semanas), muestran el nombre, logo y color de la empresa cargados en Cómputo, y guardan una foto sin vencidas ni montos que se actualiza cada vez que alguien de la empresa abre BuildPlan.

**Multiempresa:** cada usuario ve los cronogramas, la tendencia y los links de su empresa (`app_metadata.empresa`, igual que en Cómputo). Una empresa nueva empieza vacía y sube sus XML desde **Datos**.

## Cómo se actualiza

**Cronograma de una obra**
1. En MS Project: Archivo → Guardar como → XML. Antes, cargá el % completado y la **fecha de estado** (Proyecto → Información del proyecto).
2. En BuildPlan → **Datos** → *Subir cronogramas*. Si ya existe uno con el mismo nombre de archivo, lo reemplaza.
3. Listo: se guarda el original (lo usa Cómputo), una copia liviana para BuildPlan y se actualiza el índice con sus avisos de calidad.

**Datos de las obras (estado, comitente, ubicación, código)**
BuildPlan → **Datos** → *Subir Excel de proyectos* (mismo formato que `Proyectos_Bauvek.xlsx`; se guarda como `<empresa>/proyectos.xlsx`). La columna `Archivo XML` vincula cada fila con su cronograma; `Código` (RR, JS, LM…) tiene prioridad sobre los códigos cargados en el código.

**Excel de pagos**
Entrar a `pagos.html` → **↑ Actualizar Excel**.

**Configuración de Supabase**
`supabase/2026-10-20_bktableros_datos_privados.sql` crea el bucket `cronogramas`, la tabla `tendencia_obras` (foto semanal compartida), la tabla `enlaces_publicos` y la función `ver_enlace()`.

## Migración (oct-2026)

Mientras la carpeta de Bauvek en el bucket esté vacía, BuildPlan (solo para Bauvek) sigue leyendo `data/projects/` del repo y muestra **⚠ Datos** en el encabezado. Desde ahí, *Copiar todo desde el repo* sube los XML y el Excel de proyectos al bucket. Después de verificar, se borran `data/projects/*.xml` y `data/Proyectos_Bauvek.xlsx` del repo. Ojo: siguen en el historial de git hasta que se reescriba.

## Reglas

- Nombres de archivo de los XML: como se llama la obra (`Vivienda Apellido.xml`), sin mayúsculas raras.
- Nada con datos de clientes o importes en el repo: todo lo que está acá lo puede descargar cualquiera.
- Cada herramienta es un único `.html` (React por CDN, sin build). Los cambios van directo en ese archivo.

## Scripts

- `scripts/generate-manifest.js` — índice de cronogramas con huella (`hash`) y avisos de calidad.
- `scripts/build-lite.js` — copia de los XML sin `TimephasedData` (~4 veces más livianos) para BuildPlan. Los originales quedan intactos porque los usa Cómputo de Obras.
