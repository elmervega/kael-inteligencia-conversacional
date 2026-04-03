# 🔥 DigitalOcean Firewall Setup Guide

**Fecha**: 2026-04-02  
**Droplet**: kael-prod-v2 (165.22.232.160)  
**Propósito**: Protección de red en DigitalOcean  

---

## ❓ ¿DEBERÍA ACTIVAR EL FIREWALL DE DIGITALOCEAN?

### 🟢 **SÍ, DEFINITIVAMENTE**

**Razones**:
1. **Protección extra**: Además del UFW del servidor
2. **Nivel de red**: Filtra traffic antes de llegar al servidor
3. **DDoS prevention**: Ayuda a mitigar ataques
4. **Sin costo extra**: Incluido en DigitalOcean
5. **Fácil de configurar**: 10 minutos

**Recomendación**: ACTIVAR AHORA

---

## 📋 CONFIGURATION STEPS

### PASO 1: Ir a DigitalOcean Console

```
1. Ir a: https://cloud.digitalocean.com
2. Login con tu cuenta
3. Ir a: Networking → Firewalls (en el menú izquierdo)
```

---

### PASO 2: Crear Nuevo Firewall

```
1. Click: "Create Firewall"
2. Name: "kael-prod-firewall"
3. Description: "Firewall for Kael production server 165.22.232.160"
```

---

### PASO 3: Configurar Inbound Rules (ENTRADA)

**AGREGAR estas reglas:**

#### Rule 1: SSH (tu conexión)
```
Protocol: TCP
Port: 22
Source Type: IP Address
Source: [TU IP PÚBLICA] (si sabes tu IP)
      O: 0.0.0.0/0 (permite cualquiera - MENOS SEGURO)
Description: "SSH access"
```

#### Rule 2: HTTP
```
Protocol: TCP
Port: 80
Source Type: All (0.0.0.0/0)
Description: "HTTP web traffic"
```

#### Rule 3: HTTPS
```
Protocol: TCP
Port: 443
Source Type: All (0.0.0.0/0)
Description: "HTTPS secure web traffic"
```

#### Rule 4: n8n (Opcional - solo si quieres acceso remoto)
```
Protocol: TCP
Port: 5678
Source Type: IP Address
Source: [TU IP] (RESTRINGIDO a tu IP)
Description: "n8n admin access (restricted)"
```

**NO AGREGAR estos puertos (DDoS/Mining):**
```
❌ 3333 (Litecoin)
❌ 5555 (Various)
❌ 7777 (Various)
❌ 14433 (Monero)
❌ 14444 (Monero)
❌ 45700 (Xmrig)
```

---

### PASO 4: Configurar Outbound Rules (SALIDA)

**Por defecto (Recomendado):**
```
"Allow all outbound traffic"
```

O restringido (más paranoia):
```
Protocol: TCP
Ports: 443 (HTTPS)
Destination: All (0.0.0.0/0)
Description: "HTTPS outbound only"

+ agregar más según necesites (DNS, email, etc)
```

---

### PASO 5: Aplicar a Droplet

```
1. Scroll down a "Apply to Droplets"
2. Busca: "kael-prod-v2" (165.22.232.160)
3. Click en ella para seleccionar
4. Click: "Create Firewall"
```

**Espera 1-2 minutos a que se aplique.**

---

## ✅ VERIFICACIÓN

Una vez aplicado el firewall, verifica:

```bash
# SSH a tu servidor (debe funcionar)
ssh kaeladmin@165.22.232.160

# Verificar que servicios responden
curl http://localhost/                    # nginx
curl http://localhost:3000/               # kael-web
curl http://localhost:5678/health         # n8n

# Si alguno no responde → firewall bloqueó
# Revisa las reglas en DigitalOcean console
```

---

## 🔧 TABLA DE CONFIGURACIÓN RECOMENDADA

| Puerto | Protocolo | Origen | Propósito | Permitir |
|--------|-----------|--------|----------|----------|
| 22 | TCP | Tu IP | SSH Admin | ✅ |
| 80 | TCP | 0.0.0.0/0 | HTTP | ✅ |
| 443 | TCP | 0.0.0.0/0 | HTTPS | ✅ |
| 3000 | TCP | 0.0.0.0/0 | kael-web | ✅ |
| 5678 | TCP | Tu IP | n8n admin | ✅ |
| 5432 | TCP | Localhost | PostgreSQL | ❌ (interno) |
| 3333 | TCP | Cualquiera | Litecoin Mining | ❌ |
| 5555 | TCP | Cualquiera | Mining | ❌ |
| 7777 | TCP | Cualquiera | Mining | ❌ |

