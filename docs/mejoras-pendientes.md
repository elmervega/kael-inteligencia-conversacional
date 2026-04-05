# Mejoras Pendientes — Kael Web

> Documento de referencia para próximas sesiones de desarrollo.
> Actualizado: 2026-04-05

---

## Alta Prioridad

### 1. Dashboard Home con datos reales
**Archivo:** `app/dashboard/page.tsx`  
**Descripción:** La página de inicio del dashboard actualmente es básica. Mostrar:
- Total de conversaciones con Kael
- Recordatorios activos / próximos
- Último mensaje con Kael (fecha + preview)
- Estado de conexión Telegram (vinculado / no vinculado)
- Acceso rápido a configuración si no tiene Telegram configurado

**Notas técnicas:**
- Leer `conversation_memory` via `prisma.$queryRaw` (tabla de n8n)
- Leer `recordatorios` via Prisma
- Comparar con `user.telegramChatId` para mostrar estado Telegram

---

### 2. CI/CD con GitHub Actions
**Archivo:** `.github/workflows/deploy.yml` (nuevo)  
**Descripción:** Deploy automático a producción en cada push a `main`.

**Pasos del workflow:**
1. Checkout código
2. SSH al servidor
3. `git pull origin main`
4. `npx prisma migrate deploy`
5. `npx prisma generate`
6. `npm run build`
7. `systemctl restart kael-web`
8. Health check: `curl http://localhost:3000/`

**Secrets necesarios en GitHub:**
- `SSH_PRIVATE_KEY` — contenido de `~/.ssh/kael_server`
- `SERVER_HOST` — `165.22.232.160`
- `SERVER_USER` — `root`

---

### 3. Reboot del servidor (aplicar fstab)
**Acción:** Reinicio controlado para que `/etc/fstab` aplique noexec en `/tmp` y `/var/tmp` permanentemente.
- Ya está configurado en fstab
- Ya está activo por remount manual
- Falta confirmar tras reboot

---

## Media Prioridad

### 4. Asociar Telegram en Settings — UX mejorada
**Archivo:** `app/dashboard/settings/page.tsx`  
**Descripción:** El usuario necesita vincularse a Telegram para usar Kael. Mejorar el flujo:
- Detectar si `telegramChatId` está vacío
- Mostrar card de "Conecta tu Telegram" con instrucciones paso a paso:
  1. Abrir Telegram → buscar `@KaelBot`
  2. Enviar `/start`
  3. Pegar el Chat ID que el bot responde
- Validar formato del Chat ID antes de guardar

---

### 5. Página 404 personalizada
**Archivo:** `app/not-found.tsx` (nuevo)  
**Descripción:** Reemplazar la página 404 genérica de Next.js con una en el estilo de Kael (fondo oscuro, logo, botón a home).

---

### 6. Eliminar cuenta
**Archivo:** `app/dashboard/profile/page.tsx` + `app/api/profile/route.ts`  
**Descripción:** Sección "Zona de peligro" al final de perfil:
- Botón "Eliminar mi cuenta" → modal de confirmación
- Requiere escribir email para confirmar
- DELETE en `/api/profile`: elimina User (cascade: Account, Session, UserPreferences)
- Redirige a `/` con signOut

---

### 7. Notificación de nuevo login
**Archivo:** `lib/auth.ts`  
**Descripción:** En el callback `signIn`, enviar email a `user.email` cuando detecte un login nuevo (revisar IP o User-Agent). Usar Resend.

---

## Infraestructura

### 8. Backups a la nube
**Archivo:** `/home/kaeladmin/scripts/backup.sh` (ampliar)  
**Descripción:** Enviar el `.sql` diario a un destino externo:
- **Opción A:** `rclone` a Google Drive (gratuito hasta 15GB)
- **Opción B:** DigitalOcean Spaces (S3-compatible, ~$5/mes)

**Pasos:**
1. Instalar `rclone` en servidor
2. Configurar `rclone config` con Google Drive
3. Agregar al script: `rclone copy "$BACKUP_DIR/kael_db_${DATE}.sql" gdrive:kael-backups/`

---

### 9. Monitor externo (Uptime Robot)
**Descripción:** Monitor gratuito que hace ping cada 5 minutos y alerta si cae el sitio.
- URL: https://uptimerobot.com
- Configurar monitors para: `https://kael.quest` y `https://n8n.kael.quest`
- Alertas a `aroonvegaf@gmail.com` y Telegram

**Importante:** Configurar antes de activar: las IPs de Uptime Robot ya están en fail2ban `ignoreip` ✅

---

### 10. ✅ RESUELTO — Fail2Ban / Cloudflare / monitores legítimos
**Problema ocurrido:** 2026-04-05: Fail2Ban baneó IPs de Cloudflare causando Error 521.

**Causa raíz:** Al estar detrás de Cloudflare, todo tráfico (legítimo + ataques) llega con IP de Cloudflare. No se debe agregar Cloudflare a `ignoreip` — eso ciega la detección.

**Solución aplicada:**
- `CF-Connecting-IP` header configurado en nginx (`/etc/nginx/conf.d/cloudflare-realip.conf`) → nginx ve y loggea la IP real del cliente
- Fail2Ban detecta IPs reales de atacantes desde los logs
- 116 IPs de Uptime Robot agregadas a `ignoreip` ✅
- Resend no hace requests entrantes al servidor → no requiere whitelist ✅

**Regla de seguridad permanente — NUNCA exponer archivos sensibles:**
- `/.env*`, `/.git/`, `/package.json`, `/.htaccess`, etc. → nginx devuelve `444` (sin respuesta)
- Doble protección: `map $blocked_uri` + `location` explícito en nginx
- Verificado: `/.env.production` → `000` (conexión cerrada) ✅

---

## Mejoras de Producto (futuro)

### 11. Landing page — Sección de precios real
**Archivo:** `app/page.tsx`  
**Descripción:** Reemplazar el botón "Plan Pro — Próximamente" con una sección de precios real cuando se defina el modelo de negocio.

### 12. Historial de sesiones activas
**Archivo:** Dashboard → nuevo `app/dashboard/security/page.tsx`  
**Descripción:** Mostrar sesiones activas (de tabla `Session` en Prisma), con opción de cerrar sesiones remotas.

### 13. Estadísticas avanzadas
**Archivo:** `app/dashboard/page.tsx` o nueva página  
**Descripción:** Gráfico de actividad de conversaciones por día/semana. Usar datos de `conversation_memory`.

---

## Notas de Seguridad para cada Deploy

Antes de cada deploy, verificar:
```bash
# 1. Sin secretos hardcodeados
git diff --staged | grep -iE 'api.key|token|password|secret|sk-|AAAAC|Bearer '

# 2. Sin exec/spawn/child_process en APIs
grep -r "exec\|spawn\|child_process" app/api/

# 3. Sin datos sensibles en GET responses (password, tokens)
# Revisar todos los `select:` en routes GET

# 4. Rate limiting en todos los endpoints públicos
grep -r "withRateLimit" app/api/

# 5. Inputs validados con Zod
grep -r "safeParse\|z\." app/api/
```
