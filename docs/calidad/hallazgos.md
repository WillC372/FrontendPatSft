# Hallazgos del equipo de ingeniería

Severidad: **Crítica** (pérdida de datos, fallo de seguridad explotable o caída en producción) · **Alta** (una función principal falla o riesgo serio) · **Media** (falla parcial o deuda que ya cuesta) · **Baja** (mejora o detalle).

Estados: `Nuevo` · `Aprobado` · `Requiere propuesta` · `En corrección` · `En revisión (PR …)` · `Resuelto` · `Descartado`.

## Resumen

> Primera auditoría (19 nov 2026), modo `auditar`, en solo lectura, completa con los ocho especialistas: base de datos, arquitectura e integración, seguridad, backend, frontend y experiencia de usuario, IA, rendimiento y pruebas. Los hallazgos repetidos entre especialistas se unieron en uno. 50 hallazgos: 1 crítico, 12 altos, 24 medios y 13 bajos (H-051 lo pidió después el dueño). Línea base de pruebas (mismo código de `main`): frontend 56, backend 112 y servicio de IA 123, todas aprobadas; migraciones verificadas en GitHub Actions.
>
> Resueltos con merge (al 20 nov): H-001, H-002, H-003, H-019 y H-051 a H-062. H-024 se corrigió en la rama del equipo. Del 053 al 062 son pedidos y errores que aparecieron después de la auditoría. Los demás siguen como «Nuevo» y esperan la decisión del dueño.

