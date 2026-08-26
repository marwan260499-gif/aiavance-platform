# AIAVANCE — Plataforma

Trabajamos en español.

## Qué es esto

SaaS multi-tenant para negocios locales (peluquerías, salones estéticos).
Un agente de IA atiende WhatsApp, agenda citas y las guarda en Supabase.
Este repo es **el dashboard web** desde el que el negocio ve y gestiona
esas citas, sus leads y sus conversaciones.

Este repo es una de cuatro piezas:

| Pieza | Dónde | Qué hace |
|---|---|---|
| **Dashboard** (este repo) | Next.js 16 en Vercel | Lo que ve el dueño del negocio |
| **n8n** | `automations.aiavance.es`, workflow `xSxzkr6BG8zpPBcG` | El bot de WhatsApp. EN PRODUCCIÓN |
| **Supabase** | proyecto `qsswknlugbxoppqeeahk` | Base de datos, única fuente de verdad |
| **WhatsApp** | Meta Graph API | Canal con el cliente final |

Push a `main` despliega solo en `aiavance-platform.vercel.app`.

## Antes de tocar nada

**Oriéntate leyendo el código, no asumas.** Este archivo describe el
contexto estable del proyecto, no el estado actual de las pantallas.
Al empezar una sesión, mira la estructura de `app/` para saber qué
rutas existen de verdad hoy.

## Base de datos

Tablas: `empresas`, `leads`, `conversaciones`, `mensajes`, `handoffs`,
`citas`, `clientes_autorizados`.

Multi-tenant por `empresa_id`, con RLS a través de la función
`mis_empresas()`.

`citas` tiene: `id`, `empresa_id`, `lead_id`, `fecha_hora`,
`duracion_min`, `confirmada`, `asistio`, `cancelada`, `notas`,
`google_calendar_event_id`, `created_at`.

**La agenda filtra siempre `cancelada = false`.** Una cita anulada sigue
en la tabla, no se borra.

## Contrato con n8n (importante)

El bot y el dashboard escriben en las mismas tablas. Si cambias el
esquema de `citas`, `leads`, `conversaciones` o `mensajes`, **el workflow
de n8n se puede romper en silencio** y no te vas a enterar desde aquí.

Antes de una migración que toque esas tablas, avísame para revisarlo en
n8n. Añadir columnas nuevas es seguro; renombrar o quitar, no.

## Cómo quiero que trabajes

1. **Un paso cada vez.** Haz una cosa, enséñame el resultado, y espera.
   No encadenes cinco cambios sin que yo confirme.
2. **Antes de algo largo, dime el plan en 3-4 líneas** y cuánto trabajo
   es. Si hay una decisión de diseño, pregúntame ANTES, no después.
3. **Nunca borres filas ni hagas operaciones destructivas en la base de
   datos.** Dame el SQL y lo ejecuto yo en el SQL Editor de Supabase.
4. **Soy no-técnico.** Explícame el porqué en lenguaje llano, sin jerga
   innecesaria, pero sin ocultarme los detalles que importan.
5. **Si no lo has comprobado, dilo.** Distingue entre "he ejecutado esto
   y funciona" y "esto debería funcionar según el código".

## Trampas ya aprendidas

### Comprobar `error` en las consultas a Supabase

```js
const { data } = await supabase.from('citas').select()   // ❌
const { data, error } = await supabase.from('citas').select()  // ✅
```

Sin mirar `error`, un fallo (por ejemplo, una columna que no existe) se
convierte en una lista vacía indistinguible de "no hay datos". Esto ya
costó horas una vez.

### UTC vs hora de Madrid

Supabase guarda en UTC. Una cita a las 11:00 de Madrid está en la tabla
como `09:00+00`. Al mostrar fechas al usuario hay que convertirlas
siempre a `Europe/Madrid`. Al comparar fechas en código, compara
**instantes** (`new Date(x).getTime()`), nunca cadenas de texto.

### `supabase/schema.sql` puede estar desincronizado

El archivo del repo no siempre refleja la base de datos real. Verifica
contra la API o el SQL Editor antes de fiarte de él.

## Hueco arquitectónico pendiente

El modelo actual es de **propietario único**: `empresas.user_id` apunta a
un solo usuario. Antes de dar de alta clientes reales con sus propios
logins hará falta una tabla de unión usuarios↔empresas con roles.

Tenerlo presente al tocar cualquier cosa de permisos o autenticación:
no construyas encima asumiendo que un usuario tiene una sola empresa
para siempre.

## Autenticación

Login con Google OAuth y con enlace mágico por email.
