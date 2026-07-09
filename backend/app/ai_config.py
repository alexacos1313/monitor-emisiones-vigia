#backend/app/ai_config.py
import os
from dotenv import load_dotenv
from groq import Groq
from llama_index.core import SQLDatabase
from llama_index.core.query_engine import NLSQLTableQueryEngine
from llama_index.core import Settings
from llama_index.llms.groq import Groq as LlamaGroq
import sqlite3

load_dotenv()

# Deshabilitar embeddings (no los necesitamos para SQL)
Settings.embed_model = None

# Conectar a la base de datos
def get_sql_database():
    return SQLDatabase.from_uri("sqlite:///./data/emisiones.db")

# Obtener el LLM de Groq
def get_llm():
    return LlamaGroq(
        model="llama-3.1-8b-instant",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.1
    )

# Query engine global
query_engine = None

def init_ai():
    global query_engine
    try:
        sql_database = get_sql_database()
        llm = get_llm()
        
        query_engine = NLSQLTableQueryEngine(
            sql_database=sql_database,
            llm=llm,
            verbose=True
        )
        print("IA inicializada correctamente")
        return True
    except Exception as e:
        print(f"Error inicializando IA: {e}")
        return False

def get_query_engine():
    return query_engine