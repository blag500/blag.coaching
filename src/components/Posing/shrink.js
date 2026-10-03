/**
 * Смалява снимка до дългата страна `edge` и я връща като JPEG.
 *
 * Снимка от галерията на телефона е 4–8 MB и 4000 пиксела; за сравнение на
 * екран стигат 1600 — и хранилището не се пълни с неща, които никой не вижда.
 * Ориентацията от EXIF се спазва от браузъра при рисуване на <img>.
 */
export async function shrinkToJpeg(file, edge = 1600, quality = 0.9) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })
    const w = img.naturalWidth, h = img.naturalHeight
    const scale = Math.min(1, edge / Math.max(w, h))
    const c = document.createElement('canvas')
    c.width = Math.round(w * scale)
    c.height = Math.round(h * scale)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    return await new Promise(r => c.toBlob(r, 'image/jpeg', quality))
  } finally {
    URL.revokeObjectURL(url)
  }
}
