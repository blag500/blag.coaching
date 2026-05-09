#!/usr/bin/env node
const fs = require('fs');
const zlib = require('zlib');

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const byte of buf) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createPNG(width, height, drawFn) {
  const chunks = [];
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  function makeChunk(type, data) {
    const t = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  chunks.push(makeChunk('IHDR', ihdr));

  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = drawFn(x, y, width, height);
      row[1 + x * 3] = r;
      row[2 + x * 3] = g;
      row[3 + x * 3] = b;
    }
    rows.push(row);
  }
  const compressed = zlib.deflateSync(Buffer.concat(rows));
  chunks.push(makeChunk('IDAT', compressed));
  chunks.push(makeChunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

// Draw BC icon: dark bg + accent square in center
function drawIcon(x, y, w, h) {
  const bg = [10, 10, 15];       // #0A0A0F
  const accent = [200, 241, 53]; // #C8F135
  const border = [42, 42, 58];   // #2A2A3A

  const pad = Math.round(w * 0.15);
  const r = Math.round(w * 0.18); // corner radius approx

  // Rounded rect accent block in center
  const bx1 = pad, by1 = pad, bx2 = w - pad, by2 = h - pad;
  const inBlock = x >= bx1 && x < bx2 && y >= by1 && y < by2;

  // Inner dark area for letter-like negative space
  const ip = Math.round(w * 0.28);
  const inInner = x >= ip && x < w - ip && y >= ip && y < h - ip;

  if (inBlock && !inInner) return accent;
  return bg;
}

fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/icon-192.png', createPNG(192, 192, drawIcon));
fs.writeFileSync('public/icon-512.png', createPNG(512, 512, drawIcon));
fs.writeFileSync('public/apple-touch-icon.png', createPNG(180, 180, drawIcon));
console.log('Icons generated in public/');
