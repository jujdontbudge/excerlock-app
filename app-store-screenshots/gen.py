#!/usr/bin/env python3
"""GPT Image 2 helper. Usage:
  gen.py generate <out.png> <prompt.txt> [size]
  gen.py edit <out.png> <prompt.txt> <image1.png> [image2.png ...] [--size WxH]
Key: $OPENAI_API_KEY or ~/.openai_key. Default size 1024x1536, quality high."""
import base64, json, os, subprocess, sys

key = os.environ.get("OPENAI_API_KEY") or open(os.path.expanduser("~/.openai_key")).read().strip()
MODEL = "gpt-image-2"

def generate(out, prompt, size):
    import urllib.request
    body = json.dumps({"model": MODEL, "prompt": prompt, "size": size, "quality": "high", "n": 1}).encode()
    req = urllib.request.Request("https://api.openai.com/v1/images/generations", data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=600) as r:
        data = json.load(r)
    open(out, "wb").write(base64.b64decode(data["data"][0]["b64_json"]))

def edit(out, prompt, images, size):
    cmd = ["curl", "-s", "-H", f"Authorization: Bearer {key}", "-F", f"model={MODEL}",
           "-F", f"size={size}", "-F", "quality=high", "-F", f"prompt={prompt}"]
    for im in images:
        cmd += ["-F", f"image[]=@{im}"]
    cmd.append("https://api.openai.com/v1/images/edits")
    data = json.loads(subprocess.check_output(cmd))
    if "error" in data:
        sys.exit(data["error"])
    open(out, "wb").write(base64.b64decode(data["data"][0]["b64_json"]))

if __name__ == "__main__":
    mode, out, prompt_file = sys.argv[1:4]
    rest = sys.argv[4:]
    size = "1024x1536"
    if "--size" in rest:
        i = rest.index("--size"); size = rest[i + 1]; rest = rest[:i] + rest[i + 2:]
    prompt = open(prompt_file).read().strip()
    if mode == "generate":
        generate(out, prompt, rest[0] if rest else size)
    else:
        edit(out, prompt, rest, size)
    print("wrote", out)
