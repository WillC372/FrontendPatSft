# 9. Matriz de trazabilidad

Cada requisito con su caso de uso, dónde está implementado y qué prueba automática lo verifica. Prefijos de las pruebas: **B** = BackendPatSft (JUnit), **I** = AIPatSft (JUnit) y **F** = FrontendPatSft (`node:test`). Los casos de uso están en [01-Actores-y-casos-de-uso.md](01-Actores-y-casos-de-uso.md).

| Requisito | Caso de uso | Implementación principal | Pruebas |
|---|---|---|---|
| RF-01 Registro, inicio y cierre de sesión | CU-01 | `user/AuthService`, `security/JwtAuthenticationFilter`, `js/views/Auth.js` | B `ApiFlowIntegrationTest`, B `AccountChangesIntegrationTest`, F `PasswordRules` |
| RF-02 Recuperación de contraseña | CU-01 | `AuthService.requestPasswordReset`, `MailService` | B `PasswordRecoveryEmailIntegrationTest` |
| RF-03 Acceso de demostración por rol | CU-02 | `user/DemoAccounts` (restauración al entrar), `Auth.js` | B `DemoAccountsIntegrationTest`, B `DemoEmailsIntegrationTest` |
| RF-04 Inicio | CU-03 | `dashboard/DashboardController`, `js/views/Dashboard.js` | B `ApiFlowIntegrationTest` |
| RF-05 Registrar una medición | CU-03 | `MeasurementService`, `Measurers`, `PlaceAccess.activeForRecording` | B `ApiFlowIntegrationTest`, B `PlacesIntegrationTest`, B `DemoAccountsIntegrationTest` |
| RF-06 Historial, gráficas y exportación | CU-07 | `MeasurementSpecifications`, `MeasurementIterator`, `js/views/History.js` | B `MeasurementExportIntegrationTest`, B `MeasurementIteratorTest` |
| RF-07 Conectar y calibrar un medidor | CU-04 | `device/*` (Adapter, Factory, State), `js/core/BrowserMeter.js` | B `AdapterTest`, B `PhMeterFactoryTest`, B `DeviceConnectionStateTest`, B `TextMeterParserTest`, F `MeterProtocols` |
| RF-08 Perfiles de agua con rangos | CU-08 | `profile/PhClassifier`, `WaterProfile.copyFor` | B `PhClassifierTest`, F `ProfileRules` |
| RF-09 Alertas y anomalías | CU-06 | `alert/AlertService`, `AnomalyDetector` y sus reglas | B `PhAlterationRuleTest`, B `ApiFlowIntegrationTest`, I `IsolationForestTest`, I `MlModelServiceTest` |
| RF-10 Tendencias y predicción | CU-12 | `intelligence/deep/DeepForecastService` (LSTM) | I `DeepLearningTest`, I `OfficialSeriesForecastIntegrationTest` |
| RF-11 Diagnóstico con IA y fuentes | CU-12 | `DiagnosisService`, `knowledge` (BM25) | I `DiagnosisIntegrationTest`, I `DiagnosisValidatorTest`, I `RetrievalTest`, I `KnowledgeBaseTest` |
| RF-12 Simulador de escenarios | CU-12 | `ScenarioSimulator` | I `ChatMemoryAndScenarioTest`, I `AssistantMemoryScenarioCostIntegrationTest` |
| RF-13 Informes y PDF | CU-14 | `ReportBuilder`, `PdfWriter`, agente de informes | I `ReportBuilderTest`, I `PdfWriterTest`, I `ReportAgentTest`, I `AgentReportIntegrationTest` |
| RF-14 Asistente con respuesta en vivo | CU-13 | Chat con SSE, `FallbackAiProvider`, `js/core/SseParser.js` | I `FallbackAiProviderTest`, I `CitationReferencesTest`, F `SseParser`, F `AnswerText` |
| RF-15 Lectura de pH por foto | CU-05 | `vision/PhotoReadingService` | I `PhotoReadingIntegrationTest`, I `PhotoReadingValidatorTest`, I `ImageSanitizerTest` |
| RF-16 Planes y pagos | CU-15 | `payment/PaymentService`, `PayuGateway` | B `PaymentIntegrationTest`, B `PaymentConcurrencyTest`, B `PayuGatewayTest` |
| RF-17 Configuración de la cuenta | CU-16 | `UserController`, `js/views/Settings.js` | B `AccountChangesIntegrationTest` |
| RF-18 Foto de perfil, nombre y contraseña | CU-16 | `AvatarService`, `AuthService.changePassword` | B `AvatarIntegrationTest`, B `AccountChangesIntegrationTest` |
| RF-19 Historial de sesiones | CU-16, CA-07 | `user_sessions`, `audit_log` | B `SessionHistoryIntegrationTest`, F `SessionText` |
| RF-20 Datos oficiales (USGS) | CA-06, CA-08 | `reference/*`, `OfficialDataService` | B `OfficialDataIntegrationTest`, B `ReferenceDataImportTest`, F `OfficialText` |
| RF-21 Administración y consumo de IA | CA-01 a CA-07 | `admin/*`, `AiUsageController`, `js/views/Admin.js`, `js/core/Roles.js` | B `AdminIntegrationTest`, B `AdminLimitsTest`, I `DemoAdminPrivacyTest`, I `AiProviderProxyTest`, F `Roles` (H-061) |
| RF-22 Aqua y recorrido guiado | CU-12 | `js/views/AquaBot.js`, `js/views/Tour.js` | Revisión en el navegador |
| RF-23 Varios lugares y otros parámetros | CU-08 | `place/*`, `WaterParams` | B `PlacesIntegrationTest` |
| RF-24 Calculadora de dosis y tratamientos | CU-10 | `js/core/DoseCalc.js`, `treatment/*` | F `DoseCalc`, B `CareFeaturesIntegrationTest` |
| RF-25 Recordatorios y avisos | CU-11 | `reminder/*`, `notify/Notifier`, Web Push | B `CareFeaturesIntegrationTest`, B `WebPushCryptoTest`, B `DeliverableEmailTest` |
| RF-26 Compartir un lugar | CU-09 | `PlaceService.share` / `join` | B `PlacesIntegrationTest` |
| RF-27 Historial de calibraciones | CU-04 | `calibration/*` | B `CareFeaturesIntegrationTest` |
| RF-28 App en el idioma elegido | CU-16 | `i18n` en los dos servicios, `js/core/I18n.js` | B `I18nIntegrationTest`, I `I18nIntegrationTest`, I `TranslationServiceTest`, I `UiTextWarmerTest` |
| RF-29 Voz de Aqua | CU-06, CU-13 | `js/core/Voice.js` | Revisión en el navegador |
| RF-30 Alarma por alteración del pH | CU-06 | `PhAlterationRule`, `Notifier`, `js/views/PhAlarm.js`, `js/core/AlarmSound.js` | B `PhAlterationRuleTest`, I `AnalysisTest`, I `AlarmExplanationIntegrationTest`, F `AlarmRules` |
| RNF-01 Seguridad | Todos | JWT con versión, `user_sessions`, `RateLimiter`, `X-Internal-Key` | B `RateLimiterTest`, I `RateLimiterTest`, B `ApiFlowIntegrationTest` |
| RNF-02 Rendimiento | Todos | `ApiCache`, `ExpiringCache`, caché de IA | F `ApiCache`, B `ExpiringCacheTest`, I `ExpiringCacheTest` |
| RNF-03 Disponibilidad | Todos | `KeepAwake`, «Activando el servidor…», respaldo sin IA | B `KeepAwakeTest`, I `AnalysisWithoutGenerativeAiIntegrationTest` |
| RNF-04 Usabilidad y accesibilidad | Todos | Diseño adaptable, `StorageJanitor` | Revisión con axe-core en 36 pantallas, F `StorageJanitor` |
| RNF-05 Privacidad | CA-02, CU-16 | Enmascarado de cuentas reales, avatar privado | I `DemoAdminPrivacyTest`, B `DemoAccountsIntegrationTest`, B `AvatarIntegrationTest` |
| RNF-06 Mantenibilidad | — | Patrones de diseño, CI en cada pull request, control de `main` | F `ProtegerMain`, todas las suites |
| RNF-07 Compatibilidad | — | Navegadores modernos, Web Serial en Chrome y Edge | F `MeterProtocols`, revisión en el navegador |

## Estado de las pruebas (20 nov 2026, en `main`)

| Repositorio | Pruebas | Resultado |
|---|---|---|
| FrontendPatSft | 60 (`node:test`) y 74 módulos con sintaxis válida; 62 con H-061 | Todas aprobadas |
| BackendPatSft | 118 (JUnit con H2) | Todas aprobadas |
| AIPatSft | 128 (JUnit con H2 y proveedores imitados) | Todas aprobadas |
| DBPatSft | Migraciones aplicadas dos veces a una base vacía | Aprobado |
