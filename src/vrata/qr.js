// Личният QR за вратата (миграция 152). Същата сметка като qrMac() в
// supabase/functions/zs-access/index.ts:
//   ZS1.<qr_id>.<w>.<mac>, w = 30-секундният прозорец,
//   mac = HMAC-SHA256(sha256(ключа), "<qr_id>.<w>"), първите 12 байта, base64url.
// Ключът не излиза от телефона; базата пази само sha256 от него.
import qrcode from 'qrcode-generator'

export const WINDOW_MS = 30_000
export const windowNow = () => Math.floor(Date.now() / WINDOW_MS)

const enc = new TextEncoder()
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
const b64url = (b) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export async function payload(token, qrId, w = windowNow()) {
  const th = hex(await crypto.subtle.digest('SHA-256', enc.encode(token)))
  const k = await crypto.subtle.importKey('raw', enc.encode(th), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(`${qrId}.${w}`)))
  return `ZS1.${qrId}.${w}.${b64url(sig.slice(0, 12))}`
}

/** Пътят на тъмните модули като един <path> — рисува се в SVG с поле от 4 модула. */
export function qrPath(text) {
  const q = qrcode(0, 'M')
  q.addData(text)
  q.make()
  const n = q.getModuleCount()
  let d = ''
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`
  return { d, size: n + 8 }
}
