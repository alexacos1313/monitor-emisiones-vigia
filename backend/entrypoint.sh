#!/bin/bash
set -e

echo "🚀 Inicializando base de datos..."
python /app/scripts/init_db.py

echo "✅ Base de datos inicializada"

echo "🚀 Arrancando servidor..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload