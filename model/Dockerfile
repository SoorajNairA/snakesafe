# ── Stage 1: builder ──────────────────────────────────────────────────────────
# Install dependencies in a separate layer so Docker can cache them.
FROM python:3.11-slim AS builder

WORKDIR /install

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/deps -r requirements.txt

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /deps /usr/local

# Copy application code and model weights
COPY server.py .
COPY snake_venom_classifier.h5 .

# Cloud Run injects PORT; default to 8080
ENV PORT=8080

EXPOSE 8080

# Use shell form so $PORT is expanded at runtime
CMD uvicorn server:app --host 0.0.0.0 --port $PORT
