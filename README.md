# InterTand – Fase 2 (Prototipado)

InterTand es un **prototipo académico** que digitaliza el sistema tradicional de tandas (ahorros rotativos comunitarios) integrando la tecnología **Interledger Open Payments** para manejar pagos de manera segura y transparente.

---

## Problema

Las tandas tradicionales presentan varios inconvenientes:

- Falta de transparencia en el manejo del dinero  
- Dependencia de una sola persona coordinadora que puede cometer errores  
- Los pagos se hacen en efectivo, lo cual es riesgoso  
- Es complicado gestionar múltiples participantes  
- Existe el riesgo de fraudes o malos manejos  
- Solo pueden participar personas que vivan cerca  
- Todo el proceso es manual y lento  

---

## Tecnologías

### Backend
- **Node.js con Express.js** – Servidor web  
- **MySQL** – Base de datos relacional  
- **bcrypt** – Seguridad de contraseñas  
- **@interledger/open-payments** – Integración con Interledger para pagos  

### Frontend
- **HTML5 y CSS3** – Estructura y estilos  
- **Tailwind CSS** – Framework CSS para diseño  
- **JavaScript** – Lógica en cliente  

### Herramientas
- **Git y GitHub** – Control de versiones  

---

## Solución

InterTand digitaliza el proceso de las tandas mediante una aplicación web que permite:  

- Registro seguro de usuarios  
- Creación y gestión de tandas con número de participantes y turnos automáticos  
- Registro de pagos (aportaciones y cobros)  
- Uso de **wallets de prueba predefinidas** en Interledger (asociadas a los usuarios en la base de datos)  
- Dashboard para consultar en tiempo real el estado de las tandas  

---

## Beneficios

### Para los usuarios
- Mayor seguridad: elimina el manejo de efectivo  
- Transparencia total: todas las operaciones quedan registradas  
- Acceso desde cualquier lugar con internet  
- Historial de pagos accesible en todo momento  

### Para el sistema
- Automatización de turnos y pagos, reduciendo errores humanos  
- Escalabilidad para manejar múltiples tandas y usuarios  
- Interoperabilidad con estándares de pagos internacionales  

---

## Arquitectura

```plaintext
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
