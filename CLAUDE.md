# CLAUDE.md — Kael Inteligencia Conversacional

**Instrucciones Críticas para Claude:**
1. **Siempre anticipar fallas** y brindar recomendaciones proactivas
2. **Nunca eliminar** el servidor de DigitalOcean — siempre salvaguardarlo
3. **Documentar todo** — procedimientos, cambios, decisiones
4. **Priorizar seguridad** — especialmente para n8n y datos de usuarios

---

## 📊 Estado Actual del Sistema (2026-03-28)

### Servidores
| Servidor | IP | Estado | Propósito |
|----------|-----|--------|----------|
| **kael-prod-v2** | 165.22.232.160 | ✅ ACTIVO | Producción (n8n + kael-web) |
| **Old Server** | 137.184.171.83 | ❌ ELIMINADO | (Fue comprometido 3x por xmrig) |

### Servicios Activos
| Servicio | Puerto | Usuario | Status | Endpoint |
|----------|--------|--------|--------|----------|
| **n8n** | 5678 | `n8n` (NO root) | ✅ Corriendo | https://n8n.kael.quest |
| **kael-web** (Next.js) | 3000 | `www-data` | ✅ Corriendo | https://kael.quest |
| **nginx** | 80/443 | root | ✅ Corriendo | Reverse proxy |
| **PostgreSQL** | 5432 | `postgres` | ✅ Corriendo | BD: kael |

### SSL/Certificados
| Dominio | Estado | Expiración |
|---------|--------|-----------|
| **kael.quest** | ✅ HTTPS | 2026-06-26 |
| **n8n.kael.quest** | ✅ HTTPS | 2026-06-26 |
| **www.kael.quest** | ⏳ Pendiente | - |

### Firewall & Seguridad
- ✅ UFW activo con rules específicas
- ✅ Bloqueo de puertos de minería (3333, 5555, 7777, 14433, 14444, 45700)
- ✅ fail2ban protegiendo SSH
- ✅ SSH key-only (sin passwords)
- ✅ PermitRootLogin = no
- ✅ n8n corre como usuario dedicado (NO root)

---

## 🔑 Credenciales Seguras

### Ubicaciones de Credenciales

```bash
# n8n — Usuario y BD
/home/n8n/.n8n/database.sqlite      # Base de datos (37MB)
/home/n8n/.n8n/database.sqlite.bak  # Backup recomendado

# n8n — Encryption key
/home/n8n/.n8n/config               # Clave de encriptación

# kael-web — Env vars
/var/www/kael-web/.env              # DB_URL, NEXTAUTH_SECRET, etc.

# nginx — Auth (ACTUALMENTE NO USADO)
/etc/nginx/.htpasswd                # (Obsoleto — n8n maneja auth)

# SSH — Keys de autenticación
/home/kaeladmin/.ssh/authorized_keys
/root/.ssh/authorized_keys

# Certificados SSL
/etc/letsencrypt/live/kael.quest/
/etc/letsencrypt/live/n8n.kael.quest/
```

### Contraseñas Críticas

**⚠️ GUARDAR EN LUGAR SEGURO (1Password, Bitwarden, etc.)**

```
=== n8n Owner Account ===
Email: aroonvegaf@gmail.com
Password: [Se configura en primer login después de reset]

=== kael-web Database ===
Host: localhost:5432
User: kaeluser
Password: kaelpassword123
Database: kael

=== PostgreSQL Admin ===
User: postgres
[Sin contraseña — local socket only]

=== SSH Access ===
User: kaeladmin
Auth: SSH key (NO password)
```

---

## 🔄 Procedimientos Críticos

### 1. Reset de Credenciales n8n

Si el usuario olvida su contraseña de n8n:

```bash
ssh kaeladmin@165.22.232.160
sudo -i

# OPCIÓN A: Reset completo (borra todos los usuarios)
sudo -u n8n n8n user-management:reset

# Luego:
systemctl restart n8n
# Usuario debe crear cuenta nueva en primer login
```

**Riesgos:**
- Borra TODOS los usuarios de n8n
- Las credenciales antiguas ya no funcionan
- Usar solo si es absolutamente necesario

---

### 2. Backup de Datos Críticos

