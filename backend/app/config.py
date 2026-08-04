# backend/app/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_PATH = os.getenv("DATABASE_PATH", "/app/data/emisiones.db")
    SECRET_KEY = os.getenv("SECRET_KEY", "secret-key-change-in-production")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    
    # Email
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "alexacos13@gmail.com")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "wdbc iupn xqgm bkaw")
    MAIL_FROM = os.getenv("MAIL_FROM", "alexacos13@gmail.com")
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "True").lower() == "true"
    MAIL_USE_SSL = os.getenv("MAIL_USE_SSL", "False").lower() == "true"

settings = Settings()