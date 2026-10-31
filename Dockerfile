# PitchIQ API with the video analysis running inside it (Render free plan: 512 MB, 0.1 CPU).
# Build context: the repo root. One analysis at a time; videos up to MAX_VIDEO_SECONDS.
# (worker/Dockerfile builds the analysis as a separate service instead, for hosts with more CPU: set WORKER_URL.)
FROM python:3.12-slim

# OpenCV needs libGL; MediaPipe's task runtime loads libEGL and libGLES even on CPU (found by CI).
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libegl1 libgles2 \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
# One thread per math library: at 0.1 CPU more threads only add memory (see analysis/video.py).
ENV OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
# glibc gives each thread its own memory pool by default; two pools keep the 512 MB server from bloating.
ENV MALLOC_ARENA_MAX=2
WORKDIR /app

COPY backend/requirements.txt backend/requirements.txt
COPY worker/requirements.txt worker/requirements.txt
RUN pip install --no-cache-dir --no-deps mediapipe==1.2.0 \
    && pip install --no-cache-dir -r backend/requirements.txt -r worker/requirements.txt

COPY analysis analysis
# The exact model files the accuracy tests used, checked by SHA-256.
RUN python -m analysis.get_models efficientdet_lite0_int8.tflite efficientdet_lite2_int8.tflite
COPY worker worker
COPY frontend/public/samples frontend/public/samples
COPY frontend/data/samples.json frontend/data/samples.json
COPY backend/app backend/app

WORKDIR /app/backend
EXPOSE 8000
# The seed is re-runnable: it (re)creates the demo player and challenge players on every deploy.
CMD ["sh", "-c", "python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
