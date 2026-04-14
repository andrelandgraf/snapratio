const RATIOS = {
  "16:9": 16 / 9,
  "1:1": 1,
  "4:5": 4 / 5,
  "1.91:1": 1.91,
};

const MIN_WIDTH = 200;
const RESIZE_FACTOR = 0.12;
const CONTROLS_GAP = 12;

const state = {
  x: 0,
  y: 0,
  width: 800,
  height: 450,
  ratio: "16:9",
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  startX: 0,
  startY: 0,
  capturing: false,
};

const selection = document.getElementById("selection");
const panelTop = document.getElementById("overlay-top");
const panelBottom = document.getElementById("overlay-bottom");
const panelLeft = document.getElementById("overlay-left");
const panelRight = document.getElementById("overlay-right");
const controls = document.getElementById("controls");
const dimensions = document.getElementById("dimensions");
const sizeDisplay = document.getElementById("size-display");
const toast = document.getElementById("toast");

const api = window.snapratio;

function quit() {
  if (api) {
    api.quit();
  } else {
    window.close();
  }
}

function init() {
  if (!api) {
    document.body.style.background = "rgba(0,0,0,0.8)";
    document.body.innerHTML =
      '<p style="color:white;text-align:center;margin-top:40vh;font-size:18px;">' +
      "SnapRatio failed to initialize.<br>Try relaunching the app.</p>";
    return;
  }

  state.x = (window.innerWidth - state.width) / 2;
  state.y = (window.innerHeight - state.height) / 2 - 30;
  clamp();
  render();
  setupEventListeners();

  requestAnimationFrame(() => {
    selection.classList.add("smooth");
  });
}

function render() {
  const sx = state.x;
  const sy = state.y;
  const sw = state.width;
  const sh = state.height;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  selection.style.left = `${sx}px`;
  selection.style.top = `${sy}px`;
  selection.style.width = `${sw}px`;
  selection.style.height = `${sh}px`;

  panelTop.style.height = `${Math.max(0, sy)}px`;

  panelBottom.style.top = `${sy + sh}px`;
  panelBottom.style.height = `${Math.max(0, vh - sy - sh)}px`;

  panelLeft.style.top = `${sy}px`;
  panelLeft.style.width = `${Math.max(0, sx)}px`;
  panelLeft.style.height = `${sh}px`;

  panelRight.style.top = `${sy}px`;
  panelRight.style.left = `${sx + sw}px`;
  panelRight.style.width = `${Math.max(0, vw - sx - sw)}px`;
  panelRight.style.height = `${sh}px`;

  const cw = controls.offsetWidth;
  const ch = controls.offsetHeight;
  let cx = sx + sw / 2 - cw / 2;
  let cy = sy + sh + CONTROLS_GAP;

  if (cy + ch > vh - 10) {
    cy = sy - ch - CONTROLS_GAP;
  }
  cx = Math.max(8, Math.min(cx, vw - cw - 8));
  cy = Math.max(8, Math.min(cy, vh - ch - 8));

  controls.style.left = `${cx}px`;
  controls.style.top = `${cy}px`;

  const dpr = window.devicePixelRatio || 1;
  const actualW = Math.round(sw * dpr);
  const actualH = Math.round(sh * dpr);

  dimensions.textContent = `${actualW} × ${actualH}px`;
  sizeDisplay.textContent = `${actualW} × ${actualH}`;
}

function setRatio(ratio) {
  state.ratio = ratio;
  const r = RATIOS[ratio];

  let newHeight = Math.round(state.width / r);
  const maxH = window.innerHeight - 60;

  if (newHeight > maxH) {
    newHeight = maxH;
    state.width = Math.round(newHeight * r);
  }

  const cx = state.x + state.width / 2;

  state.height = newHeight;
  state.x = cx - state.width / 2;
  state.y = (window.innerHeight - state.height) / 2 - 30;

  clamp();
  render();

  document.querySelectorAll(".ratio-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.ratio === ratio);
  });
}

