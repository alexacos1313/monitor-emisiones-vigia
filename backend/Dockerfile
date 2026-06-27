FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todo el código
COPY ./app /app

# Crear directorio para datos
RUN mkdir -p /app/data

# Copiar entrypoint y dar permisos
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Variable de entorno
ENV PYTHONPATH=/app

EXPOSE 8000

# Usar entrypoint
ENTRYPOINT ["/entrypoint.sh"]