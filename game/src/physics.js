// Small shared geometry helpers: angles, distances and circle collisions.
// Nothing here knows about the game; the systems use it to stay consistent.
export function dist2(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

export function dist(ax, ay, bx, by) {
  return Math.sqrt(dist2(ax, ay, bx, by));
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? v : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Do two circles overlap?
export function circlesHit(a, ar, b, br) {
  return dist2(a.x, a.y, b.x, b.y) < (ar + br) * (ar + br);
}
