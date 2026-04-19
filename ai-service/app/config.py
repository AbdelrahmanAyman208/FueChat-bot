from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # OpenAI ChatGPT API
    openai_api_key: str = Field("", env="OPENAI_API_KEY")
    openai_model: str = Field("gpt-4o-mini", env="OPENAI_MODEL")
    openai_temperature: float = Field(0.2, env="OPENAI_TEMPERATURE")

    # Embeddings / Vector store
    embedding_model: str = Field("models/embedding-001", env="EMBEDDING_MODEL")

    # Vector store
    vector_store_type: str = Field("chroma", env="VECTOR_STORE_TYPE")
    faiss_index_path: str = Field("vectorstore/faiss_index", env="FAISS_INDEX_PATH")
    chroma_persist_dir: str = Field("vectorstore/chroma_db", env="CHROMA_PERSIST_DIR")

    # Paths
    pdf_path: str = Field("data/handbook.pdf", env="PDF_PATH")

    # Chunking
    chunk_size: int = Field(1500, env="CHUNK_SIZE")
    chunk_overlap: int = Field(300, env="CHUNK_OVERLAP")

    # Retrieval
    retriever_k: int = Field(10, env="RETRIEVER_K")

    # API
    api_host: str = Field("0.0.0.0", env="API_HOST")
    api_port: int = Field(8000, env="API_PORT")
    debug: bool = Field(True, env="DEBUG")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()