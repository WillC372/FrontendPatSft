# PoolGuard — Frontend

Interfaz de usuario interactiva para el sistema de monitoreo inteligente de calidad de agua en piscinas de uso mixto (adultos y niños), diseñada como caso de estudio universitario de **Patrones de Software**.

> **Repositorio del Backend:** [BackendPatSft](https://github.com/WillC372/BackendPatSft)

---

## 🚀 Características de la Interfaz

* **Diseño Responsivo & Temas:** Soporte completo para Modo Claro y Modo Oscuro con persistencia en preferencias de usuario.
* **Dashboard en Tiempo Real:** Métricas de pH, cloro libre, temperatura y carga de bañistas con código de colores según el estado del agua (Óptima, Precaución, Crítico).
* **Gráfica de Tendencia (24 Horas):** Renderizada en HTML5 Canvas nativo mostrando las curvas históricas de pH y cloro.
* **Control de Sensor & Simulador de Pruebas (Patrones Observer y State):**
  * **Pestaña BLE:** Escaneo de medidor físico *AquaMeter-BT-01*.
  * **Pestaña Simulador:** Transmisión en vivo de telemetría bajo demanda con 4 escenarios de prueba:
    1. *Agua Óptima:* pH 7.38, Cloro 1.90 ppm.
    2. *Fluctuación Leve:* Desviación de parámetros y asistencia química.
    3. *Contaminación Súbita:* Simulación de ingreso de fluidos (orina/urea), caída drástica de pH y disparo de alerta de voz.
    4. *Sobrecarga de Bañistas:* Evaluación de carga orgánica con motor de IA predictiva.
    * *Sliders Manuales:* Ajuste manual en vivo de pH y cloro para pruebas de fluctuación.
* **Alertas Multicanal en Español:** Notificaciones push en pantalla y **Alertas por Voz en Español** mediante la Web Speech API nativa.
* **Módulo de Administración:** Modificación de umbrales en vivo (Patrón Command) y registro de mantenimientos con bitácora de auditoría inalterable.
* **Asistente de Dosificación Química e IA:** Cálculo de químicos correctivos y porcentaje de probabilidad de colapso sanitario.
* **Generación de Reportes Sanitarios:** Descarga instantánea de informes de cumplimiento en formato `.txt`.

---

## 🛠️ Tecnologías Utilizadas

* **HTML5 Semántico**
* **CSS3 Moderno** (Flexbox, CSS Grid, Custom Properties / Variables de Color)
* **JavaScript Puro (Vanilla JS ES6+)** — Sin dependencias ni frameworks externos de terceros.
* **Web Speech API** (Síntesis de voz en español `es-ES`).
* **HTML5 Canvas API** (Gráficos estadísticos nativos).

---

## 🌐 Despliegue en Vercel

Este repositorio está preconfigurado para desplegarse directamente en **Vercel**:

1. Ingresa a [Vercel](https://vercel.com) e inicia sesión con GitHub.
2. Haz clic en **Add New...** > **Project**.
3. Selecciona el repositorio **`FrontendPatSft`** y haz clic en **Import**.
4. Haz clic en **Deploy**.

Vercel reconocerá el archivo `vercel.json` y publicará la aplicación en segundos, permitiendo probar la app en la nube con su **Simulador de Sensores Integrado y Persistencia Reactiva**.

---

## 👥 Usuarios Demo

| Usuario | Contraseña | Rol |
| :--- | :--- | :--- |
| `admin` | `admin123` | Administrador |
| `operario` | `operario123` | Operario |

*(También es posible crear cuentas nuevas desde la pestaña "Registrarse")*.




https://frontendpatsft.vercel.app/
