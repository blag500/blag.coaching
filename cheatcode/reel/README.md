# Клип „Скъсай веригата“

15 с, 1080×1920, без звук. Направен с умението motion-reel. Решението и
сценарият са в `docs/DECISIONS.md` и в бележката от 2026-10-04.

Готовият mp4 не е тук, а в Google Drive: CHEAT CODE → 03 видео.

## Пускане

Папката се сглобява за работа; снимките и шрифтовете не се пазят тук.

```bash
cd cheatcode/reel
cp ../../public/cheatcode/gris*.jpg .
# шрифтовете: Unbounded 800, Onest 500/600, JetBrains Mono 500 — локално
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
curl -s -A "$UA" 'https://fonts.googleapis.com/css2?family=Unbounded:wght@800&family=Onest:wght@500;600&family=JetBrains+Mono:wght@500&display=swap' > fonts.css
mkdir -p fonts; i=0; for u in $(grep -o "https://fonts.gstatic.com[^)]*" fonts.css); do i=$((i+1)); curl -s -o fonts/f$i.woff2 "$u"; sed -i "s|$u|fonts/f$i.woff2|" fonts.css; done
python3 -m http.server 8899 --bind 127.0.0.1 &
REEL_DIR=$PWD PW_HOST=../.. node render.mjs --sheet 2 5 9 14   # кадри в sheet/
REEL_DIR=$PWD PW_HOST=../.. OUT=cheatcode-bg.mp4 node render.mjs
```

`PW_EXEC=/път/до/chromium`, ако инсталираният Playwright иска друг браузър.

## Английска версия

Надписите са на четири места в `scene.js`: „Пак същото.“, „Всяка вечер.“,
„Твоето. На грам.“, „Сглоби своето.“ — плюс името на ястието, имената
на плъзгачите и безличното меню (`MENU`).
