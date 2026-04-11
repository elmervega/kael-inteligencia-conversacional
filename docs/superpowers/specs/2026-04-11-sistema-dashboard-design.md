# Sistema Admin Dashboard — Spec

**Fecha:** 2026-04-11
**Estado:** Aprobado — listo para implementación

---

## Objetivo

Convertir `/dashboard-sistema` en un panel de administración seguro, protegido por autenticación propia (independiente del sistema Kael), con logs mejorados con clasificación por severidad y eventos de seguridad en tiempo real.

---

## Arquitectura

### Autenticación independiente

El sistema de autenticación del panel de sistema es completamente separado de NextAuth/Kael:

- **Credenciales:** `SISTEMA_ADMIN_USER` + `SISTEMA_ADMIN_PASSWORD_HASH` (bcrypt) en `.env`
- **JWT:** firmado con `SISTEMA_JWT_SECRET` (distinto al `AUTH_SECRET` de NextAuth)
- **Cookie:** `sistema-session` — `HttpOnly`, `Secure`, `SameSite=Strict`, expiry 8 horas
- **Verificación:** en el middleware de Next.js usando `jose` (ya incluido por NextAuth)
- **Aislamiento:** una brecha en el sistema Kael no compromete el acceso al panel de sistema

### Variables de entorno requeridas en `.env`

```
SISTEMA_ADMIN_USER=<usuario>
SISTEMA_ADMIN_PASSWORD_HASH=<hash_bcrypt>   # generado con bcrypt.hash(password, 12)
SISTEMA_JWT_SECRET=<secreto_64_chars>       # independiente de AUTH_SECRET
```

---

## Componentes y Archivos

### Nuevos

| Archivo | Propósito |
|---------|-----------|
| `lib/sistema-auth.ts` | Helpers: `signSistemaToken()`, `verifySistemaToken()`, `hashPassword()` |
| `app/sistema/login/page.tsx` | Página de login del panel de sistema |
| `app/api/sistema/auth/route.ts` | POST: login → emite cookie. DELETE: logout → borra cookie |
| `app/api/sistema/logs/route.ts` | GET: últimos 100 logs clasificados por severidad |
| `app/api/sistema/security/route.ts` | GET: logins fallidos, IPs bloqueadas, rate limit hits |

### Modificados

| Archivo | Cambio |
|---------|--------|
| `middleware.ts` | Agregar protección JWT para `/dashboard-sistema/*` y `/api/sistema/*` → redirige a `/sistema/login` |
| `app/dashboard-sistema/page.tsx` | Rediseño completo: logs coloreados + sección seguridad + logout |

---

## API: `/api/sistema/auth`

### POST — Login
**Body:** `{ username: string, password: string }`

**Flujo:**
1. Comparar `username` con `SISTEMA_ADMIN_USER`
2. Comparar `password` con `SISTEMA_ADMIN_PASSWORD_HASH` usando `bcrypt.compare()`
3. Si OK → emitir JWT firmado con `SISTEMA_JWT_SECRET`, payload `{ sub: username, role: 'admin' }`
4. Setear cookie `sistema-session`: `HttpOnly`, `Secure`, `SameSite=Strict`, `Max-Age: 28800` (8h)
5. Rate limiting: máximo 5 intentos por IP en 15 minutos → responde 429

**Respuesta exitosa:** `{ ok: true }` + `Set-Cookie`
**Respuesta fallida:** `{ error: 'Credenciales incorrectas' }` status 401

### DELETE — Logout
Borra la cookie `sistema-session` seteando `Max-Age: 0`.

---

## API: `/api/sistema/logs`

**Autenticación:** verifica `sistema-session` JWT antes de procesar.

**Fuente:** `journalctl -u kael-web -n 100 --no-pager --output=json`

**Clasificación por severidad:**

| Nivel | Palabras clave en el mensaje |
|-------|------------------------------|
| `error` | `[auth][error]`, `MissingCSRF`, `CredentialsSignin`, `[dashboard/layout] auth() returned null`, `[dashboard/page] session.user.id missing`, `Error`, `error`, `ENOENT`, `Bus error` |
| `warning` | `[Security]`, `Rate limit exceeded`, `WARN`, `warn`, `Unauthorized` |
| `info` | Todo lo demás |

**Sanitización:**
- API keys: `sk-[a-zA-Z0-9]{48}` → `sk-***`
- Tokens Bearer: `Bearer [...]` → `Bearer ***`
- Emails: regex → `***EMAIL***`
- Passwords en logs: `password:[valor]` → `password:***`

**Response:**
```json
{
  "logs": [
    { "timestamp": "ISO", "level": "error|warning|info", "message": "..." }
  ]
}
```

---

## API: `/api/sistema/security`

**Autenticación:** verifica `sistema-session` JWT antes de procesar.

### Datos recopilados

