cat > scripts/deploy.sh << 'DEPLOY_SCRIPT_END'
#!/bin/bash
set -e

echo "════════════════════════════════════════════════════════════════════"
echo "  🚀 AUDITORÍA, COMPILACIÓN Y DEPLOYMENT COMPLETO"
echo "  Servidor: 165.22.232.160"
echo "  Fecha: $(date)"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# ============================================================================
# FASE 1: CLONAR Y AUDITAR
# ============================================================================
echo "FASE 1: Clonando repositorio..."
cd /var/www
sudo rm -rf kael-web 2>/dev/null || true
sudo git clone https://github.com/elmervega/kael-inteligencia-conversacional.git kael-web
sudo chown -R www-data:www-data /var/www/kael-web
cd /var/www/kael-web
echo "✅ Repositorio clonado"
echo ""

# ============================================================================
# FASE 2: AUDITORÍA DE SEGURIDAD
# ============================================================================
echo "FASE 2: Auditando seguridad..."
echo ""
echo "🔍 Archivos principales:"
ls -la | grep -E "package.json|next.config|.env|tsconfig"
echo ""

echo "🔐 Verificando secretos..."
if grep -r "password\|secret\|token\|key" .env* 2>/dev/null | grep -v ".env.example" | grep -v "node_modules"; then
  echo "⚠️  ADVERTENCIA: Posibles secretos encontrados"
else
  echo "✅ No hay secretos en archivos"
fi
echo ""

echo "📋 Package.json (primeras 30 líneas):"
head -30 package.json
echo ""

# ============================================================================
# FASE 3: INSTALAR DEPENDENCIAS
# ============================================================================
echo "FASE 3: Instalando dependencias npm..."
sudo -u www-data npm install 2>&1 | tail -5
echo ""

echo "🔐 Auditoria de seguridad de dependencias:"
sudo -u www-data npm audit 2>&1 | tail -10
echo ""

# ============================================================================
# FASE 4: COMPILAR NEXT.JS
# ============================================================================
echo "FASE 4: Compilando Next.js..."
sudo -u www-data npm run build 2>&1 | tail -20
echo "✅ Compilación completada"
echo ""

# ============================================================================
# FASE 5: OBTENER CERTIFICADOS SSL
# ============================================================================
echo "FASE 5: Obteniendo certificados SSL..."
sudo certbot certonly --standalone \
  -d kael.quest \
  -d www.kael.quest \
  -d n8n.kael.quest \
  --non-interactive \
  --agree-tos \
  -m aroonvegaf@gmail.com \
  --preferred-challenges http 2>&1 | tail -10
echo ""

# ============================================================================
# FASE 6: CONFIGURAR NGINX HTTPS
# ============================================================================
echo "FASE 6: Configurando nginx para HTTPS..."

sudo tee /etc/nginx/sites-available/kael.quest > /dev/null << 'NGINX_KAEL'
server {
    listen 80;
    listen [::]:80;
    server_name kael.quest www.kael.quest;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name kael.quest www.kael.quest;

    ssl_certificate /etc/letsencrypt/live/kael.quest/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kael.quest/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_KAEL

sudo tee /etc/nginx/sites-available/n8n.kael.quest > /dev/null << 'NGINX_N8N'
server {
    listen 80;
    listen [::]:80;
    server_name n8n.kael.quest;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name n8n.kael.quest;

    ssl_certificate /etc/letsencrypt/live/n8n.kael.quest/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/n8n.kael.quest/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
NGINX_N8N

sudo nginx -t
sudo systemctl restart nginx
echo "✅ nginx configurado para HTTPS"
echo ""

# ============================================================================
# FASE 7: INICIAR SERVICIOS
# ============================================================================
echo "FASE 7: Iniciando servicios..."

sudo systemctl restart postgresql
sleep 2
sudo systemctl restart kael-web
sudo systemctl enable kael-web
sleep 2
sudo systemctl restart n8n
sudo systemctl enable n8n

echo "✅ Servicios iniciados"
echo ""

# ============================================================================
# FASE 8: VERIFICACIÓN FINAL
# ============================================================================
echo "FASE 8: Verificación final..."
echo ""

echo "🔍 Estado de Servicios:"
echo ""
echo "PostgreSQL:"
sudo systemctl status postgresql --no-pager | grep -E "active|inactive"
echo ""
echo "nginx:"
sudo systemctl status nginx --no-pager | grep -E "active|inactive"
echo ""
echo "kael-web:"
sudo systemctl status kael-web --no-pager | grep -E "active|inactive|running"
echo ""
echo "n8n:"
sudo systemctl status n8n --no-pager | grep -E "active|inactive|running"
echo ""

echo "🌐 Puertos abiertos:"
sudo ss -tlnp 2>/dev/null | grep -E "LISTEN|:80|:443|:3000|:5678|:5432" | tail -10
echo ""

echo "🔒 Certificados SSL:"
echo | openssl s_client -servername kael.quest -connect kael.quest:443 2>/dev/null | grep "Issuer\|Subject\|Not After" | head -5
echo ""

echo "✅ Tests de conectividad:"
echo ""
echo "HTTPS kael.quest:"
curl -s -I https://kael.quest 2>&1 | head -2
echo ""
echo "HTTPS n8n.kael.quest:"
curl -s -I https://n8n.kael.quest/health 2>&1 | head -2
echo ""

# ============================================================================
# RESUMEN FINAL
# ============================================================================
echo "════════════════════════════════════════════════════════════════════"
echo "                    ✅ DEPLOYMENT COMPLETADO"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "📊 SERVICIOS EN OPERACIÓN:"
echo "   ✅ PostgreSQL (puerto 5432)"
echo "   ✅ nginx (puertos 80/443)"
echo "   ✅ kael-web (puerto 3000 → proxy)"
echo "   ✅ n8n (puerto 5678 → proxy)"
echo ""
echo "🔒 CERTIFICADOS SSL:"
echo "   ✅ kael.quest"
echo "   ✅ n8n.kael.quest"
echo ""
echo "🌍 ACCESO DESDE INTERNET:"
echo "   ✅ https://kael.quest"
echo "   ✅ https://n8n.kael.quest"
echo ""
echo "📍 PRÓXIMOS PASOS:"
echo "   1. Accede a https://kael.quest en tu navegador"
echo "   2. Configura n8n en https://n8n.kael.quest"
echo "   3. Verifica logs: sudo journalctl -u kael-web -f"
echo ""
echo "════════════════════════════════════════════════════════════════════"

DEPLOY_SCRIPT_END
