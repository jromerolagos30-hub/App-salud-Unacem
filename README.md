# APP Salud Ocupacional UNACEM - Google Sheets

## 1. Preparar Google Sheet
Usa el archivo:
https://docs.google.com/spreadsheets/d/1_iaQ5gpJpYxVKAz2hmYmiVij6JirzgLH9bwdjfKPmvs/edit

El Apps Script creará automáticamente estas hojas si no existen:
- Trabajadores
- Reportes

## 2. Instalar Apps Script
1. Abrir Google Sheet.
2. Extensiones → Apps Script.
3. Pegar el contenido de `apps-script/Code.gs`.
4. Guardar.
5. Implementar → Nueva implementación.
6. Tipo: Aplicación web.
7. Ejecutar como: Yo.
8. Quién tiene acceso: Cualquier persona.
9. Copiar la URL terminada en `/exec`.

## 3. Configurar la web
Abrir `config.js` y reemplazar:
`PEGAR_AQUI_URL_APPS_SCRIPT`
por la URL de Apps Script.

## 4. Subir a GitHub
Subir estos archivos al repositorio:
- index.html
- styles.css
- app.js
- config.js
- README.md

## 5. Activar GitHub Pages
Settings → Pages → Deploy from branch → main → /(root) → Save.

## Flujo
- Empresa/Contrata carga o actualiza master de trabajadores.
- Trabajador ingresa DNI y reporta síntomas diarios.
- Dashboard lee los reportes desde Google Sheets.


## V3 - Validador de permiso de altura
Incluye pantalla **Validar permiso** para tomar foto del permiso, leer varios DNI mediante OCR y comparar contra los reportes del día en Google Sheets.

IMPORTANTE: actualizar el Apps Script con el nuevo `apps-script/Code.gs` y volver a implementar la aplicación web para que funcione la acción `validarPermiso`.
