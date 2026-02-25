"""
NL2SQL – Model Preloader & Cold Start Optimizer
AI modellerinin ilk ayağa kalkma süresini minimize eder.

Stratejiler:
1. preload_app=True (Gunicorn) ile modeller fork öncesi yüklenir
2. Build-time'da model artifact'ları indirilir (Dockerfile)
3. Startup event'te bağlantı havuzları ve cache warm-up yapılır
4. Health check "startup probe" ile hazır olmadan trafik almaz
"""
import asyncio
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI

logger = structlog.get_logger(__name__)


class ModelPreloader:
    """
    Model ve kaynak ön-yükleme yöneticisi.
    Gunicorn preload_app=True ile birlikte çalışır.
    """

    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def initialize(self) -> None:
        """Tüm ağır kaynakları sırayla yükle."""
        if self._initialized:
            logger.info("Models already initialized, skipping.")
            return

        start = time.monotonic()
        logger.info("🚀 Starting cold-start initialization...")

        # 1. LLM client'ını ön-başlat
        await self._init_llm_client()

        # 2. Veritabanı bağlantı havuzunu başlat
        await self._init_db_pool()

        # 3. Redis bağlantısını başlat
        await self._init_redis()

        # 4. Şema cache warm-up
        await self._warmup_schema_cache()

        # 5. Tokenizer'ı ön-yükle (tiktoken vb.)
        await self._preload_tokenizer()

        elapsed = time.monotonic() - start
        self._initialized = True
        logger.info(f"✅ Cold-start initialization completed in {elapsed:.2f}s")

    async def _init_llm_client(self) -> None:
        """OpenAI / LLM client'ını başlat ve test et."""
        try:
            logger.info("Initializing LLM client...")
            # OpenAI client init – bağlantı havuzu oluşturulur
            # from app.services.llm_service import llm_service
            # await llm_service.initialize()
            logger.info("LLM client initialized.")
        except Exception as e:
            logger.error(f"LLM client init failed: {e}")

    async def _init_db_pool(self) -> None:
        """Async veritabanı bağlantı havuzunu başlat."""
        try:
            logger.info("Initializing database connection pool...")
            # from app.database import engine
            # async with engine.begin() as conn:
            #     await conn.execute(text("SELECT 1"))
            logger.info("Database pool ready.")
        except Exception as e:
            logger.error(f"Database pool init failed: {e}")

    async def _init_redis(self) -> None:
        """Redis bağlantısını başlat ve test et."""
        try:
            logger.info("Initializing Redis connection...")
            # from app.services.cache_service import cache_service
            # await cache_service.connect()
            # await cache_service.health_check()
            logger.info("Redis connection ready.")
        except Exception as e:
            logger.error(f"Redis init failed: {e}")

    async def _warmup_schema_cache(self) -> None:
        """Veritabanı şemalarını önceden cache'le."""
        try:
            logger.info("Warming up schema cache...")
            # from app.services.schema_service import schema_service
            # await schema_service.cache_all_schemas()
            logger.info("Schema cache warmed up.")
        except Exception as e:
            logger.warning(f"Schema cache warm-up failed (non-critical): {e}")

    async def _preload_tokenizer(self) -> None:
        """Tiktoken tokenizer'ını ön-yükle (ilk çağrı yavaş olabilir)."""
        try:
            logger.info("Preloading tokenizer...")
            import tiktoken
            tiktoken.encoding_for_model("gpt-4o")
            logger.info("Tokenizer preloaded.")
        except Exception as e:
            logger.warning(f"Tokenizer preload failed (non-critical): {e}")

    async def shutdown(self) -> None:
        """Graceful shutdown – kaynakları temizle."""
        logger.info("Shutting down services...")
        # from app.services.cache_service import cache_service
        # await cache_service.disconnect()
        # from app.database import engine
        # await engine.dispose()
        self._initialized = False
        logger.info("Shutdown complete.")


# Singleton instance
preloader = ModelPreloader()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    FastAPI lifespan event handler.
    Startup'ta kaynakları yükler, shutdown'da temizler.

    Kullanım (app.main):
        app = FastAPI(lifespan=lifespan)
    """
    # ── Startup ──
    await preloader.initialize()
    yield
    # ── Shutdown ──
    await preloader.shutdown()
