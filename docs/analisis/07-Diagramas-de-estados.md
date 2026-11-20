# 7. Diagramas de estados

## 7.1 Medición

Una lectura pasa por la validación y luego queda clasificada según el perfil del lugar. La clasificación no cambia después de guardarse.

```mermaid
stateDiagram-v2
    [*] --> Recibida
    Recibida --> Rechazada : falla un validador (pH fuera de 0–14, fecha futura, temperatura imposible)
    Recibida --> Validada : pasa la cadena (VALID)
    Recibida --> ValidadaConObservaciones : advertencias (WARNING, p. ej. cambio brusco)
    Validada --> Clasificada
    ValidadaConObservaciones --> Clasificada
    state Clasificada {
        [*] --> Optima : dentro del rango ideal
        [*] --> Precaucion : fuera del ideal, dentro del de precaución
        [*] --> Critica : fuera del rango de precaución
    }
    Clasificada --> [*] : guardada en el historial
    Rechazada --> [*] : 422, no se guarda
```

## 7.2 Alerta

```mermaid
stateDiagram-v2
    [*] --> Creada : una regla de anomalía la detecta
    Creada --> Descartada : la misma alerta ya existe en los últimos 30 min
    Creada --> NoLeida : se guarda y se notifica
    NoLeida --> Sonando : es PH_ALTERATION y la app está abierta
    Sonando --> Leida : «Entendido»
    NoLeida --> Leida : se abre en la campana o se marcan todas
    Descartada --> [*]
    Leida --> [*]
```

## 7.3 Pago

```mermaid
stateDiagram-v2
    [*] --> PENDING : checkout (formulario firmado)
    PENDING --> APPROVED : PayU confirma o la verificación lo encuentra aprobado
    PENDING --> DECLINED : PayU lo rechaza
    PENDING --> ERROR : error de PayU
    PENDING --> EXPIRED : no se pagó a tiempo
    APPROVED --> [*] : Premium por 30 días, aplicado una sola vez
    DECLINED --> [*]
    ERROR --> [*]
    EXPIRED --> [*]
```

## 7.4 Sesión

```mermaid
stateDiagram-v2
    [*] --> Abierta : inicio de sesión (con o sin «Recordarme»)
    Abierta --> Abierta : actividad (renueva lastActivityAt)
    Abierta --> Vencida : pasa expiresAt
    Abierta --> Cerrada : LOGOUT
    Abierta --> Cerrada : CLOSED_FROM_OTHER («Cerrar mis otras sesiones»)
    Abierta --> Cerrada : PASSWORD_CHANGED
    Abierta --> Cerrada : ROLE_CHANGED
    Abierta --> Cerrada : ACCOUNT_DISABLED
    Vencida --> [*]
    Cerrada --> [*]
```

## 7.5 Cuenta y plan

```mermaid
stateDiagram-v2
    [*] --> Gratuita : registro
    Gratuita --> Premium : pago aprobado o asignado por un administrador
    Premium --> Gratuita : vence premiumUntil o lo cambia un administrador
    Gratuita --> Desactivada : un administrador la desactiva
    Premium --> Desactivada : un administrador la desactiva
    Desactivada --> Gratuita : un administrador la reactiva
    Gratuita --> [*] : la persona elimina su cuenta
    Premium --> [*] : la persona elimina su cuenta
    note right of Premium
        Las cuentas de los botones vuelven a su plan
        cada vez que alguien entra con el botón.
    end note
```

## 7.6 Medidor conectado al servidor (patrón State)

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    Disconnected --> Connected : conectar (puerto y protocolo)
    Connected --> Live : iniciar modo en vivo
    Live --> Connected : detener modo en vivo
    Connected --> Error : falla la lectura o el puerto
    Live --> Error : falla la lectura
    Error --> Connected : reconectar
    Connected --> Disconnected : desconectar
    Error --> Disconnected : desconectar
```
