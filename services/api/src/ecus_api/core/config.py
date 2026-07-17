from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Production must be introduced together with authentication and authorization.
    app_env: Literal["development", "test"] = "development"
    database_url: SecretStr
    storage_root: Path = Path(".data/files")
    review_max_file_bytes: int = Field(default=20_000_000, gt=0, le=25_000_000)
    review_max_pdf_pages: int = Field(default=100, ge=1, le=500)
    review_max_documents: int = Field(default=30, ge=1, le=100)
    review_max_observations: int = Field(default=5000, ge=1, le=5000)
    jobs_concurrency: int = Field(default=2, ge=1, le=8)
    jobs_max_pending: int = Field(default=4, ge=0, le=32)
    jobs_timeout_seconds: float = Field(default=180, gt=0)
    processing_timeout_seconds: float = Field(default=1800, gt=0, le=7200)
    extraction_field_batch_size: int = Field(default=40, ge=1, le=50)
    extraction_page_batch_size: int = Field(default=8, ge=1, le=30)
    extraction_field_catalog_path: Path = Path("reference-data/ai-field-catalog.v1.json")
    review_set_prompt_version: str = Field(default="v3", pattern=r"^[a-zA-Z0-9_-]+$")
    review_source_prompt_version: str = Field(default="v3", pattern=r"^[a-zA-Z0-9_-]+$")
    extraction_use_page_images: bool = False
    extraction_image_dpi: int = Field(default=120, ge=72, le=200)
    extraction_image_jpeg_quality: int = Field(default=85, ge=50, le=95)
    ai_trace_enabled: bool = False
    ai_trace_root: Path | None = None
    ocr_enabled: bool = True
    ocr_command: str = "tesseract"
    ocr_languages: str = "eng+vie"
    ocr_dpi: int = Field(default=200, ge=100, le=400)
    ocr_min_confidence: float = Field(default=0.65, ge=0, le=1)
    ocr_max_pixels: int = Field(default=20_000_000, ge=1_000_000, le=50_000_000)
    ocr_timeout_seconds: float = Field(default=60, gt=0, le=300)
    ai_base_url: str = "https://api.openai.com/v1"
    ai_api_key: SecretStr = SecretStr("")
    ai_test_transport: bool = False
    ai_extraction_model: str = ""
    ai_hs_model: str = ""
    ai_supports_vision: bool = True
    ai_output_mode: Literal["json_schema", "json_object"] = "json_schema"
    ai_timeout_seconds: float = Field(default=60, gt=0)
    ai_max_input_chars: int = Field(default=100_000, gt=0)
    ai_max_image_bytes: int = Field(default=5_000_000, gt=0)
    ai_max_images: int = Field(default=16, ge=0)
    ai_prompt_version: str = Field(default="v1", pattern=r"^[a-zA-Z0-9_-]+$")

    @field_validator("ai_trace_root", mode="before")
    @classmethod
    def empty_trace_root(cls, value: object) -> object:
        return None if value == "" else value

    @field_validator("ai_base_url")
    @classmethod
    def validate_base_url(cls, value: str) -> str:
        from urllib.parse import urlsplit

        url = urlsplit(value)
        if url.scheme not in {"http", "https"} or not url.hostname:
            raise ValueError("AI_BASE_URL must be an HTTP(S) endpoint")
        if url.username or url.password or url.query or url.fragment:
            raise ValueError("AI_BASE_URL must not contain credentials, query or fragment")
        if url.hostname.endswith("openai.com") and url.scheme != "https":
            raise ValueError("OpenAI requires HTTPS")
        return value.rstrip("/")
