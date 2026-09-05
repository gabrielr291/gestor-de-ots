========================================================================
                 GESTOR DE ORDENES DE TRABAJO (OTs)
========================================================================

Sistema web para la gestion, registro y auditoria de Ordenes de Trabajo (OTs) 
desarrollado con JavaScript vanilla e integrado con Firebase (Authentication 
y Realtime Database).


1. CARACTERISTICAS PRINCIPALES
------------------------------------------------------------------------

- Autenticacion de usuarios:
  * Inicios de sesion seguros mediante Firebase Auth.
  * Registro publico de usuarios con estado inicial pendiente de aprobacion.
  * Creacion de usuarios desde el panel de administracion usando una 
    instancia secundaria de Firebase sin interrumpir la sesion activa.
  * Control de fortaleza de contrasenas y validacion de coincidencia.

- Gestion de roles y permisos:
  * Panel de administracion para visualizar y gestionar usuarios.
  * Asignacion dinamica de permisos individuales: edicion (canEdit) y 
    eliminacion (canDelete).
  * Control de estados de cuenta: activa, pendiente (pending) o 
    bloqueada (blocked).

- Control y registro de OTs:
  * Formulario dinamico con soporte para anadir campos personalizados.
  * Modos de visualizacion filtrados: los usuarios convencionales ven 
    unicamente sus OTs creadas, mientras que los administradores tienen 
    acceso global.
  * Ordenamiento por fecha (mas recientes o mas antiguos).
  * Filtro de busqueda en tiempo real por numero de bus.

- Auditoria y respaldo:
  * Registro automatico de cambios en un historial de auditoria (audit_logs).
  * Exportacion de datos de OTs a formatos JSON (respaldo completo) y CSV 
    (compatible con Excel).
  * Exportacion del historial de auditoria en JSON y CSV.
  * Importacion de respaldos JSON para restaurar registros.


2. ESTRUCTURA DEL PROYECTO
------------------------------------------------------------------------

.
|-- index.html        # Estructura principal de la interfaz web
|-- styles.css        # Estilos visuales de la aplicacion
`-- app.js            # Logica de la aplicacion e integracion con Firebase


3. REQUISITOS E INSTALACION
------------------------------------------------------------------------

1. Clonar el repositorio:
   git clone https://github.com/tu-usuario/gestor-ots.git
   cd gestor-ots

2. Configurar Firebase:
   - Crea un proyecto en la consola de Firebase:
     https://console.firebase.google.com/
   - Habilita los metodos de autenticacion mediante correo electronico y 
     contrasena (Email/Password).
   - Habilita Firebase Realtime Database.
   - En el archivo app.js, reemplaza el objeto firebaseConfig con las 
     credenciales de tu proyecto.

3. Ejecutar la aplicacion:
   - No requiere compilacion previa ni servidores Node.js.
   - Puedes abrir directamente el archivo index.html en cualquier 
     navegador web o desplegarlo mediante servicios de hosting estatico 
     como GitHub Pages, Firebase Hosting o Vercel.


4. REGLAS DE SEGURIDAD SUGERIDAS (REALTIME DATABASE)
------------------------------------------------------------------------

Para asegurar el acceso adecuado a los datos en Firebase Realtime Database, 
se recomienda configurar las siguientes reglas basicas:

{
  "rules": {
    "users": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "ots": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "audit_logs": {
      ".read": "auth != null && root.child('users').child(auth.uid).child('isAdmin').val() === true",
      ".write": "auth != null"
    }
  }
}


5. TECNOLOGIAS UTILIZADAS
------------------------------------------------------------------------

- HTML5
- CSS3
- JavaScript (ES6+)
- Firebase App SDK v8 (Authentication y Realtime Database)