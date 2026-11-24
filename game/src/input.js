// Keyboard and mouse, as one plain object the update step reads. The main
// loop owns an instance; the HUD buttons on the title screen read clicks too.
export function createInput(canvas) {
  const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    action: false,
    shoot: false,
    mouseX: 0,
    mouseY: 0,
    clicked: false,
    clickX: 0,
    clickY: 0,
    pressedKeys: new Set(),
  };
  const downKeys = new Set();
  const keyMap = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    KeyE: 'action', Space: 'shoot',
  };
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    const name = keyMap[e.code];
    // E is an action, not a held state: only the first press counts, so
    // holding E to enter a car does not make you exit it again a frame later
    // when the browser repeats the keydown.
    if (name === 'action') {
      if (!downKeys.has(e.code)) input.action = true;
    } else if (name) {
      input[name] = true;
    }
    if (!downKeys.has(e.code)) input.pressedKeys.add(e.code);
    downKeys.add(e.code);
  });
  window.addEventListener('keyup', (e) => {
    const name = keyMap[e.code];
    if (name) input[name] = false;
    downKeys.delete(e.code);
  });
  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = input.action = input.shoot = false;
    downKeys.clear();
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - r.left;
    input.mouseY = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - r.left;
    input.mouseY = e.clientY - r.top;
    input.shoot = true;
    input.clicked = true;
    input.clickX = input.mouseX;
    input.clickY = input.mouseY;
  });
  window.addEventListener('mouseup', () => {
    input.shoot = false;
  });
  return input;
}

// Was this key pressed since the last frame? Call once a frame per key.
export function pressed(input, code) {
  if (input.pressedKeys.has(code)) {
    input.pressedKeys.delete(code);
    return true;
  }
  return false;
}

export function consumeClick(input) {
  if (!input.clicked) return null;
  input.clicked = false;
  return { x: input.clickX, y: input.clickY };
}
