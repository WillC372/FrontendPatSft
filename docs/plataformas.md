# Plataformas

| Plataforma | Estado |
|---|---|
| **Linux** (Ubuntu 24.04, OpenJDK 21, x86-64) | **Compilado, ejecutado y capturado.** Se ejecutó con un servidor gráfico virtual (Xvfb). |
| Windows | **No probado.** JavaFX lo soporta; no se ha compilado ni ejecutado aquí. |
| macOS | **No probado.** |
| Android / iOS | **No compilado ni evaluado.** Requeriría Gluon (GluonFX), que usa GraalVM; la compilación para iOS exige un Mac con Xcode. Bluetooth, USB y permisos son específicos de cada sistema y habría que abstraerlos. No se promete soporte. |
| Web (URL pública) | **No aplicable directamente.** JavaFX es una tecnología de escritorio/móvil; no puede desplegarse en Vercel como un sitio web. Una alternativa Java (por ejemplo JPro) no se ha evaluado. |

## Distribución pendiente

Falta generar un JAR ejecutable con dependencias y un instalador por sistema operativo (`jpackage`). Un instalador solo se puede construir en el sistema operativo de destino. Hasta entonces, la aplicación se ejecuta con `mvn javafx:run`.
