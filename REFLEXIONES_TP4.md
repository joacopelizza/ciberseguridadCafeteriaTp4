# Reflexiones — TP4 Ciberseguridad

Este documento reúne una reflexión breve por cada falla del inventario detallado de `VULNERABILIDADES.md` y una reflexión final. Las respuestas se enfocan en qué prácticas ayudarían a prevenir problemas equivalentes en un proyecto real.

## Reflexiones por falla

### VUL-01 · Inyección SQL en el login

En un proyecto real, las credenciales deben consultarse con parámetros y las contraseñas deben verificarse con un algoritmo de hash como bcrypt. Así, la entrada se trata como dato y no como parte de una instrucción SQL.

### VUL-02 · Inyección SQL en los filtros del catálogo

Los filtros del catálogo deben usar consultas parametrizadas y validar los valores permitidos. No conviene construir SQL concatenando lo que escribió una persona en el buscador.

### VUL-03 · Inyección SQL en el filtro por mesa

El filtro por mesa debe validar el formato esperado y enviar el valor como parámetro de la consulta. La consulta nunca debe reinterpretar el dato recibido como código SQL.

### VUL-04 · Inyección SQL en reportes

Los filtros de reportes deben parametrizarse y limitarse a valores válidos. Además, los reportes contienen información sensible, por lo que su acceso debe estar restringido a los roles autorizados.

### VUL-05 · XSS reflejado en el buscador

El texto de búsqueda debe insertarse en la página como texto, no como HTML. Usar APIs como `textContent` evita que una búsqueda se convierta en contenido ejecutable.

### VUL-06 · XSS reflejado en mensajes del servidor

Los errores deben ser genéricos y no repetir sin filtrar el dato ingresado. En la interfaz, los mensajes también deben mostrarse como texto y no interpretarse como marcado HTML.

### VUL-07 · XSS almacenado en las reseñas

Todo contenido guardado que luego se muestra a otras personas debe validarse y escaparse al presentarse. La seguridad no puede depender de que quienes escriben una reseña se comporten de forma confiable.

### VUL-08 · XSS de DOM en el panel

Los parámetros de la URL también son entrada no confiable. Para mostrar títulos y mensajes del panel se deben usar nodos de texto y, cuando corresponda, aceptar solo valores de una lista permitida.

### VUL-09 · CSRF en formularios que cambian estado

Las operaciones que crean, modifican o eliminan datos deben verificar un token anti-CSRF y el origen esperado. La protección debe aplicarse de manera consistente a todos los formularios y endpoints de escritura.

### VUL-10 · Validación insuficiente en pedidos

El servidor debe comprobar cantidades, mesa, productos y límites antes de guardar el pedido, y calcular el total con los precios del catálogo. La validación del navegador ayuda a la experiencia, pero no reemplaza la validación del servidor.

### VUL-11 · Validación insuficiente en reseñas

Los campos de una reseña deben tener tipo, longitud y rango definidos y comprobarse en el servidor. Esto evita datos inválidos y reduce entradas abusivas o demasiado grandes.

### VUL-12 · Subida de archivos sin restricciones

Las cargas deben aceptar solo formatos necesarios, limitar tamaño y verificar que el contenido coincida con el tipo declarado. También conviene asignar nombres aleatorios y almacenar los archivos de forma que no puedan ejecutarse como código del servidor.

### VUL-13 · Contraseñas almacenadas en texto plano

Las contraseñas nunca deben guardarse ni registrarse en texto plano. Se deben almacenar hashes con salt mediante un algoritmo diseñado para contraseñas y verificar las claves con ese algoritmo.

### VUL-14 · Falta de protección contra fuerza bruta

El login debe limitar intentos repetidos y aplicar esperas o bloqueos temporales razonables. También conviene monitorear intentos anómalos sin revelar si una cuenta existe.

### VUL-15 · Cookie de sesión sin atributos de seguridad

