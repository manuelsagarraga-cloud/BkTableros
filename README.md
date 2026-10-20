# BkTableros

Tableros de seguimiento de obra de Bauvek Construcciones. Sitio estático publicado en GitHub Pages:
https://manuelsagarraga-cloud.github.io/BkTableros/

| Página | Qué muestra | De dónde lee |
|---|---|---|
| `index.html` | Login del sitio y acceso a las herramientas | Supabase de Cómputo (login; índice privado de cronogramas) |
| `buildplan.html` | Cronogramas: Inicio por gravedad, obra (Resumen, Semana, Gantt, Abastecimiento, Curva S y demoras), Portfolio | Supabase de Cómputo, bucket privado `cronogramas`, carpeta `bauvek/` |
| `pagos.html` | Programación de pagos a proveedores de Bauvek | Supabase de Cómputo, bucket privado `pagos` (empresa bauvek o admin) |

Links públicos sin login: `buildplan.html?v=<token>` muestra la vista de cliente de una obra o la agenda de un contratista. Se crean desde **Compartir** (obra) o **Link** (Portfolio → Próximas 3 semanas), muestran el nombre, logo y color de la empresa cargados en Cómputo, y guardan una foto sin vencidas ni montos que se actualiza cada vez que alguien de Bauvek abre BuildPlan.

**Acceso:** todo el sitio es privado y de uso interno de Bauvek. Se entra con el usuario de Cómputo (una sola sesión para portada, BuildPlan, Pagos y Cómputo) y solo pasan usuarios con empresa `bauvek` o rol `admin`. Cada página vuelve a verificar la sesión y los datos están en Supabase con permisos por usuario, así que abrir una página directo no muestra nada.

**Cómputo de Obras** es una app aparte y multiempresa, enlazada desde la portada. Desde Cómputo, solo los usuarios de Bauvek ven los cronogramas de Bauvek.

## Cómo se actualiza

**Cronograma de una obra**
1. En MS Project: Archivo → Guardar como → XML. Antes, cargá el % completado y la **fecha de estado** (Proyecto → Información del proyecto).
2. En BuildPlan → **Datos** → *Subir cronogramas*. Si ya existe uno con el mismo nombre de archivo, lo reemplaza.
3. Listo: se guarda el original (lo usa Cómputo), una copia liviana para BuildPlan y se actualiza el índice con sus avisos de calidad.

**Datos de las obras (estado, comitente, ubicación, código)**
BuildPlan → **Datos** → *Subir Excel de proyectos* (se guarda como `bauvek/proyectos.xlsx`). La columna `Archivo XML` vincula cada fila con su cronograma; `Código` (RR, JS, LM…) tiene prioridad sobre los códigos cargados en el código.

**Excel de pagos**
Entrar a `pagos.html` → **↑ Actualizar Excel**.

**Configuración de Supabase**
`supabase/2026-10-20_bktableros_datos_privados.sql` crea el bucket `cronogramas`, la tabla `tendencia_obras` (foto semanal compartida), la tabla `enlaces_publicos` y la función `ver_enlace()`.

## Datos

No hay datos en este repo ni en el sitio publicado: cronogramas, Excel de proyectos y Excel de pagos están en Supabase, con acceso solo para usuarios de Bauvek (y admin). Los archivos que estuvieron en el repo hasta oct-2026 siguen en el historial de git.

## Reglas

- Nombres de archivo de los XML: como se llama la obra (`Vivienda Apellido.xml`), sin mayúsculas raras.
- Nada con datos de clientes o importes en el repo: todo lo que está acá lo puede descargar cualquiera.
- Cada herramienta es un único `.html` (React por CDN, sin build). Los cambios van directo en ese archivo.

