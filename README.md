InterTand – Fase 2 (Prototipado)

InterTand es un prototipo académico que digitaliza el sistema tradicional de tandas (ahorros rotativos comunitarios) integrando la tecnología Interledger Open Payments para manejar pagos de manera segura y transparente.

¿Cuál es el problema?

Las tandas tradicionales presentan varios inconvenientes:
Falta de transparencia en el manejo del dinero.
Dependencia de una sola persona coordinadora que puede cometer errores.
Pagos en efectivo, lo cual implica riesgo de pérdidas o robos.
Complejidad al gestionar múltiples participantes.
Riesgo de fraudes o malos manejos.
Limitación geográfica: solo pueden participar personas cercanas.
Proceso manual y lento.

¿Qué tecnología usarán?

Backend
Node.js con Express.js – Servidor web
MySQL – Base de datos relacional
bcrypt – Seguridad de contraseñas
@interledger/open-payments – Integración con Interledger para pagos

Frontend
HTML5 y CSS3 – Estructura y estilos
Tailwind CSS – Framework CSS para diseño
JavaScript – Lógica en cliente

Herramientas
Git y GitHub – Control de versiones

¿Cuál es la solución?

InterTand digitaliza el proceso de las tandas mediante una aplicación web que permite:
Registro seguro de usuarios.
Creación y gestión de tandas con número de participantes y turnos automáticos.
Registro de pagos (aportaciones y cobros).
Uso de wallets de prueba predefinidas en Interledger (asociadas a los usuarios en la base de datos).
Dashboard para consultar en tiempo real el estado de las tandas.

¿Cuáles son los beneficios?

Para los usuarios
Mayor seguridad: elimina el manejo de efectivo.
Transparencia total: todas las operaciones quedan registradas.
Acceso desde cualquier lugar con internet.
Historial de pagos accesible en todo momento.

Para el sistema

Automatización de turnos y pagos, reduciendo errores humanos.
Escalabilidad para manejar múltiples tandas y usuarios.
Interoperabilidad con estándares de pagos internacionales.

¿Cuál es su arquitectura / stack simple?
[Frontend: HTML + CSS + JS + Tailwind]
              │
              ▼
     [Backend: Node.js + Express]
              │
              ▼
       [Base de datos: MySQL]
              │
              ▼
 [Interledger Open Payments API con wallets de prueba]

¿Qué funciones son indispensables?

Creación de tandas con reglas definidas.
Registro automático de turnos y pagos.
Conexión con wallets de prueba de Interledger.
Dashboard con estado de las tandas y reportes de pagos.


¿Quién será responsable de construir qué parte?

Alexandra: Conexión de la API entre el backend y el frontend.
Manuel: Desarrollo del backend.
Oscar y Evelyn: Desarrollo del frontend y realización de pruebas de funcionamiento.