# 4. Diagramas de secuencia

## 4.1 Medición con foto y alarma (tres servicios)

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant F as App web (Vercel)
    participant IA as Servicio de IA (AIPatSft)
    participant V as Modelo de visión (Gemini o Groq)
    participant B as Backend (BackendPatSft)
    participant DB as PostgreSQL (Neon)
    participant P as Web Push y correo

    U->>F: Medir → Con una foto (pantalla del medidor)
    F->>IA: POST /vision/ph-reading (JPEG, token)
    IA->>IA: Valida el token y sanea la imagen
    IA->>V: Lee solo el número marcado «pH»
    V-->>IA: JSON {ph: 12.67, temperatura, confianza}
    IA->>IA: Valida la respuesta y guarda la lectura pendiente
    IA-->>F: Valor, margen, confianza, pendingId
    U->>F: Guardar medición
    F->>IA: POST /vision/ph-reading/{id}/save
    IA->>B: POST /internal/measurements (X-Internal-Key)
    B->>B: Measurers: ¿no es administrador?
    B->>B: Cadena de validación y clasificación
    B->>DB: INSERT measurements
    B->>B: Reglas: PhAlterationRule detecta nivel crítico
    B->>DB: INSERT alerts (kind PH_ALTERATION)
    B-)P: Aviso urgente y correo de alarma
    B-->>IA: Medición guardada
    IA-->>F: Medición guardada
    loop Cada 15 s
        F->>B: GET /alerts?unreadOnly
    end
    B-->>F: Alerta PH_ALTERATION nueva
    F->>U: Sirena, ventana y voz de Aqua
    F->>IA: POST /intelligence/alarm/{id}/explain
    IA-->>F: Causas, pasos y cuándo vuelve a ser seguro
```

## 4.2 Inicio de sesión con un botón de demostración

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitante
    participant F as App web
    participant B as Backend
    participant D as DemoAccounts
    participant DB as PostgreSQL

    F->>B: GET /auth/demo-accounts
    B-->>F: Usuario, Premium y Administrador (correo y contraseña)
    V->>F: Pulsa «Administrador»
    F->>B: POST /auth/login
    B->>D: restoreBeforeLogin(correo)
    D->>DB: Busca la cuenta y la crea si se borró
    D->>DB: Devuelve contraseña, nombre, rol y plan
    B->>DB: Abre la sesión (user_sessions)
    B-->>F: Token JWT y datos de la cuenta (rol ADMIN)
    F->>F: Roles.js: el administrador va a #/admin
    F->>B: GET /admin/summary y /admin/users
    B-->>F: Cifras y cuentas (las reales, enmascaradas)
```

## 4.3 Pago de Premium con PayU

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant F as App web
    participant B as Backend
    participant PU as PayU
    participant DB as PostgreSQL

    U->>F: Pagar con PayU
    F->>B: POST /payments/checkout
    B->>DB: INSERT payments (PENDING)
    B-->>F: Formulario firmado
    F->>PU: Envía el formulario
    U->>PU: Paga (datos de prueba del sandbox)
    PU-)B: POST /payments/payu/confirmation (webhook firmado)
    B->>DB: SELECT ... FOR UPDATE del pago
    B->>DB: APPROVED · Premium hasta +30 días
    PU-->>F: Vuelve a la app
    F->>B: POST /payments/verify
    B->>DB: SELECT ... FOR UPDATE del pago
    B->>B: Ya estaba aplicado: no suma otra vez
    B-->>F: Plan Premium activo
```

## 4.4 Pregunta al asistente con respuesta en vivo

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant F as App web
    participant IA as Servicio de IA
    participant K as Biblioteca normativa (BM25)
    participant G as Gemini
    participant Q as Groq

    U->>F: ¿Qué hago si el pH de mi piscina sube a 8,4?
    F->>IA: POST /intelligence/assistant (SSE)
    IA->>IA: Cuota del día y memoria de la conversación
    IA->>K: Busca citas de EPA, OMS, CDC y FAO
    K-->>IA: Fragmentos permitidos
    IA->>G: Pregunta con datos del usuario y citas
    alt Gemini responde
        G-->>IA: Texto en partes
    else Gemini falla o se congela
        IA-)F: evento restart
        IA->>Q: Misma pregunta
        Q-->>IA: Texto en partes
    end
    IA-->>F: Respuesta en vivo con citas numeradas
    F->>U: Aqua la escribe y la lee en voz alta
```