| ID | Título | Repositorio | Tipo | Severidad | Estructural | Estado |
|---|---|---|---|---|---|---|
| H-001 | Premium puede aplicarse dos veces si el retorno de PayU y la confirmación llegan a la vez | BackendPatSft | error | Alta | no | Resuelto (BackendPatSft#3) |
| H-002 | Borrar la cuenta falla si un lugar ajeno usa un perfil personalizado suyo | BackendPatSft · DBPatSft | error | Alta | no | Resuelto (BackendPatSft#4) |
| H-003 | El backend y el servicio de IA aplican reglas distintas de cambio brusco y dan severidades opuestas | AIPatSft · BackendPatSft | IA / arquitectura | Alta | no (cambia el comportamiento de los análisis: validar) | Resuelto (AIPatSft#2) |
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
| H-019 | La cuenta pública de administrador de demostración ve los correos reales y tiene IA ilimitada | AIPatSft | seguridad | Crítica | no | Resuelto (AIPatSft#3) |
| H-020 | Los datos oficiales del USGS cargados en un lugar disparan alarmas falsas y se mezclan con las mediciones propias en los modelos | BackendPatSft · AIPatSft | error / IA | Alta | no | Nuevo |
| H-021 | Los recordatorios ya avisados y no marcados como hechos bloquean el envío de todos los demás | BackendPatSft | error | Alta | no | Nuevo |
| H-022 | Las consultas de 2000 mediciones se quedan con las más antiguas (gráfica, entrenamiento de modelos) | BackendPatSft · AIPatSft | error / rendimiento | Alta | no | Nuevo |
| H-023 | Textos personales llegan al traductor con IA y quedan en el diccionario público | AIPatSft · FrontendPatSft | seguridad / privacidad | Alta | no | Nuevo |
| H-024 | El control que protege `main` se saltaba con variantes comunes de git y no tenía pruebas | Los cuatro (`.claude/hooks`) | seguridad del proceso | Alta | no | Resuelto (rama `equipo-ingenieria`) |
| H-025 | El texto de la IA puede rebajar un veredicto CRITICAL (alarma y validador) y la prueba solo cubre el caso feliz | AIPatSft | IA | Alta | no | Nuevo |
| H-026 | El escaneo de anomalías hace 2 consultas por medición y puede reentrenar Isolation Forest una vez por medición | AIPatSft | rendimiento | Alta | no | Nuevo |
| H-027 | La regresión predice desde «ahora» aunque los datos tengan semanas | AIPatSft | IA | Alta | no | Nuevo |
| H-028 | Nadie prueba que la alarma llegue a los demás miembros de un lugar compartido ni la deduplicación | BackendPatSft | pruebas | Alta | no | Nuevo |
| H-029 | Un solo hilo para todas las tareas programadas: la importación del USGS retrasa recordatorios y pagos | BackendPatSft | rendimiento | Media | no | Nuevo |
| H-030 | Una medición manual con fecha pasada genera una alerta crítica con aviso al teléfono y correo | BackendPatSft | error | Media | no | Nuevo |
| H-031 | La cuota diaria de IA se salta con peticiones simultáneas | AIPatSft | seguridad | Media | no | Nuevo |
| H-032 | El traductor abierto sin sesión permite agotar y llenar el diccionario compartido | AIPatSft | seguridad | Media | no | Nuevo |
| H-033 | Un EDITOR puede redefinir los rangos del lugar del dueño y meter texto en los prompts | BackendPatSft · AIPatSft | seguridad | Media | no | Nuevo |
| H-034 | El sondeo de alertas cada 15 s no se pausa nunca y mantiene despiertos Render y Neon | FrontendPatSft | rendimiento | Media | no | Nuevo |
| H-035 | La LSTM se entrena en el hilo de la petición (~5 s de CPU) y se descarta con cada medición nueva | AIPatSft | rendimiento | Media | no | Nuevo |
| H-036 | El health check de Render consulta la base de datos (por confirmar con qué frecuencia) | BackendPatSft · AIPatSft | rendimiento | Media | no | Nuevo |
| H-037 | La evaluación de la LSTM usa datos del futuro al interpolar huecos | AIPatSft | IA | Media | no | Nuevo |
| H-038 | Diagnóstico, alarma, chat y conclusión sin control de cifras ni de dosis; FigureCheck incompleto | AIPatSft | IA | Media | no | Nuevo |
| H-039 | La CI no detecta que las copias de migraciones o de clases se desincronicen de DBPatSft | Los cuatro | pruebas / arquitectura | Media | no | Nuevo |
| H-040 | `ReferenceDataImportTest` pasa por la razón equivocada y la deduplicación del importador no deduplica | BackendPatSft | pruebas / error | Media | no | Nuevo |
| H-041 | La prueba de recordatorios no verifica lo que promete y puede ser frágil por la base H2 compartida | BackendPatSft | pruebas | Media | no | Nuevo |
| H-042 | Si una carga falla después de cambiar de pantalla, el error tapa la pantalla nueva | FrontendPatSft | error | Media | no | Nuevo |
| H-043 | Si no se puede guardar el idioma, la app recarga dos veces y vuelve al español sin decir nada | FrontendPatSft | error | Media | no | Nuevo |
| H-044 | Errores del cliente responden 500 «Ocurrió un error inesperado» | BackendPatSft | error | Baja | no | Nuevo |
| H-045 | Quien fue retirado de un lugar sigue viendo sus lecturas en la explicación de alarma | AIPatSft | seguridad | Baja | no | Nuevo |
| H-046 | A 320 px de ancho la barra superior se sale de la pantalla | FrontendPatSft | diseño adaptable | Baja | no | Nuevo |
| H-047 | Siete pantallas muestran su error de carga sin botón «Reintentar» | FrontendPatSft | experiencia de usuario | Baja | no | Nuevo |
| H-048 | Si falla «Marcar como leídas» en las alertas, el error queda sin manejar | FrontendPatSft | error | Baja | no | Nuevo |
| H-049 | Cualquier visita a la pantalla de inicio de sesión despierta el servicio de IA | FrontendPatSft · AIPatSft | rendimiento | Baja | no | Nuevo |
| H-050 | Costo de IA no registrado: traducciones y ejecuciones fallidas del agente | AIPatSft | IA / costos | Baja | no | Nuevo |
| H-051 | El backend y el servicio de IA tenían código que no es Java (firmware, generador KiCad y scripts) | BackendPatSft · AIPatSft · FrontendPatSft | requisito del dueño | Media | no | Resuelto (FrontendPatSft#40, BackendPatSft#5, AIPatSft#4) |
| H-052 | Traducciones que la IA reescribió en español en vez de traducir (italiano y japonés) | AIPatSft · DBPatSft | error / IA | Media | no | Resuelto (AIPatSft#5, DBPatSft#3) |
| H-053 | El docente no podía probar todo con los botones de acceso, y las fotos no se guardaban si el lugar en uso era solo para ver | BackendPatSft · FrontendPatSft | pedido del docente / error | Alta | no | Resuelto (BackendPatSft#6, FrontendPatSft#42) |
| H-054 | La foto podía tomar la temperatura como pH, y el administrador demo tenía límite de IA | AIPatSft | IA / pedido del docente | Media | no | Resuelto (AIPatSft#6) |
| H-055 | En el celular, la lectura por foto abría la cámara y no dejaba elegir una foto de la galería | FrontendPatSft | error de interfaz | Media | no | Resuelto (FrontendPatSft#43) |
| H-056 | Una medición crítica no hacía sonar la alarma si no había mediciones en la última hora | BackendPatSft · AIPatSft | error | Alta | no | Resuelto (BackendPatSft#7, AIPatSft#7) |
| H-057 | En el celular aparecía la ventana de la alarma pero la sirena no sonaba | FrontendPatSft | error | Alta | no | Resuelto (FrontendPatSft#44) |
| H-058 | Avisos de la alarma por WhatsApp y correos reales en los botones de acceso | DBPatSft · BackendPatSft · FrontendPatSft | pedido del dueño | Media | sí (columnas nuevas, aprobadas por el dueño) | Resuelto y luego retirado en parte por H-060 (DBPatSft#4, BackendPatSft#8, FrontendPatSft#45) |
| H-059 | Los botones de acceso usaban correos inventados | BackendPatSft | pedido del dueño | Baja | no | Resuelto (BackendPatSft#9) |
| H-060 | Se quita WhatsApp: el dueño decidió no configurar la cuenta de Meta | BackendPatSft · FrontendPatSft | decisión del dueño | Baja | no | Resuelto (BackendPatSft#10, FrontendPatSft#46) |
| H-061 | El administrador veía la misma app que un usuario y podía medir; el historial mostraba columnas vacías | BackendPatSft · FrontendPatSft | pedido del dueño / error | Media | no | Resuelto (BackendPatSft#11, FrontendPatSft#47) |
| H-062 | El requisito RNF-07 pedía «instalar la app» y decía que la interfaz solo estaba en español | FrontendPatSft | documentación / decisión del dueño | Baja | no | Resuelto (FrontendPatSft#49) |
| H-063 | La gota de «Acerca de» en Configuración ocupaba todo el ancho de la tarjeta | FrontendPatSft | error de interfaz | Baja | no | En revisión (rama `mejora/H-063-gota-acerca-de`) |

## Detalle

### H-001 · Premium puede aplicarse dos veces si el retorno de PayU y la confirmación llegan a la vez
- Repositorio: BackendPatSft · Tipo: error · Severidad: **Alta** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Resuelto (BackendPatSft#3)
- Evidencia: `payment/PaymentService.java` (verify/confirm leen con `findByReferenceCode` sin bloqueo; `reconcile` llama a `applyPremium` → `extendPremium`); `Payment` sin `@Version` (V9 sin columna de versión). Con READ COMMITTED, dos transacciones que leen PENDING extienden Premium dos veces. Verificado en el código; reproducción por confirmar.
- Impacto: Un pago extiende Premium el doble, dos correos y dos registros PREMIUM_PAID.
- Propuesta: Bloqueo `@Lock(PESSIMISTIC_WRITE)` en una variante de `findByReferenceCode` usada por `reconcile` (solo código) y prueba de concurrencia.

### H-002 · Borrar la cuenta falla si un lugar ajeno usa un perfil personalizado suyo
- Repositorio: BackendPatSft · DBPatSft · Tipo: error · Severidad: **Alta** · Estructural: no · Esfuerzo: M · Riesgo de regresión: medio · Estado: Resuelto (BackendPatSft#4)
- Evidencia: `PlaceService.profileFor` acepta perfiles visibles para el editor (`isVisibleTo(userId)`), no para el dueño; `water_profiles.owner_id` ON DELETE CASCADE (V1:16) pero `places.profile_id` (V18:10) y `measurements.profile_id` (V1:58) sin ON DELETE; `AccountDeletionService` solo hace `users.delete`. Reproducido en H2: violación de integridad de `places.profile_id`.
- Impacto: El miembro EDITOR no puede eliminar su cuenta; el dueño queda con un perfil que no ve ni edita.
- Propuesta: `profileFor` solo acepta perfiles del sistema o del dueño del lugar; antes de borrar la cuenta, pasar los lugares ajenos que usen sus perfiles al perfil general (como `ProfileService.delete`). Las mediciones ajenas con ese perfil: decisión pendiente (ver H-004).

### H-003 · El backend y el servicio de IA aplican reglas distintas de cambio brusco y dan severidades opuestas
- Repositorio: AIPatSft · BackendPatSft · Tipo: IA / arquitectura · Severidad: **Alta** · Estructural: no (cambia el comportamiento de los análisis: validar) · Esfuerzo: S · Riesgo de regresión: medio · Estado: Resuelto (AIPatSft#2)
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

### H-019 · La cuenta pública de administrador de demostración ve los correos reales y tiene IA ilimitada
- Repositorio: AIPatSft · Tipo: seguridad · Severidad: **Crítica** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Resuelto (AIPatSft#3) · Detectado por: seguridad
- Evidencia: 
  - Cualquiera, sin sesión, obtiene la contraseña: `GET /api/v1/auth/demo-accounts` está abierta (`backendpatsft/.../config/SecurityConfig.java:41`, `user/AuthController.java:68-71`) y la devuelve en `DemoAccounts.java:93`.
  - Esa cuenta tiene el rol ADMIN (`DemoAccounts.java`, `Kind.ADMIN`).
  - En el servicio de IA, `/api/v1/admin/**` solo exige ese rol (`aipatsft/.../config/SecurityConfig.java:39`).
  - `GET /api/v1/admin/ai-usage` (`intelligence/ai/AiUsageController.java:25-28`) llama a `AiUsageService.global`, que pone el correo sin enmascarar de los 10 usuarios que más gastan (`AiUsageService.java:57`).
  - El servicio de IA no tiene ningún control para cuentas de demostración (no aparece `isDemo` en el código). El backend sí enmascara (`AdminController.java:63-76`).
- Impacto: cualquier visitante obtiene los correos de clientes reales.
- Propuesta: en `AiUsageController.global`, si la persona es demo (`User.isDemo()`), enmascarar el correo con la misma regla que `DemoAccounts.maskEmail` del backend, o responder 403.
- También lo vio seguridad: 
  - `user/User.java:88-90` devuelve `isUnlimited() = role == ADMIN` sin excluir las cuentas demo.
  - `AiProviderProxy.quotaFor` asigna entonces una cuota de `Integer.MAX_VALUE`.
  - La credencial es pública (ver hallazgo 1).
  - En el servicio de IA no se usa `RateLimiter` en ningún sitio (grep sin resultados fuera de su propia clase).

### H-020 · Los datos oficiales del USGS cargados en un lugar disparan alarmas falsas y se mezclan con las mediciones propias en los modelos
- Repositorio: BackendPatSft · AIPatSft · Tipo: error / IA · Severidad: **Alta** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: backend
- Evidencia: `place/OfficialDataService.java:82-91` guarda las lecturas OFFICIAL en el mismo `place_id`. `alert/AlertService.java:46` toma el historial con `findTop50ByPlaceIdOrderByMeasuredAtDesc`, sin filtrar por origen. Ese historial lo usan `PhAlterationRule.java:35` y `StatisticalOutlierRule.java:29`. Prueba: cargué 2 días de un río con pH 8.1 y luego registré a mano un pH de 7.4. Salieron dos alertas: `PH_ALTERATION` («El pH bajó de 8.15 a 7.40 en 45 minutos», con alarma sonora) y `STATISTICAL_OUTLIER` («inusual frente a tus últimas 49 mediciones (mediana 8.11, z -16.0)»).
- Impacto: el comentario de la clase (líneas 29-30) dice que las lecturas oficiales «no pasan por las alertas», pero sí alimentan las alertas siguientes. Hay alarmas falsas y un «valor atípico» en cada medición hasta juntar 50 propias. Además, `MeasurementService.java:113` («última medición») y `:179` pueden tomar el dato del río como la última medición del lugar.
- Propuesta: excluir `MeasurementSource.OFFICIAL` del historial de `AlertService` y de `contextFor`/`latest`, con consultas `...AndSourceNot`. Agregar una prueba que cargue datos oficiales, mida y espere cero alertas.
- También lo vio IA: 
  - El backend carga lecturas horarias de un río en el lugar de la persona y solo salta las horas que ya tienen medición (`backendpatsft/.../place/OfficialDataService.java:66-77`).
  - En la IA solo se excluye `SIMULATED`: `ml/MlModelService.java:135` y `deep/DeepForecastService.java:140`. La marca de la LSTM solo considera `SIMULATED` (`:145`).
  - La LSTM muestra el aviso «basada en tu historial» (`:45`) y el Isolation Forest «inusual para tu historial» (`ml/MlAnomalyRule.java:324`).
  - Los datos del chat y de la conclusión solo advierten del simulador (`IntelligenceFacade.java:388`). El prompt del agente menciona SIMULATED y PHOTO pero no OFFICIAL (`agent/ReportAgent.java:47`). Solo el diagnosis lo avisa (`DiagnosisService.java:202-206`).
  - Medición del Isolation Forest con 60 lecturas propias (pH ~6,8):
    - sin datos del río, 2 de 60 marcadas como anómalas;
    - con 30 días de datos horarios del río (pH ~8,0) en el mismo lugar, **19 de 60**.

### H-021 · Los recordatorios ya avisados y no marcados como hechos bloquean el envío de todos los demás
- Repositorio: BackendPatSft · Tipo: error · Severidad: **Alta** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: backend
- Evidencia: `reminder/ReminderRepository.java:169` trae `findTop200ByActiveTrueAndNextDueBefore…OrderByNextDueAsc`. `ReminderScheduler.java:31-33` descarta los que ya fueron avisados (`Reminder.java:139-141`), pero esos siguen vencidos para siempre y ocupan los primeros puestos. Prueba: con 201 recordatorios avisados y vencidos de otra persona, un recordatorio nuevo y vencido dio `sent=0` y quedó sin aviso (`newStillUnnotified=1`).
- Impacto: cuando se juntan 200 recordatorios ignorados en todo el sistema (bastan 4 cuentas con 50), nadie vuelve a recibir recordatorios.
- Propuesta: filtrar en la consulta `(lastNotifiedAt is null or lastNotifiedAt < nextDue)`, con un `@Query`. Agregar una prueba con más de 200 recordatorios.

### H-022 · Las consultas de 2000 mediciones se quedan con las más antiguas (gráfica, entrenamiento de modelos)
- Repositorio: BackendPatSft · AIPatSft · Tipo: error / rendimiento · Severidad: **Alta** · Estructural: no · Esfuerzo: M · Riesgo de regresión: medio · Estado: Nuevo · Detectado por: rendimiento
- Evidencia: 
  - Lugares donde se usa:
    - entrenamiento de Isolation Forest: `MlModelService.java:133`;
    - entrenamiento de la LSTM: `DeepForecastService.java:138`;
    - escaneos y series de la IA: `MeasurementService.java:92` (AIPatSft);
    - historial y gráficas del backend (`/measurements/series`): `MeasurementService.java:118` (BackendPatSft);
    - `OfficialDataService.java:67`.
  - La medición continua guarda una lectura cada 10 s (`BrowserMeter.js:29`), es decir 8640 al día. Las primeras 2000 cubren unas 5,5 h.
- Impacto: 
  - Con un medidor continuo, la ventana de 90 días entrena con las primeras ~5,5 h. El modelo queda «sin entrenar» (menos de 3 días de datos, o menos ventanas de las que necesita la LSTM) aunque haya meses de datos.
  - Las gráficas de 7 o 30 días muestran solo el principio del periodo.
  - El escaneo semanal analiza datos viejos, y eso provoca los reentrenamientos ad hoc del hallazgo 1.
  - Se transfieren 2000 entidades completas cuando bastaría una serie reducida.
- Propuesta: traer las N más recientes (`findTop2000…OrderByMeasuredAtDesc` e invertir la lista en memoria), o reducir la serie por cubetas horarias en SQL para las gráficas y la LSTM. Es una consulta nueva y no cambia el esquema.
- También lo vio backend: `MeasurementService.java:117-119` usa `findTop2000…OrderByMeasuredAtAsc` (`MeasurementRepository.java:30`). El medidor USB guarda una medición cada 10 s (`frontendpatsft/js/core/BrowserMeter.js:29`), unas 8640 al día. Con eso, `/measurements/series?days=7` (`MeasurementController.java:63-68`) solo trae las primeras ~5,5 horas del periodo y faltan los datos recientes. `series` tampoco limita el rango cuando llegan `from` y `to`, a diferencia de `export`. Lo mismo afecta el conjunto `taken` de `OfficialDataService.java:67`, que puede mezclar lecturas oficiales en horas que ya tienen mediciones propias.
- También lo vio IA: 
  - `findTop2000ByPlaceIdAndMeasuredAtBetweenOrderByMeasuredAtAsc` (`measurement/MeasurementRepository.java:30`) toma las 2000 más antiguas.
  - Lo usan `ml/MlModelService.java:133`, `deep/DeepForecastService.java:138` y `MeasurementService.java:92` (tendencia, regresión y diagnóstico).
  - El filtro de SIMULATED se aplica después del límite, así que simulaciones antiguas pueden dejar fuera mediciones reales recientes.

### H-023 · Textos personales llegan al traductor con IA y quedan en el diccionario público
- Repositorio: AIPatSft · FrontendPatSft · Tipo: seguridad / privacidad · Severidad: **Alta** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: seguridad
- Evidencia: 
  - `js/core/I18n.js:376` observa todo el documento y solo se salta lo que lleva `translate="no"`.
  - Estos datos se muestran con `esc()` pero sin `translate="no"`:
    - títulos de conversación, que son el inicio de la pregunta del usuario: `js/views/AssistantPane.js:73`;
    - nota de la medición: `js/views/History.js:152`;
    - nombres de perfil propios: `History.js:116,149` y `Dashboard.js:71`;
    - nombre del lugar en los recordatorios: `Care.js:271`;
    - nombre del medidor: `History.js:148`.
  - El servidor solo descarta textos con correo (`i18n/TranslationService.java:51,200-203`). Los guarda en `ui_translations` (`:338-339`).
  - `GET /api/v1/i18n/dictionary/{lang}` es público (`SecurityConfig.java:38`, `I18nController.java:55-60`) y devuelve todas las claves.
- Impacto: preguntas, notas y nombres de las personas se envían al proveedor de IA y cualquiera puede descargarlos.
- Propuesta: usar `own()` o `translate="no"` en esos puntos. Hay que limpiar las claves ya guardadas, pero borrar filas es destructivo y necesita aprobación.
- También lo vio IA: 
  - `report/pdf/ReportPdfService.java:83` envía todos los textos del PDF a `translations.translateAll(...)`.
  - Entre esos textos están el objetivo que escribió la persona (`:119`, `"Objetivo: " + r.focus()`), el resumen y las secciones del agente (`:120`, `:133`) y el nombre del perfil (`:117`). Todo pasa por `PdfWriter.java:72`.
  - `i18n/TranslationService.java:338-339` guarda cada traducción en `ui_translations`, el diccionario compartido.
  - `i18n/I18nController.java:55-59` sirve ese diccionario completo sin sesión (`config/SecurityConfig.java:38`, `permitAll` para `/api/v1/i18n/**`).
  - El único filtro es el de correos (`TranslationService.java:51`, `:202`); los números se cambian por `{0}`, pero el texto queda.
- También lo vio frontend y UX: 
  - Nombres de lugar en recordatorios: `Care.js:271` y `Dashboard.js:113`. En el resto de la app los nombres de lugar sí usan `own()`.
  - Título de un recordatorio personalizado: `Dashboard.js:113`. `Care.js:270` sí lo distingue con `r.kind === "CUSTOM" ? own(...)`.
  - Nombre del dueño de un lugar compartido: `Places.js:171` y `Dashboard.js` (la línea «Lugar compartido por…», hacia la línea 46).
  - Nombre de perfil, que puede ser personalizado: `Places.js:168`, `History.js:116` y `:149`, `MeasureFlow.js:19`, `Intelligence.js:342` y `:366`. `Profiles.js:79` sí lo hace bien con `systemProfile`.
  - Reproducción (`/tmp/fe-audit/t3.js`, con la cuenta en inglés): `POST /i18n/translate` recibió «De Lucía Peña Ortega · Solo ver» y «… Perfil Mi perfil de Cloro …», y la tarjeta los mostró con la traducción aplicada.

### H-024 · El control que protege `main` se saltaba con variantes comunes de git y no tenía pruebas
- Repositorio: Los cuatro (`.claude/hooks`) · Tipo: seguridad del proceso · Severidad: **Alta** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Resuelto (rama `equipo-ingenieria`) · Detectado por: pruebas (QA)
- Evidencia: `.claude/hooks/proteger-main.mjs`. Lo corrí con JSON de PreToolUse sobre un repositorio desechable en `main`:
  - Pasan sin bloqueo (exit 0):
    - `git -c user.name=x commit -m x`
    - `git --no-pager commit -m x`
    - `git -c x=y reset --hard`
    - `git push origin HEAD` y `git push -u origin HEAD` desde `main`
    - `git push origin +mejora/x` (push forzado con `+refspec`)
  - Sí se bloquean (exit 2): `git commit`, `git push origin`, `HEAD:main`, `reset --hard`, `--delete`, `branch -D main`.
  - Causas:
    - Línea 29: solo se acepta `-C` antes del subcomando, así que con `-c` o `--no-pager` los `^commit` y `^reset` de las líneas 42 y 44 no coinciden.
    - Línea 40: «push desde main» solo bloquea si hay menos de 2 refs, y `origin HEAD` son 2.
    - Línea 37: no detecta el `+` de un refspec forzado.
  - Hay además un falso positivo: `git switch --create mejora/x && git commit` se bloquea porque la línea 34 solo entiende `-c` y `-b`.
  - `.claude/settings.json:4-6` niega solo por prefijo (`git reset --hard:*`), así que tampoco cubre `git -c … reset --hard`.
  - No hay pruebas del hook en ningún repositorio.
- Impacto: un agente puede hacer commit o push en `main`, que despliega a producción, o forzar un push sin que nada lo detenga.
- Propuesta: 
  - Quitar las opciones globales de git (`-c k=v`, `--no-pager`, `-C`, `--git-dir`…) antes de evaluar el subcomando.
  - En `push` desde `main`, tratar `HEAD` como el ref de la rama actual.
  - Bloquear refspecs que empiecen con `+`.
  - Agregar `tests/ProtegerMain.test.mjs` (node:test, con `git init -b main` en un directorio temporal) que fije cada uno de estos casos, para que lo corra `Checks.yml`.

### H-025 · El texto de la IA puede rebajar un veredicto CRITICAL (alarma y validador) y la prueba solo cubre el caso feliz
- Repositorio: AIPatSft · Tipo: IA · Severidad: **Alta** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: pruebas (QA)
- Evidencia: 
  - `intelligence/alarm/AlarmExplainer.java:165-182` (`fromAi`) acepta `summary`, `steps` y `safeAgain` tal como llegan. Solo el campo `dangerous` se toma del sistema (línea 180).
  - El javadoc (líneas 39-40) y el CLAUDE.md piden que la IA no contradiga el veredicto ni invente cifras. A diferencia de `ScenarioExplainer.java:241` y `AgentReportValidator.java:78`, aquí no se usa `FigureCheck` ni hay ninguna validación.
  - `api/AlarmExplanationIntegrationTest.java:79-96` solo prueba una respuesta de la IA que ya dice «Es peligroso».
- Impacto: en una alarma CRITICAL, el diálogo y la voz (`frontendpatsft/js/views/PhAlarm.js:99-100,120-126`) mostrarían y leerían «no es peligroso» o un pH inventado si el modelo se equivoca.
- Propuesta: 
  - En `fromAi`, rechazar la respuesta (con `InvalidAnswer`, que ya cae al respaldo por reglas) si contradice `dangerous` o si `FigureCheck.check` falla.
  - Agregar dos pruebas: una respuesta que dice «no es peligroso» con alerta CRITICAL debe dar `source=RULES`, y lo mismo una cifra inventada.
- También lo vio IA: 
  - El prompt pide «CRITICAL if the last measurement is critical» (`diagnosis/DiagnosisService.java:51`) y las reglas devuelven CRITICAL (`diagnosis/RuleBasedDiagnoser.java:32-33`).
  - Sin embargo, `DiagnosisValidator.minimumRisk` usa HIGH como mínimo para una medición crítica (`DiagnosisValidator.java:120`). La prueba `DiagnosisValidatorTest.java:86` fija ese comportamiento.
  - Con HIGH, la próxima medición se pide en 12 h en lugar de 4 h (`:100-101`).

### H-026 · El escaneo de anomalías hace 2 consultas por medición y puede reentrenar Isolation Forest una vez por medición
- Repositorio: AIPatSft · Tipo: rendimiento · Severidad: **Alta** · Estructural: no · Esfuerzo: M · Riesgo de regresión: medio · Estado: Nuevo · Detectado por: rendimiento
- Evidencia: 
  - `AnomalyDetector.java:26-27` llama a `detect` por cada medición, y con ello a `MlAnomalyRule.evaluate` y a `MlModelService.evaluate`.
  - `MlModelService.java:65` ejecuta `stamps.changed(placeId)`, que en `PlaceStamps.java:22-23` hace `findTopByPlaceIdOrderByMeasuredAtDesc` más `countByPlaceId` en cada llamada.
  - Si la medición no está en los datos del entrenamiento, `MlModelService.java:98-104` entrena un bosque nuevo (`fit`) solo para ella.
  - Este escaneo lo usan `overview` (`IntelligenceFacade.java:155`, se abre con cada visita al Dashboard), anomalías, conclusión, el diagnóstico, el PDF y el agente.
  - Medición A (1000 mediciones cada 15 min): un escaneo de 7 días con 671 mediciones hizo **1342 consultas** (671 + 671) y tardó 37-47 ms de CPU. Con unos 5 ms por viaje a Neon serían unos 7 s solo de consultas (cálculo).
  - Medición B (4320 mediciones en 90 días, una cada 30 min): un escaneo de 335 mediciones tardó **11,8-14,8 s de CPU local** e hizo 670 consultas. Sale a unos 44 ms por reentrenamiento ad hoc. Pasa porque el entrenamiento guarda las 2000 mediciones más antiguas (hallazgo 2) y ninguna de la semana está en el modelo. Con 2000 mediciones en la semana serían unos 88 s locales (cálculo).
- Impacto: el Dashboard y los análisis se vuelven lentos o agotan el tiempo de espera, la CPU del plan gratuito queda saturada y Neon recibe cientos de consultas por cada pantalla.
- Propuesta: 
  - Revisar `stamps.changed` una vez por escaneo, no por medición. Puede ser un `modelForPlace` previo en `scan`, o que `MlAnomalyRule` reciba el `Training` ya resuelto.
  - En `evaluate`, si la medición no está en el modelo, puntuarla con el modelo existente en lugar de reentrenar dentro de un bucle. El reentrenamiento ad hoc se dejaría solo para la medición nueva aislada.

### H-027 · La regresión predice desde «ahora» aunque los datos tengan semanas
- Repositorio: AIPatSft · Tipo: IA · Severidad: **Alta** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: IA
- Evidencia: 
  - `intelligence/analysis/Forecaster.java:44-49` calcula `target = nowX + day` sin mirar cuánto tiempo pasó desde la última medición.
  - El horizonte (`:39`) solo se limita por la duración de los datos.
  - Medición con 20 puntos de 7,00 a 7,95 en 4,75 días, con la última medición hace 24 días: `available=true` y predicciones de pH 13,0, 13,2 y 13,4.
  - Esa predicción llega a `/forecast` (`IntelligenceFacade.java:200-207`, frase «en 3 días el pH estaría cerca de 13.40: crítico»), a los datos del diagnóstico (`DiagnosisService.java:183`, `:240-244`) y al agente.
- Impacto: alertas y diagnósticos con cifras sin sentido cuando la persona dejó de medir, presentadas como estimación válida.
- Propuesta: 
  - Contar el horizonte desde la última medición, no desde `now`.
  - Devolver `unavailable` si la distancia entre la última medición y `now` supera el horizonte máximo (o la duración de los datos).
  - Agregar una prueba con datos viejos.

### H-028 · Nadie prueba que la alarma llegue a los demás miembros de un lugar compartido ni la deduplicación
- Repositorio: BackendPatSft · Tipo: pruebas · Severidad: **Alta** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: pruebas (QA)
- Evidencia: 
  - `alert/AlertService.java:53-79` reparte cada alerta a `places.people(placeId)` y llama a `notifier.alert(...)` (push y correo).
  - `grep -rn "Notifier" src/test` no da resultados: el `Notifier` no se verifica en ninguna prueba.
  - `PlacesIntegrationTest.java:58-99` comparte el lugar y mide, pero nunca consulta `/alerts` del invitado.
  - `StatisticalOutlierRule` y `AnomalyDetector` no aparecen en ninguna prueba. Solo hay pruebas unitarias de `PhAlterationRule`, y `OUT_OF_RANGE` se cubre de forma indirecta en `ApiFlowIntegrationTest.java:112`.
- Impacto: una regresión en `people()` o en la deduplicación por persona (`repeated`, línea 65) dejaría al cuidador de una piscina compartida sin alarma, y ninguna prueba fallaría.
- Propuesta: 
  - En `PlacesIntegrationTest`: el dueño comparte como EDITOR, el invitado mide 7.5 y luego 3.0, y se comprueba que el dueño y el invitado tienen cada uno 1 alerta `PH_ALTERATION`.
  - Agregar un `@MockitoSpyBean Notifier` (o un doble) que verifique 2 llamadas `alert(...)`.
  - Agregar una prueba unitaria de `StatisticalOutlierRule`.
- También lo vio backend: ninguna prueba toca `AlertService.REPEAT_GAP` ni `repeated()` (`AlertService.java:86-93`): ni el paso de CAUTION a CRITICAL, ni la separación por lugar y por persona, ni la supresión de OUT_OF_RANGE cuando hay una alteración. `CareFeaturesIntegrationTest` solo prueba un recordatorio, y `OfficialDataIntegrationTest` no mide después de cargar los datos. Por eso los hallazgos 1, 2 y 5 pasaron sin que fallara ninguna prueba.

### H-029 · Un solo hilo para todas las tareas programadas: la importación del USGS retrasa recordatorios y pagos
- Repositorio: BackendPatSft · Tipo: rendimiento · Severidad: **Media** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: backend
- Evidencia: no hay `spring.task.scheduling.pool.size`, ni `spring.threads.virtual.enabled`, ni un `TaskScheduler` propio (lo busqué en `src/main`), así que Spring Boot usa su programador por defecto con un solo hilo. Al despertar, `ReferenceDataImporter.java:60-69` arranca a los 45 s. Hace más de 20 peticiones con un tiempo máximo de 60 s cada una y hasta 3 intentos con esperas de 20 s (`UsgsWaterDataClient.java:127,145-166`). `ReminderScheduler` (60 s) y `PaymentService.housekeeping` (60 s) esperan detrás.
- Impacto: si el USGS va lento o limita las peticiones, los recordatorios salen tarde. Si la importación pasa de unos 14 minutos, Render duerme el servidor antes de enviarlos y se pierde ese ciclo de 3 horas. Por confirmar: cuánto dura la importación en producción.
- Propuesta: `spring.task.scheduling.pool.size: 3` en `application.yml`, o `spring.threads.virtual.enabled: true`.

### H-030 · Una medición manual con fecha pasada genera una alerta crítica con aviso al teléfono y correo
- Repositorio: BackendPatSft · Tipo: error · Severidad: **Media** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: backend
- Evidencia: `MeasurementController.java:80` acepta el `measuredAt` que manda el cliente. `TimestampValidator.java:9` solo rechaza fechas de más de 366 días. `AlertService.onMeasurementRecorded` (`:46-80`) no mira la antigüedad, y `repeated()` (`:89`) deduplica contra `Instant.now()`. Prueba: una medición de pH 3.0 fechada hace 200 días creó una alerta `OUT_OF_RANGE CRITICAL` en ese momento.
- Impacto: cargar el historial en papel llena de avisos críticos y correos por agua que hoy puede estar bien.
- Propuesta: no crear alertas ni enviar avisos si la medición es más antigua que un margen corto (por ejemplo 1 hora) o anterior a la última medición del lugar.

### H-031 · La cuota diaria de IA se salta con peticiones simultáneas
- Repositorio: AIPatSft · Tipo: seguridad · Severidad: **Media** · Estructural: no · Esfuerzo: M · Riesgo de regresión: medio · Estado: Nuevo · Detectado por: seguridad
- Evidencia: 
  - `AiProviderProxy.java:130-138` y `:156` primero comprueban `usedToday < quota`, luego llaman al proveedor (tarda segundos) y solo después guardan el uso. No hay bloqueo ni reserva.
  - La caché solo ayuda cuando la primera respuesta ya terminó.
  - Además, `ChatController.java:34` usa un único pool de 8 hilos para los chats en streaming de todos, con cola sin límite. Una persona puede ocuparlo entero.
- Impacto: la cuota por plan se puede saltar, lo que agota el proveedor y deja sin servicio a los demás.
- Propuesta: reservar el uso de forma atómica antes de llamar al proveedor (un contador por usuario y día o un semáforo) y limitar los streams por usuario.

### H-032 · El traductor abierto sin sesión permite agotar y llenar el diccionario compartido
- Repositorio: AIPatSft · Tipo: seguridad · Severidad: **Media** · Estructural: no · Esfuerzo: M · Riesgo de regresión: medio · Estado: Nuevo · Detectado por: seguridad
- Evidencia: 
  - `POST /api/v1/i18n/translate` está abierto (`SecurityConfig.java:38`, `I18nController.java:62-66`).
  - Cada dirección puede enviar 2500 textos nuevos por hora (`TranslationBudget.java:138`), pero el total es de 60 llamadas a la IA al día (`TranslationService.java:98-99`, de hasta 60 textos cada una).
  - Así, una sola IP agota en unas 2 horas las traducciones de todos para ese día.
  - Lo que manda el atacante se guarda para siempre en `ui_translations`, se carga entero en memoria (`:431-437`) y se sirve a cada cliente en `/dictionary`.
  - **Por confirmar** (depende de que el modelo obedezca): una instrucción en un texto del mismo lote podría dictar la "traducción" de un texto de la interfaz aún sin traducir. Solo se comprueban los marcadores (`:334`). No es XSS, porque se inserta con `textContent`, pero permite suplantar textos.
- Impacto: interfaz sin traducir para todos, crecimiento sin límite del diccionario y posible contenido falso.
- Propuesta: aceptar textos nuevos anónimos solo si están en la lista conocida de textos de la interfaz (la de `UiTextWarmer`). El resto, solo con sesión o con la clave interna.

### H-033 · Un EDITOR puede redefinir los rangos del lugar del dueño y meter texto en los prompts
- Repositorio: BackendPatSft · AIPatSft · Tipo: seguridad · Severidad: **Media** · Estructural: no · Esfuerzo: S · Riesgo de regresión: medio · Estado: Nuevo · Detectado por: seguridad
- Evidencia: 
  - `PUT /places/{id}` solo exige `editable` (`PlaceService.java:82-83`). Su `profileFor` (`:207-210`) comprueba que el perfil sea visible para el EDITOR, no para el dueño. Lo mismo hace `ProfileService.activate` (`:110-113`).
  - Con eso el EDITOR asigna su perfil privado al lugar ajeno. Después lo cambia con `PUT /profiles/{id}` (`ownedProfile`), y así cambia la clasificación y las alertas de las mediciones del dueño, que no puede ver ni editar ese perfil.
  - El nombre del lugar y el del perfil entran sin aislar en los prompts de todos los miembros (`IntelligenceFacade.java:370-372`, `DiagnosisService.java:194`, `AlarmExplainer.java:141`).
  - El efecto sobre el modelo está **por confirmar**.
- Impacto: un colaborador cambia el veredicto (óptimo o crítico) del agua de otra persona y puede manipular las respuestas de Aqua.
- Propuesta: en un lugar ajeno, aceptar solo perfiles del sistema o del dueño, y que cambiar el lugar o su perfil sea solo del dueño. En los prompts, marcar los nombres como datos no confiables.

### H-034 · El sondeo de alertas cada 15 s no se pausa nunca y mantiene despiertos Render y Neon
- Repositorio: FrontendPatSft · Tipo: rendimiento · Severidad: **Media** · Estructural: no · Esfuerzo: S · Riesgo de regresión: medio · Estado: Nuevo · Detectado por: rendimiento
- Evidencia: 
  - `Shell.js:223` tiene `setInterval(() => this.refreshAlerts(), 15000)`. No mira `visibilitychange` ni la inactividad (el único uso de `document.hidden` está en `PhAlarm.js:40` y `AquaBot.js:338`). `/alerts` no entra en la caché (`ApiCache.js`, sin regla).
  - Cada sondeo hace 3 consultas: sesión y usuario en `JwtAuthenticationFilter.java:39-41`, y alertas. Además hace un UPDATE de `user_sessions` por minuto (`SessionHistoryService.java:29`, `TOUCH_INTERVAL` = 1 min).
  - Cálculo por pestaña abierta: 5760 peticiones y unas 17 000 consultas al día.
  - Render duerme tras 15 min sin peticiones. Una pestaña en segundo plano, que Chrome limita a 1 llamada por minuto, lo sigue despertando. Una pestaña olvidada todo el mes son unas 720 h del backend de las 750 h compartidas con la IA.
  - Neon nunca alcanza sus 5 min sin uso.
  - El historial de sesiones marca actividad aunque la persona se haya ido.
- Impacto: se anula el ahorro previsto (KEEP_AWAKE apagado, WakeUp.yml cada 3 h), y una sola pestaña puede agotar las horas gratuitas de Render y el cómputo de Neon.
- Propuesta: con la pestaña oculta, detener el sondeo cuando haya push activo o espaciarlo a 60 s o más. Detenerlo tras unos 30 min sin interacción y refrescar al volver a la pestaña o al recibir el mensaje `ph-alarm` del service worker, que ya existe (`Shell.js:224`).

### H-035 · La LSTM se entrena en el hilo de la petición (~5 s de CPU) y se descarta con cada medición nueva
- Repositorio: AIPatSft · Tipo: rendimiento · Severidad: **Media** · Estructural: no · Esfuerzo: M · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: rendimiento
- Evidencia: 
  - `DeepForecastService.java:125-126`: `dropIfChanged` y luego `cache.get(…, train)`, con el entrenamiento en `:177`.
  - Medición con 2000 mediciones horarias (83 días), 1 CPU y los JAVA_OPTS del Dockerfile: **5,1-5,5 s por entrenamiento**, con unos 9-14 MB de heap transitorio (55-72 MB con 4 CPU).
  - Con un medidor continuo, cada consulta de pronóstico encuentra una medición nueva (`PlaceStamps.changed`) y vuelve a entrenar.
  - `ExpiringCache.get` entrena dentro de `ConcurrentHashMap.compute` (`common/ExpiringCache.java`, en `get`). Eso bloquea el cubo del mapa, no solo esa clave como dice su comentario, durante todo el entrenamiento.
  - El tiempo en la CPU de Render gratuito está por confirmar (se esperan decenas de segundos).
- Impacto: la pantalla «Profunda» y la herramienta del agente (`DeepForecastTool`) esperan segundos o minutos, y la CPU queda ocupada para otras peticiones.
- Propuesta: no invalidar por cada medición, sino solo si el modelo tiene más de X horas o si cambió más de un N % de los datos. Entrenar fuera de `compute`, con un único entrenamiento en curso por clave.

### H-036 · El health check de Render consulta la base de datos (por confirmar con qué frecuencia)
- Repositorio: BackendPatSft · AIPatSft · Tipo: rendimiento · Severidad: **Media** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: rendimiento
- Evidencia: 
  - `backendpatsft/render.yaml:11` y `aipatsft/render.yaml:13` tienen `healthCheckPath: /actuator/health`.
  - `application.yml` de los dos servicios no desactiva `management.health.db`. Su propio comentario dice que `/health` «checks everything» y que `/health/liveness` no consulta la base.
  - `ServerWake.js:14` también usa `/actuator/health` en cada ping de arranque, uno cada 3 s.
  - Está por confirmar con qué frecuencia sondea Render mientras el servicio está despierto.
- Impacto: mientras cualquiera de los dos servicios esté despierto, sus health checks pueden impedir que Neon se suspenda. Además, el pool de Hikari (5 conexiones fijas, `maxLifetime` de 30 min) reabre conexiones y despierta Neon (por confirmar).
- Propuesta: cambiar `healthCheckPath` a `/actuator/health/liveness` en los dos `render.yaml`, o `readiness` sin el indicador de la base. `ServerWake` también usaría `liveness`.

### H-037 · La evaluación de la LSTM usa datos del futuro al interpolar huecos
- Repositorio: AIPatSft · Tipo: IA · Severidad: **Media** · Estructural: no · Esfuerzo: M · Riesgo de regresión: medio · Estado: Nuevo · Detectado por: IA
- Evidencia: 
  - `deep/HourlySeries.java:210-213` interpola hasta 6 h usando la medición siguiente.
  - En las ventanas de `ForecastDataset.windows` (`:74-79`), la última hora de entrada puede ser interpolada hacia un valor que es objetivo de esa misma ventana. Además, objetivos interpolados se cuentan como valores reales en `absoluteErrors` (`DeepForecastService.java:239-248`).
  - En producción la última hora siempre es una medición real, así que el error de prueba y la banda del 90 % (`:196`) salen optimistas.
  - Con mediciones cada 4, 5 y 6 h, la persistencia evaluada da un MAE de 0,132, 0,122 y 0,105. Con el último valor medido (lo que ve producción) da 0,157, 0,153 y 0,142: entre 16 % y 26 % de optimismo. Con datos horarios, 0 %.
  - Además, la elección entre la red y la referencia, la «mejor referencia» y la banda se calculan sobre el mismo conjunto de prueba (`:187-196`); la validación solo sirve para la parada temprana.
  - Con el mínimo de 164 ventanas, el entrenamiento queda con 90 ventanas, menos que `MIN_TRAIN = 100` (`:166-169`).
- Impacto: el «error en datos que el modelo no vio» y el intervalo que se muestran son más estrechos que la realidad cuando las mediciones son espaciadas.
- Propuesta: 
  - Evaluar y calcular la banda solo en ventanas cuya última entrada sea medida, y con objetivos medidos (`observed`).
  - Decidir entre red y referencia con la validación y reportar la prueba aparte.
  - Exigir `trainEnd >= MIN_TRAIN`.

### H-038 · Diagnóstico, alarma, chat y conclusión sin control de cifras ni de dosis; FigureCheck incompleto
- Repositorio: AIPatSft · Tipo: IA · Severidad: **Media** · Estructural: no · Esfuerzo: M · Riesgo de regresión: medio · Estado: Nuevo · Detectado por: IA
- Evidencia: 
  - `FigureCheck` solo se usa en `agent/AgentReportValidator.java:78` y `scenario/ScenarioExplainer.java:241`.
  - `DiagnosisValidator`, `AlarmExplainer.fromAi` (`:165-182`, que tampoco verifica que el resumen respete `dangerous`) y el chat (`IntelligenceFacade.java:272-279`) no revisan cifras ni dosis. Las dosis exactas se evitan solo con el prompt, y en el chat la pregunta de la persona va sin delimitar (`:273`).
  - El patrón de `analysis/FigureCheck.java:152` ignora enteros y signos. `check("Agrega 50 ml de ácido y espera 2 horas; pendiente -0.12…", {-0.12, 7.8})` da `checked=2` y `unverified=[0.12]`: no detecta «50 ml» y marca como falsa una cifra correcta.
- Impacto: cifras inventadas y dosis concretas pueden llegar a la persona sin aviso en las funciones más usadas.
- Propuesta: 
  - Aplicar `FigureCheck` a los textos de diagnóstico y alarma, y mostrar `verification`.
  - Incluir el signo en el patrón.
  - Agregar una comprobación simple de dosis (número con ml, g, L o mg y un verbo como agregar, añadir o echar) que reemplace la frase por la recomendación de la calculadora.
  - En `AlarmExplainer`, recurrir a las reglas si `dangerous=true` y el resumen no lo dice.

### H-039 · La CI no detecta que las copias de migraciones o de clases se desincronicen de DBPatSft
- Repositorio: Los cuatro · Tipo: pruebas / arquitectura · Severidad: **Media** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: pruebas (QA)
- Evidencia: 
  - `backendpatsft/.github/workflows/Tests.yml:20-28` y `aipatsft/.github/workflows/Tests.yml:20-28` solo hacen checkout de su propio repositorio y corren `mvn test` contra su copia `src/test/resources/db/migration`.
  - Esa copia se actualiza a mano con `scripts/sync-migrations.sh`, que borra y copia.
  - `dbpatsft/.github/workflows/Migrations.yml:40-48` solo prueba PostgreSQL 16. No prueba H2 en modo PostgreSQL, aunque `dbpatsft/CLAUDE.md` exige esa compatibilidad.
  - Un cambio en DBPatSft no dispara las pruebas de los servicios.
  - Las clases duplicadas (`measurement/validation/*`, `place/PlaceAccess…`) tampoco se comparan. La cadena de validación de la IA no tiene ninguna prueba propia (`grep ValidationChain aipatsft/src/test` vacío).
  - Hoy todo coincide, pero nada lo garantiza.
- Impacto: una migración nueva puede aplicarse en Neon mientras los servicios siguen probando un esquema viejo, o una que no funcione en H2 rompe las pruebas de los servicios recién al sincronizar.
- Propuesta: 
  - Agregar a `Tests.yml` del backend y de la IA un paso que haga checkout de DBPatSft (`actions/checkout` con `repository:`) y `diff -r` contra la copia, y que falle si difieren.
  - Opcionalmente, un paso en `Migrations.yml` que aplique las migraciones a H2 con la imagen de Flyway.

### H-040 · `ReferenceDataImportTest` pasa por la razón equivocada y la deduplicación del importador no deduplica
- Repositorio: BackendPatSft · Tipo: pruebas / error · Severidad: **Media** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: pruebas (QA)
- Evidencia: 
  - El servidor falso (`reference/ReferenceDataImportTest.java:117-118,127-139`) ignora el parámetro `datetime` y en la segunda importación devuelve otra vez las 6 lecturas.
  - En `ReferenceDataImporter.java:158-161`, `stored` busca lecturas posteriores a `from - 1s`, que es justo la última guardada. Así excluye todas las existentes y el filtro de las líneas 162-163 nunca descarta nada.
  - En la salida de la línea base, el segundo `refresh()` falla por la restricción única: `Unique index … uq_reference_reading … 'USGS-01467200'` seguido de `0 new readings. Sin actualizar en esta ronda: USGS-01467200`.
  - La prueba solo afirma `second.getReadings()).isZero()` (línea 72) y nunca revisa `getMessage()`, así que pasa porque la estación falló.
  - Además `first.getReadings()).isIn(0, 6)` (línea 70) acepta que no se haya importado nada.
- Impacto: la deduplicación depende por completo de que USGS respete el filtro de tiempo. Si USGS devuelve lecturas solapadas, esa estación queda «sin actualizar» en cada ronda y la prueba lo da por bueno.
- Propuesta: 
  - Calcular `stored` desde el `since` real que se envía, o desde la primera hora devuelta, en lugar de desde `from - 1s`.
  - Afirmar `second.getMessage()).isNull()` en la línea 72.

### H-041 · La prueba de recordatorios no verifica lo que promete y puede ser frágil por la base H2 compartida
- Repositorio: BackendPatSft · Tipo: pruebas · Severidad: **Media** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: pruebas (QA)
- Evidencia: 
  - `api/CareFeaturesIntegrationTest.java:76` solo afirma `scheduler.sendDue()).isGreaterThanOrEqualTo(1)`: pasa aunque el recordatorio enviado sea de otra prueba.
  - El comentario de la línea 77 («the same due date is not notified again») no tiene aserción: no hay un segundo `sendDue()` para este recordatorio ni verificación del `Notifier`.
  - Todas las pruebas comparten una sola base `jdbc:h2:mem:aquasense;DB_CLOSE_DELAY=-1` (`src/test/resources/application.yml:3`).
  - Esta clase sube el retardo inicial a 1 h (línea 25), pero los otros contextos de Spring en caché conservan el `ReminderScheduler` con 60 s de retardo (`ReminderScheduler.java:26`, `@EnableScheduling`).
  - En un runner lento (más de 60 s), otro contexto podría enviar el recordatorio antes y la línea 76 fallaría. Esto queda **por confirmar**: aquí la suite tardó 44 s y no lo reproduje.
- Impacto: no hay ninguna prueba que garantice el «una vez por fecha» (`Reminder.needsNotice`, línea 93), y la prueba puede fallar en CI de vez en cuando.
- Propuesta: 
  - Poner `aquasense.reminders.initial-delay-ms: 3600000` en `src/test/resources/application.yml`.
  - Verificar que el `Notifier` se llama para este `userId`.
  - Agregar `assertThat(scheduler.sendDue())` sin nuevo envío para ese recordatorio.

### H-042 · Si una carga falla después de cambiar de pantalla, el error tapa la pantalla nueva
- Repositorio: FrontendPatSft · Tipo: error · Severidad: **Media** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: frontend y UX
- Evidencia: el bloque `catch` escribe en `root` (el contenedor de la página, que se reutiliza entre pantallas) sin comprobar `ctx.stale()`. Pasa en `js/views/Dashboard.js:28`, `History.js:32`, `Profiles.js:69`, `Settings.js:68`, `Billing.js:110`, `Care.js:169`, `OfficialData.js:49` y `Places.js:150`. La comprobación `stale()` solo está en el camino que funciona.
  - Reproducción (`/tmp/fe-audit/t1.js`): se abre `#/dashboard` con `/dashboard` respondiendo 500 a los 2,5 s, y a los 0,8 s se va a `#/intelligence/scenario`.
  - Resultado: la dirección sigue en `#/intelligence/scenario`, pero el contenido termina siendo «No se pudo cargar el panel · Reintentar». Se ve bien el título de una pantalla con el error de otra.
- Impacto: es probable en producción, porque el backend en Render tarda hasta un minuto en despertar y entretanto la persona sigue navegando.
- Propuesta: en cada `catch`, empezar con `if (ctx.stale()) return null;` (en Places y Profiles, `return;`).

### H-043 · Si no se puede guardar el idioma, la app recarga dos veces y vuelve al español sin decir nada
- Repositorio: FrontendPatSft · Tipo: error · Severidad: **Media** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: frontend y UX
- Evidencia: 
  - `js/views/Settings.js:220-230`: si el `PUT /users/me/settings` falla, se muestra un aviso, pero igual se llama a `i18n.change(lang)`, que recarga la página y borra el aviso.
  - Después de recargar, `js/core/I18n.js:428-429` (`syncWithAccount`) ve que la cuenta todavía tiene `es` y vuelve a llamar a `change`, que recarga otra vez.
  - Reproducción (`/tmp/fe-audit/t7.js`): con el PUT respondiendo 503, se elige «en». Resultado: 1 PUT, 2 recargas, idioma final `es`, ningún aviso visible.
- Impacto: la persona elige un idioma, la pantalla parpadea dos veces y todo queda en español sin explicación.
- Propuesta: si el PUT falla, no llamar a `i18n.change`: devolver el selector al idioma anterior, volver a activarlo y dejar el aviso.

### H-044 · Errores del cliente responden 500 «Ocurrió un error inesperado»
- Repositorio: BackendPatSft · Tipo: error · Severidad: **Baja** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: backend
- Evidencia: `common/GlobalExceptionHandler.java:87-90` convierte en 500 todo lo que no tiene manejador propio. Prueba: `POST /api/v1/measurements` con `text/plain` y `POST /payments/payu/confirmation` con JSON responden 500 y quedan como ERROR en el registro (deberían ser 415). Por confirmar, por el mismo camino: `DataIntegrityViolationException` (409) y `MaxUploadSizeExceededException` (413).
- Impacto: códigos HTTP incorrectos y ruido de errores en Render.
- Propuesta: agregar manejadores para `HttpMediaTypeNotSupportedException`, `MaxUploadSizeExceededException` y `DataIntegrityViolationException`, con mensajes en español.

### H-045 · Quien fue retirado de un lugar sigue viendo sus lecturas en la explicación de alarma
- Repositorio: AIPatSft · Tipo: seguridad · Severidad: **Baja** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: seguridad
- Evidencia: 
  - `AlarmExplainer.java:118-129` solo comprueba `alert.userId == userId` y luego lee la última hora de mediciones del lugar sin `PlaceAccess.visible`.
  - Las alertas se crean para todos los miembros (`backendpatsft/.../alert/AlertService.java:52-69`) y no se borran cuando alguien sale o es retirado.
- Propuesta: si `m.getPlaceId()` no es nulo, llamar a `places.visible(userId, placeId)` y responder 404 si no tiene acceso.

### H-046 · A 320 px de ancho la barra superior se sale de la pantalla
- Repositorio: FrontendPatSft · Tipo: diseño adaptable · Severidad: **Baja** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: frontend y UX
- Impacto: en celulares pequeños la página se mueve hacia los lados y el menú de la cuenta queda medio fuera.
- Propuesta: añadir un `@media (max-width: 340px)` que reduzca `.place-chip` (por ejemplo a `max-width: 92px`) o el espacio de `.topbar-actions`. No cambia el diseño.
- Evidencia (`/tmp/fe-audit/t4.js` y `t5.js`, captura `/tmp/fe-audit/topbar-320.png`):
  - En todas las pantallas con sesión, a 320 px de ancho, `scrollWidth` es 344. `.topbar-actions` termina en x=344 y el botón de la cuenta (`.user-chip`) queda cortado.
  - A 360, 375 y 414 px no pasa. Las pantallas de acceso, registro y recuperar contraseña están bien a 320 px.
  - La causa está en `assets/css/Features.css:20-21`: el chip del lugar tiene un `max-width: 120px` fijo en el `@media (max-width: 760px)`.
- Impacto: en celulares pequeños la página se mueve hacia los lados y el menú de la cuenta queda medio fuera.
- Propuesta: añadir un `@media (max-width: 340px)` que reduzca `.place-chip` (por ejemplo a `max-width: 92px`) o el espacio de `.topbar-actions`. No cambia el diseño.

### H-047 · Siete pantallas muestran su error de carga sin botón «Reintentar»
- Repositorio: FrontendPatSft · Tipo: experiencia de usuario · Severidad: **Baja** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: frontend y UX
- Evidencia: probé todas las rutas con el API respondiendo 500 (`/tmp/fe-audit/t2.js`). Ninguna dejó errores sin manejar, pero solo el Inicio (`Dashboard.js:28-30`) ofrece «Reintentar». Historial, Perfiles, Configuración, Plan, Cuidado, Datos oficiales y Lugares (mismas líneas que H-a) solo muestran el mensaje.
- Impacto: cuando el backend se está despertando, la única salida es recargar toda la página.
- Propuesta: reutilizar el botón del Inicio (`ctx.router.resolve()`) en esos `emptyState`. Conviene hacerlo junto con H-a.

### H-048 · Si falla «Marcar como leídas» en las alertas, el error queda sin manejar
- Repositorio: FrontendPatSft · Tipo: error · Severidad: **Baja** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: frontend y UX
- Evidencia: en `js/views/Shell.js:152-157`, el `await api.post("/alerts/read-all")` no tiene `try/catch`. Si falla, lo recoge el manejador global de `App.js:181`, y el panel no se vuelve a dibujar ni se avisa a `alerts:changed`. Lo verifiqué leyendo el código, no en el navegador.
- Impacto: aparece un aviso genérico y el panel queda como estaba, sin decir qué pasó.
- Propuesta: poner `try/catch` con `toast(error.message, "error")`, igual que en el resto de los botones.

### H-049 · Cualquier visita a la pantalla de inicio de sesión despierta el servicio de IA
- Repositorio: FrontendPatSft · AIPatSft · Tipo: rendimiento · Severidad: **Baja** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: rendimiento
- Evidencia: 
  - `App.js:206` llama a `wakeAiService()` al cargar la página, sin sesión.
  - Al arrancar, la IA lee los diccionarios de traducción en la base a los 90 s (`UiTextWarmer.java`, en `onStart`), y eso despierta Neon.
  - Cálculo: cada visita anónima con los servicios dormidos cuesta al menos 15 min de IA más el arranque, sumados a los 15 min del backend.
- Impacto: visitantes y bots gastan horas de Render y despiertan Neon sin usar Aqua.
- Propuesta: dejar solo la llamada del evento `session:changed` (`App.js:207`), o despertar la IA al abrir Aqua o el Dashboard.

### H-050 · Costo de IA no registrado: traducciones y ejecuciones fallidas del agente
- Repositorio: AIPatSft · Tipo: IA / costos · Severidad: **Baja** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Nuevo · Detectado por: IA
- Evidencia: 
  - `i18n/TranslationService.java:379` llama a `FallbackAiProvider` directamente, sin el proxy y con `userId=null`. Los éxitos no se registran, y las fallas solo si hay `userId` (`AiProviderProxy.java:85`).
  - El segundo intento por tono (`TranslationService.java:310`) no suma a `aiCallsToday` (`:301`).
  - Una ejecución fallida del agente (hasta 10 turnos con contexto creciente) se registra sin tokens (`agent/AgentJobService.java:195`).
- Impacto: el informe de uso y costo subestima el gasto real, y el tope de 60 llamadas al día de traducción se puede superar.
- Propuesta: 
  - Registrar el uso de TRANSLATION con un usuario técnico o con `userId` nulo permitido.
  - Contar `askAgain`.
  - Devolver los tokens acumulados en `AgentFailedException` y guardarlos en `recordFailure`.

### H-051 · El backend y el servicio de IA tenían código que no es Java (firmware, generador KiCad y scripts)
- Repositorio: BackendPatSft · AIPatSft · FrontendPatSft · Tipo: requisito del dueño · Severidad: **Media** · Estructural: no (traslado de una carpeta y scripts reescritos, sin cambiar la aplicación) · Esfuerzo: M · Riesgo de regresión: bajo · Estado: Resuelto (FrontendPatSft#40, BackendPatSft#5, AIPatSft#4) · Pedido por: el dueño
- Evidencia: GitHub mostraba en BackendPatSft Python 79 KB, C++ 24 KB, HTML 10 KB, JavaScript 3 KB y Shell, todo de `hardware/` (firmware del ESP32 y generador KiCad) y de `scripts/sync-migrations.sh`. En AIPatSft había `scripts/extract-ui-texts.mjs`, `scripts/VerifyKnowledgeQuotes.py` y `scripts/sync-migrations.sh`.
- Cambio: `hardware/` pasa a FrontendPatSft con su prueba de GitHub Actions; los cinco scripts se reescriben en Java con el mismo resultado (2300 textos y 0 diferencias; 20 de 20 citas; 27 migraciones). El control de `main` de esos dos repositorios queda en Java (`ProtegerMain.java`), probado con los mismos casos que el de JavaScript. El `Dockerfile` se queda porque Render lo necesita; `.gitattributes` lo excluye de las estadísticas de lenguaje.
- Orden de merge: FrontendPatSft#40 antes que BackendPatSft#5.

### H-052 · Traducciones que la IA reescribió en español en vez de traducir (italiano y japonés)
- Repositorio: AIPatSft · DBPatSft · Tipo: error / IA · Severidad: **Media** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: Resuelto (AIPatSft#5, DBPatSft#3) · Detectado por: revisión de idiomas en producción (20 nov)
- Evidencia: los 2274 textos están en el diccionario de los 6 idiomas, y la revisión de cada pantalla con una cuenta temporal dio 0 textos en español en inglés, francés, alemán, chino y japonés (en japonés, en la segunda vuelta). En italiano dio 2: «¿Qué ha aplicado o ha hecho?» y «Ácido cianúrico», guardados como traducción. Al revisar los diccionarios aparecieron además «relatório» (portugués) en italiano, «estación», «Cerrar sesión» y «Análisis avanzado» dentro del japonés, y la etiqueta vieja «Resumen en español» en inglés. `TranslationService.leftInSpanish` solo detectaba una traducción idéntica al original.
- Impacto: la app muestra esos textos en español para siempre en ese idioma.
- Corrección: `stillSpanish` (¿, ¡ o una palabra con ñ, á, í, ó o ú que no sea un nombre copiado del original) hace que el texto se pida una vez más y que, si sigue en español, no se guarde. La migración V28 borra las 10 filas malas para que se traduzcan otra vez. Sin falsos positivos en los diccionarios publicados. Pruebas del servicio de IA: 125 → 128.
- Orden de merge: AIPatSft#5 antes que DBPatSft#3.

### H-053 · El docente no podía probar todo con los botones de acceso, y las fotos no se guardaban si el lugar en uso era solo para ver
- Repositorio: BackendPatSft · FrontendPatSft · Tipo: pedido del docente / error · Severidad: **Alta** · Estructural: no · Estado: Resuelto (BackendPatSft#6, FrontendPatSft#42) · Detectado por: pedido del dueño (20 nov)
- Evidencia: el docente revisa la app solo con los botones, sin hablar con nadie, y las cuentas de demostración tenían bloqueos (pagar, cambiar nombre, foto y contraseña, compartir, eliminar). Con la cuenta de Ana, la foto fallaba con 403 porque el lugar en uso era un río compartido solo para ver. Además, `PhotoFlow` usaba `event.currentTarget` después de un `await`: tras un error, «Guardar» quedaba desactivado para siempre.
- Corrección: tres botones (Usuario en plan gratuito, Premium y Administrador) sin bloqueos de demostración. `DemoAccounts.restore` deja cada cuenta como se ofrece antes de cada inicio de sesión con el botón. El administrador demo solo actúa sobre cuentas demo y `@example.com`. `PlaceAccess.activeForRecording` guarda la medición en un lugar propio si el lugar en uso es de solo lectura. Pruebas: backend 114 → 115; frontend 60 → 60.

### H-054 · La foto podía tomar la temperatura como pH, y el administrador demo tenía límite de IA
- Repositorio: AIPatSft · Tipo: IA / pedido del docente · Severidad: **Media** · Estructural: no · Estado: Resuelto (AIPatSft#6) · Detectado por: pedido del dueño (20 nov)
- Evidencia: muchos medidores muestran varios números (pH, temperatura, mV) y la instrucción al modelo de visión no decía cuál leer.
- Corrección: la IA lee solo el número que tiene «pH» al lado, y si no lo distingue dice que no se pudo leer. El administrador demo vuelve a tener IA ilimitada (revierte una parte de H-019), y los correos de personas reales siguen enmascarados. Pruebas: 125 → 125.

### H-055 · En el celular, la lectura por foto abría la cámara y no dejaba elegir una foto de la galería
- Repositorio: FrontendPatSft · Tipo: error de interfaz · Severidad: **Media** · Estructural: no · Estado: Resuelto (FrontendPatSft#43) · Detectado por: el dueño en su celular (20 nov)
- Evidencia: el campo de archivo tenía `capture="environment"`, que en el celular obliga a usar la cámara.
- Corrección: se quita `capture`, así el celular ofrece la galería y los archivos. La cámara sigue disponible con el botón «Usar la cámara de este equipo». Pruebas: 60 → 60.

### H-056 · Una medición crítica no hacía sonar la alarma si no había mediciones en la última hora
- Repositorio: BackendPatSft · AIPatSft · Tipo: error · Severidad: **Alta** · Estructural: no · Estado: Resuelto (BackendPatSft#7, AIPatSft#7) · Detectado por: el dueño en producción (20 nov)
- Evidencia: una foto con pH 12,67 solo creó «pH en nivel crítico» y «Valor atípico». No sonó la alarma, Aqua no habló y no llegó el aviso urgente. `PhAlterationRule` solo comparaba con la última hora, y la medición anterior era de 1 h 16 min antes (`recent.isEmpty()`).
- Corrección: una medición en nivel crítico es una alteración aunque no haya mediciones recientes. Se compara con la anterior, sea de cuando sea, o se menciona sola si es la primera. La misma regla está en la IA (H-003). Pruebas: backend 115 → 116, con el caso de producción; IA 128 → 128.

### H-057 · En el celular aparecía la ventana de la alarma pero la sirena no sonaba
- Repositorio: FrontendPatSft · Tipo: error · Severidad: **Alta** · Estructural: no · Estado: Resuelto (FrontendPatSft#44) · Detectado por: el dueño en su celular (20 nov)
- Evidencia: la sirena se hacía con Web Audio, que el iPhone silencia con el interruptor de silencio y que en los celulares queda suspendido si el toque no se tomó como permiso.
- Corrección: la sirena es un WAV generado en el navegador (`sirenWav`) y suena con un elemento `<audio>`. El primer toque (`touchend` o `click`) la habilita, junto con la voz. En iPhone con Safari 17 o más se pide `audioSession.type = "playback"`. Web Audio queda como respaldo. Pruebas: 60 → 62; 64 de 64 junto con el `main` del 20 nov. El PR se cerró sin merge, se reabrió el mismo día y se hizo merge.

### H-058 · Avisos de la alarma por WhatsApp y correos reales en los botones de acceso
- Repositorio: DBPatSft · BackendPatSft · FrontendPatSft · Tipo: pedido del dueño · Severidad: **Media** · Estructural: sí (columnas nuevas, aprobadas por el dueño) · Estado: Resuelto y luego retirado en parte por H-060 (DBPatSft#4, BackendPatSft#8, FrontendPatSft#45)
- Cambio: la migración V29 agrega `users.phone_number` y `user_settings.whatsapp_alerts`. Se agregaron el envío por la WhatsApp Cloud API (apagado sin credenciales, sin fingir envíos), un límite propio para el correo de la alarma, `Notifier.deliverable` (las direcciones inventadas o de ejemplo no reciben correo) y los correos de los botones configurables con `DEMO_*_EMAIL`. Pruebas: backend 116 → 120.

### H-059 · Los botones de acceso usaban correos inventados
- Repositorio: BackendPatSft · Tipo: pedido del dueño · Severidad: **Baja** · Estructural: no · Estado: Resuelto (BackendPatSft#9)
- Corrección: las cuentas de los botones pasan a buzones reales del dueño (Usuario, Premium y Administrador). Cada cuenta se renombra y conserva sus lugares, mediciones e historial. No se usa la cuenta personal del dueño, porque los intentos fallidos con la contraseña pública la bloquearían. Pruebas: 120 → 120.

### H-060 · Se quita WhatsApp: el dueño decidió no configurar la cuenta de Meta
- Repositorio: BackendPatSft · FrontendPatSft · Tipo: decisión del dueño · Severidad: **Baja** · Estructural: no · Estado: Resuelto (BackendPatSft#10, FrontendPatSft#46)
- Cambio: salen `WhatsAppService`, `WhatsAppController`, las variables `WHATSAPP_*` y la fila de Configuración. Las columnas de V29 quedan sin usar, porque borrarlas sería un cambio destructivo de la base. Se mantienen el correo de la alarma, los correos de los botones y `Notifier.deliverable` (`DeliverableEmailTest`). Pruebas: backend 120 → 118 (salen 3 de WhatsApp y entra 1 del correo); frontend 60 → 60.

### H-061 · El administrador veía la misma app que un usuario y podía medir; el historial mostraba columnas vacías
- Repositorio: BackendPatSft · FrontendPatSft · Tipo: pedido del dueño / error · Severidad: **Media** · Estructural: no · Estado: Resuelto (BackendPatSft#11, FrontendPatSft#47)
- Evidencia: el administrador trabaja para la empresa dueña del software y no debe medir, pero tenía «Medir», el medidor y Aqua. En el historial, Cloro, Alcalinidad, Dureza y Ác. cianúrico aparecían siempre, porque la API manda `"empty": true` dentro de `params`.
- Corrección: `Measurers.require` responde 403 a cualquier medición de una cuenta ADMIN (a mano, con el medidor, con la foto y al cargar datos del USGS). `js/core/Roles.js` separa las pantallas de cada rol, y el administrador tiene su propia barra: Panel, Consumo IA, Datos oficiales y Sesiones. El historial solo muestra esas columnas si alguna medición tiene ese valor. Pruebas: backend 118 → 119; frontend 60 → 62.

### H-062 · El requisito RNF-07 pedía «instalar la app» y decía que la interfaz solo estaba en español
- Repositorio: FrontendPatSft · Tipo: documentación / decisión del dueño · Severidad: **Baja** · Estructural: no · Esfuerzo: S · Riesgo de regresión: ninguno (solo documentación) · Estado: Resuelto (FrontendPatSft#49) · Detectado por: preparación de la exposición (20 nov)
- Evidencia: `docs/Requerimientos.md` y `docs/issues/37-RNF-07.md` describían RNF-07 como «Compatibilidad e instalación», con el criterio «El navegador ofrece instalar la app» y la frase «Interfaz en español». La app tiene siete idiomas (`js/core/Locale.js`). Sobre la instalación: Chromium no reporta errores de instalabilidad en la app publicada (`Page.getInstallabilityErrors` vacío, manifiesto sin errores), así que técnicamente sí se puede instalar en Chrome o Edge; pero el dueño decidió que el requisito no prometa instalarla.
- Corrección: RNF-07 pasa a «Compatibilidad con navegadores»: se usa desde el navegador sin instalar nada, en computador y celular; el medidor necesita Chrome o Edge en un computador; interfaz en siete idiomas. No cambia código: el manifiesto y `sw.js` (que también sirve para los avisos Web Push) se quedan.

### H-063 · La gota de «Acerca de» en Configuración ocupaba todo el ancho de la tarjeta
- Repositorio: FrontendPatSft · Tipo: error de interfaz · Severidad: **Baja** · Estructural: no · Esfuerzo: S · Riesgo de regresión: bajo · Estado: En revisión (rama `mejora/H-063-gota-acerca-de`) · Detectado por: el dueño (20 nov)
- Evidencia: en la app publicada, el logo de «Acerca de» medía 948 × 948 px en computador (1280 px de ancho) y 320 × 320 px en celular. `Settings.js` usa `logo("brand-logo")`, pero `.brand-logo` solo tiene tamaño dentro de la pantalla de acceso (`.auth-hero-content .brand-logo`), y un SVG sin tamaño crece hasta llenar el espacio.
- Corrección: la fila pasa a `about-brand` y `Views.css` le da a la gota 56 × 56 px (`flex: none`), con la misma sombra que la de la barra superior. Se mantiene la clase `brand-logo`, así la gota sigue respetando el ajuste «Animaciones». Probado sobre la app publicada con los archivos de la rama: 56 px en computador y en celular, sin errores de consola. Pruebas: 64 → 65 (`AboutLogo.test.mjs`, que falla sin la corrección).
