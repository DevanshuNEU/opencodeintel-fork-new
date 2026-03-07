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

CMD ["python", "server.py"]
