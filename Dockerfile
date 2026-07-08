# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend & Package Application
FROM python:3.10-slim
WORKDIR /app

# Install system dependencies (needed for PDF rendering/FAISS compilation fallbacks if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python requirements
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY backend/ ./

# Copy built frontend assets into FastAPI static files directory
COPY --from=frontend-builder /frontend/dist ./static

EXPOSE 8000
ENV PORT=8000

CMD ["python", "main.py"]