function resize(direction) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const step = Math.max(40, state.width * RESIZE_FACTOR);
  const r = RATIOS[state.ratio];

  let newW = direction > 0 ? state.width + step : state.width - step;
  newW = Math.max(MIN_WIDTH, Math.min(newW, vw));
  let newH = Math.round(newW / r);

  if (newH > vh) {
    newH = vh;
    newW = Math.round(newH * r);
  }

  const dw = newW - state.width;
  const dh = newH - state.height;

  let x = state.x - dw / 2;
  let y = state.y - dh / 2;

  x = Math.max(0, Math.min(x, vw - newW));
  y = Math.max(0, Math.min(y, vh - newH));

  selection.classList.remove("smooth");
  state.x = Math.round(x);
  state.y = Math.round(y);
  state.width = Math.round(newW);
  state.height = Math.round(newH);
  render();

  requestAnimationFrame(() => selection.classList.add("smooth"));
}

function clamp() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  state.x = Math.max(0, Math.min(state.x, vw - state.width));
  state.y = Math.max(0, Math.min(state.y, vh - state.height));
}

function showToast(message, duration) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), duration || 2500);
}

async function switchDisplay() {
  const result = await api.switchDisplay();
  if (result.switched) {
    state.x = (window.innerWidth - state.width) / 2;
    state.y = (window.innerHeight - state.height) / 2 - 30;
    clamp();
    render();
    showToast(
      `Display ${result.currentIndex + 1} of ${result.displayCount}`,
      1500
    );
  } else {
    showToast("Only one display connected", 1500);
  }
}

async function capture() {
  if (state.capturing) return;
  state.capturing = true;

  try {
    const result = await api.capture({
      x: Math.round(state.x),
      y: Math.round(state.y),
      width: Math.round(state.width),
      height: Math.round(state.height),
    });

    state.capturing = false;

    if (result && !result.success) {
      showToast(result.error || "Capture failed", 5000);
    }
  } catch (err) {
    state.capturing = false;
    showToast("Capture failed — " + String(err), 5000);
  }
}

function setupEventListeners() {
  selection.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (e.target.tagName === "BUTTON") return;

    state.isDragging = true;
    state.dragStartX = e.clientX;
    state.dragStartY = e.clientY;
    state.startX = state.x;
    state.startY = state.y;

    selection.classList.add("dragging");
    selection.classList.remove("smooth");
  });

  document.addEventListener("mousemove", (e) => {
    if (!state.isDragging) return;
    state.x = state.startX + (e.clientX - state.dragStartX);
    state.y = state.startY + (e.clientY - state.dragStartY);
    clamp();
    render();
  });

  document.addEventListener("mouseup", () => {
    if (!state.isDragging) return;
    state.isDragging = false;
    selection.classList.remove("dragging");
    selection.classList.add("smooth");
  });

  [panelTop, panelBottom, panelLeft, panelRight].forEach((panel) => {
    panel.addEventListener("click", (e) => {
      selection.classList.add("smooth");
      state.x = e.clientX - state.width / 2;
      state.y = e.clientY - state.height / 2;
      clamp();
      render();
    });
  });

  document.querySelectorAll(".ratio-btn").forEach((btn) => {
    btn.addEventListener("click", () => setRatio(btn.dataset.ratio));
  });

  document.getElementById("shrink").addEventListener("click", () => resize(-1));
  document.getElementById("grow").addEventListener("click", () => resize(1));

  document.getElementById("capture-btn").addEventListener("click", capture);

  document.getElementById("close-btn").addEventListener("click", quit);

  document.addEventListener("keydown", (e) => {
    if (state.capturing) return;

    switch (e.key) {
      case "=":
      case "+":
        resize(1);
        break;
      case "-":
        resize(-1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        capture();
        break;
      case "Escape":
        quit();
        break;
      case "Tab":
        e.preventDefault();
        switchDisplay();
        break;
      case "1":
        setRatio("16:9");
        break;
      case "2":
        setRatio("1:1");
        break;
      case "3":
        setRatio("4:5");
        break;
      case "4":
        setRatio("1.91:1");
        break;
      case "ArrowUp":
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowRight":
        e.preventDefault();
        nudge(e.key, e.shiftKey);
        break;
    }
  });
}

function nudge(key, fast) {
  const step = fast ? 20 : 4;
  switch (key) {
    case "ArrowUp":
      state.y -= step;
      break;
    case "ArrowDown":
      state.y += step;
      break;
    case "ArrowLeft":
      state.x -= step;
      break;
    case "ArrowRight":
      state.x += step;
      break;
  }
  clamp();
  render();
}

init();
