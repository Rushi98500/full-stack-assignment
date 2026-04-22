from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database configuration
    database_client: str = "postgres"
    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str = "docprocessor"
    database_username: str = "postgres"
    database_password: str = "admin"
    
    # Redis configuration
    redis_url: str = "redis://redis:6379/0"
    
    # Application configuration
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 10
    secret_key: str = "changeme"
    
    # Environment
    node_env: str = "development"
    
    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.database_username}:{self.database_password}@{self.database_host}:{self.database_port}/{self.database_name}"
    
    @property
    def database_url_sync(self) -> str:
        return f"postgresql://{self.database_username}:{self.database_password}@{self.database_host}:{self.database_port}/{self.database_name}"
    
    class Config:
        env_file = ".env"


settings = Settings()
