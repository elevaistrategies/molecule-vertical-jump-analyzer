// Vertical Jump Analyzer (Flight Time Method)
// height ≈ (g * t^2) / 8

const videoInput = document.getElementById("videoInput");
const video = document.getElementById("video");
const videoHint = document.getElementById("videoHint");

const clearBtn = document.getElementById("clearBtn");

const backBig = document.getElementById("backBig");
const backSmall = document.getElementById("backSmall");
const forwardSmall = document.getElementById("forwardSmall");
const forwardBig = document.getElementById("forwardBig");

const stepSelect = document.getElementById("stepSelect");
const currentTimeEl = document.getElementById("currentTime");

const markTakeoffBtn = document.getElementById("markTakeoff");
const markLandingBtn = document.getElementById("markLanding");

const takeoffVal = document.getElementById("takeoffVal");
const landingVal = document.getElementById("landingVal");
const flightVal = document.getElementById("flightVal");

const gravitySelect = document.getElementById("gravitySelect");
const calcBtn = document.getElementById("calcBtn");

const heightVal = document.getElementById("heightVal");
const shareBtn = document.getElementById("shareBtn");

let objectUrl = null;
let takeoffTime = null;
let landingTime = null;

function fmt(t) {
  if (t === null || t === undefined) return "—";
  return `${t.toFixed(3)}s`;
}

function enableControls(enabled) {
  const controls = [
    clearBtn,
    backBig, backSmall, forwardSmall, forwardBig,
    stepSelect,
    markTakeoffBtn, markLandingBtn,
    gravitySelect,
    calcBtn,
    shareBtn
  ];
  controls.forEach(el => el.disabled = !enabled);
}

function resetMarkers() {
  takeoffTime = null;
  landingTime = null;
  takeoffVal.textContent = "—";
  landingVal.textContent = "—";
  flightVal.textContent = "—";
  heightVal.textContent = "—";
}

function updateFlightTimeUI() {
  if (takeoffTime !== null && landingTime !== null) {
    const t = landingTime - takeoffTime;
    flightVal.textContent = t > 0 ? fmt(t) : "⚠️ Landing must be after takeoff";
  } else {
    flightVal.textContent = "—";
  }
}

function setVideoTimeSafely(newTime) {
  if (!video.duration || Number.isNaN(video.duration)) return;
  const clamped = Math.max(0, Math.min(video.duration, newTime));
  video.currentTime = clamped;
}

function getStepSize() {
  const val = parseFloat(stepSelect.value);
  return Number.isFinite(val) ? val : 0.0333333;
}

function updateCurrentTimeUI() {
  currentTimeEl.textContent = fmt(video.currentTime || 0);
}

function computeHeightMeters(g, t) {
  // height ≈ (g * t^2) / 8
  return (g * t * t) / 8;
}

function metersToInches(m) {
  return m * 39.3700787402;
}

function metersToCm(m) {
  return m * 100;
}

function buildSummary() {
  const g = parseFloat(gravitySelect.value || "9.81");
  const ft = (takeoffTime !== null && landingTime !== null) ? (landingTime - takeoffTime) : null;

  let heightM = null;
  if (ft !== null && ft > 0) heightM = computeHeightMeters(g, ft);

  const lines = [];
  lines.push("Vertical Jump Analyzer (Flight Time Method)");
  lines.push("----------------------------------------");
  lines.push(`Takeoff: ${fmt(takeoffTime)}`);
  lines.push(`Landing: ${fmt(landingTime)}`);
  lines.push(`Flight time: ${ft !== null ? fmt(ft) : "—"}`);
  lines.push(`Gravity: ${g.toFixed(2)} m/s²`);

  if (heightM !== null) {
    lines.push(`Estimated height: ${heightM.toFixed(3)} m`);
    lines.push(`Estimated height: ${metersToCm(heightM).toFixed(1)} cm`);
    lines.push(`Estimated height: ${metersToInches(heightM).toFixed(1)} in`);
  } else {
    lines.push("Estimated height: — (mark takeoff + landing first)");
  }

  lines.push("");
  lines.push("Formula: height ≈ (g × t²) / 8");
  return lines.join("\n");
}

// --- Events ---

videoInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Clean up old object URL if any
  if (objectUrl) URL.revokeObjectURL(objectUrl);

  objectUrl = URL.createObjectURL(file);
  video.src = objectUrl;

  resetMarkers();
  heightVal.textContent = "—";

  videoHint.style.display = "none";
  enableControls(true);

  // When metadata loads, set time UI
  video.addEventListener("loadedmetadata", () => {
    updateCurrentTimeUI();
  }, { once: true });
});

clearBtn.addEventListener("click", () => {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;

  video.removeAttribute("src");
  video.load();

  videoInput.value = "";
  resetMarkers();
  updateCurrentTimeUI();

  videoHint.style.display = "grid";
  enableControls(false);
});

video.addEventListener("timeupdate", updateCurrentTimeUI);

backBig.addEventListener("click", () => setVideoTimeSafely(video.currentTime - 1.0));
forwardBig.addEventListener("click", () => setVideoTimeSafely(video.currentTime + 1.0));

backSmall.addEventListener("click", () => setVideoTimeSafely(video.currentTime - getStepSize()));
forwardSmall.addEventListener("click", () => setVideoTimeSafely(video.currentTime + getStepSize()));

markTakeoffBtn.addEventListener("click", () => {
  takeoffTime = video.currentTime;
  takeoffVal.textContent = fmt(takeoffTime);
  updateFlightTimeUI();
});

markLandingBtn.addEventListener("click", () => {
  landingTime = video.currentTime;
  landingVal.textContent = fmt(landingTime);
  updateFlightTimeUI();
});

calcBtn.addEventListener("click", () => {
  const g = parseFloat(gravitySelect.value || "9.81");

  if (takeoffTime === null || landingTime === null) {
    heightVal.textContent = "Mark takeoff + landing first";
    return;
  }

  const t = landingTime - takeoffTime;
  if (!(t > 0)) {
    heightVal.textContent = "Landing must be after takeoff";
    return;
  }

  const hM = computeHeightMeters(g, t);
  const cm = metersToCm(hM);
  const inches = metersToInches(hM);

  heightVal.textContent = `${cm.toFixed(1)} cm  •  ${inches.toFixed(1)} in`;
});

shareBtn.addEventListener("click", async () => {
  const text = buildSummary();

  try {
    await navigator.clipboard.writeText(text);
    shareBtn.textContent = "✅ Copied!";
    setTimeout(() => (shareBtn.textContent = "🧾 Copy Result Summary"), 1200);
  } catch {
    // Clipboard can fail if not on https or permissions are blocked.
    // Fallback: prompt
    window.prompt("Copy this summary:", text);
  }
});

// Start disabled until video loads
enableControls(false);
updateCurrentTimeUI();
