#!/bin/bash
set -e

# Colores para mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN} Iniciando contenedor del monitor de emisiones...${NC}"

# Crear directorio de datos si no existe
mkdir -p /app/data

# Verificar si la base de datos existe
if [ ! -f "/app/data/emisiones.db" ]; then
    echo -e "${YELLOW} Base de datos no encontrada. Creando base de datos inicial...${NC}"
    python /app/scripts/init_db.py
    echo -e "${GREEN} Base de datos creada correctamente${NC}"
else
    echo -e "${GREEN} Base de datos ya existe, omitiendo creación.${NC}"
fi

# Iniciar la aplicación
echo -e "${GREEN} Iniciando servidor FastAPI...${NC}"
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload