#!/bin/bash

##########################################################
# 📊 KAEL DAILY HEALTH CHECK
# Ejecutado automáticamente a las 6:00 PM hora Panamá
# (23:00 UTC)
##########################################################

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="/var/log/kael-health-check.log"
EMAIL="aroonvegaf@gmail.com"
SERVER_IP="165.22.232.160"
SSH_KEY="/root/.ssh/kael_server"

echo "========================================" | tee -a $LOG_FILE
echo "🏥 KAEL Health Check - $TIMESTAMP" | tee -a $LOG_FILE
echo "========================================" | tee -a $LOG_FILE

# 1️⃣ API HEALTH CHECK
echo "" | tee -a $LOG_FILE
echo "1️⃣ API Health Check..." | tee -a $LOG_FILE
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://kael.quest/api/health)
if [ "$HEALTH" = "200" ]; then
    echo "   ✅ API is healthy (HTTP $HEALTH)" | tee -a $LOG_FILE
else
    echo "   ❌ API ERROR (HTTP $HEALTH)" | tee -a $LOG_FILE
fi

# 2️⃣ SYSTEM STATUS CHECK
echo "" | tee -a $LOG_FILE
echo "2️⃣ System Status Check..." | tee -a $LOG_FILE
STATUS=$(curl -s https://kael.quest/api/system/status)
DB_STATUS=$(echo $STATUS | grep -o '"database"[^}]*}' | head -c 30)
REDIS_STATUS=$(echo $STATUS | grep -o '"redis"[^}]*}' | head -c 30)

echo "   Database: $DB_STATUS" | tee -a $LOG_FILE
echo "   Redis: $REDIS_STATUS" | tee -a $LOG_FILE

# 3️⃣ REDIS INFO
echo "" | tee -a $LOG_FILE
echo "3️⃣ Redis Statistics..." | tee -a $LOG_FILE
REDIS_INFO=$(ssh -i $SSH_KEY root@$SERVER_IP 'redis-cli info stats' 2>/dev/null)
if [ ! -z "$REDIS_INFO" ]; then
    HITS=$(echo "$REDIS_INFO" | grep "hits" | head -1)
    MISSES=$(echo "$REDIS_INFO" | grep "misses" | head -1)
    echo "   $HITS" | tee -a $LOG_FILE
    echo "   $MISSES" | tee -a $LOG_FILE
else
    echo "   ⚠️ Could not fetch Redis stats" | tee -a $LOG_FILE
fi

# 4️⃣ RECENT LOGS
echo "" | tee -a $LOG_FILE
echo "4️⃣ Recent Errors/Warnings..." | tee -a $LOG_FILE
ERRORS=$(ssh -i $SSH_KEY root@$SERVER_IP 'journalctl -u kael-web -n 20 --no-pager | grep -i "error\|warning"' 2>/dev/null)
if [ ! -z "$ERRORS" ]; then
    echo "$ERRORS" | tee -a $LOG_FILE
else
    echo "   ✅ No recent errors" | tee -a $LOG_FILE
fi

# 5️⃣ SYSTEM RESOURCES
echo "" | tee -a $LOG_FILE
echo "5️⃣ Server Resources..." | tee -a $LOG_FILE
RESOURCES=$(ssh -i $SSH_KEY root@$SERVER_IP 'echo "CPU/Mem/Disk:" && free -h | grep Mem && df -h / | grep "/"' 2>/dev/null)
echo "$RESOURCES" | tee -a $LOG_FILE

# 6️⃣ SERVICE STATUS
echo "" | tee -a $LOG_FILE
echo "6️⃣ Service Status..." | tee -a $LOG_FILE
SERVICES=$(ssh -i $SSH_KEY root@$SERVER_IP 'systemctl is-active kael-web && echo "kael-web: ✅" || echo "kael-web: ❌"' 2>/dev/null)
REDIS_SVC=$(ssh -i $SSH_KEY root@$SERVER_IP 'systemctl is-active redis-server && echo "redis-server: ✅" || echo "redis-server: ❌"' 2>/dev/null)
DB_SVC=$(ssh -i $SSH_KEY root@$SERVER_IP 'systemctl is-active postgresql && echo "postgresql: ✅" || echo "postgresql: ❌"' 2>/dev/null)

echo "   $SERVICES" | tee -a $LOG_FILE
echo "   $REDIS_SVC" | tee -a $LOG_FILE
echo "   $DB_SVC" | tee -a $LOG_FILE

echo "" | tee -a $LOG_FILE
echo "========================================" | tee -a $LOG_FILE
echo "✅ Health Check Completed" | tee -a $LOG_FILE
echo "========================================" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

# Optional: Send email report
# echo "Kael Daily Health Check - $TIMESTAMP" | mail -s "Kael Health Report" $EMAIL < $LOG_FILE
