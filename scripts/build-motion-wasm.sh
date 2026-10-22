#!/bin/sh
# Builds Orion's trajectory compiler for the browser and refreshes the Orion data the Learn lessons use.
#
#   scripts/build-motion-wasm.sh [path to the Orion repository]   (default ~/dev/cardinal/orionProject/orion)
#
# 1. copies Orion's motion sources (unchanged) into motion-wasm/orion-src/
# 2. builds orion-trajectory for wasm32-wasip1 -> public/learn/orion-trajectory.wasm
# 3. copies the files that program reads (poses, motions, joint limits) -> src/data/orion/files/
# 4. writes src/data/orion/catalog.json with Orion's own loaders, for the lesson pages
# Needs Rust with the WASI target: `rustup target add wasm32-wasip1`.
set -eu
ORION=${1:-$HOME/dev/cardinal/orionProject/orion}
SITE=$(cd "$(dirname "$0")/.." && pwd)
SRC=$SITE/motion-wasm/orion-src
DATA=$SITE/src/data/orion

rm -rf "$SRC" && mkdir -p "$SRC/motion" "$SRC/bin"
for f in calibration library pose shared style trajectory; do cp "$ORION/runtime/src/motion/$f.rs" "$SRC/motion/"; done
cp "$ORION/runtime/src/error.rs" "$SRC/"
cp "$ORION/runtime/src/bin/orion-trajectory.rs" "$SRC/bin/"
# The light effect names a pose may refer to, cut from the one constant that lists them.
sed -n '/^pub const LIGHTING_EFFECT_NAMES/,/^];/p' "$ORION/runtime/src/devices/lighting.rs" > "$SRC/lighting_names.rs"
printf '%s' "$(git -C "$ORION" rev-parse --short HEAD)" > "$SRC/REVISION"

cd "$SITE/motion-wasm"
cargo build --release --target wasm32-wasip1 --bin orion-trajectory
mkdir -p "$SITE/public/learn"
cp target/wasm32-wasip1/release/orion-trajectory.wasm "$SITE/public/learn/"

rm -rf "$DATA/files" && mkdir -p "$DATA/files/motion/config/v2" "$DATA/files/motion/motions" "$DATA/files/hardware/profiles"
cp "$ORION/motion/config/v2/poses.yaml" "$DATA/files/motion/config/v2/"
cp -R "$ORION/motion/motions/v2" "$DATA/files/motion/motions/"
cp "$ORION/hardware/profiles/v2-joints.json" "$DATA/files/hardware/profiles/"
cargo run --quiet --release --bin orion-catalog -- "$ORION" > "$DATA/catalog.json"

ls -l "$SITE/public/learn/orion-trajectory.wasm" "$DATA/catalog.json"
