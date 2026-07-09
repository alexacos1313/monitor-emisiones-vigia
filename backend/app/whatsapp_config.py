#backend/app/whatsapp_config.py
from twilio.rest import Client
import os
from dotenv import load_dotenv

load_dotenv()

def enviar_whatsapp(mensaje: str, destinatario: str = None):
    """Enviar mensaje por WhatsApp"""
    try:
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        from_number = os.getenv("TWILIO_WHATSAPP_NUMBER")
        
        if not destinatario:
            destinatario = os.getenv("TWILIO_TO_NUMBER")
        
        if not all([account_sid, auth_token, from_number, destinatario]):
            print("Credenciales de WhatsApp no configuradas")
            return False
        
        client = Client(account_sid, auth_token)
        
        message = client.messages.create(
            body=mensaje,
            from_=from_number,
            to=destinatario
        )
        
        print(f"WhatsApp enviado: {message.sid}")
        return True
        
    except Exception as e:
        print(f"Error enviando WhatsApp: {e}")
        return False