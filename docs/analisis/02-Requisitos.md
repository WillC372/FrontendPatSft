# 2. Requisitos

La especificación completa (historia de usuario, criterios de aceptación y MockUp) está en [`docs/Requerimientos.md`](../Requerimientos.md). Aquí se ven como modelo: qué requisito deriva o refina a otro y con qué elemento se satisface o verifica.

## Diagrama de requisitos funcionales (núcleo)

```mermaid
requirementDiagram

    requirement RF05 {
        id: RF_05
        text: Registrar una medicion y ver su resultado
        risk: high
        verifymethod: test
    }
    requirement RF08 {
        id: RF_08
        text: Perfiles de agua con rangos
        risk: medium
        verifymethod: test
    }
    requirement RF09 {
        id: RF_09
        text: Alertas y deteccion de anomalias
        risk: high
        verifymethod: test
    }
    requirement RF30 {
        id: RF_30
        text: Alarma por alteracion del pH
        risk: high
        verifymethod: test
    }
    requirement RF15 {
        id: RF_15
        text: Lectura de pH por foto
        risk: medium
        verifymethod: demonstration
    }
    requirement RF07 {
        id: RF_07
        text: Conectar y calibrar un medidor
        risk: medium
        verifymethod: test
    }
    requirement RF21 {
        id: RF_21
        text: Administracion de usuarios y consumo de IA
        risk: medium
        verifymethod: test
    }

    element MeasurementService {
        type: "Servicio del backend"
        docref: "BackendPatSft measurement/MeasurementService.java"
    }
    element PhAlterationRule {
        type: "Regla de anomalia"
        docref: "BackendPatSft alert/analysis/PhAlterationRule.java"
    }
    element PhotoReadingService {
        type: "Servicio de IA"
        docref: "AIPatSft vision/PhotoReadingService.java"
    }
    element PhAlarm {
        type: "Pantalla"
        docref: "FrontendPatSft js/views/PhAlarm.js"
    }
    element ApiFlowIntegrationTest {
        type: "Prueba"
        docref: "BackendPatSft src/test"
    }
    element PhAlterationRuleTest {
        type: "Prueba"
        docref: "BackendPatSft src/test"
    }
    element AdminIntegrationTest {
        type: "Prueba"
        docref: "BackendPatSft src/test"
    }
    element AdminController {
        type: "Controlador"
        docref: "BackendPatSft admin/AdminController.java"
    }

    RF05 - contains -> RF08
    RF09 - derives -> RF05
    RF30 - derives -> RF09
    RF15 - refines -> RF05
    RF07 - refines -> RF05
    MeasurementService - satisfies -> RF05
    PhAlterationRule - satisfies -> RF30
    PhAlarm - satisfies -> RF30
    PhotoReadingService - satisfies -> RF15
    AdminController - satisfies -> RF21
    ApiFlowIntegrationTest - verifies -> RF05
    PhAlterationRuleTest - verifies -> RF30
    AdminIntegrationTest - verifies -> RF21
```

## Requisitos no funcionales

```mermaid
requirementDiagram

    performanceRequirement RNF02 {
        id: RNF_02
        text: Rendimiento con planes gratuitos
        risk: medium
        verifymethod: analysis
    }
    designConstraint RNF01 {
        id: RNF_01
        text: Seguridad JWT sesiones revocables y limites
        risk: high
        verifymethod: test
    }
    interfaceRequirement RNF04 {
        id: RNF_04
        text: Usabilidad accesibilidad y diseno adaptable
        risk: medium
        verifymethod: inspection
    }
    designConstraint RNF05 {
        id: RNF_05
        text: Privacidad de los datos
        risk: high
        verifymethod: test
    }
    designConstraint RNF06 {
        id: RNF_06
        text: Mantenibilidad y calidad del codigo
        risk: low
        verifymethod: test
    }

    element JwtAuthenticationFilter {
        type: "Seguridad"
        docref: "BackendPatSft security"
    }
    element ApiCache {
        type: "Cache del frontend"
        docref: "FrontendPatSft js/core/ApiCache.js"
    }
    element AxeCore {
        type: "Revision de accesibilidad"
        docref: "36 pantallas sin hallazgos"
    }
    element GitHubActions {
        type: "Integracion continua"
        docref: "Pruebas en cada pull request"
    }

    JwtAuthenticationFilter - satisfies -> RNF01
    ApiCache - satisfies -> RNF02
    AxeCore - verifies -> RNF04
    GitHubActions - verifies -> RNF06
    RNF05 - derives -> RNF01
```

## Clasificación (MoSCoW)

| Prioridad | Requisitos |
|---|---|
| **Debe tener** | RF-01, RF-04, RF-05, RF-06, RF-08, RF-09, RF-30, RF-21, RNF-01, RNF-05 |
| **Debería tener** | RF-07, RF-11, RF-14, RF-15, RF-16, RF-20, RF-23, RF-24, RF-25, RNF-02, RNF-03, RNF-04 |
| **Podría tener** | RF-10, RF-12, RF-13, RF-22, RF-26, RF-27, RF-28, RF-29, RNF-06, RNF-07 |
| **No tendrá (por ahora)** | Avisos por WhatsApp (se construyó y se quitó a pedido del dueño, H-060) |
