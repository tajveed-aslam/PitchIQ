# PitchIQ analysis worker (Hugging Face Space, Docker SDK). Built from a folder assembled by worker/deploy_space.py:
# analysis/, worker/ and the sample clips, with this file at its root.
FROM python:3.12-slim

# OpenCV (pulled in by MediaPipe) needs these system libraries.
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Spaces run as user 1000.
RUN useradd -m -u 1000 user
WORKDIR /home/user/app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

COPY worker/requirements.txt worker/requirements.txt
RUN pip install --no-cache-dir -r worker/requirements.txt

COPY analysis analysis
COPY worker worker
COPY frontend/public/samples frontend/public/samples
# The exact model files the accuracy tests used, checked by SHA-256.
RUN python -m analysis.get_models efficientdet_lite0.tflite efficientdet_lite2.tflite \
    && chown -R user /home/user/app

USER user
EXPOSE 7860
CMD ["uvicorn", "worker.app:app", "--host", "0.0.0.0", "--port", "7860"]
