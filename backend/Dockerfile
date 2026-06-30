FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto del código y crea la carpeta para almacenar la BD
COPY ./app .
 RUN mkdir -p /app/data

ENV PYTHONPATH=/app

# Puerto para FastAPI
EXPOSE 8000

# Comando para ejecutar la aplicación
CMD ["sh", "-c", "python -m app.scripts.init_db && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]