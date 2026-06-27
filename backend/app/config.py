# backend/app/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_PATH = os.getenv("DATABASE_PATH", "/app/data/emisiones.db")
    SECRET_KEY = os.getenv("SECRET_KEY", "secret-key-change-in-production")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_FROM = os.getenv("MAIL_FROM")

settings = Settings()