# Backend Dockerfile - Production ready
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for tree-sitter
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create repos directory for cloning
RUN mkdir -p repos

# Expose the default port (informational; Railway injects its own $PORT at runtime)
EXPOSE 8000

# Health check hits whatever port the app bound to, so it tracks $PORT not a hardcoded 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import os,urllib.request; p=os.environ.get('PORT','8000'); urllib.request.urlopen('http://localhost:'+p+'/health').read()" || exit 1

# Bind Railway's dynamic $PORT (fallback 8000 for local/compose). The platform healthcheck
# queries $PORT, so hardcoding 8000 here makes the deploy fail "service unavailable".
# exec keeps uvicorn as PID 1 so it gets SIGTERM for graceful shutdown.
# proxy-headers for rate limiting behind the reverse proxy (set FORWARDED_ALLOW_IPS in prod).
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers
