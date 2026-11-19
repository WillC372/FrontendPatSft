# Hallazgos del equipo de ingeniería

Severidad: **Crítica** (pérdida de datos, fallo de seguridad explotable o caída en producción) · **Alta** (una función principal falla o riesgo serio) · **Media** (falla parcial o deuda que ya cuesta) · **Baja** (mejora o detalle).

Estados: `Nuevo` · `Aprobado` · `Requiere propuesta` · `En corrección` · `En revisión (PR …)` · `Resuelto` · `Descartado`.

## Resumen

> Primera auditoría (19 nov 2026), modo `auditar`, en solo lectura. Completaron su revisión los especialistas de **base de datos** y de **arquitectura e integración**; los de seguridad, backend, frontend y experiencia de usuario, IA, rendimiento y pruebas se interrumpieron por el límite de uso de la cuenta y quedan pendientes (`/equipo-ingenieria auditar seguridad`, etc.). Los hallazgos de severidad Alta se verificaron en el código. Línea base de pruebas (mismo código de `main`): frontend 56, backend 112 y servicio de IA 123, todas aprobadas; migraciones verificadas en GitHub Actions.


| ID | Título | Repositorio | Tipo | Severidad | Estructural | Estado |
|---|---|---|---|---|---|---|
| H-001 | Premium puede aplicarse dos veces si el retorno de PayU y la confirmación llegan a la vez | BackendPatSft | error | Alta | no | Nuevo |
| H-002 | Borrar la cuenta falla si un lugar ajeno usa un perfil personalizado suyo | BackendPatSft · DBPatSft | error | Alta | no | Nuevo |
| H-003 | El backend y el servicio de IA aplican reglas distintas de cambio brusco y dan severidades opuestas | AIPatSft · BackendPatSft | IA / arquitectura | Alta | no (cambia el comportamiento de los análisis: validar) | Nuevo |
| H-004 | Al borrar la cuenta de un miembro EDITOR se borran sus mediciones y tratamientos del lugar compartido | DBPatSft · BackendPatSft | datos | Media | sí (decisión de producto y privacidad) | Nuevo |
| H-005 | Una lectura por foto se pierde si el backend no la acepta, y el botón queda desactivado | AIPatSft · FrontendPatSft | error | Media | no | Nuevo |
| H-006 | La entidad Alert del servicio de IA no tiene `kind` y la explicación de alarmas acepta cualquier alerta y recalcula el peligro | AIPatSft | incompleto | Media | no | Nuevo |
| H-007 | La consulta de alertas no leídas (cada 15 s) no tiene índice adecuado | DBPatSft | rendimiento | Media | no | Nuevo |
| H-008 | Claves foráneas sin índice que hacen lentos los borrados y algunas consultas | DBPatSft | rendimiento | Media | no | Nuevo |
| H-009 | Columnas de enums sin CHECK en la base | DBPatSft | datos | Media | no | Nuevo |
| H-010 | Tablas que crecen sin límite ni política de retención | DBPatSft · BackendPatSft · AIPatSft | rendimiento | Media | sí (borrado masivo) | Nuevo |
| H-011 | Unas 90 clases copiadas entre backend e IA sin nada que las mantenga iguales; la IA conserva código muerto que escribe en tablas ajenas | AIPatSft · BackendPatSft | duplicado / arquitectura | Media | sí para un módulo común; no para quitar código muerto | Nuevo |
| H-012 | Nada impide desplegar un servicio antes de aplicar la migración que necesita | DBPatSft · BackendPatSft · AIPatSft | arquitectura / pruebas | Media | no | Nuevo |
| H-013 | Pagos sin CHECK de importe, periodo y moneda | DBPatSft | datos | Baja | no | Nuevo |
| H-014 | Traducciones de más de 4000 caracteres no se guardan | AIPatSft | error | Baja | no | Nuevo |
| H-015 | Posible doble creación de «Mi agua» (por confirmar) | BackendPatSft · AIPatSft | error | Baja | no | Nuevo |
| H-016 | El aviso push de una alarma puede tardar ~35 s si el servicio de IA está dormido | BackendPatSft | rendimiento | Baja | no | Nuevo |
| H-017 | `docs/Architecture.md` del backend describe el monolito anterior | BackendPatSft | documentación | Baja | no | Nuevo |
| H-018 | El README del servicio de IA y `Esquema.md` contradicen el código | AIPatSft · DBPatSft | documentación | Baja | no | Nuevo |

