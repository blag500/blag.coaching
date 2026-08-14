/**
 * Points → a cubic bezier path that curves through all of them.
 *
 * Each control point sits `tension` of the way to its neighbour horizontally and
 * at its own point's height, which keeps the curve from overshooting between two
 * close readings — a weight chart that dips below every value it plots is
 * telling a story the scale did not.
 *
 * Tension is how round the corners come out. 0.4 is the soft line the profile
 * chart draws across a wide card; smaller keeps the turns sharp, which is what a
 * thumbnail needs — at 124 pixels wide, rounding is indistinguishable from
 * flatness and the shape disappears into it.
 *
 * Shared rather than copied: the profile chart and the sparkline on Днес draw
 * the same line at two sizes, and a curve algorithm kept in two places drifts.
 */
export function smoothPath(pts, tension = 0.4) {
  if (pts.length < 2) return ''
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const cpx = (curr.x - prev.x) * tension
    d += ` C${prev.x + cpx},${prev.y} ${curr.x - cpx},${curr.y} ${curr.x},${curr.y}`
  }
  return d
}
