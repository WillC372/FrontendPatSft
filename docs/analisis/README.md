# Ingeniería de requisitos y análisis de software · Aqua Assistant AI

Modelos del sistema tal como está construido y publicado (20 nov 2026). Cada diagrama sale del código de los cuatro repositorios, no de un diseño ideal: las entidades, estados, rutas y reglas tienen el mismo nombre que en el código.

Los diagramas están escritos en [Mermaid](https://mermaid.js.org), así que GitHub los dibuja directamente en esta página.

| # | Documento | Qué contiene |
|---|---|---|
| 1 | [Actores y casos de uso](01-Actores-y-casos-de-uso.md) | Actores, diagrama de casos de uso por rol y especificación de los casos principales |
| 2 | [Requisitos](02-Requisitos.md) | Diagrama de requisitos (funcionales y no funcionales) y cómo se verifica cada uno |
| 3 | [Diagramas de flujo (actividad)](03-Diagramas-de-flujo.md) | Inicio de sesión, medición, alarma, lectura por foto, pago y recordatorios |
| 4 | [Diagramas de secuencia](04-Diagramas-de-secuencia.md) | Interacción entre la app, el backend, el servicio de IA y los servicios externos |
| 5 | [Diagrama de clases](05-Diagrama-de-clases.md) | Modelo de dominio y clases principales con sus patrones de diseño |
| 6 | [Modelo entidad-relación](06-Modelo-entidad-relacion.md) | Tablas de la base de datos (PostgreSQL en Neon) y sus relaciones |
| 7 | [Diagramas de estados](07-Diagramas-de-estados.md) | Estados de una medición, una alerta, un pago, una sesión, una cuenta y el medidor |
| 8 | [Arquitectura: componentes y despliegue](08-Arquitectura.md) | Los cuatro repositorios, los servicios externos y dónde corre cada parte |
| 9 | [Matriz de trazabilidad](09-Trazabilidad.md) | Requisito → caso de uso → componentes → pruebas |

Los requisitos completos, con historia de usuario, criterios de aceptación y MockUp, están en [`docs/Requerimientos.md`](../Requerimientos.md).
