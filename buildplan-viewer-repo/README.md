# BuildPlan Viewer 📊

Visualizador de cronogramas de Microsoft Project para Bauvek. Solo lectura, sin base de datos.

## Cómo funciona

1. Exportá tu archivo de MS Project como XML (`Archivo → Guardar como → XML`)
2. Subí el `.xml` a la carpeta `data/projects/` de este repo
3. GitHub Actions regenera el manifiesto y redeploya automáticamente
4. Abrí el sitio y el proyecto aparece en la lista

## Estructura

```
├── data/projects/     ← XMLs de MS Project van acá
├── scripts/           ← Script que genera el manifiesto
├── .github/workflows/ ← Deploy automático
└── index.html         ← La aplicación
```

## Funcionalidades

- **Parser MSPDI completo**: tareas, jerarquía WBS, dependencias, recursos, calendarios
- **Gantt interactivo**: barras de progreso, hitos, tareas resumen, línea de hoy
- **Zoom temporal**: día / semana / mes / trimestre
- **Dashboard**: KPIs, distribución por estado, próximos hitos
- **Multi-proyecto**: varias pestañas + vista Portfolio
- **Búsqueda rápida**: Ctrl+K
- **Tema automático**: claro / oscuro según el sistema

## Requisitos

Ninguno. Es una app estática que corre 100% en el navegador.