```bash
# Backup de n8n database
sudo -u n8n cp /home/n8n/.n8n/database.sqlite \
  /home/n8n/.n8n/database.sqlite.bak.$(date +%Y%m%d)

# Backup de encryption key (crítico — sin esto no recuperas la BD)
sudo -u n8n cp /home/n8n/.n8n/config \
  /home/n8n/.n8n/config.bak.$(date +%Y%m%d)

# Backup de kael-web .env
sudo cp /var/www/kael-web/.env /var/www/kael-web/.env.bak.$(date +%Y%m%d)

# Backup de PostgreSQL
pg_dump -U kaeluser -h localhost kael > ~/kael_db_$(date +%Y%m%d).sql

# ⚠️ RECOMENDACIÓN: Hacer backups semanales
# Opción: Configurar cron job (ver Paso 3)
```

**Dónde guardar:**
- En el servidor: `/home/kaeladmin/backups/`
- En la nube: Google Drive, Dropbox, AWS S3 (encrypted)
- NUNCA en GitHub o repositorios públicos

---

### 3. Recovery Rápido

Si algo falla:

```bash
# Restaurar n8n database
sudo -u n8n cp /home/n8n/.n8n/database.sqlite.bak.YYYYMMDD \
  /home/n8n/.n8n/database.sqlite
sudo systemctl restart n8n

# Restaurar PostgreSQL
psql -U kaeluser -h localhost kael < ~/kael_db_YYYYMMDD.sql
sudo systemctl restart kael-web

# Restaurar nginx config
sudo cp /etc/nginx/sites-available/n8n.kael.quest.bak \
  /etc/nginx/sites-available/n8n.kael.quest
sudo nginx -t && sudo systemctl reload nginx
```

---

## 🔧 Comandos de Diagnóstico Rápido

### Estado General

```bash
# Todos los servicios
sudo systemctl status n8n kael-web nginx postgresql fail2ban

# Resumen de proceso
ps aux | grep -E "node|n8n|postgres"

# Recursos (CPU, memoria)
free -h                    # Memoria
df -h                      # Disco
top -n 1 | head -20        # Top processes

# Logs recientes
sudo journalctl -u n8n -n 50          # n8n logs (últimas 50 líneas)
sudo journalctl -u kael-web -n 50     # kael-web logs
sudo tail -50 /var/log/nginx/access.log
sudo tail -50 /var/log/nginx/error.log
```

### Diagnóstico de n8n

```bash
# Verificar que corre como usuario 'n8n' (NO root)
ps aux | grep n8n | grep -v root | grep node

# Estado del servicio
systemctl status n8n

# Database integrity
sqlite3 /home/n8n/.n8n/database.sqlite "PRAGMA integrity_check;"

# Verificar permisos
ls -la /home/n8n/.n8n/
stat /home/n8n/.n8n/database.sqlite
stat /home/n8n/.n8n/config

# Conectividad a localhost:5678
curl -v http://localhost:5678/health 2>&1 | head -20

# WebSocket check (importante para n8n UI)
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://localhost:5678/socket.io/?transport=websocket
```

### Diagnóstico de nginx

```bash
# Test de config
sudo nginx -t

# Estado
systemctl status nginx

# Logs de error
sudo tail -50 /var/log/nginx/error.log

# Verificar que kael.quest y n8n.kael.quest están habilitados
ls -la /etc/nginx/sites-enabled/

# Revisar directivas principales
sudo grep -r "server_name" /etc/nginx/sites-enabled/

# Test de conectividad
curl -v https://kael.quest 2>&1 | head -30
curl -v https://n8n.kael.quest/health 2>&1 | head -30

# Verificar SSL
echo | openssl s_client -servername kael.quest -connect kael.quest:443 2>/dev/null | grep -A 2 "Issuer\|Subject\|Not Before\|Not After"
```

### Diagnóstico de Seguridad

```bash
# Procesos sospechosos
ps aux | grep -E "xmrig|scanner|defunct|gs-dbus|kdevtmpfsi|kinsing"

# Puertos abiertos
sudo ss -tlnp

# Servicios systemd sospechosos
systemctl list-unit-files | grep -E "defunct|gs-dbus|scanner|mining"
sudo systemctl list-units --state=failed

# Archivos ejecutables nuevos en /var/www/kael-web
find /var/www/kael-web -type f -perm /111 -newer /var/www/kael-web/package.json

# Conexiones de red activas
sudo ss -tnp | grep -E "3333|5555|7777|14433|14444|45700"

# Verificar que UFW está bloqueando puertos de minería
sudo ufw show added | grep -E "3333|5555"

# fail2ban status
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

---

## 🛡️ Checklist de Seguridad Mensual

```
[ ] Revisar logs de SSH en /var/log/auth.log
    sudo tail -100 /var/log/auth.log | grep -E "Failed|Accepted"

