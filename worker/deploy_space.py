"""Publish the analysis worker to a Hugging Face Space (Docker).

Assembles the Space's files (Dockerfile at the root, analysis/, worker/, the sample clips, a README with the Space
settings) and uploads them. Also stores WORKER_KEY as a Space secret so only the PitchIQ API can use the worker.

Needs:  pip install huggingface_hub
        HF_TOKEN   = a Hugging Face access token with write access
        HF_SPACE   = "<your-hf-username>/pitchiq-worker"
        WORKER_KEY = the same random key you give the API
Run:    python -m worker.deploy_space
"""

import os
import shutil
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

README = """---
title: PitchIQ analysis worker
emoji: ⚽
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: Counts football juggling touches from a video (PitchIQ API backend)
---

The computer-vision worker behind [PitchIQ](https://github.com/tajveed-aslam/PitchIQ). It only answers the PitchIQ API
(requests need a shared key). Source: `analysis/` and `worker/` in the GitHub repo.
"""


def assemble(dest: Path):
    ignore = shutil.ignore_patterns("__pycache__", "*.pyc", "spike", "tests", "deploy_space.py")
    shutil.copytree(ROOT / "analysis", dest / "analysis", ignore=ignore)
    shutil.copytree(ROOT / "worker", dest / "worker", ignore=ignore)
    samples = dest / "frontend/public/samples"
    samples.mkdir(parents=True)
    for clip in (ROOT / "frontend/public/samples").glob("*.mp4"):
        shutil.copy2(clip, samples / clip.name)
    shutil.copy2(ROOT / "worker/Dockerfile", dest / "Dockerfile")
    (dest / "README.md").write_bytes(README.encode("utf-8"))
    # Windows checkouts can have CRLF line endings; a Dockerfile RUN line ending in "\\\r" breaks the Linux build.
    for f in dest.rglob("*"):
        if f.is_file() and (f.suffix in {".py", ".txt", ".md"} or f.name == "Dockerfile"):
            f.write_bytes(f.read_bytes().replace(b"\r\n", b"\n"))


def main():
    from huggingface_hub import HfApi

    token, space, key = os.environ["HF_TOKEN"], os.environ["HF_SPACE"], os.environ["WORKER_KEY"]
    api = HfApi(token=token)
    api.create_repo(space, repo_type="space", space_sdk="docker", exist_ok=True)
    api.add_space_secret(space, "WORKER_KEY", key)
    with tempfile.TemporaryDirectory() as tmp:
        assemble(Path(tmp))
        api.upload_folder(folder_path=tmp, repo_id=space, repo_type="space",
                          commit_message="Deploy PitchIQ worker", delete_patterns=["*"])
    user, name = space.split("/")
    print(f"Uploaded. Building at https://huggingface.co/spaces/{space}")
    print(f"Worker URL for the API: https://{user.lower()}-{name.lower().replace('_', '-')}.hf.space")


if __name__ == "__main__":
    main()
