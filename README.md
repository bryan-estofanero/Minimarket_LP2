# Minimarket LP2

Sistema web para ventas e inventario de un minimarket de **una sucursal**, adaptado del ZIP de referencia al avance de LP2. Monolito modular Spring Boot y una SPA Angular. Importes en soles; productos vendidos por unidad entera.

## Qué contiene

- Categorías y productos con CRUD, DTO, mapper, relación ORM y stock de consulta.
- Clientes con CRUD; proveedores con identificación DNI/RUC, contacto opcional, búsqueda paginada, ficha e historial, activación/desactivación y compra preseleccionada.
- Venta con cabecera–detalle, precio del catálogo, totales calculados en el servidor, descuento de existencias y anulación que las devuelve una sola vez.
- Compra **recibida** con cabecera–detalle persistido en Oracle, costo de adquisición e ingreso de stock. Anulación solo si se puede retirar la cantidad ingresada sin dejar stock negativo.
- Consultas paginadas, filtros por fecha/estado, orden y agregados independientes de la página. Vendedor y comprador consultan sus propias operaciones; administrador y supervisor consultan todas.
- Keycloak con Authorization Code + PKCE, renovación, guards, interceptor y cierre de sesión contra el proveedor.
- Auditoría automática de creación/anulación, correlación de logs, Actuator, caché breve de categorías, configuración por ambiente y pruebas.

El alcance excluye producción/ensamblaje, fórmulas, tesorería, cuentas por cobrar/pagar, delivery y facturación electrónica. No conserva pantallas, datos ni reportes de computadoras. Los módulos de catálogo y operaciones mantienen el estilo visual oscuro del proyecto de referencia.

## Requisitos

- **JDK 21 completo**: comprobar `java -version` y `javac -version`.
- Node.js 24 LTS y npm. Las versiones exactas instaladas están en `frontend/package-lock.json`; usar `npm ci`.
- Docker Desktop con Compose, contenedores Linux y recursos suficientes para Oracle y Keycloak.
- En Windows, PowerShell genera los secretos locales. El helper conserva un .env existente y nunca imprime sus valores.
- Puertos libres: 1521, 38080, 8080 y 4200. No iniciar el SIGPC anterior simultáneamente en esos puertos.

Versiones de referencia: Boot 4.0.7, Modulith 2.0.7, SpringDoc 3.0.2, Java 21 y Angular 22.

## Abrir en el editor

Extraer el ZIP y abrir esta carpeta o `Minimarket_LP2.code-workspace`. Backend y frontend son carpetas separadas dentro del mismo proyecto. No se incluyen node_modules, target, dist ni datos persistentes de contenedores: se reconstruyen para tu sistema operativo.

## Primera ejecución en Windows / PowerShell

Si ya existe una base Oracle, aplique primero la [migración incremental de proveedores](docs/PROVEEDORES.md). Añade columnas y protección de duplicados sin borrar datos; no clasifica documentos antiguos automáticamente. La inicialización de volúmenes nuevos la incluye. El backend actualizado necesita esas columnas antes de arrancar.

Desde la carpeta que contiene este README:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/configurar.ps1
docker compose up -d
docker compose ps
docker compose logs oracle
docker compose logs keycloak
```

La primera descarga e inicialización de Oracle puede tardar varios minutos. Esperar a que Oracle esté healthy y Keycloak termine de arrancar. El SQL se ejecuta automáticamente **solo cuando el volumen Oracle está vacío**. Este proyecto usa volúmenes propios y no migra ni modifica los datos del SIGPC anterior.

Abrir `http://localhost:38080/realms/minimarket/.well-known/openid-configuration`: debe responder JSON. Si Keycloak todavía está iniciando, esperar y volver a consultar. Abrir otra terminal:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/backend.ps1
```

Este comando carga `.env` en el proceso y ejecuta el Maven Wrapper. En otra terminal:

```powershell
cd frontend
npm ci
npm start
```

Abrir **http://localhost:4200**. La pantalla de acceso redirige a Keycloak. Swagger está en http://localhost:8080/swagger-ui.html y salud en http://localhost:8080/actuator/health.

El inicio de sesión usa el tema claro `minimarket`, ubicado en `keycloak-themes`, con el mismo verde que los módulos. Para aplicar este tema a un realm que ya existe, ejecutar `docker compose up -d --no-deps keycloak` y luego `powershell -ExecutionPolicy Bypass -File scripts/aplicar-tema.ps1`. El script solo actualiza el tema y los idiomas del acceso. Las instalaciones nuevas lo reciben en la importación inicial.

Los helpers incluidos en esta revisión están destinados a Windows/PowerShell. No hay helpers Python/Bash equivalentes incluidos.

## Usuarios de aula

El realm importado contiene estos usuarios de **demostración local**. Las credenciales de demostración se consultan únicamente en el archivo local de importación de Keycloak o se reemplazan desde su consola; no se publican aquí.

| Usuario | Rol | Uso |
|---|---|---|
| admin | ADMIN | CRUD, ventas, compras, anulaciones y auditoría |
| supervisor | SUPERVISOR | Ventas/compras, consultas generales, anulación y auditoría |
| cajero | VENDEDOR | Registrar y consultar sus ventas; consultar catálogo |
| comprador | COMPRADOR | Registrar y consultar sus compras; consultar catálogo |

La cuenta de administración **de Keycloak** también se llama admin, pero su contraseña es la generada como `KEYCLOAK_ADMIN_PASSWORD` en `.env`. Son cuentas de realms diferentes. Los usuarios de la aplicación viven en el realm minimarket. No exponer estas cuentas de aula en Internet.

## Administración de cuentas y consulta DNI

La ruta **Usuarios y roles** está disponible solo para ADMIN. Permite crear cuentas con contraseña temporal, activar/desactivar y asignar varios roles. El backend utiliza la [API administrativa oficial de Keycloak](https://www.keycloak.org/docs-api/latest/rest-api/index.html), mediante un cliente confidencial del realm `minimarket` con Service Accounts habilitado. Configure sus permisos `realm-management` para consultar/gestionar usuarios y consultar roles; habilite Admin Events en Keycloak para auditar esas acciones. No entregue `realm-admin` al navegador ni a los roles de aplicación. Esta configuración real aún debe verificarse en su Keycloak.

Agregue en su `.env` local `KEYCLOAK_SERVICE_CLIENT_ID` y `KEYCLOAK_SERVICE_CLIENT_SECRET`, obtenidos de ese cliente. `scripts/backend.ps1` los carga sin mostrarlos. En Docker se utiliza el hostname interno de `compose.prod.yml`. El secreto nunca se coloca en Angular. Sin configuración, la pantalla muestra un error 503 controlado. No se modificó el realm existente ni sus usuarios durante esta revisión.

No puede cambiar sus propios roles o desactivar su propia cuenta. Durante cambios de roles, el backend desactiva temporalmente la cuenta y cierra sus sesiones; si falla la integración, revise el estado antes de reintentar. Los JWT ya emitidos pueden seguir siendo válidos hasta su expiración: el Resource Server valida JWT localmente. La operación externa de varias llamadas no tiene rollback JPA.

En Clientes, **Consultar DNI** utiliza APIsPerú a través del adaptador backend `ApisPeruDniProvider`. Cree su cuenta en https://apisperu.com/servicios/dniruc y obtenga el token de DNI/RUC. En el archivo local `.env`, complete `APISPERU_TOKEN=su_token` y reinicie `scripts/backend.ps1`. En Docker, recree el backend para cargar la variable. El botón completa nombres y apellidos; requiere rol ADMIN, igual que el registro de clientes. Sin token, ante un fallo o si no hay datos válidos, el formulario permite ingresar los datos manualmente.

En **Cobrar venta**, al completar los ocho dígitos se busca primero el cliente local; si no existe se consulta APIsPerú y se autocompleta el nombre. Si falla la consulta, se permite escribirlo manualmente. La consulta DNI está disponible para ADMIN, SUPERVISOR y VENDEDOR; la administración de clientes conserva sus permisos anteriores. Las respuestas tardías se descartan al cambiar de DNI, elegir consumidor final o editar el nombre manualmente.

El contrato oficial está en https://dniruc.apisperu.com/doc/swagger: se consulta `GET https://dniruc.apisperu.com/api/v1/dni/{dni}?token=...` solo desde el servidor, con límites de conexión de 3 segundos y lectura de 5 segundos. No registre URLs de estas consultas: contienen token y DNI. El token no se incluye en Angular ni se devuelve al navegador. Las pruebas del adaptador usan respuestas simuladas; una consulta real requiere su token.

## Recorrido de demostración

1. Entrar como admin. El catálogo trae productos de ejemplo **sin stock**.
2. Abrir Compras → Registrar compra. Seleccionar el proveedor de ejemplo, buscar un producto y comprar 10 unidades. El costo de adquisición puede ser diferente del precio de venta.
3. Consultar Productos e inventario: stock 10.
4. Registrar una venta de 2 unidades: stock 8. El backend decide el precio vigente y calcula el total.
5. Anular esa venta: stock 10. Un segundo intento de anulación responde 409.
6. Consultar Auditoría y verificar CREAR/ANULAR con el identificador real del usuario de Keycloak.
7. Entrar con cajero y comprobar que no puede anular ni escribir productos. Puede consultar sus ventas, sin ver las de otro vendedor.

## Pruebas

Backend, sin Oracle ni Keycloak (H2 solo para pruebas y claves RSA locales solo de prueba):

```powershell
cd backend
.\mvnw.cmd test
```

Frontend:

```powershell
cd frontend
npm test -- --watch=false
npm run build -- --configuration production
```

Contra Oracle real, con la infraestructura local ya inicializada:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pruebas-oracle.ps1 -ConfirmarBaseDePruebas
```

Prueba completa de navegador, con infraestructura, backend y frontend ya funcionando:

```powershell
cd frontend
npx playwright install chromium
npm run test:e2e
```

La prueba de Oracle usa el principal JWT de Spring Security Test, como S14; la de navegador usa el login real de Keycloak y no simula APIs. Las pruebas de integración crean registros de prueba en la base local: ejecutarlas en el entorno de aula, nunca sobre información de negocio.

Antes de Playwright, defina `E2E_PASSWORD` en el entorno de esa terminal, usando la contraseña de una cuenta de pruebas. No hay contraseña predeterminada dentro del test. `E2E_USER` permite seleccionar el usuario; por defecto usa el nombre admin. No copie secretos en capturas o archivos de evidencia.

**Resultados y límites de lo ejecutado aquí:** consultar `docs/pruebas-y-pendientes.md` (la validación anterior se conserva como antecedente). Que una prueba esté incluida no significa que haya sido ejecutada con Oracle/Keycloak en el entorno de revisión.

## Build y ejecución de producción local

Como alternativa al backend/Angular abiertos en terminales, detener esos procesos y ejecutar:

```powershell
docker compose -f compose.yml -f compose.prod.yml up -d --build
```

Usa la misma infraestructura y datos. Abre http://localhost:4200. El backend usa perfil prod, la SPA se sirve con Nginx y los assets versionados tienen caché. Swagger queda desactivado; Actuator solo expone health.

Esta es la preparación de producción **local** del curso. Keycloak sigue en start-dev sobre HTTP local. Para publicar en Internet hace falta configurar TLS, hostname y modo de producción de Keycloak, además de reemplazar las cuentas de aula; este ZIP no afirma que eso ya esté desplegado.

Para detener sin borrar datos: `docker compose -f compose.yml -f compose.prod.yml down`. No usar `down -v` si deseas conservar los datos.

## Documentación

- `docs/CLIENTES-ESENCIAL.md`: listado/registro/edición de clientes sin ficha, adaptador DNI, validaciones y migración 08 para nombres/apellidos separados.

- `docs/INVENTARIO.md`: catálogo, ficha, movimientos, permisos, merma/conteo y migración incremental 06 para otras instalaciones existentes.

- `docs/COMPRAS.md`: nueva pantalla de recepción, comprobantes y observaciones, validaciones y migración incremental 05 para otras instalaciones existentes.

- `docs/PROVEEDORES.md`: formulario, ficha, compras, permisos, auditoría y pasos de migración de proveedores.

- `docs/cumplimiento-curso.md`: diagnóstico inicial y contraste con las fuentes académicas.
- `docs/cambios-realizados.md`: etapas implementadas y recorrido de una venta para la defensa.
- `docs/pruebas-y-pendientes.md`: resultados de esta revisión y bloqueos reales.

- `docs/ARQUITECTURA.md`: estructura, módulos, relaciones y reglas.
- `docs/AVANCE_LP2.md`: trazabilidad S01–S16 y evidencias por evaluación.
- `docs/API_Y_SEGURIDAD.md`: endpoints, roles, errores y flujo de acceso.
- `docs/PRUEBAS_Y_SUSTENTACION.md`: casos, demostración y criterios.
- `docs/OPTIMIZACION.md`: mediciones y decisión de caché/Redis.
- `docs/BITACORA.md`: correcciones del ZIP de referencia.
- `docs/VALIDACION.md`: pruebas realmente ejecutadas y pendientes.

## Problemas frecuentes

- Error `release version 21 not supported`: instalar JDK 21 completo y revisar JAVA_HOME y `.\mvnw.cmd -version`; una JRE no reemplaza al JDK.
- DB_PASSWORD no definida: ejecutar el backend con el script de arranque o cargar `.env` en esa terminal.
- Oracle `missing table`: revisar logs de inicialización y FREEPDB1. Hibernate valida, no crea las tablas. No reutilizar un volumen de otro proyecto.
- Keycloak no encuentra el realm: revisar `docker compose logs keycloak`. La importación inicial no reemplaza un realm que ya existe.
- Redirección de login inválida: acceder por localhost:4200; cambiar hostname/puerto exige actualizar el cliente y los orígenes de Keycloak.
- 409 al anular compra: parte del stock ya se vendió. Primero revisar las operaciones; el sistema impide dejar existencias negativas.
- Dependencias de Windows en Linux: ejecutar npm ci en el destino. El ZIP no incluye node_modules.
