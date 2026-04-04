# Dashboard SaaS — Kael Inteligencia Conversacional
**Fecha:** 2026-04-04  
**Estado:** Aprobado — listo para implementar

---

## Objetivo

Construir un dashboard funcional y visualmente atractivo (dark theme) que cada cliente de kael.quest recibe al registrarse. El dashboard es el panel de control personal del usuario para configurar, monitorear y gestionar su instancia de Kael.

Adicionalmente, agregar una sección demo en la landing page (`/`) que muestre un preview del dashboard como incentivo para pasarse al plan pago.

---

## Target

**SaaS multi-usuario:** Cada persona que se registra en kael.quest tiene su propio dashboard con datos aislados (sus conversaciones, sus recordatorios, su configuración de Kael).

---

## Problema crítico a resolver

La tabla `conversation_memory` en PostgreSQL usa `user_id` = Telegram chat_id (string numérico). Los usuarios de kael-web tienen un `id` tipo cuid. Actualmente no están vinculados.

**Solución:** Agregar campo `telegramChatId` al modelo `User` en Prisma. El usuario lo configura en el dashboard. El sistema consulta `conversation_memory WHERE user_id = telegramChatId`.

---

## Diseño Visual

- **Tema:** Dark (#080808 fondo, #111 cards, #1e1e1e borders)
- **Acentos:** Gradiente índigo-violeta (#6366f1 → #8b5cf6)
- **Texto:** Blanco #f0f0f0 principal, gris #888 secundario, #666 terciario
- **Layout:** Sidebar fija 224px (desktop) + área de contenido scrollable
- **Animaciones:** Framer Motion (ya instalado)

---

## Estructura de Navegación

```
Sidebar:
  Principal
  ├── ⚡ Inicio          → /dashboard
  ├── 💬 Conversaciones  → /dashboard/conversations
  └── 🔔 Recordatorios   → /dashboard/reminders
  Cuenta
  ├── ⚙️ Configurar Kael → /dashboard/settings
  ├── 👤 Mi perfil       → /dashboard/profile
  └── 💎 Plan            → /dashboard/plan
```

---

## Secciones por página

### /dashboard (Inicio)
1. **Header** — saludo con nombre, subtítulo
2. **Stats row (3 cards)** — total conversaciones, recordatorios activos, días con Kael
3. **Grid 2 columnas:**
   - Izquierda (principal): Configurar Kael (kael_name, idioma, tono, instrucción especial)
   - Derecha: preview últimas 2 conversaciones + preview 3 recordatorios activos
4. Botón Guardar configuración → llama a `/api/preferences`

### /dashboard/settings (página completa de config)
- Misma config card pero expandida (más campos en el futuro)

### /dashboard/conversations
- Lista paginada de `conversation_memory` filtrada por `telegramChatId` del usuario
- Columnas: fecha, mensaje usuario, respuesta Kael

### /dashboard/reminders
- Lista de recordatorios del usuario (tabla `reminders` filtrada por `chat_id = telegramChatId`)
- Crear / marcar como completado / eliminar

---

## Cambios en Base de Datos (Prisma)

```prisma
model User {
  // campos existentes...
  telegramChatId String?   // nuevo: vincula con conversation_memory.user_id
  preferences    UserPreferences?
}

model UserPreferences {
  id             String  @id @default(cuid())
  userId         String  @unique
  kaelName       String  @default("")      // nombre con que Kael llama al usuario
  language       String  @default("es")   // "es" | "en" | "auto"
  tone           String  @default("motivacional") // "motivacional" | "casual" | "formal"
  customInstruction String @default("")
  user           User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## API Routes nuevas

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/preferences` | GET | Lee preferencias del usuario autenticado |
| `/api/preferences` | PUT | Guarda preferencias (kaelName, language, tone, customInstruction, telegramChatId) |
| `/api/conversations` | GET | Lee conversation_memory filtrado por telegramChatId, paginado |
| `/api/reminders` | GET | Lee recordatorios activos del usuario |
| `/api/reminders` | POST | Crea recordatorio |
| `/api/reminders` | DELETE | Elimina recordatorio por id |

---

## Landing Page — Sección Demo

Agregar sección nueva en `app/page.tsx` después de las features actuales:

- Título: "Tu panel de control personal"
- Mockup estático del dashboard (screenshot o HTML inline)
- Badge "Solo Plan Pro"
- CTA: "Empezar gratis"

---

## Archivos a crear / modificar

### Nuevos
- `app/dashboard/layout.tsx` — sidebar + auth check
- `app/dashboard/conversations/page.tsx`
- `app/dashboard/reminders/page.tsx`
- `app/dashboard/settings/page.tsx`
- `app/dashboard/plan/page.tsx`
- `app/api/preferences/route.ts`
- `app/api/conversations/route.ts`
- `app/api/reminders/route.ts`
- `components/dashboard/Sidebar.tsx`
- `components/dashboard/StatsCard.tsx`
- `components/dashboard/KaelConfigForm.tsx`
- `components/dashboard/ConversationsPreview.tsx`
- `components/dashboard/RemindersPreview.tsx`

### Modificados
- `prisma/schema.prisma` — añadir UserPreferences + telegramChatId en User
- `app/dashboard/page.tsx` — rediseño completo
- `app/page.tsx` — agregar sección demo
- `middleware.ts` — ya protege /dashboard

---

## Orden de implementación

1. Prisma schema + migración en servidor
2. API routes (preferences, conversations, reminders)
3. Sidebar component
4. Dashboard layout.tsx
5. Dashboard home page (redesign)
6. Páginas secundarias (conversations, reminders, settings, plan)
7. Landing page demo section
8. Deploy a producción
