# TenisFSApp

Aplicacion movil de la Academia de Tenis FS.

## Desarrollo

```bash
npm install
npm run start
```

## Flujo inicial actual

- `app/index.tsx`: splash screen personalizado con duracion de 2.4 segundos.
- `app/next-screen.tsx`: pantalla provisoria que luego puede reemplazarse por la vista real siguiente.

## Gestión de jugadores

En **Administrador → Gestionar Jugadores** se pueden agregar jugadores por liga y
eliminarlos con confirmación. Las ligas se consultan desde Supabase. La eliminación
desactiva al jugador para conservar sus resultados; al agregar otra vez el mismo
nombre en esa liga, se reactiva su registro con sus estadísticas anteriores.

Para habilitar las altas y bajas, ejecutar una vez
[`supabase/player_management.sql`](supabase/player_management.sql) en el SQL Editor
del proyecto Supabase, después del esquema de resultados existente. Las altas y
bajas se ejecutan mediante `manage_player`, disponible para los roles `anon` y
`authenticated`, sin pedir ni enviar una clave de administrador. El acceso inicial
al panel Administrador conserva su PIN. La gestión de jugadores puede abrirse o
recargarse directamente sin solicitar otra validación.

### Aplicar el cambio en Supabase

1. Abrir el proyecto utilizado por la aplicación e ingresar a **SQL Editor → New query**.
2. Pegar el contenido completo de `supabase/player_management.sql` y ejecutar **Run**.
   Si las tablas `leagues` y `players` ya existen, basta con ejecutar este archivo.
   También se puede ejecutar si ya se aplicó la versión anterior: reemplaza la
   función con PIN y conserva los datos de jugadores y resultados.
3. Iniciar la aplicación con `npm run start` y recargarla. Si se usa una versión
   publicada, generar y distribuir una nueva versión con este cambio.
4. Entrar a **Administrador → Gestionar Jugadores**, agregar un jugador en una
   liga y comprobar que aparezca en su tabla de posiciones y en el selector de
   **Registrar Resultado**. Eliminarlo y verificar que desaparezca de esas listas.
   Al volver a agregar el mismo nombre en esa liga, se conserva su historial.
5. Incluir en el commit el SQL actualizado junto con el servicio, el componente
   y sus pruebas. El commit guarda el código; el paso 2 aplica el cambio en Supabase.

La confirmación de eliminación se mantiene. Esta migración modifica únicamente
la gestión de jugadores; la validación de ligas de los partidos se gestiona aparte.

Verificación local: `npm test`, `npx tsc --noEmit`, `npm run lint` y
`npm run build:web`.

## Catálogo de ventas

Los filtros **Todos**, **Cuerdas** y **Pelotas** muestran las fotografías locales
de `assets/images/cuerdas/` y `assets/images/pelotas/`. La vista inicial y **Todos**
mantienen el grip en la primera posición y el **Servicio de encordado** en la
segunda, con la imagen `assets/images/cuerdas/servicio_encordado.jpg` y un valor
de **$6.000 por servicio**. El resto se ordena al azar al abrir el catálogo o
cambiar de filtro. Los filtros de categoría excluyen el grip y este servicio.
Las cantidades del carrito se conservan al filtrar y las imágenes no cambian al
agregar productos a la solicitud.

Al pulsar la foto, la información o el botón **Solicitar** de una tarjeta se abre `ProductDetail`, con
la descripción, características, precio unitario, promociones y selección de
cantidad. Las características corresponden a las etiquetas de las fotografías;
la disponibilidad se destaca con la etiqueta verde **Stock Disponible**. Las cuerdas
incluyen la leyenda del servicio de encordado. El botón **Solicitar producto**
agrega la cantidad elegida al carrito compartido, que se puede abrir desde el
detalle o el catálogo. Al volver se conserva el filtro y la posición del catálogo.

El carrito se muestra en una vista completa con tarjetas, fotos, controles de
cantidad y papelera para eliminar todas las unidades de un producto. El total
estimado y **Realizar Pedido** permanecen visibles al recorrer la lista. Este
botón abre un popup con los jugadores activos de todas las ligas, un buscador
y **Confirmar Pedido**, que se habilita al seleccionar un jugador. La consulta
incluye paginación, estados de carga y reintento si falla la conexión. Al confirmar,
se guardan el jugador, la liga y las líneas del pedido en Supabase en una operación
atómica. El servidor calcula las promociones y verifica que el total coincida con
el mostrado. Mientras se guarda se bloquean las modificaciones y la confirmación
repetida; si falla, se conserva el carrito y se reutiliza la misma clave al reintentar.
Tras recibir la confirmación de Supabase, se vacía el carrito y aparece una pantalla
con una transición suave, un icono de verificación y el mensaje **¡Solicitud Enviada!**.
Incluye únicamente **Volver al panel de ventas**, que regresa al catálogo incluso
si el pedido se inició desde un detalle. Al volver a abrir el carrito, se muestra vacío.

