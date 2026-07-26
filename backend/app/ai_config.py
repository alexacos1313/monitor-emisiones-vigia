# backend/app/ai_config.py
import os
from dotenv import load_dotenv
from llama_index.core import SQLDatabase
from llama_index.core.query_engine import NLSQLTableQueryEngine
from llama_index.core import Settings
from llama_index.llms.groq import Groq as LlamaGroq
import logging

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Settings.embed_model = None

_query_engine = None
_initialized = False

def get_sql_database():
    try:
        db_path = os.getenv("DATABASE_PATH", "./data/emisiones.db")
        logger.info(f"Conectando a base de datos: {db_path}")
        
        if not os.path.exists(db_path):
            # Intentar ruta alternativa
            alt_path = os.path.join(os.path.dirname(__file__), "..", "data", "emisiones.db")
            if os.path.exists(alt_path):
                db_path = alt_path
                logger.info(f"Usando ruta alternativa: {db_path}")
            else:
                logger.warning(f"Base de datos no encontrada en {db_path}")
                # Crear directorio si no existe
                os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
        return SQLDatabase.from_uri(f"sqlite:///{db_path}")
    except Exception as e:
        logger.error(f"Error conectando a base de datos: {e}")
        return None

def get_llm():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx":
        logger.warning("GROQ_API_KEY no configurada")
        return None
    
    try:
        return LlamaGroq(
            model="llama-3.1-8b-instant",
            api_key=api_key,
            temperature=0.1,
            max_tokens=1024
        )
    except Exception as e:
        logger.error(f"Error inicializando LLM: {e}")
        return None

def init_ai():
    global _query_engine, _initialized
    
    if _initialized:
        return True
    
    try:
        logger.info("Inicializando IA...")
        
        sql_database = get_sql_database()
        if not sql_database:
            logger.error("No se pudo conectar a la base de datos")
            return False
        
        llm = get_llm()
        if not llm:
            logger.error("No se pudo inicializar LLM")
            return False
        
        _query_engine = NLSQLTableQueryEngine(
            sql_database=sql_database,
            llm=llm,
            verbose=True,
            tables=None
        )
        
        _initialized = True
        logger.info("IA inicializada correctamente")
        return True
    except Exception as e:
        logger.error(f"Error inicializando IA: {e}")
        _initialized = False
        return False

def get_query_engine():
    return _query_engine

def is_ai_available():
    return _initialized and _query_engine is not None