[ ] Verificar que NO hay procesos xmrig o minería
    ps aux | grep -i xmrig
    ps aux | grep -i mining

[ ] Revisar espacios en disco (>80% es peligroso)
    df -h /

[ ] Revisar memoria RAM (¿swap activo?)
    free -h

[ ] Verificar que n8n corre como usuario 'n8n', NO root
    ps aux | grep "node.*n8n" | grep -v root

[ ] Revisar certificados SSL (¿expiración pronto?)
    echo | openssl s_client -servername kael.quest -connect kael.quest:443 2>/dev/null | grep "Not After"

[ ] Revisar permisos de archivos sensibles
    ls -la /home/n8n/.n8n/
    ls -la /var/www/kael-web/.env

[ ] Revisar logs de nginx (¿errores 502, 503?)
    sudo tail -50 /var/log/nginx/error.log

[ ] Verificar que fail2ban está activo
    sudo systemctl status fail2ban
    sudo fail2ban-client status sshd

[ ] Revisar outputs recientes de workflows n8n
    # Verificar en UI: https://n8n.kael.quest

[ ] Revisar PostgreSQL (¿tamaño de DB?)
    du -sh /var/lib/postgresql/*/main/
```

---

## ⚠️ Escenarios Críticos y Soluciones

### Escenario 1: n8n no responde (502 Bad Gateway)

```bash
# Paso 1: Verificar estado
systemctl status n8n

# Paso 2: Ver logs
sudo journalctl -u n8n -n 50 | tail -20

# Paso 3: Reiniciar
sudo systemctl restart n8n
sleep 5

# Paso 4: Verificar conectividad
curl -v http://localhost:5678/health

# Paso 5: Si sigue fallando, verificar DB
sqlite3 /home/n8n/.n8n/database.sqlite "SELECT COUNT(*) FROM sqlite_master;"

# Paso 6: Última opción — restaurar backup
sudo -u n8n cp /home/n8n/.n8n/database.sqlite.bak.YYYYMMDD \
  /home/n8n/.n8n/database.sqlite
sudo systemctl restart n8n
```

**Causas comunes:**
- n8n corriendo como root (❌ Incorrecto)
- Database corrupted
- Permisos incorrectos en /home/n8n/.n8n/

---

### Escenario 2: Alta latencia o lentitud

```bash
# Verificar recursos
free -h                    # ¿RAM llena?
df -h /                    # ¿Disco lleno?
top -n 1 | head -10        # ¿CPU al 100%?

# Verificar procesos culpables
ps aux --sort=-%cpu | head -10
ps aux --sort=-%mem | head -10

# Si hay xmrig o minería
pkill -f xmrig
pkill -f scanner_linux
ps aux | grep -v grep | grep -E "xmrig|scanner"

# Verificar conexiones de red
sudo ss -tnp | wc -l       # ¿Demasiadas conexiones?
sudo ss -tnp | grep ESTABLISHED | wc -l

# Revisar puertos de minería
sudo ss -tnp | grep -E ":3333|:5555|:7777|:14433|:14444|:45700"
```

**Soluciones:**
- Aumentar swap: `sudo fallocate -l 4G /swapfile`
- Limpiar disk: `docker system prune -a` (si uses Docker)
- Reiniciar servicios: `sudo systemctl restart n8n kael-web`

---

### Escenario 3: SSL Certificate caducado

```bash
# Verificar expiración
echo | openssl s_client -servername kael.quest -connect kael.quest:443 2>/dev/null | grep "Not After"

# Renovar manualmente
sudo certbot renew --dry-run   # Test
sudo certbot renew --force-renewal

# O específico para un dominio
sudo certbot --nginx -d kael.quest --force-renewal
sudo certbot --nginx -d n8n.kael.quest --force-renewal

# Después: reload nginx
sudo systemctl reload nginx

# Verificar que se renovó
echo | openssl s_client -servername kael.quest -connect kael.quest:443 2>/dev/null | grep "Not After"
```

---

### Escenario 4: Ataque de Fuerza Bruta (SSH)

```bash
# Verificar fail2ban
sudo fail2ban-client status sshd

# Ver intentos bloqueados
sudo tail -100 /var/log/fail2ban.log | grep "Ban\|Unban"

# Si quieres desbloquear una IP
sudo fail2ban-client set sshd unbanip 123.45.67.89

# Cambiar configuración de fail2ban
sudo nano /etc/fail2ban/jail.d/sshd.conf
# Recomendado:
# maxretry = 3
# bantime = 3600
# findtime = 600

# Aplicar cambios
sudo systemctl restart fail2ban
```

---

## ⚠️ Issues Conocidos

### 1. kael.quest — NextAuth UntrustedHost Error

**Estado:** 🔴 Pendiente resolución
**Síntoma:** Acceso a https://kael.quest muestra "Server error - There is a problem with the server configuration"
**Causa Raíz:** NextAuth.js rechaza el host `kael.quest` aunque está configurado correctamente

**Intentos fallidos:**
- ✗ Agregar `NEXTAUTH_TRUST_HOST=true` al `.env`
- ✗ Agregar `trustHost: true` a `/var/www/kael-web/lib/auth.ts`
- ✗ Mejorar headers nginx (`X-Forwarded-Proto`, `X-Forwarded-Host`, etc.)
- ✗ Limpiar y reconfigurar `.env` completamente

**Logs relevantes:**
```
[auth][error] UntrustedHost: Host must be trusted. URL was: https://kael.quest/api/auth/session
Error location: /var/www/kael-web/.next/server/app/api/auth/[...nextauth]/route.js:404
```

**Próximos pasos para resolver:**
1. Revisar `/var/www/kael-web/app/api/auth/[...nextauth]/route.ts` — podría haber validación hardcodeada
2. Revisar si NextAuth v5+ requiere configuración diferente
3. Considerar actualizar NextAuth.js a versión más reciente
4. O implementar un workaround (ej: usar localhost:3000 internamente, nginx redirige)

**Alternativa temporal:**
- kael.quest está siendo servido correctamente (HTTP 200 OK)
- El error ocurre solo en rutas de autenticación (`/api/auth/*`)
- La landing page podría funcionar si no hace llamadas de auth

---

## 📋 Tareas Pendientes

```
[ ] RESOLVER: NextAuth UntrustedHost en kael.quest
    - Revisar route.ts
    - Considerar actualizar NextAuth
    - Implementar workaround si es necesario

[ ] Obtener SSL para www.kael.quest
    sudo certbot --nginx -d www.kael.quest

[ ] Crear cron job para backups diarios
    0 2 * * * /home/kaeladmin/scripts/backup.sh

[ ] Monitoreo de salud del servidor
    - Uptime alerts (Uptime Robot)
    - Disk space alerts
    - Memory alerts
    - CPU alerts

[ ] Documentar todos los workflows en n8n
    - Nombres y descripciones
    - Triggers y acciones
    - Credenciales usadas

[ ] Configurar auto-renew de SSL (ya está en certbot)

[ ] Crear script de health check automático
    - Ping a kael.quest cada 5 minutos
    - Alertar si responde lentamente

[ ] Revisar y documentar todas las credenciales de n8n
    - Telegram bot token
    - WhatsApp credentials
    - API keys externas

[ ] Preparar runbook de disaster recovery
    - Procedimiento si se pierde el servidor
    - Cómo restaurar desde backups
    - Cómo configurar en un nuevo servidor
```

---

## 🚀 Próximos Pasos (Cuando esté estable)

1. **Monitoreo en tiempo real**
   - Integrar con Uptime Robot o similar
   - Alertas a email/Telegram si servicios caen

2. **Auto-scaling**
   - Si n8n crece, considerar Docker containers
   - PostgreSQL replication para alta disponibilidad

3. **CI/CD para kael-web**
   - GitHub Actions para deployments automáticos
   - Testing antes de push a producción

4. **Auditoría de seguridad**
   - Revisar permisos de archivos
   - Auditoría de acceso SSH
   - Penetration testing

5. **Disaster Recovery Plan**
   - Documentar cómo restaurar desde cero
   - Guardar IaC (Terraform, Ansible)
   - Simular recovery mensualmente

---

## 📞 Contactos y Referencias

**DigitalOcean:**
- Dashboard: https://cloud.digitalocean.com
- Cuenta: aroonvegaf@gmail.com
- Dominio: Porkbun (kael.quest)

**Servicios:**
- n8n Docs: https://docs.n8n.io
- Next.js Docs: https://nextjs.org/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/

**Logs y Troubleshooting:**
- journalctl: `man journalctl`
- nginx: `man nginx`
- systemctl: `man systemctl`

---

**Última actualización:** 2026-03-28
**Estado:** PRODUCCIÓN ESTABLE — Servidor anterior (137.184.171.83) eliminado ✅