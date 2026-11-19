FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir torch==2.3.1 torchaudio==2.3.1 --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir "numpy<2" demucs==4.0.1 fastapi==0.115.0 uvicorn==0.30.6
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PYTHONUNBUFFERED=1
WORKDIR /home/user/app
RUN python -c "from demucs.pretrained import get_model; get_model('htdemucs_6s')"
COPY --chown=user app.py .
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