Las cookies de sesión deben usar `HttpOnly` y `SameSite`, y `Secure` cuando el sitio funciona sobre HTTPS. Configurar correctamente estos atributos reduce la exposición de la sesión en el navegador.

### VUL-16 · Identificador de sesión predecible

Los identificadores de sesión deben generarse con un generador criptográficamente seguro y tener suficiente entropía. Nunca deben derivarse de contadores ni datos fáciles de adivinar.

### VUL-17 · Sesiones sin expiración

Las sesiones deben tener una duración definida y revocarse al vencer. La aplicación también debe limpiar sesiones expiradas para reducir la ventana en la que una sesión olvidada pueda seguir siendo usada.

### VUL-18 · Logout que no invalida la sesión en el servidor

Al cerrar sesión, el servidor debe eliminar o revocar la sesión además de borrar la cookie del navegador. Así, una copia previa del identificador deja de servir para autenticarse.

### VUL-19 · Enumeración de usuarios

Los errores de autenticación deben ser iguales para usuario inexistente y contraseña incorrecta. Mantener mensajes y tiempos de respuesta razonablemente similares evita dar pistas sobre qué cuentas están registradas.

### VUL-20 · Falta de autorización en el panel

Cada ruta administrativa debe comprobar la identidad y el rol en el servidor. Ocultar botones o pestañas en la interfaz no protege una API a la que se puede llamar directamente.

### VUL-21 · Escalada de privilegios al cambiar roles

Los cambios de rol deben permitirse solo a una persona autorizada y validar el nuevo rol contra opciones conocidas. El servidor no debe confiar en que el cliente envíe un rol legítimo ni permitir que una cuenta se eleve sus propios privilegios.

### VUL-22 · Inyección de comandos del sistema operativo

Cuando sea necesario ejecutar un proceso, se deben pasar argumentos separados sin shell, validar entradas con una lista permitida y ejecutar con privilegios mínimos. Es preferible evitar procesos del sistema si existe una alternativa más segura.

### VUL-23 · Exposición de secretos en el diagnóstico

Los endpoints de diagnóstico deben exponerse solo a roles autorizados o eliminarse en producción. Nunca deben devolver variables de entorno, contraseñas ni detalles internos que no sean necesarios para la operación.

### VUL-24 · Stack traces enviados al cliente

Los errores detallados deben quedar en registros internos con acceso controlado. Al cliente se le debe devolver un mensaje claro pero genérico, sin rutas, consultas ni información de implementación.

### VUL-25 · Falta de cabeceras de seguridad

Las cabeceras de seguridad y una política CSP deben configurarse desde el inicio y revisarse junto con las necesidades reales de la aplicación. Son una capa adicional de defensa, no un reemplazo para corregir XSS.

### VUL-26 · Base de datos sin contraseña y uso del superusuario

La base debe exigir credenciales fuertes y la aplicación debe conectarse con una cuenta de servicio de permisos mínimos. Separar privilegios reduce el impacto de un error o una vulnerabilidad en la aplicación.

### VUL-27 · Credenciales por defecto

Las cuentas de demostración no deben llegar habilitadas en producción con claves conocidas. Las credenciales iniciales deben ser únicas, guardarse fuera del código y cambiarse durante la configuración del entorno.

### VUL-28 · IDOR en pedidos y datos de otros clientes

Cada consulta o modificación de un recurso debe comprobar que la persona autenticada tiene permiso sobre ese recurso concreto. Conocer o adivinar un identificador no debe bastar para acceder a datos de otra mesa o cliente.

## Reflexión final

Este trabajo nos llevó a entender que una aplicación no es segura solo porque sus pantallas funcionen en el uso esperado. Cada dato recibido debe tratarse como no confiable, cada acción debe comprobarse en el servidor y cada permiso debe verificarse para el recurso específico. También aprendimos que las medidas de seguridad tienen que integrarse al diseño y comprobarse con pruebas funcionales y de seguridad: corregir una falla no sirve si se rompe el negocio, y una interfaz que parece correcta no demuestra por sí sola que el servidor esté protegido.
