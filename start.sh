#!/usr/bin/env bash
set -euo pipefail

REPO="${OMO_START_REPO:-h053698/getting-started-with-omo}"
REF="${OMO_START_REF:-main}"
HOME_DIR="${OMO_START_HOME:-$HOME/.omo/start}"

say() { printf '\033[36m==>\033[0m %s\n' "$*"; }
die() { printf '\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }

if ! command -v bun >/dev/null 2>&1; then
  say "Bun이 없어 설치합니다 (https://bun.sh)."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"
  command -v bun >/dev/null 2>&1 || die "Bun 설치 후에도 bun 명령을 찾지 못했습니다."
fi

if [ -n "${OMO_START_SRC:-}" ]; then
  APP_DIR="$OMO_START_SRC"
  say "로컬 소스를 사용합니다: $APP_DIR"
else
  APP_DIR="$HOME_DIR/app"
  say "설정 도구를 내려받습니다 ($REPO@$REF)."
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  curl -fsSL "https://codeload.github.com/$REPO/tar.gz/$REF" | tar -xz -C "$TMP"
  SRC="$(find "$TMP" -mindepth 2 -maxdepth 2 -type d -name setup | head -n 1)"
  [ -n "$SRC" ] || die "내려받은 저장소에 setup 폴더가 없습니다."
  mkdir -p "$HOME_DIR"
  rm -rf "$APP_DIR.new"
  cp -R "$SRC" "$APP_DIR.new"
  rm -rf "$APP_DIR"
  mv "$APP_DIR.new" "$APP_DIR"
fi

say "필요한 패키지를 설치합니다."
(cd "$APP_DIR" && bun install --production --frozen-lockfile >/dev/null)

exec bun "$APP_DIR/src/cli.tsx"
