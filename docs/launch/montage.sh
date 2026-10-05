#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
# Join the rendered launch clips (a, p, d, r, e) into a 1920x1080 H.264 video and a GIF teaser.
set -euo pipefail
cd "${1:-out/launch}"
F="scale=1920:1040:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0b0c0d,setsar=1,fps=30,format=yuv420p"
ffmpeg -y -v error -i a.mp4 -i p.mp4 -i d.mp4 -i r.mp4 -i e.mp4 -filter_complex \
  "[0]$F[a];[1]$F[p];[2]$F[d];[3]$F[r];[4]$F[e];[a][p]xfade=fade:duration=0.5:offset=3.5[x1];[x1][d]xfade=fade:duration=0.5:offset=10[x2];[x2][r]xfade=fade:duration=0.5:offset=15.5[x3];[x3][e]xfade=fade:duration=0.5:offset=20[v]" \
  -map "[v]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart iso-launch.mp4
ffmpeg -y -v error -i iso-launch.mp4 -vf "fps=15,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=64[p];[s1][p]paletteuse=dither=bayer" iso-launch.gif
echo "$(pwd)/iso-launch.mp4"
