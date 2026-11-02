# Manual de usuario

## 1. Abrir la aplicación

Con el backend en marcha, ejecute `mvn javafx:run`. Verá la pantalla de inicio de sesión.

## 2. Crear una cuenta

Pulse **Regístrate aquí**, escriba su nombre, correo, contraseña (8 a 72 caracteres, con una letra y un número) y repítala. Use **Mostrar** para ver lo que escribe. Luego inicie sesión.

## 3. Iniciar sesión

Escriba su correo o usuario y su contraseña. Marque **Recordarme** solo en su propio equipo. Si olvidó la contraseña, use **¿Olvidaste tu contraseña?**: recibirá un código por correo (si el administrador configuró el correo) y lo escribirá junto con la nueva contraseña.

## 4. Inicio

Muestra su última medición con el indicador circular, su clasificación (ácida, neutra o alcalina, y si está en rango recomendado, precaución o crítico), el perfil, el dispositivo y si es una medición **real** o una **SIMULACIÓN**.

## 5. Dispositivos y medición

1. Pulse **Vincular simulador de pruebas** (los medidores físicos aún no están disponibles).
2. Pulse **Conectar**.
3. Elija el perfil de agua y pulse **Medir ahora**.
4. Revise el resultado y pulse **Guardar medición** o **Descartar**. No se muestran gráficas aquí.

El plan gratuito permite 2 dispositivos.

## 6. Historial

Elija el periodo y el origen (reales o simuladas) y pulse **Consultar**. Para ver la evolución, pulse **Ver gráfica de evolución**; la gráfica se genera solo entonces y requiere al menos 3 mediciones.

## 7. AquaSense Intelligence

- **Análisis:** elija perfil y periodo y pulse **Analizar**. Verá resumen, anomalías, tendencia, predicción (solo con datos suficientes y plan Premium), recomendaciones y limitaciones. Si faltan datos, la aplicación lo dice.
- **Simulador de escenarios:** escriba un pH hipotético, o un cambio respecto a su última medición, y pulse **Simular**. Es un "qué pasaría si", no una predicción.
- **Alertas:** lista las alertas abiertas; márquelas como atendidas.

Una anomalía estadística **no** confirma un riesgo sanitario: repita la medición y verifique con otros análisis.

## 8. Perfiles de agua

Cada perfil define los rangos de pH de referencia. Los perfiles del sistema no se modifican: **Duplicar** crea una copia personalizada. Puede crear perfiles propios con **Nuevo perfil personalizado**.

## 9. Tema y cierre de sesión

El botón de la barra superior alterna entre tema claro y oscuro (se recuerda). **Cerrar sesión** está al pie del menú lateral.

## Importante

El pH es solo un indicador: por sí solo no demuestra que el agua sea potable o segura ni que esté libre de contaminantes.
