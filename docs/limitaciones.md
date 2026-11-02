# Limitaciones y trabajo pendiente

- **Sin medidor físico:** no hay conectores Bluetooth/USB ni calibración. Solo simulador. Ver [dispositivos.md](dispositivos.md).
- **Sin pantallas** de informes, de plan/suscripción ni de chat; el backend ofrece informes y suscripciones.
- **Sin IA generativa** ni pagos (dependen de credenciales).
- **Una sola plataforma verificada** (Linux); sin instalador ni versión móvil. Ver [plataformas.md](plataformas.md).
- **Sin pruebas automáticas de interfaz.**
- **Interfaz:** textos fijos en español (sin internacionalización); accesibilidad sin evaluar formalmente; no hay modo de navegación adaptado a pantallas pequeñas (el diseño se probó a 1180×760 y 1280×800).
- **Token recordado** guardado en un archivo local protegido por permisos del sistema, no en un almacén cifrado del sistema operativo.
- **Ajustes:** la pantalla de configuración (apariencia, notificaciones, base de datos) no existe como módulo; el tema se cambia desde la barra superior.
- **Módulos del documento original sin pantalla propia:** Conexión de dispositivos (combinada con la medición), Configuración, Gestión de usuarios.
