"""Configuration for Carbon Champions."""
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    APP_NAME: str = "Carbon Champions"
    APP_URL: str = "http://localhost:8007"
    DATABASE_URL: str = "postgresql://appuser:password@db:5432/carbon"
    JWT_SECRET: str = "change-me-to-a-random-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    OPENAI_API_KEY: str = ""
    REDIS_URL: str = "redis://redis:6379/0"
    
    # Dual-mode Stripe
    STRIPE_MODE: str = "test"
    STRIPE_TEST_SECRET_KEY: str = ""
    STRIPE_LIVE_SECRET_KEY: str = ""
    STRIPE_TEST_PUBLISHABLE_KEY: str = ""
    STRIPE_LIVE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    
    @property
    def STRIPE_SECRET_KEY(self) -> str:
        return self.STRIPE_LIVE_SECRET_KEY if self.STRIPE_MODE == "live" else self.STRIPE_TEST_SECRET_KEY
    
    @property
    def STRIPE_PUBLISHABLE_KEY(self) -> str:
        return self.STRIPE_LIVE_PUBLISHABLE_KEY if self.STRIPE_MODE == "live" else self.STRIPE_TEST_PUBLISHABLE_KEY
    
    class Config:
        env_file = ".env"
        extra = "allow"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
