#backend\app\email_config.py
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()

def enviar_correo(destinatario: str, asunto: str, cuerpo_html: str) -> bool:
    try:
        smtp_server = "smtp.gmail.com"
        smtp_port = 587
        username = os.getenv("MAIL_USERNAME")
        password = os.getenv("MAIL_PASSWORD")
        
        logger.info(f"MAIL_USERNAME: {username}")
        logger.info(f"MAIL_PASSWORD: {'OK' if password else 'NO'}")
        
        if not username or not password:
            logger.error("Credenciales faltantes")
            return False
        
        msg = MIMEMultipart()
        msg['From'] = username
        msg['To'] = destinatario
        msg['Subject'] = asunto
        msg.attach(MIMEText(cuerpo_html, 'html'))
        
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.set_debuglevel(1)
        server.starttls()
        server.login(username, password)
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Correo enviado a {destinatario}")
        return True
        
    except Exception as e:
        logger.error(f"Error: {e}")
        return False