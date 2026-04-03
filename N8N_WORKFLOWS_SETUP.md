# 🔧 N8N Workflows Setup - Guía Completa

**Estado:** ✅ Listo para configurar  
**Usuario:** aroonvegaf@gmail.com  
**URL:** https://n8n.kael.quest  
**Fecha:** 2026-04-03

---

## 📋 Workflows a Crear

Este documento contiene la configuración de los 5 workflows principales de Kael.

---

## **WORKFLOW 1: Telegram Bot Handler**

### Descripción
Recibe mensajes de Telegram y responde usando Claude AI.

### Pasos en n8n:

1. **Crear nuevo workflow**
   - Click en "Start from scratch"
   - Nombre: `Telegram Bot Handler`

2. **Agregar Telegram Trigger**
   - Click en "+" 
   - Buscar "Telegram"
   - Seleccionar "Telegram Trigger"
   - Configurar:
     - **Bot Token:** `[Tu Telegram Bot Token de @BotFather]`
     - **Events:** `message`

3. **Agregar Claude Node**
   - Click en "+"
   - Buscar "Claude"
   - Seleccionar "Claude Chat Model"
   - Configurar:
     - **API Key:** `[Tu CLAUDE_API_KEY]`
     - **Model:** `claude-3-5-sonnet-20241022`
     - **Messages:** `{{ $json.message }}`

4. **Agregar Telegram Send**
   - Click en "+"
   - Buscar "Telegram"
   - Seleccionar "Telegram Send Message"
   - Configurar:
     - **Bot Token:** Mismo que el trigger
     - **Chat ID:** `{{ $json.chat.id }}`
     - **Text:** `{{ $json.text }}` (respuesta de Claude)

5. **Guardar y Activar**
   - Click en "Save"
   - Toggle para activar el workflow

---

## **WORKFLOW 2: WhatsApp Conversational**

### Descripción
Maneja mensajes de WhatsApp Business API e integra con Claude.

### Pasos en n8n:

1. **Crear nuevo workflow**
   - Nombre: `WhatsApp Conversational`

2. **Agregar Webhook Trigger**
   - Click en "+" → "Webhook"
   - Seleccionar "Webhook (localhost)"
   - Método: POST
   - Copiar URL webhook (necesaria para configuración de WhatsApp)

3. **Agregar Claude Node**
   - Buscar "Claude"
   - Configurar con mismo modelo que Workflow 1

4. **Agregar WhatsApp Send**
   - Buscar "WhatsApp"
   - Seleccionar "WhatsApp Send Message"
   - Configurar:
     - **API Key:** `[WhatsApp Business API Key]`
     - **Phone Number ID:** `[Tu WhatsApp Phone Number ID]`
     - **To:** `{{ $json.from }}`
     - **Message:** Claude response

5. **Guardar y Activar**

---

## **WORKFLOW 3: Claude AI Integration**

### Descripción
Node centralizado para todas las llamadas a Claude API.

### Pasos en n8n:

1. **Crear nuevo workflow**
   - Nombre: `Claude AI Integration`

2. **Agregar HTTP Request**
   - URL: `https://api.anthropic.com/v1/messages`
   - Método: POST
   - Headers:
     ```
     x-api-key: [CLAUDE_API_KEY]
     content-type: application/json
     anthropic-version: 2023-06-01
     ```
   - Body:
     ```json
     {
       "model": "claude-3-5-sonnet-20241022",
       "max_tokens": 1024,
       "messages": [
         {
           "role": "user",
           "content": "{{ $json.message }}"
         }
       ]
     }
     ```

3. **Agregar JSON Transform**
   - Para parsear respuesta de Claude
   - Extraer: `{{ $json.content[0].text }}`

4. **Guardar (sin activar)**
   - Este es un workflow de utilidad que otros llaman

---

## **WORKFLOW 4: Email Notifications**

### Descripción
Envía emails de notificaciones (validación, alertas, etc.).

### Pasos en n8n:

1. **Crear nuevo workflow**
   - Nombre: `Email Notifications`

2. **Agregar Webhook Trigger**
   - Para recibir requests de kael-web
   - Método: POST

3. **Agregar Gmail Node** (o SMTP genérico)
   - Click "+"
   - Buscar "Gmail" o "SMTP"
   - Configurar:
     - **Email From:** Tu email
     - **Email To:** `{{ $json.to }}`
     - **Subject:** `{{ $json.subject }}`
     - **Body:** `{{ $json.body }}`

4. **Guardar y Activar**

---

## **WORKFLOW 5: Audio Transcription (Whisper)**

### Descripción
Transcribe archivos de audio usando OpenAI Whisper.

### Pasos en n8n:

1. **Crear nuevo workflow**
   - Nombre: `Audio Transcription (Whisper)`

2. **Agregar Webhook Trigger**
   - Método: POST
   - Espera multipart/form-data con archivo de audio

3. **Agregar HTTP Request**
   - URL: `https://api.openai.com/v1/audio/transcriptions`
   - Método: POST
   - Headers:
     ```
     Authorization: Bearer [OPENAI_API_KEY]
     ```
   - Body: Form-Data
     - `file`: `{{ $binary.data }}`
     - `model`: `whisper-1`

4. **Agregar JSON Transform**
   - Extraer: `{{ $json.text }}`

5. **Guardar y Activar**

---

## 🔐 Credenciales Necesarias

Completa esta tabla con tus API keys:

| Servicio | Clave | Estado |
|----------|-------|--------|
| Telegram Bot Token | `[De @BotFather]` | ⏳ Pendiente |
| WhatsApp API Key | `[De WhatsApp Business]` | ⏳ Pendiente |
| Claude API Key | `[De Anthropic Console]` | ✅ En .env |
| OpenAI API Key | `[De OpenAI Platform]` | ✅ En .env |
| Email SMTP | `[De Gmail/SMTP]` | ✅ En .env |

---

## 🔗 Webhook URLs Importantes

Una vez creados los workflows, anotaremos los webhooks para conectarlos a kael-web:

- **Telegram Handler:** `https://n8n.kael.quest/webhook/telegram-bot`
- **WhatsApp Handler:** `https://n8n.kael.quest/webhook/whatsapp`
- **Email Sender:** `https://n8n.kael.quest/webhook/email`
- **Audio Transcriber:** `https://n8n.kael.quest/webhook/transcribe`

---

## ✅ Checklist

- [ ] Workflow 1: Telegram Bot Handler (Creado y Activo)
- [ ] Workflow 2: WhatsApp Conversational (Creado y Activo)
- [ ] Workflow 3: Claude AI Integration (Creado)
- [ ] Workflow 4: Email Notifications (Creado y Activo)
- [ ] Workflow 5: Audio Transcription (Creado y Activo)
- [ ] Todas las credenciales configuradas
- [ ] Webhooks probados
- [ ] Integración con kael-web lista

---

## 📞 Próximas Acciones

1. Crear workflows siguiendo pasos arriba
2. Configurar credenciales de cada servicio
3. Testear cada workflow
4. Documentar webhook URLs en CLAUDE.md
5. Conectar desde kael-web a los webhooks
