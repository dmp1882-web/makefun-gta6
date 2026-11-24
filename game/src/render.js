// Everything the player sees: the city, the cars, the people, the HUD with
// its minimap, and the title, pause and end screens. All drawing is plain
// canvas shapes — no images, no fonts from the network.
import { WORLD, ROAD, CAR, PLAYER } from './config.js';
import { clamp } from './physics.js';

export function titleButtons(state, viewW, viewH) {
  const bw = 280;
  const bh = 52;
  const x = viewW / 2 - bw / 2;
  const buttons = [{ id: 'start', x, y: viewH / 2 + 96, w: bw, h: bh, label: 'START' }];
  if (state.save) buttons.push({ id: 'continue', x, y: viewH / 2 + 160, w: bw, h: bh, label: 'CONTINUE' });
  return buttons;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Word-wrap a line of HUD text to at most three lines of maxWidth pixels.
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function drawBuilding(ctx, b, time) {
  const lift = b.height * 3;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(b.x + 5 + lift, b.y + 7 + lift, b.w, b.h);
  ctx.fillStyle = b.color;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, 8);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  const cols = Math.max(1, Math.floor(b.w / 18));
  const rows = Math.max(1, Math.floor(b.h / 18));
  for (let cx = 0; cx < cols; cx += 1) {
    for (let cy = 0; cy < rows; cy += 1) {
      ctx.fillRect(b.x + 7 + cx * 18, b.y + 16 + cy * 18, 8, 10);
    }
  }
}

