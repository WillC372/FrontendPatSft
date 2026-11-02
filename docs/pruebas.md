# Pruebas del cliente

```bash
mvn test
```

Último resultado verificado: **18 pruebas, 0 fallos**.

| Clase | Pruebas | Cubre |
|---|---|---|
| `ApiClientTest` | 6 | Cabecera Bearer solo en rutas protegidas, errores del servidor con detalles, renovación de token y reintento, sesión expirada, servidor caído, 204 sin contenido |
| `RememberedSessionStoreTest` | 1 | Guardar, leer y borrar el token con permisos `rw-------` |
| `RegisterValidationTest` | 1 | Reglas del formulario de registro |
| `DeviceConnectorTest` | 7 | Estados, observadores, medición inválida, error de conexión, simulador, fábrica, comandos |
| `HistoryChartRuleTest` | 1 | La gráfica exige 3 mediciones |
| `IntelligenceContractTest` | 2 | Interpretar respuestas **reales** del backend (análisis y escenario) |

Los servidores HTTP de prueba (`StubApiServer`) y el hardware falso (`ScriptedConnector`) están identificados como dobles de prueba.

## Verificación manual con la aplicación real

Se ejecutó la interfaz bajo Xvfb contra el backend real y se capturaron: inicio de sesión (claro y oscuro), inicio con medición, dispositivos y medición, historial con gráfica y AquaSense Intelligence con un análisis. **No se pudo hacer clic**, así que registro, recuperación de contraseña, la pestaña de alertas y el simulador de escenarios con resultado no se vieron en pantalla; su lógica está probada en el backend.

## No cubierto

Pruebas automáticas de la interfaz gráfica, conectores reales, otras plataformas distintas de Linux.
