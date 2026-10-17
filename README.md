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
