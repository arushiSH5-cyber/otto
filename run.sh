#!/bin/bash
# Start Otto fully offline. Text :8080, vision :8081, app :8000.
cd "$(dirname "$0")"
pgrep -f "llama-server.*8080" >/dev/null || nohup llama-server -m models/LFM3-1.7B-Q4_K_M.gguf --port 8080 -c 4096 -ngl 99 --jinja > text.log 2>&1 &
pgrep -f "llama-server.*8081" >/dev/null || nohup llama-server -m models/LFM3-VL-2B-Q4_K_M.gguf --mmproj models/mmproj-LFM3-VL-2B-Q8_0.gguf --port 8081 -c 4096 -ngl 99 --jinja > vision.log 2>&1 &
BACKEND=${BACKEND:-mac} .venv/bin/uvicorn server:app --host 127.0.0.1 --port 8000
