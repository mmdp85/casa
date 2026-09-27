# Depto nuevo

App para organizar el equipamiento del departamento: qué hay que comprar o resolver en cada ambiente, en qué etapa está cada cosa y cuánto se lleva gastado.

## Páginas

| Archivo | Qué muestra |
|---|---|
| `index.html` | Plano con el avance de cada ambiente, números generales, alertas y próximas entregas |
| `ambientes.html` | Plano, resumen por ambiente, orden y alta de ambientes nuevos |
| `ambiente.html?id=…` | Checklist del ambiente, lista sugerida, ficha con medidas y cálculo de frigorías |
| `pendientes.html` | Tablero por etapa (Por decidir, Decidido, Comprado, Listo) con filtros |
| `gastos.html` | Presupuesto vs. estimado por ambiente y categoría, calendario de cuotas, compras más grandes |
| `config.html` | Fecha de mudanza, responsables, sincronización con GitHub, backup |

Toda la lógica de datos está en `assets/data.js`; la interfaz compartida (header, modal de ítems) en `assets/ui.js`.

## Instalación

1. Crear un repo **público** para la app (por ejemplo `casa`), subir todo el contenido de esta carpeta y activar GitHub Pages (Settings → Pages → Deploy from branch → `main` / root).
2. Crear un repo **privado** para los datos (por ejemplo `casa-datos`). Puede quedar vacío; la app crea el `casa.json` en la primera sincronización.
3. Crear un token fine-grained en GitHub (Settings → Developer settings → Personal access tokens → Fine-grained tokens):
   - Repository access: *Only select repositories* → `casa-datos`
   - Permissions → Repository permissions → **Contents: Read and write**
   - Vencimiento: el que prefieras (cuando vence, la app avisa y se carga uno nuevo en Ajustes)
4. Abrir la app → Ajustes → cargar usuario, repo de datos y token → **Guardar y sincronizar**. Repetir el paso 4 una vez en cada dispositivo.

Sin token la app funciona igual, guardando en el navegador de ese dispositivo.

## Cómo guarda

- Cada cambio se guarda al instante en el navegador y a los 1,5 segundos se sube a GitHub como commit.
- Al abrir cualquier página trae la última versión del repo. Si hubo cambios en dos dispositivos, se combinan ítem por ítem (gana la edición más reciente de cada uno).
- El historial de commits de `casa-datos` es el backup: cualquier versión anterior se puede recuperar desde GitHub.

## Criterios de cálculo

- **Moneda base: US$.** Lo cargado en pesos se convierte al TC cargado en el ítem (por defecto, el MEP de dolarapi.com al momento de cargarlo).
- **Estimado** = precio real si existe; si no, el presupuesto.
- **Ahorro** = (presupuesto − estimado) / presupuesto, solo sobre ítems con presupuesto. Positivo = por debajo del presupuesto.
- **Resuelto**: una compra desde la etapa Comprado; una tarea cuando está Hecha.
- **Cuotas**: si no se carga la primera cuota, cuenta desde el mes siguiente a la compra. Las cuotas de meses anteriores cuentan como pagadas.
- **Frigorías**: m² × altura × 50, +15% con ventana al norte u oeste, +15% con techo al sol; se redondea al split estándar siguiente (2.250, 3.000, 4.500, 5.500, 6.000, 9.000). Es una estimación: confirmar con el instalador.