## Detalle

### H-001 · Premium puede aplicarse dos veces si el retorno de PayU y la confirmación llegan a la vez
- Repositorio: BackendPatSft · Tipo: error · Severidad: **Alta** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo
- Evidencia: `payment/PaymentService.java` (verify/confirm leen con `findByReferenceCode` sin bloqueo; `reconcile` llama a `applyPremium` → `extendPremium`); `Payment` sin `@Version` (V9 sin columna de versión). Con READ COMMITTED, dos transacciones que leen PENDING extienden Premium dos veces. Verificado en el código; reproducción por confirmar.
- Impacto: Un pago extiende Premium el doble, dos correos y dos registros PREMIUM_PAID.
- Propuesta: Bloqueo `@Lock(PESSIMISTIC_WRITE)` en una variante de `findByReferenceCode` usada por `reconcile` (solo código) y prueba de concurrencia.

### H-002 · Borrar la cuenta falla si un lugar ajeno usa un perfil personalizado suyo
- Repositorio: BackendPatSft · DBPatSft · Tipo: error · Severidad: **Alta** · Estructural: no · Esfuerzo: M · Riesgo de regresión: medio · Estado: Nuevo
- Evidencia: `PlaceService.profileFor` acepta perfiles visibles para el editor (`isVisibleTo(userId)`), no para el dueño; `water_profiles.owner_id` ON DELETE CASCADE (V1:16) pero `places.profile_id` (V18:10) y `measurements.profile_id` (V1:58) sin ON DELETE; `AccountDeletionService` solo hace `users.delete`. Reproducido en H2: violación de integridad de `places.profile_id`.
- Impacto: El miembro EDITOR no puede eliminar su cuenta; el dueño queda con un perfil que no ve ni edita.
- Propuesta: `profileFor` solo acepta perfiles del sistema o del dueño del lugar; antes de borrar la cuenta, pasar los lugares ajenos que usen sus perfiles al perfil general (como `ProfileService.delete`). Las mediciones ajenas con ese perfil: decisión pendiente (ver H-004).

### H-003 · El backend y el servicio de IA aplican reglas distintas de cambio brusco y dan severidades opuestas
- Repositorio: AIPatSft · BackendPatSft · Tipo: IA / arquitectura · Severidad: **Alta** · Estructural: no (cambia el comportamiento de los análisis: validar) · Esfuerzo: S · Riesgo de regresión: medio · Estado: Nuevo
- Evidencia: Backend: `alert/analysis/PhAlterationRule.java` (última hora, severidad por el perfil). IA: `intelligence/analysis/SuddenChangeRule.java` (solo la medición anterior, CRITICAL desde 1,0). Ejemplos: perfil general 7,0→8,1 = alarma CAUTION en backend y «Cambio brusco» CRITICAL en IA; piscina 7,5→8,1 = CRITICAL en backend y CAUTION en IA; subida gradual 7,0→7,6 suena en backend y la IA no la ve. El informe muestra ambas (`report/ReportService.java:110-116`).
- Impacto: Diagnóstico, agente, informe y anomalías pueden contradecir la alarma (rompe «la IA nunca contradice el veredicto del sistema»).
- Propuesta: Llevar `PhAlterationRule` al servicio de IA en lugar de `SuddenChangeRule` (tipo `PH_ALTERATION`) con pruebas de los ejemplos.

### H-004 · Al borrar la cuenta de un miembro EDITOR se borran sus mediciones y tratamientos del lugar compartido
- Repositorio: DBPatSft · BackendPatSft · Tipo: datos · Severidad: **Media** · Estructural: sí (decisión de producto y privacidad) · Esfuerzo: M · Riesgo de regresión: medio · Estado: Nuevo
- Evidencia: `measurements.user_id` y `treatments.user_id` con ON DELETE CASCADE (V1:56, V19:7); las alertas del dueño quedan con `measurement_id` NULL.
- Impacto: El historial del dueño pierde datos en silencio.
- Propuesta: A: reasignar al dueño del lugar las filas del miembro en lugares ajenos antes de borrar (solo código). B: `user_id` nullable con SET NULL (destructivo, requiere aprobación).

