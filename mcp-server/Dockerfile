# MCP Server Dockerfile - Remote Streamable HTTP deployment
FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway sets PORT automatically
ENV MCP_TRANSPORT=streamable-http
ENV MCP_HOST=0.0.0.0

EXPOSE 8080

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

CMD ["python", "server.py"]
