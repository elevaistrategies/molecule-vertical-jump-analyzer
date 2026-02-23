/**
 * Vertical Jump Analyzer - Vanilla JS
 * Single-page app with video analysis, pan/zoom, and jump height calculation
 */
(function () {
  'use strict';

  const state = {
    zoom: 1,
    panX: 0,
    panY: 0,
    takeoff: null,
    landing: null,
    gravity: 9.81,
    jumpHeightM: null,
    videoLoaded: false,
    fps: 240,
    baseWidth: 0,
    baseHeight: 0,
    viewportWidth: 0,
    viewportHeight: 0,
    maxPanX: 0,
    maxPanY: 0,
    dragStartX: 0,
    dragStartY: 0,
    dragStartPanX: 0,
    dragStartPanY: 0,
    isDragging: false,
    pinchStartDistance: 0,
    pinchStartZoom: 1
  };

  const gravityPresets = {
    '9.81': 'Earth',
    '1.62': 'Moon',
    '3.71': 'Mars',
    '24.79': 'Jupiter'
  };

  const DOM = {};

  function init() {
    cacheDOMElements();
    initTheme();
    bindVideoEvents();
    bindThemeEvents();
    bindScrubEvents();
    bindMarkerEvents();
    bindPanZoomEvents();
    bindGravityEvents();
    bindCalcModeEvents();
    bindRecordEvents();
    bindVideoControls();
    setupResizeObserver();
  }

  function cacheDOMElements() {
    DOM.video = document.getElementById('video');
    DOM.videoWrapper = document.getElementById('videoWrapper');
    DOM.videoViewport = document.getElementById('videoArea');
    DOM.videoInput = document.getElementById('videoInput');
    DOM.filenameDisplay = document.getElementById('filenameDisplay');
    DOM.statusBadge = document.getElementById('statusBadge');
    DOM.themeBtn = document.getElementById('themeBtn');
    DOM.clearBtn = document.getElementById('clearBtn');
    DOM.videoHint = document.getElementById('videoHint');
    DOM.playbackSpeed = document.getElementById('rateSelect');
    DOM.fpsInput = document.getElementById('fpsInput');
    DOM.currentTimeDisplay = document.getElementById('currentTime');
    DOM.goToTimeInput = document.getElementById('gotoTime');
    DOM.goToTimeBtn = document.getElementById('gotoBtn');
    DOM.prevFrameBtn = document.getElementById('prevFrameBtn');
    DOM.nextFrameBtn = document.getElementById('nextFrameBtn');
    DOM.takeoffTimeInput = document.getElementById('takeoffInput');
    DOM.landingTimeInput = document.getElementById('landingInput');
    DOM.setTakeoffBtn = document.getElementById('setTakeoffBtn');
    DOM.setLandingBtn = document.getElementById('setLandingBtn');
    DOM.zoomSlider = document.getElementById('zoomRange');
    DOM.zoomValue = document.getElementById('zoomValue');
    DOM.resetViewBtn = document.getElementById('resetViewBtn');
    DOM.dpadUp = document.getElementById('panUp');
    DOM.dpadDown = document.getElementById('panDown');
    DOM.dpadLeft = document.getElementById('panLeft');
    DOM.dpadRight = document.getElementById('panRight');
    DOM.dpadCenter = document.getElementById('panReset');
    DOM.zoomInBtn = document.getElementById('zoomInBtn');
    DOM.zoomOutBtn = document.getElementById('zoomOutBtn');
    DOM.loadPrompt = document.getElementById('loadPrompt');
    DOM.markerButtons = document.getElementById('markerButtons');
    DOM.markTakeoffBtn = document.getElementById('markTakeoff');
    DOM.markLandingBtn = document.getElementById('markLanding');
    DOM.takeoffDisplay = document.getElementById('takeoffVal');
    DOM.landingDisplay = document.getElementById('landingVal');
    DOM.flightTimeDisplay = document.getElementById('flightVal');
    DOM.validationWarning = document.getElementById('validationWarning');
    DOM.gravitySelect = document.getElementById('gravitySelect');
    DOM.customGravityRow = document.getElementById('customGravityRow');
    DOM.customGravityInput = document.getElementById('customGravityInput');
    DOM.useMeasuredTime = document.getElementById('useMeasuredTime');
    DOM.formulaText = document.getElementById('formulaText');
    DOM.calculateBtn = document.getElementById('calcBtn');
    DOM.resultArea = document.getElementById('resultArea');
    DOM.resultInches = document.getElementById('resultInches');
    DOM.resultCm = document.getElementById('resultCm');
    DOM.copySummaryBtn = document.getElementById('shareBtn');
    DOM.recordBtn = document.getElementById('recordBtn');
    DOM.vcPlay = document.getElementById('vcPlay');
    DOM.vcProgress = document.getElementById('vcProgress');
    DOM.vcTime = document.getElementById('vcTime');
    DOM.vcVolumeBtn = document.getElementById('vcVolumeBtn');
    DOM.vcVolume = document.getElementById('vcVolume');
    DOM.vcFullscreen = document.getElementById('vcFullscreen');
    DOM.vcSpeed = document.getElementById('vcSpeed');
    DOM.vcMarkTakeoff = document.getElementById('vcMarkTakeoff');
    DOM.vcMarkLanding = document.getElementById('vcMarkLanding');
    DOM.vcPrevFrame = document.getElementById('vcPrevFrame');
    DOM.vcNextFrame = document.getElementById('vcNextFrame');
  }
  // ----- Theme -----
  function initTheme() {
    const saved = localStorage.getItem('vja_theme');
    if (saved === 'light') document.body.classList.add('theme-light');
    updateThemeButtonLabel();
  }

  function bindThemeEvents() {
    if (!DOM.themeBtn) return;
    DOM.themeBtn.addEventListener('click', toggleTheme);
  }

  function toggleTheme() {
    document.body.classList.toggle('theme-light');
    localStorage.setItem('vja_theme', document.body.classList.contains('theme-light') ? 'light' : 'dark');
    updateThemeButtonLabel();
  }

  function updateThemeButtonLabel() {
    if (!DOM.themeBtn) return;
    DOM.themeBtn.textContent = '🌗 Theme';
  }



  // ----- Video -----
  function bindVideoEvents() {
    if (!DOM.videoInput || !DOM.video) return;
    DOM.videoInput.addEventListener('change', onVideoFileSelected);
    if (DOM.clearBtn) DOM.clearBtn.addEventListener('click', clearVideo);
    DOM.video.addEventListener('loadedmetadata', onVideoMetadata);
    DOM.video.addEventListener('timeupdate', updateCurrentTimeDisplay);
    DOM.video.addEventListener('durationchange', onVideoMetadata);
    DOM.video.addEventListener('loadeddata', onVideoMetadata);
    DOM.video.addEventListener('pause', updateCurrentTimeDisplay);
    DOM.video.addEventListener('play', updateCurrentTimeDisplay);
  }

  function onVideoFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    DOM.video.srcObject = null;
    if (DOM.video.src) URL.revokeObjectURL(DOM.video.src);
    DOM.video.pause();
    DOM.video.src = url;
    DOM.video.load();
    DOM.video.currentTime = 0;
    state.videoLoaded = true;
    resetView();
    DOM.filenameDisplay.textContent = file.name;
    DOM.statusBadge.textContent = 'Video loaded ✅';
    enableMarkerButtons();
    if (DOM.videoHint) { DOM.videoHint.textContent = ''; DOM.videoHint.style.display = 'none'; }
    resetMarkers();
    setupVideoControlsState(true);
    requestAnimationFrame(() => measureViewportAndVideo());
  }

  function clearVideo() {
    try {
      DOM.video.pause();
    } catch {}
    if (DOM.video) DOM.video.srcObject = null;
    if (DOM.video && DOM.video.src) {
      try { URL.revokeObjectURL(DOM.video.src); } catch {}
    }
    if (DOM.video) DOM.video.removeAttribute('src');
    if (DOM.video) DOM.video.load();

    if (DOM.videoInput) DOM.videoInput.value = '';
    state.videoLoaded = false;
    DOM.filenameDisplay.textContent = '';
    DOM.statusBadge.textContent = 'No video loaded';
    if (DOM.videoHint) DOM.videoHint.textContent = 'Upload a video to begin.';
    resetMarkers();
    resetView();

    // Disable marker + pan buttons
    DOM.markTakeoffBtn.disabled = true;
    DOM.markLandingBtn.disabled = true;
    DOM.calculateBtn.disabled = true;
    if (DOM.dpadUp) DOM.dpadUp.disabled = true;
    if (DOM.dpadDown) DOM.dpadDown.disabled = true;
    if (DOM.dpadLeft) DOM.dpadLeft.disabled = true;
    if (DOM.dpadRight) DOM.dpadRight.disabled = true;
    if (DOM.dpadCenter) DOM.dpadCenter.disabled = true;
    if (DOM.zoomInBtn) DOM.zoomInBtn.disabled = true;
    if (DOM.zoomOutBtn) DOM.zoomOutBtn.disabled = true;
    DOM.loadPrompt.textContent = 'Load a video to begin';
    setupVideoControlsState(false);
    if (DOM.videoHint) { DOM.videoHint.textContent = 'Upload a video to begin.'; DOM.videoHint.style.display = ''; }
    if (DOM.videoViewport) DOM.videoViewport.style.aspectRatio = '16 / 9';
  }

  function onVideoMetadata() {
    if (DOM.video && DOM.videoViewport && DOM.video.videoWidth && DOM.video.videoHeight) {
      const w = DOM.video.videoWidth;
      const h = DOM.video.videoHeight;
      DOM.videoViewport.style.aspectRatio = w + ' / ' + h;
    }
    requestAnimationFrame(() => measureViewportAndVideo());
  }

  function loadVideoFromBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    DOM.video.srcObject = null;
    if (DOM.video.src) URL.revokeObjectURL(DOM.video.src);
    DOM.video.pause();
    DOM.video.src = url;
    DOM.video.load();
    DOM.video.currentTime = 0;
    state.videoLoaded = true;
    resetView();
    DOM.filenameDisplay.textContent = filename || 'Recorded video';
    DOM.statusBadge.textContent = 'Video loaded ✅';
    enableMarkerButtons();
    if (DOM.videoHint) DOM.videoHint.textContent = '';
    if (DOM.videoHint) DOM.videoHint.style.display = 'none';
    resetMarkers();
    setupVideoControlsState(true);
    requestAnimationFrame(() => measureViewportAndVideo());
  }

  function resetView() {
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    applyTransform();
    if (DOM.zoomSlider) DOM.zoomSlider.value = 1;
    if (DOM.zoomValue) DOM.zoomValue.textContent = '1';
  }

  function resetMarkers() {
    state.takeoff = null;
    state.landing = null;
    DOM.takeoffTimeInput.value = '';
    DOM.landingTimeInput.value = '';
    DOM.takeoffDisplay.textContent = '—';
    DOM.landingDisplay.textContent = '—';
    DOM.flightTimeDisplay.textContent = '—';
    DOM.validationWarning.textContent = '';
    DOM.calculateBtn.disabled = true;
    if (DOM.resultInches) DOM.resultInches.textContent = '—';
    if (DOM.resultCm) DOM.resultCm.textContent = '—';
  }

  function enableMarkerButtons() {
    DOM.markTakeoffBtn.disabled = false;
    DOM.markLandingBtn.disabled = false;
    DOM.loadPrompt.textContent = 'Mark takeoff and landing';
    if (DOM.dpadUp) DOM.dpadUp.disabled = false;
    if (DOM.dpadDown) DOM.dpadDown.disabled = false;
    if (DOM.dpadLeft) DOM.dpadLeft.disabled = false;
    if (DOM.dpadRight) DOM.dpadRight.disabled = false;
    if (DOM.dpadCenter) DOM.dpadCenter.disabled = false;
    if (DOM.zoomInBtn) DOM.zoomInBtn.disabled = false;
    if (DOM.zoomOutBtn) DOM.zoomOutBtn.disabled = false;
  }

  function measureViewportAndVideo() {
    if (!DOM.videoWrapper || !DOM.video) return;
    const rect = DOM.videoViewport.getBoundingClientRect();
    state.viewportWidth = rect.width;
    state.viewportHeight = rect.height;
    const v = DOM.video;
    if (v.videoWidth && v.videoHeight) {
      state.baseWidth = v.videoWidth;
      state.baseHeight = v.videoHeight;
      const scaleX = state.viewportWidth / state.baseWidth;
      const scaleY = state.viewportHeight / state.baseHeight;
      const scale = Math.min(scaleX, scaleY);
      const w = state.baseWidth * scale;
      const h = state.baseHeight * scale;
      state.maxPanX = Math.max(0, (state.viewportWidth - w) / 2);
      state.maxPanY = Math.max(0, (state.viewportHeight - h) / 2);
    }
  }

  function applyTransform() {
    if (!DOM.videoWrapper) return;
    DOM.videoWrapper.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  }

  // ----- Scrub -----
  function bindScrubEvents() {
    if (DOM.playbackSpeed) DOM.playbackSpeed.addEventListener('change', () => {
      const rate = parseFloat(DOM.playbackSpeed.value);
      DOM.video.playbackRate = rate;
      if (DOM.vcSpeed) DOM.vcSpeed.value = rate;
    });
    if (DOM.goToTimeBtn) DOM.goToTimeBtn.addEventListener('click', goToTime);
    if (DOM.prevFrameBtn) DOM.prevFrameBtn.addEventListener('click', () => stepFrame(-1));
    if (DOM.nextFrameBtn) DOM.nextFrameBtn.addEventListener('click', () => stepFrame(1));
    if (DOM.setTakeoffBtn) DOM.setTakeoffBtn.addEventListener('click', () => setMarker('takeoff'));
    if (DOM.setLandingBtn) DOM.setLandingBtn.addEventListener('click', () => setMarker('landing'));
    if (DOM.zoomSlider) DOM.zoomSlider.addEventListener('input', () => { state.zoom = parseFloat(DOM.zoomSlider.value); DOM.zoomValue.textContent = state.zoom.toFixed(1); applyTransform(); });
    if (DOM.resetViewBtn) DOM.resetViewBtn.addEventListener('click', resetView);
  }

  function formatTime(sec) {
    if (!isFinite(sec) || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateCurrentTimeDisplay() {
    if (!DOM.video) return;
    const t = DOM.video.currentTime;
    const d = DOM.video.duration;
    if (DOM.currentTimeDisplay) DOM.currentTimeDisplay.textContent = t.toFixed(3);
    if (DOM.goToTimeInput) DOM.goToTimeInput.value = t.toFixed(3);
    if (DOM.takeoffTimeInput) DOM.takeoffTimeInput.value = state.takeoff != null ? state.takeoff.toFixed(3) : '';
    if (DOM.landingTimeInput) DOM.landingTimeInput.value = state.landing != null ? state.landing.toFixed(3) : '';
    if (DOM.vcProgress && isFinite(d) && d > 0) {
      DOM.vcProgress.value = (t / d) * 100;
    }
    if (DOM.vcTime) DOM.vcTime.textContent = t.toFixed(3) + ' / ' + formatTime(d);
  }

  function goToTime() {
    const t = parseFloat(DOM.goToTimeInput.value);
    if (!isNaN(t) && DOM.video) DOM.video.currentTime = Math.max(0, t);
  }

  function stepFrame(delta) {
    if (!DOM.video || !state.videoLoaded) return;
    const d = DOM.video.duration;
    if (!isFinite(d) || d <= 0) return;
    const fps = (DOM.fpsInput && parseInt(DOM.fpsInput.value, 10)) || 240;
    const frameDuration = 1 / fps;
    DOM.video.pause();
    DOM.video.currentTime = Math.max(0, Math.min(d, DOM.video.currentTime + delta * frameDuration));
  }

  function setMarker(which) {
    if (!DOM.video) return;
    const t = DOM.video.currentTime;
    if (which === 'takeoff') { state.takeoff = t; DOM.takeoffTimeInput.value = t.toFixed(3); }
    else { state.landing = t; DOM.landingTimeInput.value = t.toFixed(3); }
    updateMarkerReadouts();
  }

  // ----- Markers -----
  function bindMarkerEvents() {
    DOM.markTakeoffBtn.addEventListener('click', () => setMarker('takeoff'));
    DOM.markLandingBtn.addEventListener('click', () => setMarker('landing'));
    DOM.calculateBtn.addEventListener('click', calculate);
    DOM.copySummaryBtn.addEventListener('click', copySummary);
  }

  function updateMarkerReadouts() {
    DOM.takeoffDisplay.textContent = state.takeoff != null ? state.takeoff.toFixed(3) : '—';
    DOM.landingDisplay.textContent = state.landing != null ? state.landing.toFixed(3) : '—';
    if (state.takeoff != null && state.landing != null) {
      const flight = state.landing - state.takeoff;
      DOM.flightTimeDisplay.textContent = flight.toFixed(3);
      DOM.validationWarning.textContent = flight <= 0 ? 'Landing must be after takeoff' : '';
      DOM.calculateBtn.disabled = flight <= 0;
    } else {
      DOM.flightTimeDisplay.textContent = '—';
      DOM.validationWarning.textContent = '';
      DOM.calculateBtn.disabled = true;
    }
  }

  // ----- Pan/Zoom -----
  function bindPanZoomEvents() {
    const PAN_STEP = 20;
    if (DOM.dpadUp) DOM.dpadUp.addEventListener('click', () => { state.panY += PAN_STEP; applyTransform(); });
    if (DOM.dpadDown) DOM.dpadDown.addEventListener('click', () => { state.panY -= PAN_STEP; applyTransform(); });
    if (DOM.dpadLeft) DOM.dpadLeft.addEventListener('click', () => { state.panX += PAN_STEP; applyTransform(); });
    if (DOM.dpadRight) DOM.dpadRight.addEventListener('click', () => { state.panX -= PAN_STEP; applyTransform(); });
    if (DOM.dpadCenter) DOM.dpadCenter.addEventListener('click', resetView);
    if (DOM.zoomInBtn) DOM.zoomInBtn.addEventListener('click', () => doZoom(0.25));
    if (DOM.zoomOutBtn) DOM.zoomOutBtn.addEventListener('click', () => doZoom(-0.25));
    DOM.videoViewport.addEventListener('mousedown', onDragStart);
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
    DOM.videoViewport.addEventListener('wheel', onWheel, { passive: false });
  }

  function onDragStart(e) {
    if (!state.videoLoaded || e.button !== 0) return;
    state.isDragging = true;
    state.dragStartX = e.clientX;
    state.dragStartY = e.clientY;
    state.dragStartPanX = state.panX;
    state.dragStartPanY = state.panY;
    DOM.videoViewport.classList.add('grabbable', 'grabbing');
  }

  function onDragMove(e) {
    if (!state.isDragging) return;
    state.panX = state.dragStartPanX + (e.clientX - state.dragStartX);
    state.panY = state.dragStartPanY + (e.clientY - state.dragStartY);
    applyTransform();
  }

  function onDragEnd() {
    state.isDragging = false;
    DOM.videoViewport.classList.remove('grabbable', 'grabbing');
  }

  function doZoom(delta) {
    if (!state.videoLoaded) return;
    state.zoom = Math.max(0.5, Math.min(6, state.zoom + delta));
    if (DOM.zoomSlider) DOM.zoomSlider.value = state.zoom;
    if (DOM.zoomValue) DOM.zoomValue.textContent = state.zoom.toFixed(1);
    applyTransform();
  }

  function onWheel(e) {
    if (!state.videoLoaded) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    doZoom(delta);
  }

  

// ----- Calculation Mode -----
const EARTH_G = 9.81;

function bindCalcModeEvents() {
  if (!DOM.useMeasuredTime) return;
  // Default: same takeoff force as Earth (unchecked)
  DOM.useMeasuredTime.checked = false;
  updateFormulaText();
  DOM.useMeasuredTime.addEventListener('change', () => {
    updateFormulaText();
    if (state.takeoff != null && state.landing != null) calculate();
  });
}

function updateFormulaText() {
  if (!DOM.formulaText) return;
  if (DOM.useMeasuredTime && DOM.useMeasuredTime.checked) {
    DOM.formulaText.textContent = 'h = g × t² / 8 (t measured, g selected)';
  } else {
    DOM.formulaText.textContent = 'h = (gₑ² × t²) / (8g)  (same Earth takeoff, g selected)';
  }
}

// ----- Gravity -----
  function bindGravityEvents() {
    DOM.gravitySelect.addEventListener('change', onGravityChange);
    DOM.customGravityInput.addEventListener('input', () => { state.gravity = parseFloat(DOM.customGravityInput.value) || 9.81; });
  }

  function onGravityChange() {
    const val = DOM.gravitySelect.value;
    if (val === 'custom') {
      DOM.customGravityRow.style.display = '';
      state.gravity = parseFloat(DOM.customGravityInput.value) || 9.81;
    } else {
      DOM.customGravityRow.style.display = 'none';
      state.gravity = parseFloat(val) || 9.81;
    }
  }

  function calculate() {
  if (state.takeoff == null || state.landing == null) return;
  const t = state.landing - state.takeoff;
  if (t <= 0) return;

  const gSelected = state.gravity || EARTH_G;
  const useMeasuredTime = !!(DOM.useMeasuredTime && DOM.useMeasuredTime.checked);

  if (useMeasuredTime) {
    // Treat your measured flight time as if it happened under the selected gravity.
    state.jumpHeightM = (gSelected * t * t) / 8;
  } else {
    // Same takeoff force as Earth:
    // v0 from Earth flight time: v0 = gE * t / 2
    // height on planet: h = v0^2 / (2 gSelected) = (gE^2 * t^2) / (8 gSelected)
    state.jumpHeightM = (EARTH_G * EARTH_G * t * t) / (8 * gSelected);
  }

  const inches = state.jumpHeightM * 39.37;
  const cm = state.jumpHeightM * 100;
  if (DOM.resultInches) DOM.resultInches.textContent = inches.toFixed(2) + ' in';
  if (DOM.resultCm) DOM.resultCm.textContent = cm.toFixed(2) + ' cm';
}

function copySummary() {
    const text = `Vertical Jump Analysis\nTakeoff: ${state.takeoff != null ? state.takeoff.toFixed(3) : '—'}s\nLanding: ${state.landing != null ? state.landing.toFixed(3) : '—'}s\nFlight: ${state.landing != null && state.takeoff != null ? (state.landing - state.takeoff).toFixed(3) : '—'}s\nHeight: ${state.jumpHeightM != null ? (state.jumpHeightM * 39.37).toFixed(2) : '—'} in`;
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function bindVideoControls() {
    if (!DOM.video || !DOM.vcPlay) return;
    DOM.vcPlay.addEventListener('click', () => {
      if (DOM.video.paused) DOM.video.play().catch(() => {});
      else DOM.video.pause();
    });
    DOM.video.addEventListener('play', () => { DOM.vcPlay.textContent = '⏸'; });
    DOM.video.addEventListener('pause', () => { DOM.vcPlay.textContent = '▶'; });
    if (DOM.vcProgress) DOM.vcProgress.addEventListener('input', () => {
      if (!DOM.video.duration || !isFinite(DOM.video.duration)) return;
      DOM.video.currentTime = (parseFloat(DOM.vcProgress.value) / 100) * DOM.video.duration;
    });
    if (DOM.vcVolume) DOM.vcVolume.addEventListener('input', () => {
      DOM.video.volume = parseFloat(DOM.vcVolume.value) / 100;
      DOM.vcVolumeBtn.textContent = DOM.video.volume === 0 ? '🔇' : DOM.video.volume < 0.5 ? '🔉' : '🔊';
    });
    if (DOM.vcVolumeBtn) DOM.vcVolumeBtn.addEventListener('click', () => {
      if (DOM.video.volume > 0) {
        DOM.video.volume = 0;
        if (DOM.vcVolume) DOM.vcVolume.value = 0;
        DOM.vcVolumeBtn.textContent = '🔇';
      } else {
        DOM.video.volume = 1;
        if (DOM.vcVolume) DOM.vcVolume.value = 100;
        DOM.vcVolumeBtn.textContent = '🔊';
      }
    });
    if (DOM.vcFullscreen) DOM.vcFullscreen.addEventListener('click', toggleFullscreen);
    if (DOM.vcSpeed) {
      DOM.vcSpeed.addEventListener('change', () => {
        const rate = parseFloat(DOM.vcSpeed.value);
        DOM.video.playbackRate = rate;
        if (DOM.playbackSpeed) DOM.playbackSpeed.value = rate;
      });
    }
    if (DOM.vcMarkTakeoff) DOM.vcMarkTakeoff.addEventListener('click', () => setMarker('takeoff'));
    if (DOM.vcMarkLanding) DOM.vcMarkLanding.addEventListener('click', () => setMarker('landing'));
    if (DOM.vcPrevFrame) DOM.vcPrevFrame.addEventListener('click', () => DOM.prevFrameBtn?.click());
    if (DOM.vcNextFrame) DOM.vcNextFrame.addEventListener('click', () => DOM.nextFrameBtn?.click());
  }

  function toggleFullscreen() {
    const container = document.querySelector('.video-container');
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  function setupVideoControlsState(hasVideo) {
    const enabled = hasVideo && !DOM.video.srcObject;
    if (DOM.vcPlay) DOM.vcPlay.disabled = !enabled;
    if (DOM.vcProgress) DOM.vcProgress.disabled = !enabled;
    if (DOM.vcSpeed) DOM.vcSpeed.disabled = !enabled;
    if (DOM.vcMarkTakeoff) DOM.vcMarkTakeoff.disabled = !enabled;
    if (DOM.vcMarkLanding) DOM.vcMarkLanding.disabled = !enabled;
    if (DOM.vcPrevFrame) DOM.vcPrevFrame.disabled = !enabled;
    if (DOM.vcNextFrame) DOM.vcNextFrame.disabled = !enabled;
    if (DOM.vcVolume) DOM.vcVolume.disabled = !enabled;
    if (DOM.vcVolumeBtn) DOM.vcVolumeBtn.disabled = !enabled;
    if (DOM.vcFullscreen) DOM.vcFullscreen.disabled = !hasVideo;
  }

  function setupResizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measureViewportAndVideo());
    ro.observe(DOM.videoViewport);
  }

  // ----- Record Video -----
  let mediaRecorder = null;
  let recordStream = null;

  function bindRecordEvents() {
    if (!DOM.recordBtn) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      DOM.recordBtn.disabled = true;
      DOM.recordBtn.title = 'Record Video requires HTTPS or localhost (secure context)';
      return;
    }
    DOM.recordBtn.addEventListener('click', toggleRecord);
  }

  function toggleRecord() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      DOM.recordBtn.textContent = '🔴 Record Video';
      DOM.recordBtn.classList.remove('recording');
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((stream) => {
      recordStream = stream;
      DOM.video.srcObject = stream;
      DOM.video.muted = true;
      DOM.video.play().catch(() => {});
      state.videoLoaded = true;
      DOM.videoHint.style.display = 'none';
      DOM.statusBadge.textContent = 'Recording...';
      enableMarkerButtons();
      setupVideoControlsState(false);
      const mime = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
      mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      mediaRecorder.onstop = () => {
        recordStream.getTracks().forEach(t => t.stop());
        DOM.video.srcObject = null;
        const blob = new Blob(chunks, { type: mime });
        loadVideoFromBlob(blob, 'recorded-' + Date.now() + '.webm');
      };
      mediaRecorder.start(100);
      DOM.recordBtn.textContent = '⏹️ Stop Recording';
      DOM.recordBtn.classList.add('recording');
    }).catch((err) => {
      alert('Could not access camera: ' + (err.message || 'Permission denied'));
    });
  }

  // ----- Init -----
  init();
})();