### H-005 · Una lectura por foto se pierde si el backend no la acepta, y el botón queda desactivado
- Repositorio: AIPatSft · FrontendPatSft · Tipo: error · Severidad: **Media** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo
- Evidencia: `vision/PhotoReadingService.java:119` borra la lectura pendiente antes de llamar al backend (`:130`); si falla (502, 422, 403 o backend dormido con más de 60 s, `BackendClient.java:49`), el reintento da 404. `PhotoFlow.js:190` usa `event.currentTarget` después de un `await` (vale null → TypeError).
- Impacto: Hay que volver a analizar la foto (gasta cuota) y el mensaje confunde.
- Propuesta: Quitar la pendiente solo tras una respuesta 2xx, con un reintento corto en 502/503; en el frontend guardar el botón antes del `await`.

### H-006 · La entidad Alert del servicio de IA no tiene `kind` y la explicación de alarmas acepta cualquier alerta y recalcula el peligro
- Repositorio: AIPatSft · Tipo: incompleto · Severidad: **Media** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo
- Evidencia: `aipatsft/.../alert/Alert.java` y `AlertResponse` sin `kind` (V26); `AlarmExplainer.java:117-119` no comprueba el tipo y vuelve a clasificar con el perfil actual (`:94,130`), mientras el aviso usa `alert.severity`.
- Impacto: Un valor atípico se explica como alarma; si cambió el perfil, «Aqua explica» puede contradecir «Es peligroso».
- Propuesta: Mapear `kind` (solo lectura), responder 422 si no es `PH_ALTERATION` y usar la severidad de la alerta como veredicto.

### H-007 · La consulta de alertas no leídas (cada 15 s) no tiene índice adecuado
- Repositorio: DBPatSft · Tipo: rendimiento · Severidad: **Media** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo
- Evidencia: `Shell.js` consulta `/alerts?unreadOnly=true` cada 15 s → `findByUserIdAndReadFalseOrderByCreatedAtDesc`; solo existe `ix_alerts_user_time (user_id, created_at DESC)` (V1:83).
- Impacto: El costo crece con el historial de alertas de cada persona.
- Propuesta: Migración aditiva: `CREATE INDEX ix_alerts_user_unread ON alerts (user_id, is_read, created_at DESC)`.

### H-008 · Claves foráneas sin índice que hacen lentos los borrados y algunas consultas
- Repositorio: DBPatSft · Tipo: rendimiento · Severidad: **Media** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo
- Evidencia: Sin índice: `alerts.measurement_id`, `measurements.device_id`, `measurements.profile_id`, `places.profile_id`, `treatments.user_id`, `reminders.user_id`, `reminders.place_id`, `user_settings.active_place_id/active_profile_id`. `OfficialDataService.remove` borra hasta ~720 mediciones y cada una busca en `alerts` por `measurement_id`.
- Impacto: Borrados de lugares, cuentas y datos oficiales cada vez más lentos.
- Propuesta: Migración aditiva con esos índices.

### H-009 · Columnas de enums sin CHECK en la base
- Repositorio: DBPatSft · Tipo: datos · Severidad: **Media** · Estructural: no · Esfuerzo: S · Riesgo de regresión: medio · Estado: Nuevo
- Evidencia: `alerts.severity` y `alerts.kind`, `measurements.nature/status/validation_status`, `water_profiles.type`, `devices.protocol`, `treatments.product`, `reminders.kind`, `calibrations.point`, `user_sessions.end_reason`. H2 aceptó valores inventados.
- Impacto: Un valor inválido rompe el listado completo al leer el enum.
- Propuesta: Migración aditiva con `CHECK (col IS NULL OR col IN (...))`, después de un `SELECT DISTINCT` de solo lectura en producción para confirmar los valores existentes.

### H-010 · Tablas que crecen sin límite ni política de retención
- Repositorio: DBPatSft · BackendPatSft · AIPatSft · Tipo: rendimiento · Severidad: **Media** · Estructural: sí (borrado masivo) · Esfuerzo: M · Riesgo de regresión: medio · Estado: Nuevo
- Evidencia: `audit_log` (una fila por medición), `ai_usage` (también con caché), `user_sessions`, `alerts`, `ai_diagnoses`, `agent_reports` sin tope; `AiUsageService.global` carga 90 días en memoria.
- Impacto: Almacenamiento en Neon, consultas de administración lentas y riesgo de memoria.
- Propuesta: Trabajo de retención con plazos por tabla e índices por `created_at` (la purga requiere aprobación).

