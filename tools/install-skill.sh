#!/usr/bin/env bash
# Install the isometric-illustrations skill where an agent can load it.
#
#   tools/install-skill.sh                 # Claude Code, user scope  (~/.claude/skills)
#   tools/install-skill.sh --project DIR   # Claude Code, a project   (DIR/.claude/skills)
#   tools/install-skill.sh --dest DIR      # any agent that reads Agent Skills folders (SKILL.md)
#   tools/install-skill.sh --zip           # dist/isometric-illustrations.zip (upload to claude.ai › Skills)
#
# The skill folder is self-contained: SKILL.md, references/, assets/iso.js, scripts/.
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
src="$here/skills/isometric-illustrations"
[ -f "$here/dist/iso.js" ] && cp "$here/dist/iso.js" "$src/assets/iso.js"

case "${1:-}" in
  --zip)
    mkdir -p "$here/dist"
    (cd "$here/skills" && rm -f "$here/dist/isometric-illustrations.zip" && zip -qr "$here/dist/isometric-illustrations.zip" isometric-illustrations -x '*.DS_Store')
    echo "→ $here/dist/isometric-illustrations.zip"; exit 0 ;;
  --project) dest="${2:?project dir}/.claude/skills" ;;
  --dest) dest="${2:?destination dir}" ;;
  "") dest="$HOME/.claude/skills" ;;
  *) sed -n '2,9p' "$0"; exit 1 ;;
esac
mkdir -p "$dest"
rm -rf "$dest/isometric-illustrations"
cp -R "$src" "$dest/isometric-illustrations"
echo "→ installed to $dest/isometric-illustrations"
