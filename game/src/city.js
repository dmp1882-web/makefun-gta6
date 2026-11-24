// Solmar Bay — the city itself. A road grid with blocks that hold buildings,
// parks and palms, a beach and water along the south edge, and docks on the
// east edge. Everything is generated from the seed, so the city never changes
// between runs with the same seed.
import { WORLD, ROAD, PALETTE } from './config.js';
import { makeRng, pick, range, rangeInt } from './random.js';

export function roadXs() {
  const xs = [];
  for (let x = ROAD.first; x < WORLD.width; x += ROAD.spacing) xs.push(x);
  return xs;
}

export function roadYs() {
  const ys = [];
  for (let y = ROAD.first; y < WORLD.height - 120; y += ROAD.spacing) ys.push(y);
  return ys;
}

function nearestRoad(value, roads) {
  let best = roads[0];
  for (const r of roads) if (Math.abs(r - value) < Math.abs(best - value)) best = r;
  return best;
}

export function generateCity(seed) {
  const rng = makeRng(seed);
  const xs = roadXs();
  const ys = roadYs();
  const buildings = [];
  const parks = [];
  const palms = [];
  // One block sits between each pair of neighbouring roads.
  for (let ix = 0; ix < xs.length - 1; ix += 1) {
    for (let iy = 0; iy < ys.length - 1; iy += 1) {
      const x0 = xs[ix] + ROAD.width / 2 + 12;
      const y0 = ys[iy] + ROAD.width / 2 + 12;
      const x1 = xs[ix + 1] - ROAD.width / 2 - 12;
      const y1 = ys[iy + 1] - ROAD.width / 2 - 12;
      if (x1 - x0 < 60 || y1 - y0 < 60) continue;
      const roll = rng();
      if (roll < 0.16) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        const trees = rangeInt(rng, 3, 6);
        for (let t = 0; t < trees; t += 1) {
          palms.push({ x: range(rng, x0 + 14, x1 - 14), y: range(rng, y0 + 14, y1 - 14), park: true });
        }
        continue;
      }
      const count = rangeInt(rng, 1, 3);
      for (let b = 0; b < count; b += 1) {
        const bw = range(rng, 55, Math.min(120, (x1 - x0) / count - 8));
        const bh = range(rng, 55, Math.min(120, y1 - y0 - 8));
        const bx = x0 + (b * (x1 - x0)) / count + 4;
        const by = y0 + 4 + rng() * Math.max(0, y1 - y0 - bh - 8);
        buildings.push({
          x: bx, y: by, w: bw, h: bh,
          color: pick(rng, PALETTE.buildingRoof),
          height: rangeInt(rng, 1, 4),
        });
      }
    }
  }
  // Palms along the beach.
  for (let x = 80; x < WORLD.width - 40; x += 90) {
    palms.push({ x: x + range(rng, -20, 20), y: WORLD.height - 96 + range(rng, -8, 8), park: false });
  }
  return {
    width: WORLD.width,
    height: WORLD.height,
    roadsX: xs,
    roadsY: ys,
    buildings,
    parks,
    palms,
    beach: { y: WORLD.height - 130 },
    water: { y: WORLD.height - 52 },
    docks: { x: WORLD.width - 90, y: 910 },
    spawn: { x: xs[1], y: ys[3] },
  };
}

// Is the point on a road (with a little slack)?
export function onRoad(city, x, y) {
  const half = ROAD.width / 2 + 6;
  for (const rx of city.roadsX) if (Math.abs(x - rx) < half) return true;
  for (const ry of city.roadsY) if (Math.abs(y - ry) < half) return true;
  return false;
}

// Snap a point to the nearest road centre line.
export function snapToRoad(city, x, y) {
  const rx = nearestRoad(x, city.roadsX);
  const ry = nearestRoad(y, city.roadsY);
  return Math.abs(x - rx) < Math.abs(y - ry) ? { x: rx, y } : { x, y: ry };
}

// A Manhattan route along the road grid, as waypoints. Used by traffic cars
// and by the screenshot autopilot, so both drive on roads like real drivers.
export function roadPath(city, fromX, fromY, toX, toY) {
  const xs = city.roadsX;
  const ys = city.roadsY;
  const startX = nearestRoad(fromX, xs);
  const startY = nearestRoad(fromY, ys);
  const endX = nearestRoad(toX, xs);
  const endY = nearestRoad(toY, ys);
  const points = [];
  let cx = startX;
  let cy = startY;
  points.push({ x: cx, y: cy });
  // Drive along the start road to the column/row of the target, then across.
  if (Math.abs(endX - cx) > Math.abs(endY - cy)) {
    cx = endX;
    points.push({ x: cx, y: cy });
    cy = endY;
    points.push({ x: cx, y: cy });
  } else {
    cy = endY;
    points.push({ x: cx, y: cy });
    cx = endX;
    points.push({ x: cx, y: cy });
  }
  points.push({ x: toX, y: toY });
  return points;
}

// The building, if any, whose rectangle contains the point (with margin).
export function buildingAt(city, x, y, margin = 0) {
  for (const b of city.buildings) {
    if (x > b.x - margin && x < b.x + b.w + margin && y > b.y - margin && y < b.y + b.h + margin) return b;
  }
  return null;
}

// Push a circle out of every building it overlaps. Returns true on a hit.
export function collideBuildings(city, body, radius) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(body.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(body.y, b.y + b.h));
    const dx = body.x - cx;
    const dy = body.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      body.x = cx + (dx / d) * radius;
      body.y = cy + (dy / d) * radius;
      hit = true;
    } else if (d2 <= 0.0001) {
      body.x = b.x - radius;
      hit = true;
    }
  }
  return hit;
}

export function clampToWorld(body, margin = 20) {
  body.x = Math.max(margin, Math.min(WORLD.width - margin, body.x));
  body.y = Math.max(margin, Math.min(WORLD.height - margin, body.y));
}