### H-011 · Unas 90 clases copiadas entre backend e IA sin nada que las mantenga iguales; la IA conserva código muerto que escribe en tablas ajenas
- Repositorio: AIPatSft · BackendPatSft · Tipo: duplicado / arquitectura · Severidad: **Media** · Estructural: sí para un módulo común; no para quitar código muerto · Esfuerzo: M · Riesgo de regresión: medio · Estado: Nuevo
- Evidencia: 91 archivos con el mismo nombre (77 idénticos: JwtService, filtros, InternalKey, User, Measurement, Place, PlaceAccess, ProfileService, validación); la IA crea lugares y perfiles y marca alertas (`PlaceAccess.java:77,88`, `ProfileService.java:68,93,110`, `AlertRepository` `markAllRead`); DTO de autenticación sin uso; `spring.servlet.locations` mal ubicado en los dos `application.yml`.
- Impacto: Cada cambio se hace dos veces y las copias ya se separaron (H-006 es consecuencia).
- Propuesta: Corto plazo: quitar el código muerto y las escrituras ajenas de la IA y comprobar en CI que las clases compartidas no difieran. Mediano plazo: módulo Maven común (propuesta).

### H-012 · Nada impide desplegar un servicio antes de aplicar la migración que necesita
- Repositorio: DBPatSft · BackendPatSft · AIPatSft · Tipo: arquitectura / pruebas · Severidad: **Media** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo
- Evidencia: El orden «base → servicio» solo está escrito; los servicios arrancan con Flyway apagado y `ddl-auto: none`, también en las pruebas. Si el backend con `Alert.kind` llega antes que V26, guardar mediciones fallaría (deducido del código).
- Impacto: Un merge en el orden equivocado tumba el registro de mediciones.
- Propuesta: `ddl-auto: validate` en las pruebas y, al arrancar, comprobar la versión de `flyway_schema_history` frente a la esperada.

### H-013 · Pagos sin CHECK de importe, periodo y moneda
- Repositorio: DBPatSft · Tipo: datos · Severidad: **Baja** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo
- Evidencia: V9:12-14; H2 aceptó `amount=-5`, `period_days=-1`.
- Impacto: Un periodo ≤ 0 llamaría a `extendPremium` con duración negativa.
- Propuesta: Migración aditiva con CHECK, si los datos cumplen.

### H-014 · Traducciones de más de 4000 caracteres no se guardan
- Repositorio: AIPatSft · Tipo: error · Severidad: **Baja** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo
- Evidencia: `ui_translations.target_text VARCHAR(4000)` (V20:10) y `TranslationService` acepta hasta 4500; el error de integridad se trata como duplicado.
- Impacto: La traducción se pierde al reiniciar y se vuelve a pedir (gasta cuota).
- Propuesta: Limitar a 4000 en el código.

### H-015 · Posible doble creación de «Mi agua» (por confirmar)
- Repositorio: BackendPatSft · AIPatSft · Tipo: error · Severidad: **Baja** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo
- Evidencia: `PlaceAccess.provision` en los dos servicios: «si no tiene lugar, lo crea» sin bloqueo.
- Impacto: Dos lugares por defecto para una cuenta.
- Propuesta: Bloquear la fila del usuario antes de comprobar (o quitar la creación del servicio de IA, ver H-011).

### H-016 · El aviso push de una alarma puede tardar ~35 s si el servicio de IA está dormido
- Repositorio: BackendPatSft · Tipo: rendimiento · Severidad: **Baja** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo
- Evidencia: `Notifier` traduce antes de enviar; `TranslationClient` espera hasta 10 s + 25 s.
- Impacto: Para quien no usa español, la primera alarma con un texto nuevo llega tarde.
- Propuesta: Si es alarma, enviar con lo que ya hay en la tabla y traducir en segundo plano.

### H-017 · `docs/Architecture.md` del backend describe el monolito anterior
- Repositorio: BackendPatSft · Tipo: documentación · Severidad: **Baja** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo
- Evidencia: Dibuja la IA dentro del backend; CHECK de origen y `alerts` desactualizados; no documenta `/internal/*` ni la sesión compartida.
- Impacto: Se entiende mal el sistema actual.
- Propuesta: Rehacer el diagrama con los cuatro repositorios y los contratos internos.

### H-018 · El README del servicio de IA y `Esquema.md` contradicen el código
- Repositorio: AIPatSft · DBPatSft · Tipo: documentación · Severidad: **Baja** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo
- Evidencia: README de IA: «backend siempre despierto» y «cambio brusco»; `Esquema.md`: quién escribe `audit_log` y lecturas de `reference_*` y `ui_translations`.
- Impacto: Expectativas falsas.
- Propuesta: Corregir esos puntos.
