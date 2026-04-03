# 🔧 N8N Workflows - Instrucciones Manuales (5 Minutos)

**Nota:** Estos son workflows básicos para comenzar. Puedes editarlos después con más nodos.

---

## **WORKFLOW 1: Telegram Bot Handler** ✅

1. En n8n, haz click en **"Start from scratch"**
2. Nombre: `Telegram Bot Handler`
3. Click en **"+"** para agregar un nodo
4. Busca `"Webhook"` → Selecciona **Webhook**
5. Click en el nodo Webhook → En la sección **Settings**, copia la URL:
   - Esta es tu webhook URL para Telegram
6. Click en **"+"** de nuevo
7. Busca `"HTTP Request"` → Selecciona **HTTP Request**
8. En HTTP Request, configura:
   - **Method:** GET
   - **URL:** `https://api.anthropic.com/v1/models`
   - Headers: `authorization: Bearer YOUR_CLAUDE_API_KEY`
9. Conecta: Webhook → HTTP Request
10. Click en **"Save"**
11. **Activa el workflow** (toggle arriba a la derecha)

---

## **WORKFLOW 2: WhatsApp Conversational** ✅

1. Click **"Start from scratch"**
2. Nombre: `WhatsApp Conversational`
3. Click **"+"** → Busca **Webhook** → Selecciona
4. Click **"+"** → Busca **HTTP Request** → Selecciona
5. En HTTP Request:
   - **Method:** POST
   - **URL:** `https://api.whatsapp.com/send`
   - **Body:** 
     ```json
     {
       "message": "{{ $json.message }}"
     }
     ```
6. Conecta: Webhook → HTTP Request
7. Click **"Save"**
8. **Activa el workflow**

---

## **WORKFLOW 3: Claude AI Integration** (Utilidad)

1. Click **"Start from scratch"**
2. Nombre: `Claude AI Integration`
3. Click **"+"** → Busca **Webhook** → Selecciona
4. Click **"+"** → Busca **HTTP Request** → Selecciona
5. En HTTP Request:
   - **Method:** POST
   - **URL:** `https://api.anthropic.com/v1/messages`
   - **Headers:**
     ```
     x-api-key: YOUR_CLAUDE_API_KEY
     anthropic-version: 2023-06-01
     content-type: application/json
     ```
   - **Body:**
     ```json
     {
       "model": "claude-3-5-sonnet-20241022",
       "max_tokens": 1024,
       "messages": [
         {"role": "user", "content": "{{ $json.message }}"}
       ]
     }
     ```
6. Conecta: Webhook → HTTP Request
7. Click **"Save"**
8. **NO actives este workflow** (es una utilidad)

---

## **WORKFLOW 4: Email Notifications** ✅

1. Click **"Start from scratch"**
2. Nombre: `Email Notifications`
3. Click **"+"** → Busca **Webhook** → Selecciona
4. Click **"+"** → Busca **Gmail** o **SMTP** → Selecciona **Gmail**
5. En Gmail:
   - Click **"Authenticate"** y conecta tu cuenta Gmail
   - **To:** `{{ $json.to }}`
   - **Subject:** `{{ $json.subject }}`
   - **Text:** `{{ $json.body }}`
6. Conecta: Webhook → Gmail
7. Click **"Save"**
8. **Activa el workflow**

---

## **WORKFLOW 5: Audio Transcription (Whisper)** ✅

1. Click **"Start from scratch"**
2. Nombre: `Audio Transcription (Whisper)`
3. Click **"+"** → Busca **Webhook** → Selecciona
4. Click **"+"** → Busca **HTTP Request** → Selecciona
5. En HTTP Request:
   - **Method:** POST
   - **URL:** `https://api.openai.com/v1/audio/transcriptions`
   - **Headers:**
     ```
     Authorization: Bearer YOUR_OPENAI_API_KEY
     ```
   - **Body:** Form-Data
     - `model`: `whisper-1`
     - `file`: `{{ $binary.data }}`
6. Conecta: Webhook → HTTP Request
7. Click **"Save"**
8. **Activa el workflow**

---

## ⏱️ Tiempo Total: ~5 minutos

Después de crear cada workflow:
- Click en **"Save"**
- Toggle el **workflow** a activo (si aplica)
- El workflow aparecerá en tu dashboard

---

## ✅ Checklist Final

- [ ] Workflow 1: Telegram Bot Handler (Activo)
- [ ] Workflow 2: WhatsApp Conversational (Activo)
- [ ] Workflow 3: Claude AI Integration (Creado, Inactivo)
- [ ] Workflow 4: Email Notifications (Activo)
- [ ] Workflow 5: Audio Transcription (Activo)

**Comparte una screenshot del dashboard de n8n mostrando los 5 workflows.**

---

## 📝 Notas Importantes

- Reemplaza `YOUR_CLAUDE_API_KEY` con tu clave real
- Reemplaza `YOUR_OPENAI_API_KEY` con tu clave real
- Los webhooks se generan automáticamente
- Puedes editar los workflows después

---

Una vez que termines, comparte la screenshot y continuaremos con la integración final con kael-web.
