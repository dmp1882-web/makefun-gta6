// Solmar Heat — tuning constants and palette. One place for every number the
// rest of the game shares, so balancing never means hunting through systems.
export const WORLD = { width: 2600, height: 2000 };
export const ROAD = { width: 64, spacing: 260, first: 130 };
export const PLAYER = {
  walkSpeed: 185,
  radius: 13,
  healthMax: 100,
  pistolRange: 420,
  bulletSpeed: 760,
  fireCooldown: 0.28,
};
export const CAR = {
  accel: 420,
  brake: 620,
  maxSpeed: 540,
  reverseMax: 170,
  turnRate: 2.6,
  length: 46,
  width: 22,
  trafficSpeed: 150,
  policeSpeed: 500,
};
export const WANTED = {
  maxStars: 5,
  decayDelay: 15,
  decayEvery: 8,
  maxPolice: 4,
  stealCar: 1,
  hitPed: 1,
  shoot: 1,
  killCopCar: 1,
};
export const MISSIONS = [
  { id: 'pickup', name: 'The Pickup', reward: 500 },
  { id: 'drops', name: 'Three Drops', reward: 750 },
  { id: 'heat', name: 'Lose the Heat', reward: 1500 },
];
export const PALETTE = {
  grass: '#7fae62',
  park: '#69a24e',
  sand: '#e8d29a',
  water: '#3fa7c4',
  road: '#3c3f46',
  roadLine: '#e8d44d',
  sidewalk: '#b9bcc2',
  buildingRoof: ['#e07856', '#e8b34d', '#7fb3d5', '#c98bb0', '#8fb573', '#d5d5d5', '#f2e3c6'],
  buildingSide: '#00000033',
  carColors: ['#d94f3d', '#3d7dd9', '#e8c33d', '#7ed957', '#f2f2f2', '#222831', '#c65bd9', '#ff8c42'],
  policeWhite: '#f4f6f8',
  policeBlack: '#1c2430',
};
export const SAVE_KEY = 'solmar-heat-save-v1';
