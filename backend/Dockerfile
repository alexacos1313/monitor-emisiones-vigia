FROM python:3.11-slim

WORKDIR /app

#  Configurar mirror de PyPI (más rápido en Europa/España)
RUN pip config set global.index-url https://pypi.org/simple

#  Aumentar timeout y retries para librerías pesadas
ENV PIP_DEFAULT_TIMEOUT=300
ENV PIP_RETRIES=10
ENV PIP_NO_CACHE_DIR=1

#  Instalar dependencias
COPY requirements.txt .
RUN pip install --timeout 300 --retries 10 -r requirements.txt

#  Copiar código
COPY ./app /app
RUN mkdir -p /app/data

ENV PYTHONPATH=/app

# Copiar entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]