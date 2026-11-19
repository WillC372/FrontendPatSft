# Equipo de ingeniería de Aqua Assistant AI

Un equipo multiagente (Claude Code) que trabaja como el departamento de ingeniería del producto: analiza, audita, corrige, optimiza y mejora **el software que ya existe** en los cuatro repositorios. No construye otra versión de Aqua Assistant AI.

## Cómo se usa

Abre Claude Code con los cuatro repositorios lado a lado (por ejemplo, una carpeta con `frontendpatsft`, `backendpatsft`, `aipatsft` y `dbpatsft`) y escribe:

| Comando | Qué hace |
|---|---|
| `/equipo-ingenieria auditar` | Los especialistas analizan todo (o un área: `auditar seguridad`, `auditar AIPatSft`…) en solo lectura; el coordinador verifica la evidencia, clasifica y registra los hallazgos y te pide autorización. No cambia código. |
| `/equipo-ingenieria corregir H-012 H-015` | Corrige los hallazgos que autorizas: rama `mejora/H-XXX-...`, pruebas antes y después, prueba nueva, revisión de regresiones y pull request. No hace merge. |
| `/equipo-ingenieria verificar H-012` | Después de que hagas el merge, comprueba en la app publicada que funciona y que nada se rompió. |
| `/equipo-ingenieria estado` | Resumen de hallazgos, aprobaciones pendientes y pull requests abiertos. |

También puedes llamar a un especialista directamente, por ejemplo: «usa el auditor-seguridad para revisar las rutas de lugares compartidos».

## Especialistas (`.claude/agents/`)

| Agente | Área |
|---|---|
| `arquitecto-integracion` | Arquitectura, contratos entre los cuatro repositorios, duplicación, malas prácticas, propuestas estructurales |
| `auditor-seguridad` | Autenticación, autorización, inyección, XSS, CORS, CSP, secretos, dependencias, datos personales |
| `ingeniero-backend` | BackendPatSft |
| `ingeniero-frontend-ux` | FrontendPatSft: interfaz, flujos, accesibilidad, idiomas (sin cambiar la identidad visual) |
| `ingeniero-ia` | AIPatSft: modelos, prompts, RAG, respaldos, cuota y costos |
| `ingeniero-datos` | DBPatSft y el uso de la base: integridad, migraciones, índices |
| `ingeniero-rendimiento` | Tiempos, memoria, consultas, límites de los planes gratuitos |
| `ingeniero-qa` | Pruebas antes y después, regresiones, comprobación de punta a punta |
| `documentador-tecnico` | README, requerimientos e Issues, este registro |

## Ciclo de un hallazgo

`Nuevo` → (tú lo autorizas) `Aprobado` → `En corrección` → `En revisión (PR #…)` → (tú haces el merge) → `Resuelto` tras la verificación. También `Descartado` (con el motivo) o `Requiere propuesta` si es estructural.

Para autorizar basta con decirlo en la conversación («autorizo H-012») o cambiar el estado a `Aprobado` en `hallazgos.md`. Un cambio estructural necesita además que apruebes su propuesta en `propuestas/H-XXX.md`.

## Protección del software

- **Nada en `main`**: `.claude/hooks/proteger-main.mjs` (FrontendPatSft y DBPatSft) y su copia en Java `.claude/hooks/ProtegerMain.java` (BackendPatSft y AIPatSft, para que sigan siendo solo Java) bloquea commits y pushes a `main`, push forzado, borrar ramas y `reset --hard`. Las correcciones llegan como pull request.
- **Sin despliegues sin autorización**: Render y la base (Neon) solo se actualizan desde `main`; las ramas solo generan vistas previas en Vercel y pruebas en GitHub Actions (las migraciones de un pull request se prueban en una base vacía, no en Neon). El merge, que publica, es tuyo.
- Sin cambios en credenciales, secretos ni configuración de Render, Vercel, Neon o GitHub.
- Base de datos: solo migraciones nuevas y aditivas; nada destructivo sin aprobación.
- Pruebas antes y después con sus números; cada cambio en `registro-de-cambios.md` con cómo revertirlo (cerrar el pull request antes del merge, o `git revert` del merge en una rama nueva después).
- No se eliminan funcionalidades que funcionan ni se cambia la identidad visual o la navegación sin tu aprobación.

## Archivos

- `hallazgos.md`: registro de hallazgos clasificados.
- `registro-de-cambios.md`: cada modificación del equipo.
- `plantilla-propuesta.md` y `propuestas/`: cambios estructurales para aprobar.
- `../../scripts/sync-equipo.sh`: copia los agentes, el coordinador y el control de `main` de este repositorio a los otros tres (el original está aquí).
