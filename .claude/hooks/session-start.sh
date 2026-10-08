#!/bin/bash
# Подготвя облачна сесия на Claude Code така, че тестовете да вървят без
# заобикаляне на ръка. Локално не прави нищо.
#
#   1. Зависимостите (npm install — кешира се заедно с контейнера).
#   2. .env.local с адреса на проекта и фалшив ключ: без VITE_SUPABASE_URL
#      приложението не тръгва и целият смоук пада, а тестовете така или иначе
#      подменят всяка заявка към *.supabase.co (tests/harness.js). Истински
#      .env или .env.local не се пипа.
#   3. PW_CHROMIUM_PATH: Chromium в /opt/pw-browsers е по-стара ревизия от
#      тази, която Playwright иска, а тегленето е спряно (playwright.config.js).
#   4. Deno за `deno check` и checks.ts на крайните функции — тегли се веднъж.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

npm install --no-audit --no-fund

if [ ! -f .env ] && [ ! -f .env.local ]; then
  cat > .env.local <<'ENV'
# Направено от .claude/hooks/session-start.sh — само за тестовете в облачна сесия.
# Ключът е фалшив: срещу истинската база приложението няма да влезе.
VITE_SUPABASE_URL=https://eiltoadzaqbuqdilsfpi.supabase.co
VITE_SUPABASE_ANON_KEY=cloud-session-placeholder
ENV
fi

if [ -x /opt/pw-browsers/chromium ] && [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export PW_CHROMIUM_PATH=/opt/pw-browsers/chromium' >> "$CLAUDE_ENV_FILE"
fi

npx -y deno --version > /dev/null 2>&1 || echo "deno не се изтегли — deno check няма да върви" >&2
