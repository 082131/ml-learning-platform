# The digits API as a container image. Build after make_model.py has written model.onnx:
#   docker build -t digits-api:1 .
#   docker run --rm -p 8000:8000 digits-api:1
FROM python:3.13-slim

WORKDIR /app
# Dependencies first: this layer is cached until requirements.txt changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code and model last: they change most often.
COPY app.py model.onnx ./
ENV MODEL_VERSION=digits-1 \
    TIMEOUT_S=0.5

# Do not run as root.
USER nobody
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=2s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/readyz')"
# One process per container: scale by running more containers (replicas).
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
