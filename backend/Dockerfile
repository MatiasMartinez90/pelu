FROM python:3.11-slim

WORKDIR /app

# curl para healthchecks; dbmate para migraciones (lo usa el initContainer en k8s)
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL -o /usr/local/bin/dbmate \
       https://github.com/amacneil/dbmate/releases/download/v2.19.0/dbmate-linux-amd64 \
    && chmod +x /usr/local/bin/dbmate

COPY pyproject.toml README.md ./
COPY src/ src/
COPY db/ db/

RUN pip install --no-cache-dir -e .

RUN useradd --create-home --shell /bin/bash appuser
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# API por defecto; el deployment del worker overridea con: python -m src.queue.consumer
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
