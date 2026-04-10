from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # LLM Provider
    llm_provider: str = Field("huggingface", env="LLM_PROVIDER")  # "google" | "huggingface" | "openrouter"
    
    # Google Gemini
    google_api_key: str = Field("", env="GOOGLE_API_KEY")
    gemini_model: str = Field("gemini-1.5-flash", env="GEMINI_MODEL")
    
    # HuggingFace (gated models need HF_TOKEN + access on huggingface.co)
    hf_model: str = Field("microsoft/DialoGPT-small", env="HF_MODEL")
    hf_temperature: float = Field(0.7, env="HF_TEMPERATURE")
    hf_token: str = Field("", env="HF_TOKEN")

    # OpenRouter (OpenAI-compatible endpoint)
    openrouter_api_key: str = Field("", env="OPENROUTER_API_KEY")
    openrouter_model: str = Field("openai/gpt-4o-mini", env="OPENROUTER_MODEL")
    openrouter_base_url: str = Field("https://openrouter.ai/api/v1", env="OPENROUTER_BASE_URL")
    
    embedding_model: str = Field("models/embedding-001", env="EMBEDDING_MODEL")

    # Vector store
    vector_store_type: str = Field("chroma", env="VECTOR_STORE_TYPE")
    faiss_index_path: str = Field("vectorstore/faiss_index", env="FAISS_INDEX_PATH")
    chroma_persist_dir: str = Field("vectorstore/chroma_db", env="CHROMA_PERSIST_DIR")

    # Paths
    pdf_path: str = Field("data/handbook.pdf", env="PDF_PATH")

    # Chunking
    chunk_size: int = Field(800, env="CHUNK_SIZE")
    chunk_overlap: int = Field(150, env="CHUNK_OVERLAP")

    # Retrieval
    retriever_k: int = Field(6, env="RETRIEVER_K")

    # API
    api_host: str = Field("0.0.0.0", env="API_HOST")
    api_port: int = Field(8000, env="API_PORT")
    debug: bool = Field(True, env="DEBUG")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()