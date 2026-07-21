#!/bin/bash
set -e

echo " Iniciando backend VIGIA..."

# Cambiar al directorio de trabajo
cd /app

# Solo crear la base de datos si NO existe
if [ ! -f /app/data/emisiones.db ]; then
    echo " Primera vez: creando base de datos..."
    python /app/scripts/init_db.py
    echo " Base de datos creada"
else
    echo " Base de datos ya existe, no se borran los datos"
fi

echo " Arrancando servidor..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload