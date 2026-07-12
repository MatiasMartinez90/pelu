FROM python:3.11-slim@sha256:e031123e3d85762b141ad1cbc56452ba69c6e722ebf2f042cc0dc86c47c0d8b3

WORKDIR /app

# curl para healthchecks; dbmate para migraciones (lo usa el initContainer en k8s)
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL -o /usr/local/bin/dbmate \
       https://github.com/amacneil/dbmate/releases/download/v2.34.1/dbmate-linux-amd64 \
    && echo "b002d5249d53d0c6c482ed761b5a806c6fb9a364fcc5f9db3e8763c1d9e40e1d  /usr/local/bin/dbmate" | sha256sum -c - \
    && chmod +x /usr/local/bin/dbmate

COPY pyproject.toml README.md requirements.lock ./
COPY src/ src/
COPY db/ db/

RUN python -m pip install --no-cache-dir --upgrade pip==26.1.2 \
    && pip install --no-cache-dir --require-hashes -r requirements.lock \
    && python -m pip uninstall -y pip setuptools wheel

RUN useradd --create-home --shell /bin/bash appuser
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# API por defecto; el deployment del worker overridea con: python -m src.queue.consumer
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
