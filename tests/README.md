# Pruebas de BkTableros

Corren solas en cada push a `main`, antes de publicar. Si alguna falla, el deploy se corta y el sitio queda como estaba.

Qué prueban:
- `buildplan.html` compila (un error de JSX deja la página en blanco).
- El lector de MS Project con `fixtures/obra-prueba.xml`: tareas, jerarquía, N° Item, línea base, recursos, contratistas, fecha de estado.
- El semáforo: tarea "contratada", tarea de obra, standby, desvío bruto y neto, vencidas, avance contra plan, demoras.
- El reconocimiento de directores de obra.

El cronograma de prueba es inventado: no tiene datos de clientes. Si se cambia una regla a propósito
(por ejemplo, cómo se cuentan las vencidas), hay que actualizar el resultado esperado en `run.mjs`.

Para correrlas en la compu:
```
npm i --no-save @babel/standalone@7.23.9 @xmldom/xmldom@0.8.10
node tests/run.mjs
```
