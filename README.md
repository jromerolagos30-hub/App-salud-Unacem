# APP Salud Ocupacional UNACEM

Aplicativo web demo para reporte diario de aptitud médica/síntomas, pensado para publicarse en GitHub Pages sin cuentas Power Apps.

## Módulos
- Portal Trabajador: ingreso por DNI, validación de datos y reporte de actividades/síntomas.
- Portal Empresa: carga manual o CSV de trabajadores.
- Dashboard: reportabilidad por empresa, condición y cumplimiento.

## Publicar en GitHub Pages
1. Crear un repositorio nuevo, por ejemplo `app-salud-unacem`.
2. Subir estos archivos en la raíz del repositorio.
3. Ir a Settings > Pages.
4. En Source seleccionar `Deploy from a branch`.
5. Branch: `main`, folder: `/root`.
6. Guardar y abrir el enlace generado por GitHub Pages.

## Nota técnica
Esta versión usa `localStorage` para prueba rápida. Para producción se recomienda conectar Supabase/Firebase para base de datos centralizada.