### Habilitar pedidos en Supabase

1. En el proyecto correspondiente al `.env`, abrir **SQL Editor → New query**.
2. Ejecutar completo [`supabase/sales_orders.sql`](supabase/sales_orders.sql).
   Requiere las tablas `players` y `leagues` del esquema de resultados. Crea
   `sales_products`, `sales_product_bundles`, `sales_orders`, `sales_order_items`
   y la función `create_sales_order`. Se puede volver a ejecutar: conserva pedidos
   y precios ya configurados. No requiere cambiar las variables públicas del `.env`.
3. Recargar la app, agregar productos, abrir **Realizar Pedido**, seleccionar un
   jugador y pulsar **Confirmar Pedido**. La pantalla de éxito aparece después del guardado.
4. Comprobar el registro en **Table Editor → sales_orders** y sus productos en
   **sales_order_items**, vinculados por `order_id`. Los pedidos nuevos quedan
   **Pendiente**. El stock configurado se valida sin descontarlo en esta etapa.

Las tablas de pedidos no conceden lectura ni escritura directa a `anon` o
`authenticated`; la app crea pedidos exclusivamente mediante la función. El
catálogo y las promociones del servidor deben mantenerse alineados con
`services/salesCatalog.js`. Los pedidos conservan sus nombres y precios históricos.
El archivo [`supabase/tests/sales_orders.test.sql`](supabase/tests/sales_orders.test.sql)
verifica promociones, idempotencia, validaciones y permisos en una base de pruebas,
con datos que se revierten al terminar. No es necesario ejecutarlo para instalar.

Se agregó `expo-crypto` para los identificadores de solicitud. Si se usa un
development build nativo propio, reconstruirlo para incluir ese módulo; en web
basta con recargar el servidor o generar una nueva exportación.

### Gestión de pedidos

La opción **Administrador → Gestión de Pedidos** abre `ManageOrders`. Muestra los
pedidos más recientes, el jugador y su liga, fecha de Chile, estado, productos y
total. Incluye búsqueda por jugador, producto o número de pedido, filtros por
estado, actualización y carga de más resultados. **Ver detalle** muestra todas
las cantidades, precios históricos, subtotales y promociones de cada solicitud.
Los pedidos pendientes incluyen **Confirmar Pedido**, tanto en su tarjeta como
en el detalle. Al pulsarlo, se guarda el estado **Completado** en Supabase y se
actualizan el listado y el contador de pendientes. Los pedidos cancelados no se
pueden confirmar y repetir una confirmación completada es seguro.

Para habilitar la consulta y la confirmación, ejecutar (o volver a ejecutar)
[`supabase/order_management.sql`](supabase/order_management.sql)
en **Supabase → SQL Editor**, después de `sales_orders.sql`. Esta función utiliza
la tabla `Admin` y su campo `Admin_Key` que ya valida el acceso al administrador.
El script no concede acceso público directo a las tablas ni modifica los pedidos
guardados; los cambios de estado se realizan al confirmar desde el administrador.
La clave validada se reutiliza únicamente en memoria durante la sesión y se borra
al cerrar sesión. Tras recargar la app o abrir directamente esta pantalla, se
solicita el acceso administrativo inicial y luego se regresa a Gestión de Pedidos.

Las pruebas [`supabase/tests/order_management.test.sql`](supabase/tests/order_management.test.sql)
comprueban el acceso, los filtros, la paginación, los datos históricos y las
confirmaciones (incluidos reintentos y pedidos cancelados) en una base
de pruebas; revierten sus datos al finalizar y no son necesarias para instalar.

Los precios de cuerdas corresponden a los importes de los nombres de archivo.
El grip cuesta **$3.000 por unidad** o **3 por $8.000**. Las pelotas Dunlop y
Tecnifibre comparten estos precios por producto: **1 por $12.000**, **2 por
$23.000**, **3 por $34.000**, **4 por $43.000** y **6 por $60.000**.
El carrito aplica automáticamente la combinación de packs más económica para la
cantidad elegida y calcula cada marca por separado. Por ejemplo, 5 unidades de
pelotas cuestan $55.000 y 6 grips cuestan $16.000. Al cambiar la cantidad se
actualizan el subtotal, el total y el ahorro respecto del precio unitario.
Los productos sin precio muestran **Consultar precio**, y el total de su solicitud
queda **Por confirmar**. El catálogo no muestra cantidades de stock sin informar.
Para incorporar más imágenes, agregar el producto y su `require` literal en
`services/salesCatalog.js`, junto con el precio y stock cuando estén disponibles.
