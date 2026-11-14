#!/bin/bash
# One-time setup on the Qualcomm Dragonwing IQ-9075 (Ubuntu 24.04), following the hackathon guide:
# NPU packages -> fastrpc access -> GenieX v0.10.0 -> LFM3-1.7B Q4_0 from Hugging Face.
# Run ON THE BOARD while it has internet. It asks for the board password for sudo.
set -e
export PATH="$HOME/.local/bin:$PATH"

echo "== 1/4 NPU packages (no Adreno/graphics changes)"
sudo apt-get update
sudo apt-get install --no-install-recommends libatomic1 qcom-fastrpc1 libqnn1

echo "== 2/4 NPU device access"
getent group fastrpc >/dev/null && sudo usermod -aG fastrpc "$USER"
ls -l /dev/fastrpc-cdsp* || true

echo "== 3/4 GenieX v0.10.0"
if ! command -v geniex >/dev/null; then
  curl -fSLo ~/geniex-install.sh https://qaihub-public-assets.s3.us-west-2.amazonaws.com/qai-hub-geniex/install.sh
  sh ~/geniex-install.sh --version v0.10.0
fi
geniex version

echo "== 4/4 LFM3-1.7B Q4_0 (about 1 GB, from Hugging Face)"
geniex --skip-update list | grep -q "LFM3-1.7B" || geniex --skip-update pull LiquidAI/LFM3-1.7B-GGUF:Q4_0
geniex --skip-update list

echo
echo "Done. Log out and back in (fastrpc group), then start the NPU server with:"
echo "  bash ~/otto-iq9/serve.sh start && bash ~/otto-iq9/serve.sh status"
