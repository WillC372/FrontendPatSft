# Integración de medidores de pH

## Qué existe hoy

- Interfaz `DeviceConnector` (conectar, desconectar, medir, estado, observadores).
- Máquina de estados, plantilla de medición, comandos y fábrica (ver [patrones.md](patrones.md)).
- **Un solo conector: `SimulatedPhConnector`.** Genera lecturas sintéticas (caminata aleatoria alrededor de 7,2) y su nombre es "Simulador de pH (datos simulados)". En el servidor, un dispositivo de tipo `SIMULATOR` produce siempre mediciones `SIMULATED`, y la interfaz las rotula SIMULACIÓN.
- Si se vincula un dispositivo `BLUETOOTH` o `USB_SERIAL`, la pantalla indica que el conector **no está disponible** (requiere implementarse y probarse con un medidor físico).

## Qué NO existe (y por qué)

No hay conector Bluetooth ni USB, ni calibración, ni reconexión automática, ni descubrimiento de dispositivos: no se dispone de un medidor físico ni se ha confirmado el protocolo de ninguno. **No se afirma compatibilidad con ningún modelo.**

## Investigación de hardware (parcial, sin confirmar)

La investigación quedó incompleta: el entorno de desarrollo bloqueó el acceso a los sitios de los fabricantes, así que **no se pudieron verificar precios, disponibilidad ni envío**.

| Candidato | Lo que se encontró | Sin confirmar |
|---|---|---|
| **Atlas Scientific EZO-pH** (circuito + sonda) | Según su [hoja de datos](https://cdn.robotshop.com/media/A/Atl/RB-Atl-02/pdf/pH-ezo-datasheet.pdf): protocolo documentado en **ASCII**, modos UART (9 600 baudios por defecto) e I2C (dirección 99 por defecto), calibración de 1, 2 o 3 puntos | Versión vigente del datasheet, sintaxis exacta de comandos y códigos de respuesta, precio, y si existe una placa con **USB** que aparezca como puerto serie (necesaria para conectarlo a un computador sin electrónica adicional) |
| Medidores Bluetooth comerciales | No se halló ninguno con protocolo abierto | Todo. Muchos solo funcionan con su aplicación propietaria. Existe una característica estándar de pH en el servicio de sensado ambiental de Bluetooth (UUID 0x2A78, citado de memoria): hay que confirmarlo en la lista oficial de la Bluetooth SIG y comprobar si algún medidor la usa |

**Recomendación provisional:** priorizar un módulo con interfaz **USB-serie y protocolo ASCII documentado**, por ser el camino más sencillo desde Java. El EZO-pH es el mejor candidato conocido, pero **no compre nada** hasta verificar en la página del fabricante: (1) que haya una versión USB, (2) el precio total de circuito, sonda y placa, (3) que envíen a su país, y (4) la hoja de datos vigente.

## Plan de integración cuando haya hardware

1. Implementar `SerialPortConnector extends AbstractDeviceConnector` usando una biblioteca de puerto serie para Java (por ejemplo jSerialComm, **aún no evaluada ni añadida**).
2. Separar el protocolo del transporte: un **Adapter** que traduzca el protocolo del medidor (comandos de lectura y respuestas ASCII) y un **Bridge** hacia el transporte (serie hoy, Bluetooth mañana).
3. Registrar el modelo en `ConnectorFactory`.
4. Implementar calibración en el estado `CALIBRATING` si el hardware la admite.
5. Probar con el aparato real y registrar el resultado en este documento.

## Partes que requieren prueba con hardware real

Descubrimiento y conexión, lectura continua, errores de comunicación (desenchufar, tiempo de espera), reconexión, calibración, y precisión de las lecturas frente a una solución buffer conocida.