function drawCar(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundRect(ctx, -CAR.length / 2 + 3, -CAR.width / 2 + 3, CAR.length, CAR.width, 6);
  ctx.fill();
  ctx.fillStyle = '#16181d';
  ctx.fillRect(-CAR.length / 2 + 2, -CAR.width / 2 - 2, 10, 5);
  ctx.fillRect(-CAR.length / 2 + 2, CAR.width / 2 - 3, 10, 5);
  ctx.fillRect(CAR.length / 2 - 12, -CAR.width / 2 - 2, 10, 5);
  ctx.fillRect(CAR.length / 2 - 12, CAR.width / 2 - 3, 10, 5);
  if (car.kind === 'police') {
    ctx.fillStyle = '#f4f6f8';
    roundRect(ctx, -CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width, 6);
    ctx.fill();
    ctx.fillStyle = '#1c2430';
    ctx.fillRect(-6, -CAR.width / 2, 14, CAR.width);
    const flash = Math.sin(time * 10) > 0;
    ctx.fillStyle = flash ? '#ff2e2e' : '#2e7dff';
    ctx.fillRect(-8, -CAR.width / 2 - 2, 8, 7);
    ctx.fillStyle = flash ? '#2e7dff' : '#ff2e2e';
    ctx.fillRect(-8, CAR.width / 2 - 5, 8, 7);
  } else {
    ctx.fillStyle = car.color;
    roundRect(ctx, -CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width, 6);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(180,220,255,0.85)';
  ctx.fillRect(2, -CAR.width / 2 + 4, 12, CAR.width - 8);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-CAR.length / 2 + 6, -CAR.width / 2 + 4, 8, CAR.width - 8);
  if (car.smoke) {
    ctx.fillStyle = 'rgba(120,120,120,0.6)';
    ctx.beginPath();
    ctx.arc(-CAR.length / 2, 0, 8 + Math.sin(time * 6) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, color, radius) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + radius * 0.7, radius, radius * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(x + Math.cos(angle) * 3, y + Math.sin(angle) * 3, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

function drawMarker(ctx, m, time) {
  const pulse = 1 + Math.sin(time * 4) * 0.15;
  const s = 16 * pulse;
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#ffd94d';
  ctx.strokeStyle = '#7a5b00';
  ctx.lineWidth = 2;
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.strokeRect(-s / 2, -s / 2, s, s);
  ctx.restore();
  ctx.fillStyle = '#1c2430';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(m.label, m.x, m.y - 20);
}

function drawWorld(ctx, state, viewW, viewH) {
  const city = state.city;
  const cam = state.camera;
  const left = cam.x - viewW / 2;
  const top = cam.y - viewH / 2;
  ctx.save();
  ctx.translate(-left, -top);
  // Ground.
  ctx.fillStyle = '#7fae62';
  ctx.fillRect(left - 40, top - 40, viewW + 80, viewH + 80);
  // Beach and water along the south edge.
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(left - 40, city.beach.y, viewW + 80, WORLD.height - city.beach.y + 40);
  ctx.fillStyle = '#3fa7c4';
  ctx.fillRect(left - 40, city.water.y, viewW + 80, WORLD.height - city.water.y + 40);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  for (let x = Math.floor(left / 90) * 90; x < left + viewW + 90; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, city.water.y + 18);
    ctx.quadraticCurveTo(x + 22, city.water.y + 10, x + 45, city.water.y + 18);
    ctx.stroke();
  }
  // Parks.
  for (const park of city.parks) {
    ctx.fillStyle = '#69a24e';
    ctx.fillRect(park.x, park.y, park.w, park.h);
  }
  // Roads.
  ctx.fillStyle = '#3c3f46';
  for (const rx of city.roadsX) ctx.fillRect(rx - ROAD.width / 2, 0, ROAD.width, WORLD.height);
  for (const ry of city.roadsY) ctx.fillRect(0, ry - ROAD.width / 2, WORLD.width, ROAD.width);
  ctx.strokeStyle = '#e8d44d';
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 22]);
  for (const rx of city.roadsX) {
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx, WORLD.height);
    ctx.stroke();
  }
  for (const ry of city.roadsY) {
    ctx.beginPath();
    ctx.moveTo(0, ry);
    ctx.lineTo(WORLD.width, ry);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // Docks on the east edge.
  ctx.fillStyle = '#8a6b45';
  ctx.fillRect(city.docks.x - 20, city.docks.y - 70, 60, 140);
  ctx.fillStyle = '#6e5433';
  for (let y = city.docks.y - 70; y < city.docks.y + 70; y += 16) ctx.fillRect(city.docks.x - 20, y, 60, 3);
  // Buildings and palms.
  for (const b of city.buildings) drawBuilding(ctx, b, state.time);
  for (const palm of city.palms) {
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(palm.x - 2, palm.y - 2, 4, 10);
    ctx.fillStyle = '#3f9e4d';
    ctx.beginPath();
    ctx.arc(palm.x, palm.y - 6, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  // Mission markers.
  for (const m of state.mission.markers) if (!m.done) drawMarker(ctx, m, state.time);
  // Pedestrians.
  for (const ped of state.peds) {
    if (ped.down > 0) {
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.ellipse(ped.x, ped.y, 12, 7, ped.angle, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    drawPerson(ctx, ped.x, ped.y, ped.angle, ped.color, 9);
  }
  // Cars.
  for (const car of state.cars) drawCar(ctx, car, state.time);
  // The player.
  const p = state.player;
  if (p.onFoot) {
    drawPerson(ctx, p.x, p.y, p.angle, '#ff7a1a', PLAYER.radius);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(p.angle) * 14, p.y + Math.sin(p.angle) * 14);
    ctx.lineTo(p.x + Math.cos(p.angle) * 30, p.y + Math.sin(p.angle) * 30);
    ctx.stroke();
  }
  // Bullets.
  ctx.fillStyle = '#ffe14d';
  for (const b of state.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Particles.
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life * 2);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawMinimap(ctx, state, viewW, viewH) {
  const mw = 200;
  const mh = 156;
  const x = viewW - mw - 14;
  const y = viewH - mh - 14;
  const sx = mw / WORLD.width;
  const sy = mh / WORLD.height;
  ctx.fillStyle = 'rgba(10,14,20,0.82)';
  ctx.fillRect(x - 4, y - 4, mw + 8, mh + 8);
  ctx.fillStyle = '#24303a';
  ctx.fillRect(x, y, mw, mh);
  ctx.fillStyle = '#3fa7c4';
  ctx.fillRect(x, y + (WORLD.height - 52) * sy, mw, 52 * sy);
  ctx.strokeStyle = '#5a6a78';
  ctx.lineWidth = 1;
  for (const rx of state.city.roadsX) {
    ctx.beginPath();
    ctx.moveTo(x + rx * sx, y);
    ctx.lineTo(x + rx * sx, y + mh);
    ctx.stroke();
  }
  for (const ry of state.city.roadsY) {
    ctx.beginPath();
    ctx.moveTo(x, y + ry * sy);
    ctx.lineTo(x + mw, y + ry * sy);
    ctx.stroke();
  }
  for (const m of state.mission.markers) {
    if (m.done) continue;
    ctx.fillStyle = '#ffd94d';
    const pulse = 4 + Math.sin(state.time * 4) * 1.5;
    ctx.beginPath();
    ctx.arc(x + m.x * sx, y + m.y * sy, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a5b00';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // The docks, a landmark worth finding on the map.
  ctx.fillStyle = '#8a6b45';
  ctx.fillRect(x + (state.city.docks.x - 20) * sx, y + (state.city.docks.y - 70) * sy, 40 * sx + 2, 140 * sy + 2);
  for (const car of state.cars) {
    if (car.kind !== 'police') continue;
    ctx.fillStyle = Math.sin(state.time * 10) > 0 ? '#ff2e2e' : '#2e7dff';
    ctx.beginPath();
    ctx.arc(x + car.x * sx, y + car.y * sy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const p = state.player;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + p.x * sx, y + p.y * sy, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1c2430';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + p.x * sx, y + p.y * sy);
  ctx.lineTo(x + (p.x + Math.cos(p.angle) * 90) * sx, y + (p.y + Math.sin(p.angle) * 90) * sy);
  ctx.stroke();
}

function drawHud(ctx, state, viewW, viewH) {
  const p = state.player;
  ctx.textAlign = 'left';
  // Cash and health.
  ctx.fillStyle = 'rgba(10,14,20,0.72)';
  ctx.fillRect(12, 12, 210, 64);
  ctx.fillStyle = '#7ed957';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('$' + p.cash, 24, 42);
  ctx.fillStyle = '#222';
  ctx.fillRect(24, 52, 186, 12);
  ctx.fillStyle = p.health > 30 ? '#7ed957' : '#ff2e2e';
  ctx.fillRect(24, 52, 186 * (p.health / PLAYER.healthMax), 12);
  // Wanted stars.
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(10,14,20,0.72)';
  ctx.fillRect(viewW - 222, 12, 210, 44);
  // A fresh star flashes the box red so the level-up reads at a glance.
  if (state.wantedFlashT > 0) {
    ctx.strokeStyle = 'rgba(255,46,46,' + clamp(state.wantedFlashT, 0, 1) + ')';
    ctx.lineWidth = 3;
    ctx.strokeRect(viewW - 222, 12, 210, 44);
  }
  ctx.font = 'bold 24px sans-serif';
  let stars = '';
  for (let i = 0; i < 5; i += 1) stars += i < state.wanted ? '★' : '☆';
  ctx.fillStyle = state.wanted > 0 ? '#ffd94d' : '#8a94a6';
  ctx.fillText(stars, viewW - 24, 44);
  // Bust meter while a cop is on top of the player on foot.
  if (p.onFoot && p.bustMeter > 0.05) {
    ctx.fillStyle = 'rgba(10,14,20,0.72)';
    ctx.fillRect(viewW / 2 - 110, 16, 220, 26);
    ctx.fillStyle = '#2e7dff';
    ctx.fillRect(viewW / 2 - 104, 22, 208 * clamp(p.bustMeter / 1.6, 0, 1), 14);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BUSTED?', viewW / 2, 33);
  }
  // Mission objective, wrapped to fit its box, with the drop count while
  // running Three Drops. After the story it reads FREE ROAM.
  ctx.textAlign = 'left';
  let obj = state.mission.text;
  if (state.mission.index === 1 && state.mission.markers.length) {
    obj += ' (' + state.mission.collected + '/' + state.mission.markers.length + ')';
  }
  ctx.font = '14px sans-serif';
  const objLines = wrapText(ctx, obj, 420);
  const label = state.storyDone ? 'FREE ROAM' : 'MISSION ' + (state.mission.index + 1) + '/3';
  ctx.font = 'bold 14px sans-serif';
  const objW = Math.min(460, Math.max(ctx.measureText(label).width, ...objLines.map((l) => ctx.measureText(l).width)) + 24);
  const lineH = 18;
  const boxH = 28 + objLines.length * lineH;
  const boxY = viewH - 12 - boxH;
  ctx.fillStyle = 'rgba(10,14,20,0.72)';
  ctx.fillRect(12, boxY, objW, boxH);
  ctx.fillStyle = '#ffd94d';
  ctx.fillText(label, 24, boxY + 20);
  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  objLines.forEach((l, i) => ctx.fillText(l, 24, boxY + 20 + (i + 1) * lineH));
  // Mission 3 timer.
  if (state.mission.index === 2 && state.mission.timer > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('SHAKE THE HEAT: ' + Math.ceil(state.mission.timer) + 's', viewW / 2, 96);
  }
  // Speed when driving.
  if (!p.onFoot && p.car) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,14,20,0.72)';
    ctx.fillRect(viewW / 2 - 70, viewH - 60, 140, 40);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(Math.round(Math.abs(p.car.speed) * 0.12) + ' mph', viewW / 2, viewH - 32);
  }
  // Flash banner.
  if (state.flash && state.flash.t > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,14,20,0.8)';
    ctx.fillRect(viewW / 2 - 260, viewH / 2 - 110, 520, 44);
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(state.flash.text, viewW / 2, viewH / 2 - 81);
  }
  // Toast messages.
  ctx.textAlign = 'center';
  ctx.font = '15px sans-serif';
  state.messages.forEach((m, i) => {
    ctx.globalAlpha = clamp(m.t, 0, 1);
    ctx.fillStyle = '#fff';
    ctx.fillText(m.text, viewW / 2, 120 + i * 22);
  });
  ctx.globalAlpha = 1;
  drawMinimap(ctx, state, viewW, viewH);
  // Controls hint early on.
  if (state.time < 12) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '13px sans-serif';
    ctx.fillText('WASD move / drive · E enter car · Click to shoot · P pause · M mute', viewW / 2, viewH - 78);
  }
}

function overlay(ctx, viewW, viewH, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, viewW, viewH);
}

function drawTitle(ctx, state, viewW, viewH) {
  const g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, '#ff9a3d');
  g.addColorStop(0.55, '#e85d75');
  g.addColorStop(1, '#2b2d5c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 8; i += 1) ctx.fillRect(0, (i * viewH) / 8, viewW, 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('SOLMAR HEAT', viewW / 2, viewH / 2 - 130);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('AN OPEN-WORLD STORY IN SOLMAR BAY', viewW / 2, viewH / 2 - 96);
  ctx.fillStyle = '#fff';
  ctx.font = '15px sans-serif';
  ctx.fillText('Deke owes Mara Solis $2,800. Three jobs stand between him and a clean slate.', viewW / 2, viewH / 2 - 58);
  ctx.fillText('Steal cars, dodge the cops, run the jobs — and try not to get wasted.', viewW / 2, viewH / 2 - 36);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '14px sans-serif';
  ctx.fillText('WASD move / drive · E enter & exit car · Mouse aim, click to shoot · P pause · M mute', viewW / 2, viewH / 2 + 6);
  ctx.fillText('Progress saves automatically. Wanted stars bring the police.', viewW / 2, viewH / 2 + 28);
  for (const b of titleButtons(state, viewW, viewH)) {
    ctx.fillStyle = '#ffd94d';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#1c2430';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + 34);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '12px sans-serif';
  ctx.fillText('An original game. No affiliation with any commercial series.', viewW / 2, viewH - 18);
}

function drawEnd(ctx, viewW, viewH, big, small, color) {
  overlay(ctx, viewW, viewH, 'rgba(8,10,16,0.72)');
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText(big, viewW / 2, viewH / 2 - 20);
  ctx.fillStyle = '#fff';
  ctx.font = '17px sans-serif';
  ctx.fillText(small, viewW / 2, viewH / 2 + 24);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '14px sans-serif';
  ctx.fillText('Press Enter to continue', viewW / 2, viewH / 2 + 56);
}

export function render(state, ctx, viewW, viewH) {
  ctx.clearRect(0, 0, viewW, viewH);
  if (state.screen === 'title') {
    drawTitle(ctx, state, viewW, viewH);
    return;
  }
  drawWorld(ctx, state, viewW, viewH);
  drawHud(ctx, state, viewW, viewH);
  if (state.screen === 'pause') {
    overlay(ctx, viewW, viewH, 'rgba(8,10,16,0.6)');
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('PAUSED', viewW / 2, viewH / 2);
    ctx.font = '15px sans-serif';
    ctx.fillText('Press P to resume', viewW / 2, viewH / 2 + 36);
  } else if (state.screen === 'wasted') {
    drawEnd(ctx, viewW, viewH, 'WASTED', 'The hospital patched you up. Fee: $200.', '#ff2e2e');
  } else if (state.screen === 'busted') {
    drawEnd(ctx, viewW, viewH, 'BUSTED', 'Bail posted: $300. The heat is off — for now.', '#2e7dff');
  } else if (state.screen === 'complete') {
    drawEnd(ctx, viewW, viewH, 'DEBT PAID', 'All three jobs done. Solmar Bay is yours — keep roaming.', '#ffd94d');
  }
}
