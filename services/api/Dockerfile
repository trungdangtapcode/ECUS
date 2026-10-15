FROM ghcr.io/astral-sh/uv:0.11.32 AS uv
FROM python:3.12-slim-bookworm
COPY --from=uv /uv /usr/local/bin/uv
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng tesseract-ocr-vie && rm -rf /var/lib/apt/lists/*
COPY services/api/pyproject.toml services/api/uv.lock services/api/
COPY services/api/src services/api/src
RUN uv sync --project services/api --frozen --no-dev --no-editable
COPY services/api/alembic.ini services/api/
COPY services/api/alembic services/api/alembic
COPY scripts/seed_reference.py scripts/import_excel_form.py scripts/
COPY reference-data reference-data
COPY apps/web/src/locales/en.json apps/web/src/locales/vi.json apps/web/src/locales/
RUN useradd --uid 10001 --create-home app && mkdir -p /app/data/files && chown -R app:app /app/data
ENV PATH="/app/services/api/.venv/bin:$PATH" PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
USER app
EXPOSE 8000
CMD ["uvicorn", "ecus_api.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
