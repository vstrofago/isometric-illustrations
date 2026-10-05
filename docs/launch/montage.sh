#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
# Join the rendered launch clips (a, p, d, r, e) into a 1920x1080 H.264 video and a GIF teaser.
# Figure clips lose their frame (border and rounded corners) so everything sits on one background.
set -euo pipefail
cd "${1:-out/launch}"
BG=0x151618
FIT="scale=1920:1040:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=$BG,setsar=1,fps=30,format=yuv420p"
FIG="crop=iw-48:ih-48,$FIT"
ffmpeg -y -v error -i a.mp4 -i p.mp4 -i d.mp4 -i r.mp4 -i e.mp4 -filter_complex \
  "[0]$FIT[a];[1]$FIG[p];[2]$FIG[d];[3]$FIG[r];[4]$FIT[e];[a][p]xfade=fade:duration=0.5:offset=3.1[x1];[x1][d]xfade=fade:duration=0.5:offset=9.6[x2];[x2][r]xfade=fade:duration=0.5:offset=15.1[x3];[x3][e]xfade=fade:duration=0.5:offset=19.6[v]" \
  -map "[v]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart iso-launch.mp4
ffmpeg -y -v error -i iso-launch.mp4 -vf "fps=15,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=64[p];[s1][p]paletteuse=dither=bayer" iso-launch.gif
echo "$(pwd)/iso-launch.mp4"
