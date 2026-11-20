# 8. Arquitectura: componentes y despliegue

## 8.1 Componentes

```mermaid
flowchart TB
    subgraph Navegador[Navegador del usuario o del administrador]
        UI[App web · HTML, CSS y JavaScript con módulos ES<br/>js/views · js/core · js/ui]
        SW[Service worker · avisos Web Push]
        WS[Web Serial · medidor USB o Bluetooth]
    end

    subgraph Backend[BackendPatSft · Spring Boot 3.4, Java 21]
        B1[user · security · admin]
        B2[measurement · validation · alert]
        B3[place · profile · treatment · reminder]
        B4[payment · notify · reference · device]
    end

    subgraph IA[AIPatSft · Spring Boot, Java 21]
        I1[intelligence · chat, diagnóstico, escenarios, agente, alarma]
        I2[ml · Isolation Forest · deep · LSTM]
        I3[vision · lectura por foto]
        I4[knowledge · biblioteca normativa BM25]
        I5[i18n · traducción de la interfaz]
    end

    DB[(PostgreSQL · Neon<br/>esquema de DBPatSft, Flyway)]

    subgraph Externos[Servicios externos]
        GEM[Google Gemini]
        GRQ[Groq]
        USGS[USGS · pH de ríos]
        PAYU[PayU · sandbox]
        MAIL[Correo · API HTTPS o SMTP]
    end

    MED[[Medidor ESP32 + PH-4502C · Atlas EZO · medidor de texto]]

    UI -- REST /api/v1 + JWT --> Backend
    UI -- REST y SSE + el mismo JWT --> IA
    WS --- MED
    Backend -- JPA --> DB
    IA -- JPA y JDBC --> DB
    IA -- ruta interna X-Internal-Key: guardar lectura por foto --> Backend
    Backend -- ruta interna X-Internal-Key: traducir correos --> IA
    IA --> GEM
    IA --> GRQ
    Backend --> USGS
    Backend --> PAYU
    PAYU -- webhook de confirmación --> Backend
    Backend --> MAIL
    Backend -- Web Push --> SW
```

## 8.2 Despliegue

```mermaid
flowchart LR
    subgraph Usuario[Dispositivo del usuario]
        BR[Chrome, Edge, Safari o Firefox<br/>computador o celular]
    end
    subgraph Vercel[Vercel · CDN]
        FE[FrontendPatSft<br/>aquaassistantai.vercel.app]
    end
    subgraph Render[Render · plan gratuito, 512 MB]
        BE[Backend<br/>contenedor Docker, Java 21]
        AI[Servicio de IA<br/>contenedor Docker, Java 21]
    end
    subgraph Neon[Neon]
        PG[(PostgreSQL 16)]
    end
    subgraph GitHub[GitHub]
        GA[GitHub Actions<br/>pruebas en cada pull request<br/>migraciones a Neon solo desde main]
    end

    BR -- HTTPS --> FE
    BR -- HTTPS --> BE
    BR -- HTTPS --> AI
    BE -- TLS --> PG
    AI -- TLS --> PG
    GA -- Flyway --> PG
    GA -. el merge a main despliega .-> FE
    GA -. el merge a main despliega .-> BE
    GA -. el merge a main despliega .-> AI
```

| Componente | Repositorio | Dónde corre | Cómo se publica |
|---|---|---|---|
| App web | FrontendPatSft | Vercel | Merge a `main` (cada rama tiene vista previa) |
| Backend | BackendPatSft | Render (Docker) | Merge a `main` |
| Servicio de IA | AIPatSft | Render (Docker) | Merge a `main` |
| Esquema | DBPatSft | Neon | GitHub Actions aplica las migraciones desde `main` |
| Medidor casero | FrontendPatSft (`hardware/`) | ESP32 | Firmware Arduino, probado en GitHub Actions |

## 8.3 Decisiones de arquitectura

| Decisión | Motivo | Consecuencia |
|---|---|---|
| Separar la IA en su propio servicio | El backend gratuito de 512 MB no aguantaba los modelos y la IA | Dos servicios que comparten base de datos, JWT y rutas internas |
| Una sola base de datos compartida | Evitar duplicar cuentas, lugares y mediciones | Las migraciones viven en un repositorio aparte y cada servicio usa una copia en sus pruebas |
| Frontend sin frameworks ni compilación | Publicar en Vercel sin pasos de construcción | Módulos ES, pruebas con `node:test` |
| La IA nunca contradice al sistema | El veredicto lo calculan reglas comprobables | La IA explica y recomienda; el estado del agua lo decide el backend |
| El administrador ve otra aplicación | Trabaja para la empresa, no mide agua (H-061) | `Roles.js` en el frontend y `Measurers` en el backend |