---

## ⚠️ CONSIDERACIONES DE SEGURIDAD

### Para SSH (Puerto 22)

**Opción A: RESTRINGIDO (Más Seguro)**
```
Source: [TU IP PÚBLICA]
Benefit: Solo TÚ puedes conectar
Risk: Si tu IP cambia, no puedas conectar
```

**Opción B: ABIERTO (Menos Seguro)**
```
Source: 0.0.0.0/0 (Todos)
Benefit: Puedes conectar desde cualquier lugar
Risk: Atacantes pueden intentar SSH brute force
      (PERO fail2ban en el servidor los bloquea)
```

**Recomendación**: Opción A + fail2ban

---

## 🛡️ CAPAS DE SEGURIDAD (Defense in Depth)

Con ambos firewalls activos:

```
1. DigitalOcean Firewall (nivel de red)
   ↓
2. UFW del servidor (nivel del SO)
   ↓
3. fail2ban (protección SSH)
   ↓
4. Rate limiting en app (nivel de aplicación)
   ↓
5. Input validation (nivel de datos)
```

**Resultado**: Protección multicapa

---

## 🚨 TROUBLESHOOTING

### Si no puedo conectar por SSH después de activar firewall:

```bash
# En DigitalOcean console:
1. Ir a: Networking → Firewalls
2. Click en tu firewall
3. Edit inbound rules
4. Verificar que puerto 22 está permitido
5. Verificar que tu IP está correcta
6. Click "Update Firewall"
7. Espera 1 minuto
8. Intenta SSH de nuevo
```

### Si n8n no responde:

```bash
# Verificar puerto en firewall
1. DigitalOcean console → Firewalls
2. Verificar que puerto 5678 está permitido
3. Verificar tu IP está en la regla
4. Si cambió, actualizar la regla
```

### Si web está lenta:

```bash
# Probablemente no es firewall
# Verificar:
- Servicios en servidor
- Load en servidor
- Logs de nginx
```

---

## 📊 MONITOREO DE FIREWALL

DigitalOcean te permite ver:

```
1. Blocked connections → Conexiones rechazadas
2. Traffic statistics → Estadísticas de tráfico
3. Applied rules → Reglas aplicadas

Para ver:
- Ir a: Networking → Firewalls
- Click en tu firewall
- Ver "Activity" tab
```

---

## 🔄 CAMBIOS FRECUENTES

### Cuando tu IP cambia:

```
1. Descubre tu nueva IP pública:
   - Ir a: https://www.whatismyipaddress.com
   - O: curl ifconfig.me

2. En DigitalOcean:
   - Ir a Firewall → Edit rules
   - Cambiar tu IP en la regla SSH
   - Click "Update Firewall"

3. Espera 1-2 minutos
```

### Cuando necesitas acceso a un puerto nuevo:

```
1. En DigitalOcean Firewall:
   - Click "Add Rule"
   - Protocol: TCP
   - Port: [TU PUERTO]
   - Source: [TU IP O 0.0.0.0/0]
   - Click "Create"
```

---

## ✅ CHECKLIST FINAL

```
[ ] Firewall creado en DigitalOcean
[ ] Puerto 22 (SSH) abierto a tu IP
[ ] Puerto 80 (HTTP) abierto a todos
[ ] Puerto 443 (HTTPS) abierto a todos
[ ] Puerto 5678 (n8n) abierto a tu IP
[ ] Puertos de mining (3333, 5555, etc) CERRADOS
[ ] Firewall aplicado a droplet 165.22.232.160
[ ] SSH funciona después de aplicar firewall
[ ] HTTP/HTTPS funciona
[ ] Verificación completada
```

---

## 🎯 RECOMENDACIÓN FINAL

**Configuración Recomendada:**

```yaml
Inbound Rules:
  - SSH: Tu IP (restringido)
  - HTTP: 0.0.0.0/0 (público)
  - HTTPS: 0.0.0.0/0 (público)
  - n8n: Tu IP (restringido)

Outbound Rules:
  - Allow all (default)

Result: ✅ SEGURO + FUNCIONAL
```

---

**Tiempo de configuración**: ~10 minutos  
**Beneficio**: Protección extra contra ataques  
**Costo**: Incluido en DigitalOcean (gratis)  

**Recomendación**: ACTIVAR AHORA
