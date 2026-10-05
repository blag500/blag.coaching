# Клип „До сцената“ — Blag Coaching

15 с, 1080×1920, без звук, с умението motion-reel. Истинската подготовка на
Николай от базата: `prep_protocols`, `weight_logs` (15.07–18.09, 56 мерения),
`peak_week_days` (14.09). Числата са вписани в `scene.js` както са в базата (Р5).

## Пускане

```bash
cd reels/do-scenata
cp ../../public/arms-hi.webp .
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
curl -s -A "$UA" 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap' > fonts.css
mkdir -p fonts; i=0; for u in $(grep -o "https://fonts.gstatic.com[^)]*" fonts.css); do i=$((i+1)); curl -s -o fonts/f$i.woff2 "$u"; sed -i "s|$u|fonts/f$i.woff2|" fonts.css; done
python3 -m http.server 8898 --bind 127.0.0.1 &
REEL_DIR=$PWD PW_HOST=../.. PAGE=http://127.0.0.1:8898/ OUT=do-scenata.mp4 node render.mjs
```
