# 3. Diagramas de flujo (actividad)

## 3.1 Inicio de sesión y entrada según el rol

```mermaid
flowchart TD
    A([Abre la app]) --> B{¿Tiene sesión vigente?}
    B -- Sí --> R
    B -- No --> C[Pantalla de inicio de sesión]
    C --> D{¿Cómo entra?}
    D -- Botón Usuario, Premium o Administrador --> E[El formulario se llena con el correo y la contraseña de la cuenta de demostración]
    D -- Su correo y contraseña --> F[Escribe sus datos]
    E --> G[Backend: restaura la cuenta de demostración<br/>plan, nombre, contraseña; la crea si se borró]
    F --> H
    G --> H{¿Credenciales correctas?}
    H -- No --> I[Suma un intento fallido<br/>5 intentos bloquean la cuenta un tiempo] --> C
    H -- Sí --> J[Abre una sesión en user_sessions<br/>y entrega el token JWT]
    J --> R{¿Rol?}
    R -- ADMIN --> K[Panel de administración<br/>Panel · Consumo IA · Datos oficiales · Sesiones]
    R -- USER --> L[Inicio del usuario<br/>Inicio · Historial · Medir · Cuidado · Plan]
    K --> M([Fin])
    L --> M
```

## 3.2 Registrar una medición (backend)

```mermaid
flowchart TD
    A([Llega una lectura: a mano, medidor o foto]) --> B{¿La cuenta es de administrador?}
    B -- Sí --> X1[403: el administrador no registra mediciones] --> Z([Fin])
    B -- No --> C{¿El lugar en uso permite medir?}
    C -- No, es solo para ver --> D[Usa el primer lugar propio<br/>y lo deja como lugar en uso]
    C -- Sí --> E
    D --> E[Cadena de validación<br/>rango físico · fecha · temperatura · origen · cambio brusco]
    E --> F{¿Rechazada?}
    F -- Sí --> X2[422 con el motivo] --> Z
    F -- No --> G[Clasifica con el perfil del lugar<br/>ácida, neutra o alcalina · óptimo, precaución o crítico]
    G --> H[Guarda la medición y publica el evento]
    H --> I[Reglas de anomalía:<br/>fuera de rango · alteración del pH · valor atípico]
    I --> J{¿Hay anomalías nuevas?<br/>no repetidas en 30 min}
    J -- No --> K[Respuesta con el resultado]
    J -- Sí --> L[Crea las alertas para cada persona del lugar]
    L --> M{¿Es una alteración del pH?}
    M -- Sí --> N[Aviso urgente al celular y correo de alarma]
    M -- No --> O[Aviso normal y correo, como mucho uno por hora]
    N --> K
    O --> K
    K --> Z
```

## 3.3 La alarma en la app

```mermaid
flowchart TD
    A([Cada 15 s, o al instante con el medidor conectado]) --> B[Consulta las alertas no leídas]
    B --> C{¿Hay una PH_ALTERATION nueva<br/>de los últimos 15 min y no vista?}
    C -- No --> A
    C -- Sí --> D[Muestra la ventana de alarma<br/>Es peligroso / Por ahora no es peligroso]
    D --> E{¿La página ya recibió un toque?}
    E -- No --> F[Pide tocar la ventana para sonar] --> G
    E -- Sí --> G[Suena la sirena como audio normal]
    G --> H[Aqua dice en voz alta qué pasó y qué hacer]
    H --> I[Pide a la IA la explicación ampliada<br/>causas, pasos, cuándo vuelve a ser seguro]
    I --> J[Aqua la lee]
    J --> K{¿Pulsó Entendido?}
    K -- No, y no pasaron 2 min --> L[Sirena corta cada 10 s] --> K
    K -- Sí --> M[Marca la alerta como leída] --> N([Fin])
```

## 3.4 Lectura del pH por foto

```mermaid
flowchart TD
    A([Medir → Con una foto]) --> B{¿Tira reactiva o pantalla del medidor?}
    B --> C[Elige una foto de la galería o usa la cámara]
    C --> D[El navegador la endereza y la convierte a JPEG]
    D --> E[Servicio de IA: sanea la imagen y la envía al modelo de visión]
    E --> F{¿Tipo?}
    F -- Pantalla --> G[Lee solo el número marcado pH<br/>la temperatura va aparte]
    F -- Tira --> H[Compara el color con la carta<br/>y pide segunda opinión a otro modelo]
    G --> I{¿Se pudo leer?}
    H --> I
    I -- No --> J[No se pudo leer: no inventa un valor] --> Z([Fin])
    I -- Sí --> K[Muestra valor, margen y confianza]
    K --> L[El usuario confirma o corrige]
    L --> M[Ruta interna al backend → flujo 3.2]
    M --> Z
```

## 3.5 Pago de Premium

```mermaid
flowchart TD
    A([Plan → Pagar con PayU]) --> B[Backend crea el pago PENDING y firma el formulario]
    B --> C[El navegador va a la página segura de PayU]
    C --> D{¿Resultado en PayU?}
    D -- Aprobado --> E[PayU confirma por webhook]
    D -- Rechazado o vencido --> F[Pago DECLINED o EXPIRED]
    E --> G[El usuario vuelve a la app]
    F --> G
    G --> H[Backend verifica el estado con la API de PayU<br/>con bloqueo del pago]
    H --> I{¿Aprobado y aún no aplicado?}
    I -- Sí --> J[Premium por 30 días · correo de confirmación]
    I -- No --> K[El plan no cambia]
    J --> L([Fin])
    K --> L
```

## 3.6 Recordatorios

```mermaid
flowchart TD
    A([Reloj del sistema, cada pocos minutos]) --> B[Busca recordatorios activos vencidos]
    B --> C{¿Ya se avisó este vencimiento?}
    C -- Sí --> A
    C -- No --> D{¿Por qué canal?}
    D -- Celular --> E[Aviso Web Push]
    D -- Correo --> F[Correo en el idioma de la persona]
    E --> G[Marca el aviso enviado]
    F --> G
    G --> H{¿El usuario lo marcó como hecho?}
    H -- Sí --> I[El próximo vence en N días desde hoy]
    H -- No --> A
    I --> A
```