**Logins fallidos (últimas 24h):**
- Fuente: `journalctl -u kael-web --since "24 hours ago" --no-pager`
- Busca: `CredentialsSignin`, `MissingCSRF`
- Retorna: count total + últimas 10 ocurrencias con timestamp

**IPs bloqueadas por fail2ban:**
- Fuente: `fail2ban-client status sshd`
- Parsea la línea `Banned IP list:`
- Retorna: array de IPs actualmente baneadas

**Rate limit hits:**
- Fuente: journalctl, busca `[Security] Rate limit exceeded`
- Retorna: count últimas 24h + últimas 5 ocurrencias

**Auth errors del dashboard:**
- Busca: `[dashboard/layout] auth() returned null`, `[dashboard/page] session.user.id missing`
- Retorna: count últimas 24h

**Response:**
```json
{
  "failedLogins": { "count24h": 3, "recent": [{ "timestamp": "ISO", "type": "MissingCSRF" }] },
  "bannedIPs": ["1.2.3.4", "5.6.7.8"],
  "rateLimitHits": { "count24h": 0, "recent": [] },
  "dashboardAuthErrors": { "count24h": 2 }
}
```

---

## Frontend: `/dashboard-sistema/page.tsx`

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  🛡️ Panel de Sistema          último update | [Logout]   │
├─────────────────────────────────────────────────────────┤
│  [DB ✅] [Redis ✅] [Uptime]                             │
├─────────────────────────────────────────────────────────┤
│  📋 LOGS                                                 │
│  Filtros: [Todos] [Error] [Warning] [Info]              │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 🔴 23:08 [auth][error] MissingCSRF               │   │
│  │ 🟡 22:57 [Security] Rate limit exceeded from...  │   │
│  │ ⚪ 22:05 Server started on port 3000             │   │
│  └──────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  🔒 SEGURIDAD (últimas 24h)                             │
│  ┌────────────┐ ┌─────────────┐ ┌──────────────────┐   │
│  │ Logins     │ │ IPs         │ │ Rate Limit       │   │
│  │ fallidos   │ │ bloqueadas  │ │ hits             │   │
│  │    3       │ │    2        │ │    0             │   │
│  └────────────┘ └─────────────┘ └──────────────────┘   │
│  Lista detallada de eventos recientes...                 │
└─────────────────────────────────────────────────────────┘
```

### Comportamiento
- Logs: polling cada 15 segundos, independiente
- Seguridad: polling cada 30 segundos, independiente
- Si `/api/sistema/logs` falla → muestra error solo en esa sección, seguridad sigue funcionando
- Logs expandibles al click (mensaje completo)
- Filtro de severidad solo filtra en el cliente (no re-fetch)
- Logout llama DELETE a `/api/sistema/auth` → redirige a `/sistema/login`

---

## Middleware

```typescript
// Rutas protegidas por sistema-session JWT
if (pathname.startsWith('/dashboard-sistema') || pathname.startsWith('/api/sistema/')) {
  const cookie = request.cookies.get('sistema-session')
  if (!cookie) redirect to /sistema/login
  try {
    await jwtVerify(cookie.value, secret)  // jose
    return NextResponse.next()
  } catch {
    redirect to /sistema/login
  }
}
```

La verificación es full JWT (no solo presencia de cookie) porque el middleware puede usar `jose` directamente en el Edge Runtime.

---

## Página de Login: `/sistema/login`

- Diseño consistente con el resto del sistema (dark theme, zinc/slate)
- Campos: usuario + contraseña
- En error muestra mensaje genérico "Credenciales incorrectas" (no indica si el usuario existe)
- En éxito: redirige a `/dashboard-sistema`
- No hay link de recuperación de contraseña (credenciales en `.env`, cambiar directamente)

---

## Consideraciones de Seguridad

1. **Rate limiting en login:** 5 intentos / 15 min por IP → previene fuerza bruta
2. **Mensaje de error genérico:** no revela si el usuario existe o no
3. **JWT de corta vida:** 8 horas, sin refresh token
4. **Cookie SameSite=Strict:** previene CSRF en el propio panel
5. **APIs `/api/sistema/*` protegidas:** aunque alguien conozca las URLs, sin JWT válido reciben 401
6. **Sanitización de logs:** ningún secreto, email ni token aparece en el panel
7. **Secreto independiente:** `SISTEMA_JWT_SECRET` ≠ `AUTH_SECRET`

---

## Orden de Implementación

1. `lib/sistema-auth.ts` — helpers JWT y hash
2. `app/api/sistema/auth/route.ts` — login/logout
3. `middleware.ts` — agregar protección
4. `app/sistema/login/page.tsx` — UI de login
5. `app/api/sistema/logs/route.ts` — API de logs
6. `app/api/sistema/security/route.ts` — API de seguridad
7. `app/dashboard-sistema/page.tsx` — rediseño frontend
8. Actualizar `.env` del servidor con las nuevas variables
9. Deploy y verificación
