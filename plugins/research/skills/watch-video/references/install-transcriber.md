# Installing a local transcriber (whisper.cpp)

Read this only when `whisper-cli` is missing or the model file is absent, and only after the user said
yes: the model is a 1.6 GB download, and asking to look at a clip is not consent to that.

## The binary

| Host | Install |
| --- | --- |
| macOS with Homebrew | `brew install whisper-cpp` (gives `whisper-cli`) |
| Linux / WSL | build it: `git clone https://github.com/ggml-org/whisper.cpp && cd whisper.cpp && cmake -B build && cmake --build build -j --config Release` — the binary is `build/bin/whisper-cli` |
| Windows (native) | the release page of the same repository ships prebuilt binaries; or use WSL |

A sandboxed host that cannot install anything has no route: say the clip cannot be transcribed here and
do the visual pass alone — never report as if you had heard it.

## The model

```sh
MODEL=~/.cache/whisper.cpp/ggml-large-v3-turbo.bin
mkdir -p "$(dirname "$MODEL")"
curl -fsSL --retry 3 -o "$MODEL.part" \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin && mv "$MODEL.part" "$MODEL"
```

The URL resolved (HTTP 302 to the CDN) as of 2026-11; if it 404s, the repository's README lists the
current model location. `large-v3-turbo` is the default because it is fast on a laptop and handles
smaller languages; a smaller model (`ggml-base.bin`) is the fallback on a machine without the space.

The `.part` + `mv` keeps an interrupted download from leaving a truncated file that a later
`[ -s "$MODEL" ]` check would accept.
