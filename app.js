// ============================================================================
// TRACHOME (Empowering Every Breath, Everywhere.)
// TRACHEOSTOMY CARE LEARNING PLATFORM
// 3D Interactive Simulator — Direct Equipment Dragging + Real Sputum Photos +
// Auto Background Music + UI SFX + Fast Natural Thai Neural Voice + TH-ID Auth
// ============================================================================

const appState = {
  isAuthenticated: false,
  patientId: 'TH-841029',
  selectedTube: 'jackson', // 'jackson' | 'shiley' | 'fenestrated' | 'ttube'
  isCompletingStep: false,

  // Mode 1: 3D Tube Lab State
  labModuleIdx: 0,
  labPhase: 'demo1', // 'demo1' | 'demo2' | 'user'
  labDragPct: 0,
  labCompleted: {},

  // Mode 2: 3D Step-by-Step Guided Procedure State
  currentProcedure: 'wound', // 'wound' | 'inner' | 'suction' | 'humid'
  currentStepIndex: 0,
  guidedPhase: 'demo1', // 'demo1' | 'demo2' | 'user'
  guidedDragPct: 0,
  guidedWipeDirIdx: 0,
  guidedWipePct: 0,
  guidedCleanedQuads: new Set(),
  stepCheckpoints: {},

  // Mode 3: 3D Hands-On Practice State
  currentSimStage: 1,
  simPassed: { 1: false, 2: false, 3: false, 4: false },
  sim1Selected: new Set(),
  sim2CleanedQuads: new Set(),
  sim2WipePct: 0,
  sim3ScrubVal: 0,
  sim4ElapsedSeconds: 0,

  // Mode 4: Real Clinical Sputum & Stoma Photograph Comparison
  visualSec: 'clear',
  visualStoma: 'normal',

  // Mode 5: 8-Item Caregiver Competency State
  evalScores: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 },
  evalNotes: {
    1: 'ปฏิบัติผ่านระบบสาธิต 3 มิติ',
    2: 'เลือกอุปกรณ์ปราศจากเชื้อครบถ้วน',
    3: 'ลากเช็ดแผลรอบท่อจากด้านในออกด้านนอกครบ 4 ทิศ',
    4: 'จับแป้นประคองและถอดท่อชั้นในตามแนวโค้ง',
    5: 'สอดท่อชั้นในคืนและหมุนสลักล็อคแน่นหนา',
    6: 'ล้างมือหลังทำหัตถการครบถ้วน',
    7: 'แยกวิธีดูแลตามชนิดท่อและสลัดหยดน้ำแห้งสนิท',
    8: 'เทียบภาพถ่ายสีเสมหะจริงและลักษณะแผลถูกต้อง'
  }
};

let currentAudioPlayer = null;
let demoAnimInterval = null;
const audioPreloadCache = {};
let staticTtsManifest = {};

function loadStaticTtsManifest() {
  return fetch('tts_manifest.json')
    .then(r => (r.ok ? r.json() : {}))
    .then(m => { staticTtsManifest = m || {}; })
    .catch(() => { staticTtsManifest = {}; });
}

// ============================================================================
// 0. AUTO BACKGROUND MUSIC & TACTILE UI SOUND EFFECTS (SFX) ENGINE
// ============================================================================
let bgmAudioPlayer = null;
let bgmBlobUrl = null;
let sfxAudioCtx = null;
const BGM_VOL_NORMAL = 0.22;
const BGM_VOL_DUCKED = 0.09;

function getSfxAudioContext() {
  if (!sfxAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) sfxAudioCtx = new AudioCtx();
  }
  if (sfxAudioCtx && sfxAudioCtx.state === 'suspended') {
    sfxAudioCtx.resume().catch(() => {});
  }
  return sfxAudioCtx;
}

function playUiSound(type = 'click') {
  try {
    const ctx = getSfxAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(860, now + 0.045);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.055);
    } else if (type === 'drag') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.035);
      gain.gain.setValueAtTime(0.10, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
    } else if (type === 'success') {
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t0 = now + idx * 0.07;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.16, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.17);
      });
    } else if (type === 'alert') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(310, now);
      osc.frequency.linearRampToValueAtTime(220, now + 0.18);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.21);
    }
  } catch (e) {}
}

function buildWarmAmbientMusicWavBlobUrl() {
  if (bgmBlobUrl) return bgmBlobUrl;
  const sampleRate = 22050;
  const durationSec = 16;
  const numSamples = sampleRate * durationSec;
  const numChannels = 2;
  const bytesPerSample = 2;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const chords = [
    { pad: [174.61, 220.00, 261.63, 329.63], arp: [349.23, 440.00, 523.25, 659.25, 523.25, 440.00, 349.23, 523.25] },
    { pad: [130.81, 196.00, 246.94, 329.63], arp: [261.63, 392.00, 493.88, 659.25, 523.25, 392.00, 329.63, 493.88] },
    { pad: [146.83, 220.00, 261.63, 349.23], arp: [293.66, 440.00, 523.25, 698.46, 587.33, 440.00, 349.23, 523.25] },
    { pad: [116.54, 174.61, 220.00, 293.66], arp: [233.08, 349.23, 440.00, 587.33, 523.25, 440.00, 349.23, 440.00] }
  ];

  const twoPi = Math.PI * 2;
  let offset = 44;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const barIdx = Math.floor(t / 4) % 4;
    const barTime = t % 4;
    const chord = chords[barIdx];
    const padEnv = Math.sin((barTime / 4) * Math.PI);

    let padL = 0;
    let padR = 0;
    for (let n = 0; n < chord.pad.length; n++) {
      const f = chord.pad[n];
      padL += Math.sin(twoPi * f * t) * 0.14 + Math.sin(twoPi * (f * 2) * t) * 0.03;
      padR += Math.sin(twoPi * (f * 1.002) * t + 0.4) * 0.14 + Math.sin(twoPi * (f * 2.001) * t) * 0.03;
    }
    padL *= (0.45 + 0.55 * padEnv);
    padR *= (0.45 + 0.55 * padEnv);

    const noteStep = Math.floor(barTime / 0.5) % 8;
    const noteTime = barTime % 0.5;
    const noteFreq = chord.arp[noteStep];
    const attack = Math.min(1, noteTime / 0.025);
    const decay = Math.exp(-noteTime * 4.2);
    const noteEnv = attack * decay;
    const pan = (noteStep % 2 === 0) ? 0.85 : 1.15;

    const pianoWave = (Math.sin(twoPi * noteFreq * t) * 0.22 +
                       Math.sin(twoPi * noteFreq * 2 * t) * 0.06 * Math.exp(-noteTime * 7)) * noteEnv;

    const sampleL = Math.max(-0.95, Math.min(0.95, (padL + pianoWave * pan) * 0.55));
    const sampleR = Math.max(-0.95, Math.min(0.95, (padR + pianoWave * (2 - pan)) * 0.55));

    view.setInt16(offset, Math.floor(sampleL * 32767), true);
    view.setInt16(offset + 2, Math.floor(sampleR * 32767), true);
    offset += 4;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  bgmBlobUrl = URL.createObjectURL(blob);
  return bgmBlobUrl;
}

function ensureBackgroundMusicStarted() {
  if (!bgmAudioPlayer) {
    bgmAudioPlayer = new Audio(buildWarmAmbientMusicWavBlobUrl());
    bgmAudioPlayer.loop = true;
    bgmAudioPlayer.volume = currentAudioPlayer ? BGM_VOL_DUCKED : BGM_VOL_NORMAL;
    window.bgmAudioPlayer = bgmAudioPlayer;
  }
  if (bgmAudioPlayer.paused) {
    bgmAudioPlayer.play().catch(() => {});
  }
}

function setBackgroundMusicDucking(isDucked) {
  if (!bgmAudioPlayer) return;
  bgmAudioPlayer.volume = isDucked ? BGM_VOL_DUCKED : BGM_VOL_NORMAL;
}

// ============================================================================
// 1. FAST, ZERO-DELAY NATURAL THAI FEMALE VOICE ENGINE (/api/tts?rate=-6%)
// ============================================================================
function getTtsUrl(cleanText) {
  if (staticTtsManifest && staticTtsManifest[cleanText]) {
    return staticTtsManifest[cleanText];
  }
  return '/api/tts?rate=-16%25&text=' + encodeURIComponent(cleanText);
}

function preloadVoiceText(text) {
  const cleanText = (text || '').replace(/<[^>]+>/g, '').trim();
  if (!cleanText || audioPreloadCache[cleanText]) return;
  const url = getTtsUrl(cleanText);
  fetch(url)
    .then(r => r.blob())
    .then(blob => {
      if (blob && blob.size > 500) {
        audioPreloadCache[cleanText] = URL.createObjectURL(blob);
      }
    })
    .catch(() => {});
}

function stopActiveVoice() {
  if (currentAudioPlayer) {
    try {
      currentAudioPlayer.pause();
      currentAudioPlayer.currentTime = 0;
    } catch (e) {}
    currentAudioPlayer = null;
  }
  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }
  setBackgroundMusicDucking(false);
}

function speakNaturalThaiFemale(text, onEndedCallback) {
  stopActiveVoice();
  ensureBackgroundMusicStarted();
  const cleanText = (text || '').replace(/<[^>]+>/g, '').trim();
  if (!cleanText) {
    if (onEndedCallback) onEndedCallback();
    return;
  }

  let callbackFired = false;
  const finishOnce = () => {
    if (callbackFired) return;
    callbackFired = true;
    setBackgroundMusicDucking(false);
    if (onEndedCallback) onEndedCallback();
  };

  setBackgroundMusicDucking(true);
  const src = audioPreloadCache[cleanText] || getTtsUrl(cleanText);
  const audio = new Audio(src);
  currentAudioPlayer = audio;
  audio.playbackRate = 1.0;

  audio.onended = () => finishOnce();
  audio.onerror = () => setTimeout(finishOnce, 1200);

  audio.play().catch(() => {
    setTimeout(finishOnce, 1200);
  });
}

function speakTryFollowExample() {
  playUiSound('click');
  speakNaturalThaiFemale('ลองทำตามตัวอย่างดูนะคะ');
}

/**
 * Runs a slow, clear, deliberate 3D demonstration cycle:
 * - Glides smoothly 0% -> 100% (~2.4s)
 * - Holds at 100% (~0.65s) so the caregiver clearly sees the target position
 * - Glides back 100% -> 0% (~1.0s)
 * If loop=true, repeats continuously until cleared; if loop=false, calls onDone() once finished.
 */
function runSlow3dDemoAnimation(renderFn, loop = false, onDone = null) {
  if (demoAnimInterval) {
    clearInterval(demoAnimInterval);
    demoAnimInterval = null;
  }
  let frame = 0;
  const moveFrames = 44;  // 44 * 55ms = 2.42s slow forward motion
  const holdFrames = 12;  // 12 * 55ms = 0.66s hold at 100%
  const backFrames = 18;  // 18 * 55ms = 0.99s return to 0%
  const totalFrames = moveFrames + holdFrames + backFrames;

  renderFn(0);
  demoAnimInterval = setInterval(() => {
    frame++;
    let pct = 0;
    if (frame <= moveFrames) {
      // Smooth ease-in-out forward
      const t = frame / moveFrames;
      pct = (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2) * 100;
    } else if (frame <= moveFrames + holdFrames) {
      pct = 100;
    } else if (frame <= totalFrames) {
      const t = (frame - moveFrames - holdFrames) / backFrames;
      pct = (1 - t) * 100;
    } else {
      if (loop) {
        frame = 0;
        pct = 0;
      } else {
        clearInterval(demoAnimInterval);
        demoAnimInterval = null;
        renderFn(0);
        if (onDone) onDone();
        return;
      }
    }
    renderFn(pct);
  }, 55);
}

// ============================================================================
// 2. SILENT BACKGROUND AUTO-SYNC TO DATABASE
// ============================================================================
async function silentAutoSyncInteraction(activityText, secretionText, riskLevel, includeEval = false) {
  const tube = TUBE_TYPES[appState.selectedTube]?.shortName || 'ท่อโลหะ Jackson';
  const sec = secretionText || document.getElementById('logSecretion')?.value || 'ปกติ: เสมหะขาวใส แผลแห้งสะอาดดี';
  const risk = riskLevel || classifySecretionRisk(sec);

  const now = new Date();
  const dateStr = now.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }) + ' ' +
                  now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

  const logs = getHomeCareLogs();
  logs.unshift({
    date: dateStr,
    patientId: appState.patientId,
    tube,
    activity: activityText,
    secretion: sec,
    risk
  });
  localStorage.setItem('trachome_home_logs_v4', JSON.stringify(logs.slice(0, 40)));
  renderHomeCareLogs();
  renderEvaluationTable();

  try {
    await fetch('/api/gsheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'auto_interaction',
        patientId: appState.patientId,
        tubeType: tube,
        activity: activityText,
        secretionStatus: sec,
        riskLevel: risk,
        includeEval,
        scores: appState.evalScores,
        simStagesPassed: Object.values(appState.simPassed).filter(Boolean).length
      })
    });
  } catch (e) {}
}

// ============================================================================
// 3. PICTURE-IN-PICTURE (PiP) ANIMATED VISUAL COMPANION
// ============================================================================
function buildPipAnimationSvg(pipType) {
  const scenes = {
    pip_hold_flange: {
      label: 'มือหนึ่งจับแป้น • อีกมือดึงโค้งออก',
      svg: `<svg viewBox="0 0 150 95" width="100%" height="90">
        <rect x="72" y="25" width="12" height="45" rx="4" fill="#748da3" stroke="#fff" stroke-width="1.5"/>
        <circle cx="78" cy="25" r="8" fill="#fde047" opacity="0.85"/>
        <text x="78" y="15" text-anchor="middle" font-size="9" font-weight="700" fill="#fde047">มือจับแป้นนิ่ง</text>
        <path d="M72,48 Q115,48 120,82" fill="none" stroke="#94a3b8" stroke-width="11" stroke-linecap="round"/>
        <g class="anim-hand-cue">
          <path d="M35,42 Q75,42 82,74" fill="none" stroke="#e4ead7" stroke-width="7" stroke-linecap="round"/>
          <rect x="24" y="34" width="14" height="16" rx="3" fill="#525c32" stroke="#fff"/>
          <path d="M50,28 L22,28" stroke="#a3be5c" stroke-width="2.5" class="guide-arrow-track"/>
        </g>
      </svg>`
    },
    pip_rotate_lock: {
      label: 'หมุนสลักล็อคลง 90° ให้ดังคลิก',
      svg: `<svg viewBox="0 0 150 95" width="100%" height="90">
        <rect x="35" y="28" width="80" height="38" rx="12" fill="#4b5f73" stroke="#fff" stroke-width="1.5"/>
        <circle cx="75" cy="47" r="14" fill="#1e293b" stroke="#e4ead7" stroke-width="2"/>
        <path d="M75,20 A26,26 0 0,1 103,47" fill="none" stroke="#fde047" stroke-width="3" class="guide-arrow-track"/>
        <g class="anim-hand-cue">
          <rect x="70" y="25" width="10" height="22" rx="4" fill="#a3be5c" stroke="#fff" stroke-width="1.5"/>
        </g>
        <text x="75" y="82" text-anchor="middle" font-size="10" font-weight="800" fill="#a3be5c">🔒 หมุนล็อค 90°</text>
      </svg>`
    },
    pip_syringe_cuff: {
      label: 'กระบอกฉีดยาต่อกระเปาะลมสีฟ้า',
      svg: `<svg viewBox="0 0 150 95" width="100%" height="90">
        <ellipse cx="112" cy="48" rx="14" ry="18" fill="#b8cdd9" stroke="#fff" stroke-width="1.5"/>
        <rect x="90" y="43" width="10" height="10" rx="2" fill="#38bdf8"/>
        <rect x="42" y="39" width="48" height="18" rx="3" fill="rgba(255,255,255,0.85)" stroke="#4b5f73" stroke-width="1.5"/>
        <g class="anim-hand-cue">
          <rect x="14" y="43" width="32" height="10" rx="2" fill="#a3be5c" stroke="#fff"/>
          <rect x="10" y="37" width="5" height="22" rx="2" fill="#525c32"/>
        </g>
        <text x="75" y="80" text-anchor="middle" font-size="9" font-weight="700" fill="#e4ead7">ห้ามตัดหรือทิ่มสายกระเปาะลม</text>
      </svg>`
    },
    pip_obturator: {
      label: 'แกนนำหัวมน (ใส่ถุงเก็บหัวเตียง)',
      svg: `<svg viewBox="0 0 150 95" width="100%" height="90">
        <rect x="25" y="18" width="100" height="58" rx="8" fill="rgba(255,255,255,0.12)" stroke="#b8cdd9" stroke-dasharray="4 3"/>
        <path d="M42,45 Q95,45 104,64" fill="none" stroke="#e4ead7" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="105" cy="66" rx="5" ry="6" fill="#7d2930" stroke="#fff"/>
        <circle cx="38" cy="45" r="7" fill="none" stroke="#e4ead7" stroke-width="3"/>
        <text x="75" y="86" text-anchor="middle" font-size="9" font-weight="700" fill="#fde047">เก็บใส่ถุงสะอาดไว้หัวเตียงเสมอ</text>
      </svg>`
    },
    pip_boil_pot: {
      label: 'ต้มในน้ำเดือด 100°C นาน 30 นาที',
      svg: `<svg viewBox="0 0 150 95" width="100%" height="90">
        <ellipse cx="75" cy="82" rx="36" ry="5" fill="#ef4444"/>
        <rect x="35" y="34" width="80" height="44" rx="6" fill="#475569" stroke="#cbd5e1" stroke-width="2"/>
        <rect x="38" y="44" width="74" height="31" rx="4" fill="#38bdf8" fill-opacity="0.55"/>
        <path d="M52,55 Q82,55 92,70" fill="none" stroke="#f8fafc" stroke-width="7" stroke-linecap="round"/>
        <circle cx="58" cy="64" r="3.5" fill="#fff" class="boil-bubble-1"/>
        <circle cx="75" cy="68" r="4" fill="#fff" class="boil-bubble-2"/>
        <circle cx="92" cy="62" r="3.5" fill="#fff" class="boil-bubble-3"/>
        <text x="75" y="24" text-anchor="middle" font-size="9.5" font-weight="800" fill="#fde047">⏱️ ต้มในน้ำเดือด 30 นาที</text>
      </svg>`
    },
    pip_no_boil_plastic: {
      label: 'ห้ามต้มท่อพลาสติก (ล้าง 0.9% NSS)',
      svg: `<svg viewBox="0 0 150 95" width="100%" height="90">
        <rect x="16" y="36" width="50" height="36" rx="5" fill="#5c1f24" stroke="#eba8ae" stroke-width="1.5"/>
        <line x1="16" y1="36" x2="66" y2="72" stroke="#ef4444" stroke-width="3"/>
        <line x1="66" y1="36" x2="16" y2="72" stroke="#ef4444" stroke-width="3"/>
        <text x="41" y="26" text-anchor="middle" font-size="9" font-weight="800" fill="#eba8ae">🚫 ห้ามต้มเดือด!</text>
        <path d="M82,42 L90,72 L132,72 L140,42 Z" fill="#b8cdd9" stroke="#fff" stroke-width="1.5"/>
        <text x="111" y="61" text-anchor="middle" font-size="9" font-weight="800" fill="#1e293b">0.9% NSS</text>
        <text x="111" y="26" text-anchor="middle" font-size="9" font-weight="800" fill="#a3be5c">✅ ล้างน้ำเกลือ</text>
      </svg>`
    },
    pip_wipe_outward: {
      label: 'ลากไม้พันสำลีจากโคนท่อออกด้านนอก',
      svg: `<svg viewBox="0 0 150 95" width="100%" height="90">
        <circle cx="75" cy="48" r="14" fill="#5c1f24" stroke="#fff" stroke-width="2"/>
        <path d="M75,30 L75,10 M75,66 L75,84 M93,48 L125,48 M57,48 L25,48" stroke="#fde047" stroke-width="3" class="guide-arrow-track"/>
        <g class="anim-hand-cue">
          <line x1="88" y1="38" x2="128" y2="14" stroke="#d97706" stroke-width="3.5" stroke-linecap="round"/>
          <ellipse cx="86" cy="39" rx="6" ry="4" fill="#ffffff" stroke="#cbd5e1"/>
        </g>
      </svg>`
    },
    pip_ygauze_2person: {
      label: 'สอดผ้าก๊อซตัว Y ไร้ขุยรองใต้แป้นท่อ',
      svg: `<svg viewBox="0 0 150 95" width="100%" height="90">
        <rect x="44" y="16" width="62" height="58" rx="6" fill="#ffffff" stroke="#a3be5c" stroke-width="2.5"/>
        <path d="M75,16 L75,42" stroke="#1e293b" stroke-width="5"/>
        <circle cx="75" cy="45" r="9" fill="#4b5f73" stroke="#fde047" stroke-width="2"/>
        <text x="75" y="86" text-anchor="middle" font-size="9" font-weight="800" fill="#fde047">🩹 ผ้าก๊อซตัว Y ไร้ขุยรองใต้แป้น</text>
      </svg>`
    },
    pip_brush_scrub: {
      label: 'ลากแปรงขนนุ่มขัดเสมหะในรูท่อ',
      svg: `<svg viewBox="0 0 150 95" width="100%" height="90">
        <path d="M35,35 Q95,35 105,75" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="18" stroke-linecap="round"/>
        <g class="anim-hand-cue">
          <path d="M18,35 Q85,35 95,68" fill="none" stroke="#fde047" stroke-width="3"/>
          <ellipse cx="75" cy="44" rx="14" ry="6" fill="#ffffff" stroke="#94a3b8" stroke-dasharray="2 2"/>
        </g>
      </svg>`
    },
    pip_suction_valve: {
      label: 'สอดเข้ารูท่อ • ปิดรูดูดหมุนดึงขึ้น ≤12วิ',
      svg: `<svg viewBox="0 0 150 95" width="100%" height="90">
        <circle cx="95" cy="48" r="16" fill="#4b5f73" stroke="#fff" stroke-width="2"/>
        <circle cx="95" cy="48" r="9" fill="#0f172a"/>
        <path d="M25,48 Q65,48 95,48" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
        <rect x="20" y="40" width="18" height="16" rx="3" fill="#38bdf8" stroke="#fde047" stroke-width="1.5"/>
        <text x="75" y="86" text-anchor="middle" font-size="9" font-weight="800" fill="#fde047">สอดสายเข้ารูท่อเจาะคอที่ลำคอ</text>
      </svg>`
    }
  };

  const sc = scenes[pipType] || scenes.pip_hold_flange;
  return `${sc.svg}<div class="pip-label-tag">${sc.label}</div>`;
}

// ============================================================================
// 4. DIRECT ON-EQUIPMENT POINTER DRAGGING ENGINE
// ============================================================================
function attachDirectEquipmentDrag(containerEl, dirX, dirY, dragDistPx, onProgress, onComplete) {
  if (!containerEl) return;
  const svg = containerEl.querySelector('svg');
  const handle = containerEl.querySelector('.direct-drag-handle');
  if (!svg || !handle) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startPct = 0;

  const len = Math.hypot(dirX, dirY) || 1;
  const nx = dirX / len;
  const ny = dirY / len;

  const onPointerDown = (e) => {
    if (appState.isCompletingStep) return;
    if (demoAnimInterval) {
      clearInterval(demoAnimInterval);
      demoAnimInterval = null;
    }
    playUiSound('drag');
    isDragging = true;
    startX = e.clientX ?? (e.touches?.[0]?.clientX || 0);
    startY = e.clientY ?? (e.touches?.[0]?.clientY || 0);
    startPct = Number(handle.dataset.pct || 0);
    try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (!isDragging || appState.isCompletingStep) return;
    const cx = e.clientX ?? (e.touches?.[0]?.clientX || 0);
    const cy = e.clientY ?? (e.touches?.[0]?.clientY || 0);
    const dx = cx - startX;
    const dy = cy - startY;

    const proj = dx * nx + dy * ny;
    const deltaPct = (proj / (dragDistPx || 100)) * 100;
    const nextPct = Math.max(0, Math.min(100, startPct + deltaPct));

    if (onProgress) onProgress(nextPct);

    if (nextPct >= 92 && !appState.isCompletingStep) {
      appState.isCompletingStep = true;
      isDragging = false;
      playUiSound('success');
      if (onComplete) onComplete();
    }
  };

  const onPointerUp = () => {
    isDragging = false;
  };

  handle.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

// ============================================================================
// 5. 4 TRACHEOSTOMY TUBE DEFINITIONS & REALISTIC 3D HOSPITAL MANNEQUIN ENGINE
// ============================================================================
const TUBE_TYPES = {
  jackson: {
    id: 'jackson',
    name: '1. ท่อโลหะเงิน Jackson',
    shortName: 'ท่อโลหะ Jackson',
    tag: 'ไม่มีลูกโป่ง • ต้มในน้ำเดือด 100°C นาน 30 นาที',
    icon: `<svg viewBox="0 0 48 48" width="34" height="34" fill="none">
      <defs>
        <linearGradient id="icJacksonMetal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f8fafc"/>
          <stop offset="50%" stop-color="#94a3b8"/>
          <stop offset="100%" stop-color="#e2e8f0"/>
        </linearGradient>
      </defs>
      <!-- Curved Silver Metal Cannula (Uncuffed) -->
      <path d="M12,18 Q32,18 33,38" stroke="url(#icJacksonMetal)" stroke-width="8" stroke-linecap="round"/>
      <path d="M12,18 Q32,18 33,38" stroke="#475569" stroke-width="1.2" stroke-linecap="round" opacity="0.45"/>
      <!-- Neck Flange & Cam-Lock Latch -->
      <rect x="13" y="9" width="5" height="18" rx="2.5" fill="#cbd5e1" stroke="#334155" stroke-width="1.3"/>
      <rect x="7" y="13" width="7" height="10" rx="2" fill="#e2e8f0" stroke="#334155" stroke-width="1.3"/>
      <circle cx="15.5" cy="12" r="2.2" fill="#fde047" stroke="#334155" stroke-width="1"/>
    </svg>`,
    hasCuff: false,
    hasFenestration: false,
    isTTube: false,
    boilingAllowed: true
  },
  shiley: {
    id: 'shiley',
    name: '2. ท่อพลาสติกมีลูกโป่ง Shiley',
    shortName: 'ท่อพลาสติก Shiley',
    tag: 'มีกระเปาะลมสีฟ้า • ห้ามต้มในน้ำเดือดเด็ดขาด!',
    icon: `<svg viewBox="0 0 48 48" width="34" height="34" fill="none">
      <!-- White Plastic Curved Cannula -->
      <path d="M12,16 Q30,16 31,37" stroke="#ffffff" stroke-width="7.5" stroke-linecap="round"/>
      <path d="M12,16 Q30,16 31,37" stroke="#64748b" stroke-width="1.4" stroke-linecap="round" fill="none"/>
      <!-- Soft Inflated Cuff Balloon at Distal Tip -->
      <ellipse cx="31" cy="31" rx="7.5" ry="5.5" fill="rgba(56,189,248,0.45)" stroke="#0284c7" stroke-width="1.5"/>
      <!-- Pilot Line & Sky-Blue Pilot Balloon -->
      <path d="M25,27 Q14,32 10,36" stroke="#38bdf8" stroke-width="1.4"/>
      <ellipse cx="9.5" cy="37.5" rx="4.5" ry="2.8" transform="rotate(-25 9.5 37.5)" fill="#38bdf8" stroke="#0369a1" stroke-width="1.2"/>
      <!-- Butterfly Flange & 15mm Hub -->
      <rect x="13" y="8" width="5" height="16" rx="2.5" fill="#e2e8f0" stroke="#475569" stroke-width="1.3"/>
      <rect x="6" y="11" width="8" height="10" rx="2" fill="#f8fafc" stroke="#475569" stroke-width="1.3"/>
    </svg>`,
    hasCuff: true,
    hasFenestration: false,
    isTTube: false,
    boilingAllowed: false
  },
  fenestrated: {
    id: 'fenestrated',
    name: '3. ท่อพลาสติกมีรูพูด Fenestrated',
    shortName: 'ท่อมีรูพูด Fenestrated',
    tag: 'มีรูเปิดด้านบนให้ลมผ่านกล่องเสียง • ห้ามต้มในน้ำเดือด!',
    icon: `<svg viewBox="0 0 48 48" width="34" height="34" fill="none">
      <!-- Plastic Curved Cannula -->
      <path d="M11,22 Q30,22 32,40" stroke="#f8fafc" stroke-width="8" stroke-linecap="round"/>
      <path d="M11,22 Q30,22 32,40" stroke="#4b5f73" stroke-width="1.4" stroke-linecap="round"/>
      <!-- Highlighted Fenestration Hole Window on Upper Curve -->
      <ellipse cx="26.5" cy="21" rx="4.2" ry="2.4" transform="rotate(20 26.5 21)" fill="#fde047" stroke="#7d2930" stroke-width="1.5"/>
      <!-- Airflow Waves Rising Upward to Vocal Cords -->
      <path d="M26.5,16 V7 M23.5,10 L26.5,6.5 L29.5,10" stroke="#525c32" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Flange & Hub -->
      <rect x="12" y="14" width="5" height="16" rx="2.5" fill="#dfe7ef" stroke="#4b5f73" stroke-width="1.3"/>
      <rect x="6" y="17" width="7" height="10" rx="2" fill="#ffffff" stroke="#4b5f73" stroke-width="1.3"/>
    </svg>`,
    hasCuff: false,
    hasFenestration: true,
    isTTube: false,
    boilingAllowed: false
  },
  ttube: {
    id: 'ttube',
    name: '4. ท่อซิลิโคนตัวที Koken T-Tube',
    shortName: 'ท่อซิลิโคน T-Tube',
    tag: 'ไม่มีท่อชั้นใน • ต้องปิดจุกด้านหน้าเสมอ • ห้ามต้ม!',
    icon: `<svg viewBox="0 0 48 48" width="34" height="34" fill="none">
      <!-- Vertical Silicone Tracheal Stent Limb -->
      <rect x="26" y="6" width="10" height="36" rx="4.5" fill="rgba(184,205,217,0.85)" stroke="#4b5f73" stroke-width="1.6"/>
      <!-- Horizontal Side Limb -->
      <rect x="11" y="19" width="18" height="10" rx="3.5" fill="rgba(223,231,239,0.95)" stroke="#4b5f73" stroke-width="1.6"/>
      <!-- Front Plug Cap -->
      <rect x="6" y="17.5" width="6.5" height="13" rx="2.5" fill="#525c32" stroke="#3d4524" stroke-width="1.3"/>
    </svg>`,
    hasCuff: false,
    hasFenestration: false,
    isTTube: true,
    boilingAllowed: false
  }
};

/**
 * Renders the 3D Neck & Trachea Mannequin with realistic clinical equipment:
 * - True boiling pot immersion (moves Jackson inner cannula all the way into the boiling water + 30:00 timer)
 * - Clearly visible 3D non-woven Y-Gauze pad sliding out/in under the flange
 * - Directional 4-quadrant cotton swab dragging outward from inner stoma rim
 * - Realistic suction catheter entering directly into the circular tracheostomy tube hole at the neck
 */
let svg3dUidCounter = 0;

function build3dMannequinSvg(opts = {}) {
  const uid = 'm3d_' + (++svg3dUidCounter) + '_';
  const tube = TUBE_TYPES[opts.tubeId || appState.selectedTube] || TUBE_TYPES.jackson;
  const slidePct = Number(opts.slidePct ?? 0);
  const lockDeg = Number(opts.lockDeg ?? 90);
  const cuffPct = Number(opts.cuffPct ?? 65);
  const showObturator = !!opts.showObturator;
  const boilMode = opts.boilMode || null;
  const showYgauze = opts.showYgauze !== undefined ? opts.showYgauze : true;
  const ygauzeMode = opts.ygauzeMode || 'static'; // 'pull_old' | 'insert_new' | 'static'
  const showWipeZones = !!opts.showWipeZones;
  const activeWipeDir = Number(opts.activeWipeDir ?? 0);
  const wipeDragPct = Number(opts.wipeDragPct ?? 0);
  const cleanedQuads = opts.cleanedQuads || new Set();
  const showBrush = !!opts.showBrush;
  const showSuctionCatheter = !!opts.showSuctionCatheter;
  const suctionMode = opts.suctionMode || 'withdraw'; // 'insert' | 'withdraw'
  const suctionDepthPct = Number(opts.suctionDepthPct ?? 0);
  const showMucus = !!opts.showMucus;
  const showNebulizer = !!opts.showNebulizer;
  const dragMode = opts.dragMode || null;

  const isLocked = lockDeg >= 75;
  const dx = -(slidePct * 1.15);
  const dy = -(slidePct * 0.35);

  // When boiling: move Jackson inner cannula all the way into the boiling pot (x=220 + 315 = 535)!
  // When brushing: keep inner cannula stationary while the yellow brush scrubs inside it!
  const maxBoilDx = tube.boilingAllowed ? 310 : 145;
  const maxBoilDy = tube.boilingAllowed ? 22 : -10;
  const boilDx = boilMode === 'boiling_pot' ? (slidePct / 100) * maxBoilDx : (showBrush ? 0 : dx);
  const boilDy = boilMode === 'boiling_pot' ? (slidePct / 100) * maxBoilDy : (showBrush ? 0 : dy);
  const isSubmergedInPot = boilMode === 'boiling_pot' && tube.boilingAllowed && slidePct >= 65;

  // Y-Gauze position offset for pull_old or insert_new
  let ygauzeDx = 0;
  let ygauzeIsSoiled = false;
  if (ygauzeMode === 'pull_old') {
    ygauzeDx = -(slidePct * 1.45);
    ygauzeIsSoiled = true;
  } else if (ygauzeMode === 'insert_new') {
    ygauzeDx = -((100 - slidePct) * 1.45);
  }

  // Directional Wiping Swab Coordinates for each of the 4 directions
  const wipeDirs = [
    { label: '1. ลากไม้พันสำลีปาดขึ้นด้านบน ⬆️', sx: 310, sy: 148, vx: 0, vy: -52, arrow: 'M310,145 L310,88' },
    { label: '2. ลากไม้พันสำลีปาดออกทางขวา ➡️', sx: 342, sy: 176, vx: 62, vy: 0, arrow: 'M345,176 L412,176' },
    { label: '3. ลากไม้พันสำลีปาดลงด้านล่าง ⬇️', sx: 310, sy: 205, vx: 0, vy: 52, arrow: 'M310,208 L310,262' },
    { label: '4. ลากไม้พันสำลีปาดออกทางซ้าย ⬅️', sx: 278, sy: 145, vx: -62, vy: -22, arrow: 'M275,145 L210,122' }
  ];
  const curWipe = wipeDirs[Math.min(3, activeWipeDir)];
  const swabX = curWipe.sx + (wipeDragPct / 100) * curWipe.vx;
  const swabY = curWipe.sy + (wipeDragPct / 100) * curWipe.vy;

  return `
    <svg viewBox="0 0 700 325" width="100%" height="315" style="max-width:700px; overflow:visible; user-select:none;">
      <defs>
        <radialGradient id="${uid}skin3dGrad" cx="38%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#f5dcc4"/>
          <stop offset="55%" stop-color="#deb896"/>
          <stop offset="100%" stop-color="#b08868"/>
        </radialGradient>
        <linearGradient id="${uid}trachea3dGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#8c3b46"/>
          <stop offset="50%" stop-color="#c9717c"/>
          <stop offset="100%" stop-color="#752d37"/>
        </linearGradient>
        <linearGradient id="${uid}metal3dGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="35%" stop-color="#cbd5e1"/>
          <stop offset="70%" stop-color="#64748b"/>
          <stop offset="100%" stop-color="#f1f5f9"/>
        </linearGradient>
        <linearGradient id="${uid}spinach3dGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#7c8c4b"/>
          <stop offset="100%" stop-color="#3d4524"/>
        </linearGradient>
        <linearGradient id="${uid}placid3dGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#8ca5bc"/>
          <stop offset="100%" stop-color="#3b4d5e"/>
        </linearGradient>
        <linearGradient id="${uid}boilWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#7dd3fc" stop-opacity="0.82"/>
          <stop offset="100%" stop-color="#0284c7" stop-opacity="0.92"/>
        </linearGradient>
        <pattern id="${uid}gauzeWeave" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M 6 0 L 0 0 0 6" fill="none" stroke="#cbd5e1" stroke-width="0.8"/>
        </pattern>
        <filter id="${uid}drop3dShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#000000" flood-opacity="0.42"/>
        </filter>
      </defs>

      <!-- =============================================================== -->
      <!-- 1. 3D HEAD, JAW, NECK & SHOULDERS MANNEQUIN                     -->
      <!-- =============================================================== -->
      <g filter="url(#${uid}drop3dShadow)">
        <path d="M150,310 C155,245 215,232 255,224 L365,224 C405,232 465,245 470,310 Z" fill="url(#${uid}skin3dGrad)" stroke="#9e7656" stroke-width="2"/>
        <path d="M168,310 C180,262 230,250 310,250 C390,250 440,262 452,310 Z" fill="#3b4d5e" stroke="#748da3" stroke-width="2"/>
        <rect x="252" y="88" width="116" height="156" rx="34" fill="url(#${uid}skin3dGrad)" stroke="#9e7656" stroke-width="2"/>
        <path d="M230,45 C230,15 390,15 390,45 C390,82 362,106 310,106 C258,106 230,82 230,45 Z" fill="url(#${uid}skin3dGrad)" stroke="#9e7656" stroke-width="2"/>
        <path d="M255,84 Q310,102 365,84" fill="none" stroke="#8c6244" stroke-width="2.5" opacity="0.55"/>
      </g>

      <!-- =============================================================== -->
      <!-- 2. 3D CUTAWAY TRACHEA AIRWAY LUMEN & CARTILAGE RINGS            -->
      <!-- =============================================================== -->
      <g>
        <rect x="278" y="102" width="64" height="172" rx="22" fill="url(#${uid}trachea3dGrad)" stroke="#5c1f24" stroke-width="2.5"/>
        <path d="M282,118 Q310,126 338,118" fill="none" stroke="#f5e4e6" stroke-width="4" opacity="0.32" stroke-linecap="round"/>
        <path d="M282,140 Q310,148 338,140" fill="none" stroke="#f5e4e6" stroke-width="4" opacity="0.32" stroke-linecap="round"/>
        <path d="M282,212 Q310,220 338,212" fill="none" stroke="#f5e4e6" stroke-width="4" opacity="0.32" stroke-linecap="round"/>
        <path d="M282,236 Q310,244 338,236" fill="none" stroke="#f5e4e6" stroke-width="4" opacity="0.32" stroke-linecap="round"/>
        <path d="M282,260 Q310,268 338,260" fill="none" stroke="#f5e4e6" stroke-width="4" opacity="0.32" stroke-linecap="round"/>
        <ellipse cx="310" cy="176" rx="26" ry="24" fill="#3d1115" stroke="#eba8ae" stroke-width="2"/>
      </g>

      <!-- =============================================================== -->
      <!-- 3. 3D STERILE Y-GAUZE PAD & NECK TIE STRAP                      -->
      <!-- =============================================================== -->
      ${showYgauze ? `
        <g transform="translate(${ygauzeDx}, 0)" class="${dragMode === 'drag_ygauze' ? 'direct-drag-handle' : ''}" data-pct="${slidePct}" filter="url(#${uid}drop3dShadow)">
          <!-- Large Clearly Visible Sterile Non-Woven Y-Gauze Pad -->
          <rect x="252" y="124" width="116" height="104" rx="10" fill="${ygauzeIsSoiled ? '#fef08a' : '#ffffff'}" stroke="${dragMode === 'drag_ygauze' ? '#fde047' : '#a3be5c'}" stroke-width="3"/>
          <rect x="252" y="124" width="116" height="104" rx="10" fill="url(#${uid}gauzeWeave)" opacity="0.65"/>
          ${ygauzeIsSoiled ? `
            <!-- Old Mucus Stain on Old Gauze -->
            <ellipse cx="310" cy="182" rx="28" ry="22" fill="#eab308" opacity="0.45"/>
            <text x="310" y="220" text-anchor="middle" font-size="9.5" font-weight="800" fill="#854d0e">คราบเสมหะบนก๊อซเก่า</text>
          ` : `
            <text x="310" y="220" text-anchor="middle" font-size="9.5" font-weight="800" fill="#3d4524">ผ้าก๊อซตัว Y ไร้ขุย</text>
          `}
          <!-- Y-Cut Keyhole Slit from top edge to center stoma hole -->
          <path d="M306,124 L306,165 M314,124 L314,165" stroke="#525c32" stroke-width="2"/>
          <rect x="307" y="124" width="6" height="44" fill="#8c3b46"/>
          <circle cx="310" cy="176" r="16" fill="#3d1115" stroke="#cbd5e1" stroke-width="2"/>
          ${dragMode === 'drag_ygauze' ? `
            <circle cx="256" cy="176" r="22" fill="none" stroke="#fde047" stroke-width="3" class="anim-pulse-ring"/>
            <text x="175" y="172" text-anchor="middle" font-size="11.5" font-weight="800" fill="#fde047">
              ${ygauzeMode === 'pull_old' ? '👆 กดลากผ้าก๊อซเก่าออกทางซ้าย ⬅️' : '👆 กดลากผ้าก๊อซตัว Y สอดเข้าใต้แป้น ➡️'}
            </text>
          ` : ''}
        </g>
        ${dragMode === 'drag_ygauze' ? `
          <path d="${ygauzeMode === 'pull_old' ? 'M245,176 L130,176' : 'M135,176 L245,176'}" fill="none" stroke="#fde047" stroke-width="4.5" class="guide-arrow-track"/>
        ` : ''}
      ` : ''}

      <!-- Cotton Neck Tie Strap -->
      <path d="M250,173 Q265,176 276,176 M344,176 Q355,176 370,173" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>

      <!-- =============================================================== -->
      <!-- 4. 3D BOILING WATER POT 100°C (With 30-Min Timer & Immersion)   -->
      <!-- =============================================================== -->
      ${boilMode === 'boiling_pot' ? `
        <g transform="translate(465, 92)" filter="url(#${uid}drop3dShadow)">
          <!-- Red-Hot Stove Burner -->
          <ellipse cx="82" cy="166" rx="68" ry="10" fill="#991b1b" stroke="#f87171" stroke-width="2"/>
          <ellipse cx="82" cy="164" rx="52" ry="6" fill="#ef4444" class="anim-pulse-ring"/>
          <text x="82" y="187" text-anchor="middle" font-size="11" font-weight="800" fill="#fde047">🔥 ต้มในน้ำเดือดพล่าน 100°C (นาน 30 นาที)</text>

          <!-- Stainless Steel Pot Handles & Body -->
          <path d="M-2,65 L12,65 L12,88 L-2,88 Z M152,65 L166,65 L166,88 L152,88 Z" fill="none" stroke="#cbd5e1" stroke-width="5"/>
          <rect x="12" y="42" width="140" height="118" rx="12" fill="#334155" stroke="#e2e8f0" stroke-width="3.5"/>

          <!-- Boiling Water Inside Pot -->
          <rect x="17" y="64" width="130" height="91" rx="8" fill="url(#${uid}boilWaterGrad)"/>
          <path d="M17,66 Q48,58 82,66 T147,66" fill="none" stroke="#e0f2fe" stroke-width="3"/>

          <!-- Animated Boiling Bubbles -->
          <circle cx="45" cy="135" r="5" fill="#ffffff" opacity="0.85" class="boil-bubble-1"/>
          <circle cx="72" cy="142" r="6.5" fill="#ffffff" opacity="0.85" class="boil-bubble-2"/>
          <circle cx="102" cy="130" r="5.5" fill="#ffffff" opacity="0.85" class="boil-bubble-3"/>
          <circle cx="122" cy="140" r="4.5" fill="#ffffff" opacity="0.85" class="boil-bubble-1"/>
          ${isSubmergedInPot ? `
            <circle cx="65" cy="112" r="6" fill="#fde047" opacity="0.9" class="boil-bubble-2"/>
            <circle cx="95" cy="116" r="5" fill="#ffffff" opacity="0.9" class="boil-bubble-1"/>
          ` : ''}

          <!-- Rising Steam Waves -->
          <path d="M48,34 Q42,18 52,4" fill="none" stroke="#e2e8f0" stroke-width="3" stroke-linecap="round" class="steam-anim"/>
          <path d="M82,32 Q76,14 86,0" fill="none" stroke="#e2e8f0" stroke-width="3" stroke-linecap="round" class="steam-anim"/>
          <path d="M116,34 Q110,18 120,4" fill="none" stroke="#e2e8f0" stroke-width="3" stroke-linecap="round" class="steam-anim"/>

          <!-- Prominent 30-Minute Boiling Timer Badge -->
          <rect x="8" y="-14" width="148" height="30" rx="15" fill="${isSubmergedInPot ? '#15803d' : '#5c1f24'}" stroke="#fde047" stroke-width="2.5"/>
          <text x="82" y="5" text-anchor="middle" font-size="11" font-weight="800" fill="#ffffff">
            ⏱️ ${isSubmergedInPot ? 'กำลังต้มฆ่าเชื้อ 30:00 นาที!' : 'ต้มในน้ำเดือด 100°C • 30 นาที'}
          </text>

          <!-- Prohibition Shield if Plastic/Silicone Tube approaches Boiling Pot -->
          ${(!tube.boilingAllowed && slidePct > 18) ? `
            <g transform="translate(82, 96)">
              <circle cx="0" cy="0" r="48" fill="rgba(125, 41, 48, 0.96)" stroke="#fde047" stroke-width="3.5"/>
              <line x1="-30" y1="-30" x2="30" y2="30" stroke="#ffffff" stroke-width="6"/>
              <text x="0" y="-4" text-anchor="middle" font-size="11.5" font-weight="800" fill="#fde047">🚫 ห้ามต้มเด็ดขาด!</text>
              <text x="0" y="14" text-anchor="middle" font-size="10" font-weight="700" fill="#ffffff">ท่อพลาสติกละลาย!</text>
            </g>
          ` : ''}
        </g>
      ` : ''}

      <!-- =============================================================== -->
      <!-- 5. 3D TRACHEOSTOMY TUBE AT THE NECK                             -->
      <!-- =============================================================== -->
      <g filter="url(#${uid}drop3dShadow)">
        ${tube.isTTube ? `
          <!-- Koken Silicone T-Tube -->
          <rect x="294" y="114" width="32" height="128" rx="12" fill="rgba(223, 231, 239, 0.78)" stroke="#ffffff" stroke-width="2.5"/>
          <rect x="218" y="162" width="82" height="28" rx="10" fill="rgba(223, 231, 239, 0.9)" stroke="#ffffff" stroke-width="2.5"/>
          <g transform="translate(${dx * 0.45}, 0)" class="${dragMode ? 'direct-drag-handle' : ''}" data-pct="${slidePct}">
            <rect x="195" y="160" width="22" height="32" rx="6" fill="url(#${uid}spinach3dGrad)" stroke="#fde047" stroke-width="2.5"/>
            <text x="206" y="146" text-anchor="middle" font-size="11" font-weight="800" fill="#fde047">👆 จับจุกปิด T-Tube ลากตามลูกศร</text>
          </g>
        ` : `
          <!-- Outer Cannula inside Trachea -->
          <path d="M276,176 Q310,176 310,248" fill="none" stroke="rgba(255,255,255,0.48)" stroke-width="24" stroke-linecap="round"/>

          <!-- 3D Inflatable Tracheal Cuff & 10mL Syringe (Only on Shiley Cuffed) -->
          ${tube.hasCuff ? `
            <ellipse cx="310" cy="238" rx="${15 + (cuffPct / 100) * 16}" ry="${11 + (cuffPct / 100) * 9}"
                     fill="rgba(184, 205, 217, 0.78)" stroke="#ffffff" stroke-width="2.5"/>
            <path d="M318,225 C355,212 375,160 402,136" fill="none" stroke="#b8cdd9" stroke-width="2.5" stroke-dasharray="4 2"/>
            <g transform="translate(402, 118)">
              <ellipse cx="18" cy="14" rx="13" ry="10 + ${(cuffPct / 100) * 5}" fill="#7dd3fc" stroke="#ffffff" stroke-width="2"/>
              <text x="18" y="-3" text-anchor="middle" font-size="10" font-weight="800" fill="#dfe7ef">Pilot Balloon (${Math.round(cuffPct)}%)</text>
              <rect x="31" y="9" width="10" height="10" rx="2" fill="#0284c7"/>
              <rect x="41" y="4" width="64" height="20" rx="3" fill="rgba(255,255,255,0.88)" stroke="#4b5f73" stroke-width="2"/>
              <line x1="55" y1="4" x2="55" y2="11" stroke="#334155" stroke-width="1.5"/>
              <line x1="70" y1="4" x2="70" y2="11" stroke="#334155" stroke-width="1.5"/>
              <line x1="85" y1="4" x2="85" y2="11" stroke="#334155" stroke-width="1.5"/>
              <g transform="translate(${(100 - cuffPct) * 0.36}, 0)" class="${dragMode === 'syringe_cuff' ? 'direct-drag-handle' : ''}" data-pct="${cuffPct}">
                <rect x="44" y="7" width="10" height="14" rx="2" fill="#1e293b"/>
                <rect x="54" y="11" width="56" height="6" fill="#cbd5e1" stroke="#475569"/>
                <rect x="108" y="3" width="8" height="22" rx="3" fill="url(#${uid}spinach3dGrad)" stroke="#fde047" stroke-width="2"/>
                ${dragMode === 'syringe_cuff' ? `
                  <text x="75" y="42" text-anchor="middle" font-size="11" font-weight="800" fill="#fde047">👆 กดลากก้านไซริงค์เช็คลม ↔️</text>
                ` : ''}
              </g>
            </g>
          ` : ''}

          <!-- Fenestration Hole (Only on Fenestrated Tube) -->
          ${tube.hasFenestration ? `
            <ellipse cx="292" cy="180" rx="13" ry="7" fill="#fde047" stroke="#7d2930" stroke-width="2.5"/>
            <path d="M292,172 L292,122" stroke="#a3be5c" stroke-width="3" stroke-dasharray="5 4"/>
          ` : ''}

          <!-- Realistic Butterfly Neck Flange -->
          <path d="M262,162 C262,150 282,154 295,160 L325,160 C338,154 358,150 358,162 L358,190 C358,202 338,198 325,192 L295,192 C282,198 262,202 262,190 Z" fill="url(#${uid}placid3dGrad)" stroke="#ffffff" stroke-width="2" opacity="${showYgauze && dragMode === 'drag_ygauze' ? '0.62' : '1'}"/>
          <circle cx="272" cy="176" r="4.5" fill="#1e293b"/>
          <circle cx="348" cy="176" r="4.5" fill="#1e293b"/>
          <text x="326" y="179" font-size="8" font-weight="800" fill="#ffffff">${tube.id === 'jackson' ? 'JACKSON 6' : 'SHILEY 6'}</text>

          <!-- 3D Inner Cannula (Moves into the Boiling Pot at 100%!) -->
          <g transform="translate(${boilDx}, ${boilDy})" class="${(dragMode === 'pull_inner' || dragMode === 'drag_to_boil') ? 'direct-drag-handle' : ''}" data-pct="${slidePct}">
            <path d="M220,176 Q306,176 310,240" fill="none" stroke="url(#${uid}metal3dGrad)" stroke-width="14" stroke-linecap="round"/>
            <!-- 15mm Universal Connector / Circular Tracheostomy Tube Opening at the Neck -->
            <rect x="202" y="161" width="24" height="30" rx="6" fill="url(#${uid}spinach3dGrad)" stroke="${(dragMode === 'pull_inner' || dragMode === 'drag_to_boil') ? '#fde047' : '#e4ead7'}" stroke-width="2.5"/>
            <!-- Open Stoma / Cannula Hole at the Neck (cx=202, cy=176) -->
            <ellipse cx="202" cy="176" rx="6.5" ry="12.5" fill="#0f172a" stroke="#fde047" stroke-width="1.8"/>

            ${showBrush ? `
              <!-- 3D Curved Wire-Bristle Tracheostomy Brush inside Inner Cannula -->
              <g transform="translate(${-(100 - slidePct) * 0.65}, 0)" class="direct-drag-handle" data-pct="${slidePct}">
                <circle cx="122" cy="176" r="24" fill="rgba(253, 224, 71, 0.22)" stroke="#fde047" stroke-width="2.5" class="anim-pulse-ring"/>
                <path d="M132,176 Q255,176 288,218" fill="none" stroke="#fde047" stroke-width="4.5" stroke-linecap="round"/>
                <ellipse cx="242" cy="181" rx="20" ry="9" fill="#ffffff" stroke="#94a3b8" stroke-width="2" stroke-dasharray="3 2"/>
                <circle cx="122" cy="176" r="12" fill="#525c32" stroke="#fde047" stroke-width="3.5"/>
                <text x="145" y="144" text-anchor="middle" font-size="12" font-weight="800" fill="#fde047">👆 กดค้างที่ด้ามแปรงสีเหลืองแล้วลากไปทางขวา ➡️</text>
              </g>
              <path d="M105,204 L195,204" fill="none" stroke="#fde047" stroke-width="4.5" class="guide-arrow-track"/>
              <polygon points="202,204 188,196 188,212" fill="#fde047"/>
            ` : ''}

            ${(dragMode === 'pull_inner' || dragMode === 'drag_to_boil') ? `
              <circle cx="212" cy="176" r="24" fill="none" stroke="#fde047" stroke-width="2.5" class="anim-pulse-ring"/>
              <text x="205" y="144" text-anchor="middle" font-size="11.5" font-weight="800" fill="#fde047">
                ${dragMode === 'drag_to_boil'
                  ? (tube.boilingAllowed ? '👆 ลากท่อโลหะลงไปต้มในหม้อน้ำเดือด 30 นาที ➡️' : '👆 ลองลากท่อพลาสติก (ห้ามต้มน้ำเดือด!) ➡️')
                  : '👆 กดค้างที่หัวท่อชั้นในแล้วลากตามลูกศร'}
              </text>
            ` : ''}
          </g>

          <!-- 3D Olive-Tipped Obturator -->
          ${showObturator ? `
            <g transform="translate(${dx}, ${dy})" class="${dragMode === 'pull_obturator' ? 'direct-drag-handle' : ''}" data-pct="${slidePct}">
              <path d="M188,176 Q308,176 312,252" fill="none" stroke="#eba8ae" stroke-width="8" stroke-linecap="round"/>
              <ellipse cx="312" cy="256" rx="7" ry="9" fill="#7d2930" stroke="#ffffff" stroke-width="1.5"/>
              <rect x="170" y="162" width="20" height="28" rx="6" fill="#7d2930" stroke="#fde047" stroke-width="2.5"/>
              <circle cx="160" cy="176" r="9" fill="none" stroke="#fde047" stroke-width="3"/>
              <text x="175" y="148" text-anchor="middle" font-size="11.5" font-weight="800" fill="#fde047">👆 กดลากแกนนำออกตามลูกศร ↖️</text>
            </g>
          ` : ''}

          <!-- 3D Rotary Cam-Lock Latch on Flange -->
          <g transform="translate(266, 176) rotate(${lockDeg - 90})" class="${dragMode === 'rotate_lock' ? 'direct-drag-handle' : ''}" data-pct="${(lockDeg / 90) * 100}">
            <rect x="-10" y="-24" width="20" height="32" rx="7" fill="${isLocked ? '#525c32' : '#9a5b25'}" stroke="${dragMode === 'rotate_lock' ? '#fde047' : '#ffffff'}" stroke-width="2.5"/>
            <circle cx="0" cy="0" r="6" fill="#ffffff"/>
          </g>
          ${dragMode === 'rotate_lock' ? `
            <path d="M266,140 A36,36 0 0,1 304,176" fill="none" stroke="#fde047" stroke-width="4" class="guide-arrow-track"/>
            <text x="266" y="128" text-anchor="middle" font-size="11.5" font-weight="800" fill="#fde047">👆 กดค้างที่สลักแล้วลากหมุนลงมาล็อค ⤵️</text>
          ` : ''}
        `}
      </g>

      <!-- =============================================================== -->
      <!-- 6. DIRECTIONAL DRAG GUIDE ARROWS                                -->
      <!-- =============================================================== -->
      ${dragMode === 'pull_inner' ? `
        <path d="M195,180 Q135,176 95,152" fill="none" stroke="#fde047" stroke-width="4.5" class="guide-arrow-track"/>
        <polygon points="88,148 104,148 96,162" fill="#fde047"/>
      ` : ''}

      ${dragMode === 'drag_to_boil' ? `
        <path d="M235,176 Q375,125 535,195" fill="none" stroke="#fde047" stroke-width="4.5" class="guide-arrow-track"/>
        <polygon points="542,200 525,192 531,206" fill="#fde047"/>
      ` : ''}

      <!-- =============================================================== -->
      <!-- 7. TRUE DIRECTIONAL WOUND WIPING (Drag Cotton Swab Outward!)    -->
      <!-- =============================================================== -->
      ${showWipeZones ? `
        <g>
          <!-- 4 Quadrant Status Indicators around the Stoma -->
          <circle cx="310" cy="118" r="17" fill="${cleanedQuads.has(0) ? 'rgba(82,92,50,0.92)' : 'rgba(125,41,48,0.85)'}" stroke="${activeWipeDir === 0 && !cleanedQuads.has(0) ? '#fde047' : '#ffffff'}" stroke-width="2"/>
          <text x="310" y="122" text-anchor="middle" font-size="9.5" font-weight="800" fill="#fff">${cleanedQuads.has(0) ? '✨ 1.สะอาด' : '1.ทิศบน ⬆️'}</text>

          <circle cx="388" cy="176" r="17" fill="${cleanedQuads.has(1) ? 'rgba(82,92,50,0.92)' : 'rgba(125,41,48,0.85)'}" stroke="${activeWipeDir === 1 && !cleanedQuads.has(1) ? '#fde047' : '#ffffff'}" stroke-width="2"/>
          <text x="388" y="180" text-anchor="middle" font-size="9.5" font-weight="800" fill="#fff">${cleanedQuads.has(1) ? '✨ 2.สะอาด' : '2.ทิศขวา ➡️'}</text>

          <circle cx="310" cy="236" r="17" fill="${cleanedQuads.has(2) ? 'rgba(82,92,50,0.92)' : 'rgba(125,41,48,0.85)'}" stroke="${activeWipeDir === 2 && !cleanedQuads.has(2) ? '#fde047' : '#ffffff'}" stroke-width="2"/>
          <text x="310" y="240" text-anchor="middle" font-size="9.5" font-weight="800" fill="#fff">${cleanedQuads.has(2) ? '✨ 3.สะอาด' : '3.ทิศล่าง ⬇️'}</text>

          <circle cx="236" cy="134" r="17" fill="${cleanedQuads.has(3) ? 'rgba(82,92,50,0.92)' : 'rgba(125,41,48,0.85)'}" stroke="${activeWipeDir === 3 && !cleanedQuads.has(3) ? '#fde047' : '#ffffff'}" stroke-width="2"/>
          <text x="236" y="138" text-anchor="middle" font-size="9.5" font-weight="800" fill="#fff">${cleanedQuads.has(3) ? '✨ 4.สะอาด' : '4.ทิศซ้าย ⬅️'}</text>

          ${cleanedQuads.size < 4 ? `
            <!-- Directional Arrow Track for the Current Quadrant -->
            <path d="${curWipe.arrow}" fill="none" stroke="#fde047" stroke-width="5" class="guide-arrow-track"/>
            <!-- Draggable 3D Sterile Cotton Swab at the Inner Stoma Border -->
            <g transform="translate(${swabX}, ${swabY})" class="direct-drag-handle" data-pct="${wipeDragPct}" filter="url(#${uid}drop3dShadow)">
              <circle cx="0" cy="0" r="22" fill="rgba(253, 224, 71, 0.22)" stroke="#fde047" stroke-width="2.5" class="anim-pulse-ring"/>
              <!-- Wooden Stick -->
              <line x1="0" y1="0" x2="55" y2="-35" stroke="#d97706" stroke-width="5" stroke-linecap="round"/>
              <!-- Sterile White Cotton Tip -->
              <ellipse cx="0" cy="0" rx="11" ry="7" transform="rotate(-32)" fill="#ffffff" stroke="#38bdf8" stroke-width="2"/>
              <text x="0" y="-28" text-anchor="middle" font-size="11.5" font-weight="800" fill="#fde047">👆 ${curWipe.label}</text>
            </g>
          ` : ''}
        </g>
      ` : ''}

      <!-- =============================================================== -->
      <!-- 8. REALISTIC SUCTIONING ENTERING INTO THE NECK TUBE HOLE        -->
      <!-- =============================================================== -->
      ${showMucus ? `
        <g opacity="${suctionMode === 'insert' ? 1 : Math.max(0.05, 1 - suctionDepthPct / 95)}">
          <circle cx="308" cy="204" r="6.5" fill="#fde047" class="anim-float"/>
          <circle cx="314" cy="222" r="7.5" fill="#facc15" class="anim-float"/>
          <circle cx="306" cy="240" r="6.5" fill="#fde047" class="anim-float"/>
        </g>
      ` : ''}

      ${showSuctionCatheter ? (() => {
        // Phase A ('insert'): slidePct 0..100 moves catheter tip from outside neck hole (x=140)
        // directly THROUGH the circular neck tube opening (cx=202, cy=176) down into trachea (x=310, y=242)!
        // Phase B ('withdraw'): slidePct 0..100 withdraws catheter from deep trachea (100% inserted) back out while thumb covers valve!
        const insertRatio = suctionMode === 'insert' ? (suctionDepthPct / 100) : (1 - (suctionDepthPct / 100));
        const hubOffsetX = -(1 - insertRatio) * 85;
        const tipEndX = 202 + insertRatio * 108;
        const tipEndY = 176 + Math.pow(insertRatio, 1.4) * 66;
        const ctrlX = 202 + insertRatio * 96;

        return `
          <!-- Highlighted Circular Opening of the Tracheostomy Tube at the Neck -->
          <ellipse cx="202" cy="176" rx="9" ry="15" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="3 2"/>

          <!-- Flexible Transparent Suction Catheter Physically Entering the Neck Tube Hole (202, 176) -->
          <path d="M${115 + hubOffsetX},176 L202,176 Q${ctrlX},176 ${tipEndX},${tipEndY}"
                fill="none" stroke="rgba(125, 211, 252, 0.92)" stroke-width="7.5" stroke-linecap="round"/>
          <!-- Inner Mucus Stream inside Catheter when Withdrawing -->
          ${suctionMode === 'withdraw' && suctionDepthPct > 5 ? `
            <path d="M${130 + hubOffsetX},176 L202,176 Q${ctrlX},176 ${tipEndX},${tipEndY}"
                  fill="none" stroke="#fde047" stroke-width="3.5" stroke-dasharray="6 5"/>
          ` : ''}
          <!-- Catheter Fenestrated Tip inside Trachea -->
          <circle cx="${tipEndX}" cy="${tipEndY}" r="5" fill="#ffffff" stroke="#0284c7" stroke-width="2"/>

          <!-- Draggable Thumb-Control Suction Valve Port -->
          <g transform="translate(${105 + hubOffsetX}, 176)" class="direct-drag-handle" data-pct="${suctionDepthPct}" filter="url(#${uid}drop3dShadow)">
            <circle cx="0" cy="0" r="24" fill="none" stroke="#fde047" stroke-width="2.5" class="anim-pulse-ring"/>
            <rect x="-16" y="-13" width="32" height="26" rx="6" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
            <!-- Thumb Control Hole (Open during insert, Closed by thumb during withdraw!) -->
            <circle cx="0" cy="-2" r="6.5" fill="${suctionMode === 'withdraw' ? '#fde047' : '#0f172a'}" stroke="#ffffff" stroke-width="1.5"/>
            <text x="0" y="-28" text-anchor="middle" font-size="11.5" font-weight="800" fill="#fde047">
              ${suctionMode === 'insert'
                ? '👆 กดลากสายดูดสอดเข้าไปในรูท่อที่คอ ➡️ (ห้ามปิดรูดูด)'
                : '👆 กดปิดรูดูด + ลากหมุนดึงสายออกจากคอ ⬅️ (≤12 วินาที)'}
            </text>
          </g>

          <path d="${suctionMode === 'insert' ? 'M115,198 L195,198' : 'M195,198 L105,198'}"
                fill="none" stroke="#fde047" stroke-width="4.5" class="guide-arrow-track"/>
        `;
      })() : ''}

      ${showNebulizer ? `
        <g class="anim-float">
          <ellipse cx="220" cy="176" rx="42" ry="30" fill="rgba(184,205,217,0.55)" stroke="#dfe7ef" stroke-width="2" stroke-dasharray="4 3"/>
          <text x="220" y="181" text-anchor="middle" font-size="12" font-weight="800" fill="#ffffff">🌫️ พ่น 0.9% NSS</text>
        </g>
      ` : ''}
    </svg>
  `;
}

// ============================================================================
// 6. TAB 1: 3D TUBE EXPLORER (Dynamic Modules — No Cuff on Jackson!)
// ============================================================================
function getLab3dModules(tubeId) {
  const tube = TUBE_TYPES[tubeId] || TUBE_TYPES.jackson;
  const mods = [
    {
      id: 'pull_inner',
      title: 'ถอด-สอดท่อชั้นในตามแนวโค้ง',
      pipType: 'pip_hold_flange',
      voice: `จับประคองแป้นท่อที่คอไว้เบาๆ แล้วดึงท่อชั้นในออกตามแนวโค้งค่ะ ลองทำตามตัวอย่างนะคะ`,
      subtitleHtml: `<span class="hl-must">ต้องจับประคองแป้นท่อชั้นนอกที่คอไว้เสมอ</span> <span class="hl-why">เพื่อป้องกันไม่ให้ท่อชั้นนอกเลื่อนหลุดออกจากคอ</span> • <strong>วิธีทำ:</strong> กดค้างที่หัวท่อชั้นในบนจอ แล้วลากออกตามลูกศร`,
      dragMode: 'pull_inner',
      dirX: -1,
      dirY: -0.35
    },
    {
      id: 'rotate_lock',
      title: 'หมุนสลักล็อคหน้าแป้นคอ',
      pipType: 'pip_rotate_lock',
      voice: `เมื่อสอดท่อชั้นในเข้าที่คอแล้ว ต้องหมุนสลักล็อคลงมาให้แน่นทุกครั้งเพื่อกันท่อหลุดค่ะ ลองทำตามตัวอย่างนะคะ`,
      subtitleHtml: `เมื่อสอดท่อชั้นในแล้ว <span class="hl-must">ต้องหมุนสลักล็อคให้เข้าที่ทุกครั้ง</span> <span class="hl-why">เพราะถ้าไม่ล็อค เวลาผู้ป่วยไอ ท่อชั้นในจะพุ่งหลุดออกมาทันที</span> • <strong>วิธีทำ:</strong> กดค้างที่สลักล็อคแล้วลากหมุนลงตามลูกศร`,
      dragMode: 'rotate_lock',
      dirX: 0.4,
      dirY: 1
    }
  ];

  // ONLY include Cuff module if the selected tube actually has a cuff (Shiley Cuffed)!
  // Jackson metal tube has NO cuff, so it is completely omitted!
  if (tube.hasCuff) {
    mods.push({
      id: 'syringe_cuff',
      title: 'ลูกโป่งในหลอดลม (Cuff)',
      pipType: 'pip_syringe_cuff',
      voice: `ลูกโป่งในหลอดลมช่วยป้องกันการสำลัก ห้ามดึงหรือตัดสายกระเปาะเช็คลมสีฟ้าเด็ดขาดนะคะ ลองทำตามตัวอย่างนะคะ`,
      subtitleHtml: `กระเปาะเช็คลมสีฟ้าเชื่อมกับลูกโป่งในหลอดลม <span class="hl-danger">ห้ามดึง ห้ามตัด หรือทิ่มสายกระเปาะลมเด็ดขาด</span> <span class="hl-why">เพราะลูกโป่งจะรั่วและกันสำลักไม่ได้</span> • <strong>วิธีทำ:</strong> กดลากก้านกระบอกฉีดยาไปทางขวา ➡️`,
      dragMode: 'syringe_cuff',
      dirX: 1,
      dirY: 0
    });
  }

  mods.push({
    id: 'pull_obturator',
    title: 'แกนนำใส่ท่อหัวมน (Obturator)',
    pipType: 'pip_obturator',
    voice: `แกนนำหัวมนใช้สอดนำทางตอนใส่ท่อชั้นนอก เมื่อใส่เข้าคอแล้วต้องดึงออกทันทีและเก็บใส่ถุงไว้หัวเตียงเสมอค่ะ ลองทำตามตัวอย่างนะคะ`,
    subtitleHtml: `แกนนำหัวมน <span class="hl-danger">ห้ามทิ้งเด็ดขาด ต้องเก็บใส่ถุงสะอาดไว้หัวเตียงเสมอ</span> <span class="hl-why">เพราะใช้สอดนำทางกรณีท่อชั้นนอกหลุดฉุกเฉิน</span> • <strong>วิธีทำ:</strong> กดลากด้ามแกนนำออกจากท่อตามลูกศร ↖️`,
    dragMode: 'pull_obturator',
    dirX: -1,
    dirY: -0.3
  });

  mods.push({
    id: 'drag_to_boil',
    title: tube.boilingAllowed ? 'ต้มในน้ำเดือด 100°C (30 นาที)' : 'ข้อห้ามการต้มในน้ำเดือด',
    pipType: tube.boilingAllowed ? 'pip_boil_pot' : 'pip_no_boil_plastic',
    voice: tube.boilingAllowed
      ? `นำท่อโลหะชั้นในที่ขัดสะอาดแล้ว ลงไปต้มในหม้อน้ำเดือดพล่าน นานสามสิบนาที แล้วพักให้เย็นสนิทค่ะ ลองทำตามตัวอย่างนะคะ`
      : `ข้อห้ามสำคัญ ห้ามนำ ${tube.shortName} ลงต้มในน้ำเดือดเด็ดขาด เพราะท่อจะละลายบิดเบี้ยว ให้ล้างด้วยน้ำเกลือปราศจากเชื้อเท่านั้นนะคะ ลองทำตามตัวอย่างนะคะ`,
    subtitleHtml: tube.boilingAllowed
      ? `<strong>ท่อโลหะ Jackson:</strong> <span class="hl-must">ลากท่อลงไปต้มในหม้อน้ำเดือดพล่าน 100°C นาน 30 นาที</span> แล้ว <span class="hl-must">พักให้เย็นสนิทและสลัดน้ำให้แห้ง</span> • <strong>วิธีทำ:</strong> กดลากท่อโลหะลงไปในหม้อต้มน้ำเดือดทางขวา ➡️`
      : `<strong>${tube.shortName}:</strong> <span class="hl-danger">ห้ามนำลงต้มในหม้อน้ำเดือด 100°C เด็ดขาด!</span> <span class="hl-why">เพราะพลาสติก/ซิลิโคนจะละลายบิดเบี้ยวทันที</span> (ให้ล้างด้วย 0.9% NSS เท่านั้น)`,
    dragMode: 'drag_to_boil',
    dirX: 1,
    dirY: 0.1
  });

  return mods.map((m, idx) => ({ ...m, title: `${idx + 1}. ${m.title}` }));
}

function selectTubeType(tubeId) {
  if (!TUBE_TYPES[tubeId]) return;
  playUiSound('click');
  appState.selectedTube = tubeId;
  appState.labCompleted = {};
  document.getElementById('headerTubeName').textContent = TUBE_TYPES[tubeId].shortName;
  renderTubeSelectorStrip();
  selectLab3dModule(0);
}

function renderTubeSelectorStrip() {
  const strip = document.getElementById('tubeSelectorStrip');
  if (!strip) return;
  strip.innerHTML = Object.values(TUBE_TYPES).map(t => {
    const act = t.id === appState.selectedTube;
    return `
      <button class="tube-pill-btn ${act ? 'active' : ''}" onclick="selectTubeType('${t.id}')">
        <div class="tube-pill-icon">${t.icon}</div>
        <div>
          <div style="font-weight:800; font-size:0.92rem; color:var(--text-main);">${t.name}</div>
          <div style="font-size:0.74rem; color:var(--text-muted);">${t.tag}</div>
        </div>
      </button>
    `;
  }).join('');
}

function renderLab3dModulePills() {
  const pillsContainer = document.getElementById('lab3dModulePills');
  if (!pillsContainer) return;
  const mods = getLab3dModules(appState.selectedTube);
  pillsContainer.innerHTML = mods.map((m, idx) => {
    const act = idx === appState.labModuleIdx;
    const done = !!appState.labCompleted[idx];
    return `<button class="hud-step-btn ${act ? 'active' : ''} ${done ? 'completed' : ''}" onclick="selectLab3dModule(${idx})">${m.title}</button>`;
  }).join('');
}

function selectLab3dModule(modIdx) {
  if (demoAnimInterval) clearInterval(demoAnimInterval);
  stopActiveVoice();
  const mods = getLab3dModules(appState.selectedTube);
  if (modIdx >= mods.length) modIdx = 0;

  appState.isCompletingStep = false;
  appState.labModuleIdx = modIdx;
  appState.labPhase = 'demo1';
  appState.labDragPct = 0;
  const mod = mods[modIdx];

  renderLab3dModulePills();
  document.getElementById('lab3dPipVisualBox').innerHTML = buildPipAnimationSvg(mod.pipType);
  document.getElementById('lab3dSubtitleHtml').innerHTML = mod.subtitleHtml;
  renderLab3dPhaseUI();

  // Stage 1: Slow demonstration while nurse speaks (ending with "ลองทำตามตัวอย่างดูนะคะ")
  runSlow3dDemoAnimation((pct) => renderLab3dMannequinScene(pct, false), true);

  const spokenText = mod.voice.replace(/ลองทำตามตัวอย่างนะคะ/g, 'ลองทำตามตัวอย่างดูนะคะ');
  speakNaturalThaiFemale(spokenText, () => {
    if (appState.labPhase !== 'demo1') return;
    // Stage 2: After voice finishes "ลองทำตามตัวอย่างดูนะคะ", replay slow demo 1 full round
    appState.labPhase = 'demo2';
    renderLab3dPhaseUI();
    runSlow3dDemoAnimation((pct) => renderLab3dMannequinScene(pct, false), false, () => {
      if (appState.labPhase !== 'demo2') return;
      // Stage 3: Unlock for user to try directly on the 3D equipment!
      appState.labPhase = 'user';
      appState.labDragPct = 0;
      playUiSound('click');
      renderLab3dMannequinScene(0, true);
      renderLab3dPhaseUI();
    });
  });
}

function skipLabDemoToUser() {
  playUiSound('click');
  stopActiveVoice();
  if (demoAnimInterval) {
    clearInterval(demoAnimInterval);
    demoAnimInterval = null;
  }
  appState.labPhase = 'user';
  appState.labDragPct = 0;
  renderLab3dMannequinScene(0, true);
  renderLab3dPhaseUI();
}

function replayLab3dDemo() {
  playUiSound('click');
  selectLab3dModule(appState.labModuleIdx);
}

function renderLab3dMannequinScene(pctVal, enableDirectDrag = true) {
  const canvas = document.getElementById('mannequin3dLabCanvas');
  if (!canvas) return;
  const mods = getLab3dModules(appState.selectedTube);
  const mod = mods[appState.labModuleIdx] || mods[0];

  let opts = {
    slidePct: 0,
    lockDeg: 90,
    showObturator: false,
    boilMode: null,
    dragMode: enableDirectDrag ? mod.dragMode : null
  };

  if (mod.id === 'pull_inner') {
    opts.slidePct = pctVal;
    opts.lockDeg = pctVal > 10 ? 0 : 90;
  } else if (mod.id === 'rotate_lock') {
    opts.lockDeg = pctVal * 0.9;
  } else if (mod.id === 'syringe_cuff') {
    opts.cuffPct = pctVal;
  } else if (mod.id === 'pull_obturator') {
    opts.showObturator = true;
    opts.slidePct = pctVal;
  } else if (mod.id === 'drag_to_boil') {
    opts.boilMode = 'boiling_pot';
    opts.slidePct = pctVal;
  }

  canvas.innerHTML = build3dMannequinSvg(opts);

  if (enableDirectDrag) {
    attachDirectEquipmentDrag(
      canvas,
      mod.dirX,
      mod.dirY,
      105,
      (newPct) => {
        appState.labDragPct = newPct;
        const r = document.getElementById('labDirectDragPct');
        if (r) r.textContent = `${Math.round(newPct)}%`;
        renderLab3dMannequinScene(newPct, true);
      },
      () => completeLab3dModule()
    );
  }
}

function renderLab3dPhaseUI() {
  const badge = document.getElementById('lab3dPhaseBadge');
  const overlay = document.getElementById('lab3dActionOverlay');
  const ctrlBox = document.getElementById('lab3dInteractiveControlBox');

  if (appState.labPhase === 'demo1') {
    badge.className = 'phase-status-pill';
    badge.textContent = '🎬 1. AI กำลังสาธิตช้าๆ และอธิบายให้ดู...';
    overlay.classList.add('locked-demo');
    ctrlBox.innerHTML = `
      <div class="interactive-gesture-bar">
        <span style="color:#b8cdd9; font-weight:700;">👀 1. ชมการสาธิตช้าๆ และฟังคำอธิบายก่อนนะคะ</span>
        <button class="btn btn-secondary" style="padding:0.4rem 0.85rem; font-size:0.82rem;" onclick="skipLabDemoToUser()">⏩ ข้ามไปลองทำเองเลย</button>
      </div>
    `;
    return;
  }

  if (appState.labPhase === 'demo2') {
    badge.className = 'phase-status-pill';
    badge.textContent = '🎬 2. กำลังสาธิตช้าๆ ให้ดูอีกรอบ...';
    overlay.classList.add('locked-demo');
    ctrlBox.innerHTML = `
      <div class="interactive-gesture-bar">
        <span style="color:#fde047; font-weight:700;">👀 2. ดูจังหวะการเคลื่อนไหวช้าๆ อีกรอบ แล้วเตรียมลองทำเองนะคะ</span>
        <button class="btn btn-secondary" style="padding:0.4rem 0.85rem; font-size:0.82rem;" onclick="skipLabDemoToUser()">⏩ ลงมือทำเลย</button>
      </div>
    `;
    return;
  }

  badge.className = 'phase-status-pill user-turn';
  badge.textContent = '🖐️ 3. ตาคุณลงมือทำเอง: กดค้างที่อุปกรณ์แล้วลากตามลูกศร!';
  overlay.classList.remove('locked-demo');

  ctrlBox.innerHTML = `
    <div class="interactive-gesture-bar">
      <span style="font-weight:800; color:#fde047;">👆 กดค้างที่วงแหวนสีเหลืองบนอุปกรณ์ 3 มิติ แล้วลากไปตามทิศทางลูกศร (<strong id="labDirectDragPct">${Math.round(appState.labDragPct)}%</strong>)</span>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
        <button class="btn btn-secondary" style="padding:0.4rem 0.85rem; font-size:0.82rem;" onclick="speakTryFollowExample()">🔊 ลองทำตามตัวอย่างดูนะคะ</button>
        <button class="btn btn-primary" onclick="completeLab3dModule()">✅ ทำสำเร็จ ➡️ ขั้นถัดไป</button>
      </div>
    </div>
  `;
}

function completeLab3dModule() {
  if (appState.isAdvancing) return;
  appState.isAdvancing = true;
  if (demoAnimInterval) {
    clearInterval(demoAnimInterval);
    demoAnimInterval = null;
  }
  stopActiveVoice();
  playUiSound('success');

  const idx = appState.labModuleIdx;
  const mods = getLab3dModules(appState.selectedTube);
  appState.labCompleted[idx] = true;
  renderLab3dMannequinScene(100, false);
  renderLab3dModulePills();

  const tubeName = TUBE_TYPES[appState.selectedTube].shortName;
  const modTitle = mods[idx]?.title || '';
  silentAutoSyncInteraction(`สำรวจท่อ 3 มิติ (${tubeName}): ${modTitle}`, 'ปกติ: ลากอุปกรณ์ 3 มิติสำเร็จ', 'normal', false);

  setTimeout(() => {
    appState.isAdvancing = false;
    if (idx < mods.length - 1) {
      selectLab3dModule(idx + 1);
    } else {
      switchTab('guided');
    }
  }, 450);
}

// ============================================================================
// 7. TAB 2: 3D STEP-BY-STEP DEMONSTRATION (Real Y-Gauze, Directional Swab, Suction in Hole)
// ============================================================================
const SUCTION_TABLE = {
  neo3: { fr: 'เบอร์ 6 Fr', mmhg: '60–75 mmHg' },
  neo4: { fr: 'เบอร์ 8 Fr', mmhg: '75–90 mmHg' },
  ped4: { fr: 'เบอร์ 8 Fr', mmhg: '75–90 mmHg' },
  ped5: { fr: 'เบอร์ 10 Fr', mmhg: '90–112 mmHg' },
  adult4: { fr: 'เบอร์ 10 Fr', mmhg: '90–112 mmHg' },
  adult6: { fr: 'เบอร์ 10–12 Fr', mmhg: '112–150 mmHg' },
  adult8: { fr: 'เบอร์ 10–12 Fr', mmhg: '112–150 mmHg' },
  jackson8: { fr: 'เบอร์ 14 Fr', mmhg: '112–150 mmHg' },
  jackson9: { fr: 'เบอร์ 16 Fr', mmhg: '112–150 mmHg' }
};

function get3dGuidedSteps(tubeId) {
  const isMetal = tubeId === 'jackson';
  const tubeName = TUBE_TYPES[tubeId].shortName;

  return {
    wound: [
      {
        shortTab: '1. ดึงผ้าก๊อซเก่าออก & ดูสีเสมหะ',
        pipType: 'pip_ygauze_2person',
        voice: 'ขั้นที่หนึ่ง จับประคองแป้นท่อไว้ แล้วกดลากผ้าก๊อซชิ้นเก่าออกจากใต้แป้นท่อ เพื่อสังเกตสีและกลิ่นเสมหะค่ะ ลองทำตามตัวอย่างนะคะ',
        subtitleHtml: `ขั้นที่ 1: จับแป้นท่อแล้วดึงผ้าก๊อซเก่าออกจากใต้แป้น <span class="hl-must">สังเกตสี กลิ่นเสมหะ และรอยแดงรอบแผล</span> • <strong>วิธีทำ:</strong> กดค้างที่ผ้าก๊อซใต้แป้นท่อแล้วลากออกทางซ้าย ⬅️`,
        dragMode: 'drag_ygauze',
        dirX: -1,
        dirY: 0,
        mannequinOpts: { showYgauze: true, ygauzeMode: 'pull_old' }
      },
      {
        shortTab: '2. ลากไม้พันสำลีเช็ดแผลออก 4 ทิศ',
        pipType: 'pip_wipe_outward',
        voice: 'ขั้นที่สอง ใช้ไม้พันสำลีชุบน้ำเกลือปราศจากเชื้อ กดลากเช็ดแผลจากชิดโคนท่อ ปาดออกไปตามทิศลูกศรทั้งสี่ทิศค่ะ ลองทำตามตัวอย่างนะคะ',
        subtitleHtml: `ขั้นที่ 2: เช็ดด้วย 0.9% NSS <span class="hl-must">กดค้างที่ไม้พันสำลีชิดโคนท่อ แล้วลากปาดออกไปตามทิศลูกศรทีละทิศ</span> (<span class="hl-danger">ห้ามใช้แอลกอฮอล์เช็ดชิดรูแผลเปิด</span>)`,
        dragMode: 'wipe_4quads',
        dirX: 0,
        dirY: -1,
        mannequinOpts: { showYgauze: false, showWipeZones: true }
      },
      {
        shortTab: '3. สอดผ้าก๊อซตัว Y ไร้ขุยรองใต้แป้น',
        pipType: 'pip_ygauze_2person',
        voice: 'ขั้นที่สาม กดลากผ้าก๊อซรูปตัววายชนิดไร้ขุย สอดเข้าไปรองใต้แป้นท่อ และเวลาเปลี่ยนสายผูกคอต้องทำสองคนเสมอค่ะ ลองทำตามตัวอย่างนะคะ',
        subtitleHtml: `ขั้นที่ 3: สอดผ้าก๊อซตัว Y ไร้ขุยรองใต้แป้น (<span class="hl-danger">ห้ามตัดก๊อซธรรมดาจนมีขุยด้ายรุ่ย</span>) และ <span class="hl-must">เปลี่ยนสายผูกคอต้องทำ 2 คนเสมอ</span> • <strong>วิธีทำ:</strong> กดลากผ้าก๊อซตัว Y เข้าไปรองใต้แป้นท่อ ➡️`,
        dragMode: 'drag_ygauze',
        dirX: 1,
        dirY: 0,
        mannequinOpts: { showYgauze: true, ygauzeMode: 'insert_new' }
      }
    ],

    inner: [
      {
        shortTab: '1. จับแป้น & ลากถอดท่อชั้นใน',
        pipType: 'pip_hold_flange',
        voice: 'ขั้นที่หนึ่ง จับแป้นท่อชั้นนอกที่คอให้นิ่ง หมุนปลดล็อค แล้วดึงท่อชั้นในออกตามแนวโค้งค่ะ ลองทำตามตัวอย่างนะคะ',
        subtitleHtml: `ขั้นที่ 1: <span class="hl-must">จับประคองแป้นท่อชั้นนอกไว้เสมอ</span> แล้วดึงท่อชั้นในออกตามแนวโค้ง • <strong>วิธีทำ:</strong> กดค้างที่หัวท่อชั้นในแล้วลากออกตามลูกศร ↙️`,
        dragMode: 'pull_inner',
        dirX: -1,
        dirY: -0.3,
        mannequinOpts: { lockDeg: 0 }
      },
      {
        shortTab: '2. ลากแปรงขัดคราบเสมหะในท่อ',
        pipType: 'pip_brush_scrub',
        voice: 'ขั้นที่สอง ใช้แปรงขนนุ่มสอดขัดคราบเสมหะภายในรูท่อชั้นในออกให้สะอาดค่ะ ลองทำตามตัวอย่างนะคะ',
        subtitleHtml: `ขั้นที่ 2: แช่ละลายเสมหะแล้ว <span class="hl-must">ใช้แปรงขัดภายในรูท่อชั้นในจนใสสะอาด</span> • <strong>วิธีทำ:</strong> กดค้างที่ด้ามแปรงแล้วลากขัดท่อไปทางขวา ➡️`,
        dragMode: 'drag_brush',
        dirX: 1,
        dirY: 0,
        mannequinOpts: { showBrush: true, slidePct: 50 }
      },
      {
        shortTab: isMetal ? '3. ต้มในหม้อน้ำเดือด 100°C (30 นาที)' : '3. ล้าง 0.9% NSS (ห้ามต้มน้ำเดือด!)',
        pipType: isMetal ? 'pip_boil_pot' : 'pip_no_boil_plastic',
        voice: isMetal
          ? 'ขั้นที่สาม ลากท่อโลหะชั้นในลงไปต้มในหม้อน้ำเดือดพล่าน นานสามสิบนาที แล้ววางพักให้เย็นสนิทและสลัดน้ำให้แห้งค่ะ ลองทำตามตัวอย่างนะคะ'
          : `ขั้นที่สาม สำหรับ ${tubeName} ห้ามนำลงต้มในหม้อน้ำเดือดเด็ดขาด เพราะพลาสติกจะละลาย ให้ล้างด้วยน้ำเกลือปราศจากเชื้อเท่านั้นนะคะ ลองทำตามตัวอย่างนะคะ`,
        subtitleHtml: isMetal
          ? `ขั้นที่ 3 (ท่อโลหะ Jackson): <span class="hl-must">ลากท่อลงไปต้มในหม้อน้ำเดือดพล่าน 100°C นาน 30 นาที</span> แล้วพักให้เย็นสนิทและสลัดน้ำให้แห้ง • <strong>วิธีทำ:</strong> กดลากท่อโลหะลงไปในหม้อต้มน้ำเดือดทางขวา ➡️`
          : `ขั้นที่ 3 (${tubeName}): <span class="hl-danger">ห้ามต้มในหม้อน้ำเดือด 100°C เด็ดขาด!</span> <span class="hl-why">เพราะพลาสติกจะละลายบิดเบี้ยว</span> ให้ล้างด้วย 0.9% NSS และสลัดน้ำให้แห้ง`,
        dragMode: 'drag_to_boil',
        dirX: 1,
        dirY: 0.1,
        mannequinOpts: { boilMode: 'boiling_pot' }
      },
      {
        shortTab: '4. สอดคืน & ลากหมุนสลักล็อค 90°',
        pipType: 'pip_rotate_lock',
        voice: 'ขั้นที่สี่ เมื่อสลัดท่อจนแห้งสนิทแล้ว ให้สอดท่อชั้นในกลับเข้าที่คอ แล้วลากหมุนสลักล็อคลงมาให้แน่นทุกครั้งค่ะ ลองทำตามตัวอย่างนะคะ',
        subtitleHtml: `ขั้นที่ 4: สลัดน้ำให้แห้ง สอดท่อชั้นในคืน และ <span class="hl-must">ต้องหมุนสลักล็อค 90° ทุกครั้ง</span> • <strong>วิธีทำ:</strong> กดค้างที่สลักล็อคแล้วลากหมุนลงมาล็อค ⤵️`,
        dragMode: 'rotate_lock',
        dirX: 0.4,
        dirY: 1,
        mannequinOpts: { slidePct: 0, lockDeg: 0 }
      }
    ],

    suction: [
      {
        shortTab: '1. สอดสายดูดเสมหะเข้าไปในรูท่อที่คอ',
        pipType: 'pip_suction_valve',
        voice: 'ขั้นที่หนึ่งของการดูดเสมหะ สอดสายดูดเสมหะเข้าไปในรูท่อเจาะคอที่ลำคออย่างนุ่มนวล โดยตอนสอดสายห้ามปิดรูควบคุมแรงดูดค่ะ ลองทำตามตัวอย่างนะคะ',
        subtitleHtml: `ขั้นที่ 1: <span class="hl-must">สอดสายดูดเสมหะเข้าไปในรูท่อเจาะคอที่ลำคอ</span> ลึกประมาณ 10–12 ซม. (<span class="hl-danger">ขณะสอดสายลงไป ห้ามใช้นิ้วปิดรูดูด</span>) • <strong>วิธีทำ:</strong> กดค้างที่หัวสายดูดสีฟ้าแล้วลากสอดเข้าไปในรูท่อที่คอ ➡️`,
        dragMode: 'drag_suction_insert',
        dirX: 1,
        dirY: 0.15,
        mannequinOpts: { showSuctionCatheter: true, suctionMode: 'insert', showMucus: true }
      },
      {
        shortTab: '2. ปิดรูดูด & หมุนดึงสายออกจากรูท่อ ≤12 วินาที',
        pipType: 'pip_suction_valve',
        voice: 'ขั้นที่สอง เมื่อสายดูดอยู่ในหลอดลมแล้ว ให้ใช้นิ้วกดปิดรูควบคุมแรงดูด พร้อมหมุนสายดึงขึ้นออกจากรูท่อที่คอ ไม่เกินสิบสองวินาทีค่ะ ลองทำตามตัวอย่างนะคะ',
        subtitleHtml: `ขั้นที่ 2: <span class="hl-must">ใช้นิ้วกดปิดรูดูดสีฟ้า พร้อมหมุนสายดึงออกจากรูท่อที่คอ</span> ใช้เวลาดูดไม่เกิน 10–15 วินาที • <strong>วิธีทำ:</strong> กดค้างที่วาล์วสีฟ้าแล้วลากดึงสายออกจากรูท่อทางซ้าย ⬅️`,
        dragMode: 'drag_suction_withdraw',
        dirX: -1,
        dirY: -0.15,
        mannequinOpts: { showSuctionCatheter: true, suctionMode: 'withdraw', showMucus: true }
      }
    ],

    humid: [
      {
        shortTab: '1. พ่นละอองน้ำเกลือ 0.9% NSS',
        pipType: 'pip_no_boil_plastic',
        voice: 'การพ่นละอองไอน้ำ ให้ใช้น้ำเกลือปราศจากเชื้อ ครอบพ่นที่รูท่อเจาะคอในท่านั่งศีรษะสูง ห้ามใช้น้ำกลั่นบริสุทธิ์พ่นเองเด็ดขาดค่ะ ลองทำตามตัวอย่างนะคะ',
        subtitleHtml: `พ่นละอองไอน้ำด้วย 0.9% Normal Saline (<span class="hl-danger">ห้ามใช้น้ำกลั่นบริสุทธิ์พ่นเอง</span>) หลังพ่นเสร็จให้ไอหรือดูดเสมหะออก`,
        dragMode: 'pull_inner',
        dirX: -1,
        dirY: 0,
        mannequinOpts: { showNebulizer: true }
      }
    ]
  };
}

function selectProcedure(procKey) {
  playUiSound('click');
  if (demoAnimInterval) clearInterval(demoAnimInterval);
  appState.currentProcedure = procKey;
  appState.currentStepIndex = 0;

  document.querySelectorAll('#procedureSelector .proc-card-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.proc === procKey);
  });

  const calcBox = document.getElementById('suctionCalculatorBox');
  if (calcBox) calcBox.style.display = procKey === 'suction' ? 'block' : 'none';

  startGuided3dStep(0);
}

function updateSuctionCalc() {
  playUiSound('click');
  const sel = document.getElementById('tubeSizeSelect');
  if (!sel) return;
  const row = SUCTION_TABLE[sel.value] || SUCTION_TABLE.adult6;
  document.getElementById('calcCatheterFr').textContent = row.fr;
  document.getElementById('calcPressureMmhg').textContent = row.mmhg;
}

function startGuided3dStep(stepIdx) {
  if (demoAnimInterval) clearInterval(demoAnimInterval);
  stopActiveVoice();
  appState.isCompletingStep = false;
  const allProcs = get3dGuidedSteps(appState.selectedTube);
  const steps = allProcs[appState.currentProcedure] || allProcs.wound;
  if (stepIdx >= steps.length) stepIdx = 0;

  appState.currentStepIndex = stepIdx;
  appState.guidedPhase = 'demo1';
  appState.guidedDragPct = 0;
  appState.guidedWipeDirIdx = 0;
  appState.guidedWipePct = 0;
  appState.guidedCleanedQuads = new Set();
  const step = steps[stepIdx];

  const pillsBox = document.getElementById('guidedStepPills');
  if (pillsBox) {
    pillsBox.innerHTML = steps.map((s, idx) => {
      const k = `${appState.selectedTube}_${appState.currentProcedure}_${idx}`;
      const done = !!appState.stepCheckpoints[k];
      return `<button class="hud-step-btn ${idx === stepIdx ? 'active' : ''} ${done ? 'completed' : ''}" onclick="startGuided3dStep(${idx})">${s.shortTab}</button>`;
    }).join('');
  }

  document.getElementById('guidedPipVisualBox').innerHTML = buildPipAnimationSvg(step.pipType);
  document.getElementById('guidedSubtitleHtml').innerHTML = step.subtitleHtml;
  renderGuidedPhaseControls();

  // Stage 1: Slow demonstration while nurse explains (ending with "ลองทำตามตัวอย่างดูนะคะ")
  runSlow3dDemoAnimation((pct) => renderGuided3dScene(pct, false), true);

  const spokenText = step.voice.replace(/ลองทำตามตัวอย่างนะคะ/g, 'ลองทำตามตัวอย่างดูนะคะ');
  speakNaturalThaiFemale(spokenText, () => {
    if (appState.guidedPhase !== 'demo1') return;
    // Stage 2: After nurse finishes "ลองทำตามตัวอย่างดูนะคะ", replay slow demo 1 full round
    appState.guidedPhase = 'demo2';
    renderGuidedPhaseControls();
    runSlow3dDemoAnimation((pct) => renderGuided3dScene(pct, false), false, () => {
      if (appState.guidedPhase !== 'demo2') return;
      // Stage 3: Unlock for user to practice directly!
      appState.guidedPhase = 'user';
      appState.guidedDragPct = 0;
      appState.guidedWipePct = 0;
      playUiSound('click');
      renderGuided3dScene(0, true);
      renderGuidedPhaseControls();
    });
  });
}

function skipGuidedDemoToUser() {
  playUiSound('click');
  stopActiveVoice();
  if (demoAnimInterval) {
    clearInterval(demoAnimInterval);
    demoAnimInterval = null;
  }
  appState.guidedPhase = 'user';
  appState.guidedDragPct = 0;
  appState.guidedWipePct = 0;
  renderGuided3dScene(0, true);
  renderGuidedPhaseControls();
}

function replayGuidedStepDemo() {
  playUiSound('click');
  startGuided3dStep(appState.currentStepIndex);
}

function renderGuided3dScene(pctVal, enableDirectDrag = true) {
  const sceneBox = document.getElementById('guided3dSceneContainer');
  if (!sceneBox) return;
  const steps = get3dGuidedSteps(appState.selectedTube)[appState.currentProcedure];
  const step = steps[appState.currentStepIndex];

  let opts = {
    ...step.mannequinOpts,
    slidePct: pctVal,
    dragMode: enableDirectDrag ? step.dragMode : null,
    activeWipeDir: appState.guidedWipeDirIdx,
    wipeDragPct: appState.guidedWipePct,
    cleanedQuads: appState.guidedCleanedQuads
  };

  if (step.dragMode === 'rotate_lock') {
    opts.slidePct = 0;
    opts.lockDeg = pctVal * 0.9;
  } else if (step.dragMode === 'drag_suction_insert' || step.dragMode === 'drag_suction_withdraw') {
    opts.suctionDepthPct = pctVal;
  } else if (step.dragMode === 'wipe_4quads') {
    opts.wipeDragPct = pctVal;
  }

  sceneBox.innerHTML = build3dMannequinSvg(opts);

  if (!enableDirectDrag) return;

  if (step.dragMode === 'wipe_4quads') {
    const dirVectors = [
      { dx: 0, dy: -1 }, // 1. Up
      { dx: 1, dy: 0 },  // 2. Right
      { dx: 0, dy: 1 },  // 3. Down
      { dx: -1, dy: 0 }  // 4. Left
    ];
    const curVec = dirVectors[Math.min(3, appState.guidedWipeDirIdx)];
    attachDirectEquipmentDrag(
      sceneBox,
      curVec.dx,
      curVec.dy,
      65,
      (newPct) => {
        appState.guidedWipePct = newPct;
        const r = document.getElementById('guidedDirectDragPct');
        if (r) r.textContent = `ทิศที่ ${appState.guidedWipeDirIdx + 1}/4 (${Math.round(newPct)}%)`;
        renderGuided3dScene(newPct, true);
      },
      () => {
        appState.guidedCleanedQuads.add(appState.guidedWipeDirIdx);
        appState.guidedWipePct = 0;
        if (appState.guidedCleanedQuads.size < 4) {
          appState.guidedWipeDirIdx = appState.guidedCleanedQuads.size;
          appState.isCompletingStep = false;
          renderGuided3dScene(0, true);
          renderGuidedPhaseControls();
        } else {
          completeGuided3dStep();
        }
      }
    );
  } else {
    attachDirectEquipmentDrag(
      sceneBox,
      step.dirX,
      step.dirY,
      105,
      (newPct) => {
        appState.guidedDragPct = newPct;
        const r = document.getElementById('guidedDirectDragPct');
        if (r) r.textContent = `${Math.round(newPct)}%`;
        renderGuided3dScene(newPct, true);
      },
      () => completeGuided3dStep()
    );
  }
}

function renderGuidedPhaseControls() {
  const badge = document.getElementById('guidedPhaseBadge');
  const overlay = document.getElementById('guidedActionOverlay');
  const ctrlBox = document.getElementById('guidedInteractiveControlBox');
  const steps = get3dGuidedSteps(appState.selectedTube)[appState.currentProcedure];
  const step = steps[appState.currentStepIndex];

  if (appState.guidedPhase === 'demo1') {
    badge.className = 'phase-status-pill';
    badge.textContent = '🎬 1. AI กำลังสาธิตช้าๆ และอธิบายให้ดู...';
    overlay.classList.add('locked-demo');
    ctrlBox.innerHTML = `
      <div class="interactive-gesture-bar">
        <span style="color:#b8cdd9; font-weight:700;">👀 1. ชมการสาธิตช้าๆ และฟังคำอธิบายก่อนนะคะ</span>
        <button class="btn btn-secondary" style="padding:0.4rem 0.85rem; font-size:0.82rem;" onclick="skipGuidedDemoToUser()">⏩ ข้ามไปลองทำเองเลย</button>
      </div>
    `;
    return;
  }

  if (appState.guidedPhase === 'demo2') {
    badge.className = 'phase-status-pill';
    badge.textContent = '🎬 2. กำลังสาธิตช้าๆ ให้ดูอีกรอบ...';
    overlay.classList.add('locked-demo');
    ctrlBox.innerHTML = `
      <div class="interactive-gesture-bar">
        <span style="color:#fde047; font-weight:700;">👀 2. ดูจังหวะการเคลื่อนไหวช้าๆ อีกรอบ แล้วเตรียมลองทำเองนะคะ</span>
        <button class="btn btn-secondary" style="padding:0.4rem 0.85rem; font-size:0.82rem;" onclick="skipGuidedDemoToUser()">⏩ ลงมือทำเลย</button>
      </div>
    `;
    return;
  }

  badge.className = 'phase-status-pill user-turn';
  badge.textContent = '🖐️ 3. ตาคุณลงมือทำเอง: กดค้างที่อุปกรณ์แล้วลากตามลูกศร!';
  overlay.classList.remove('locked-demo');

  const statusLabel = step.dragMode === 'wipe_4quads'
    ? `ลากไม้พันสำลีปาดออกตามลูกศร: <strong id="guidedDirectDragPct">ทิศที่ ${Math.min(4, appState.guidedWipeDirIdx + 1)}/4 (0%)</strong>`
    : `กดค้างที่อุปกรณ์บนคอหุ่น 3 มิติ แล้วลากตามลูกศร (<strong id="guidedDirectDragPct">${Math.round(appState.guidedDragPct)}%</strong>)`;

  ctrlBox.innerHTML = `
    <div class="interactive-gesture-bar">
      <span style="font-weight:800; color:#fde047;">👆 ${statusLabel}</span>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
        <button class="btn btn-secondary" style="padding:0.4rem 0.85rem; font-size:0.82rem;" onclick="speakTryFollowExample()">🔊 ลองทำตามตัวอย่างดูนะคะ</button>
        <button class="btn btn-primary" onclick="completeGuided3dStep()">✅ ทำสำเร็จ ➡️ ขั้นถัดไป</button>
      </div>
    </div>
  `;
}

function completeGuided3dStep() {
  if (appState.isAdvancing) return;
  appState.isAdvancing = true;
  if (demoAnimInterval) {
    clearInterval(demoAnimInterval);
    demoAnimInterval = null;
  }
  stopActiveVoice();
  playUiSound('success');

  const allProcs = get3dGuidedSteps(appState.selectedTube);
  const steps = allProcs[appState.currentProcedure];
  const idx = appState.currentStepIndex;
  const k = `${appState.selectedTube}_${appState.currentProcedure}_${idx}`;
  appState.stepCheckpoints[k] = true;

  silentAutoSyncInteraction(`ฝึกทำตามสาธิต 3 มิติ (${appState.currentProcedure}): ${steps[idx].shortTab}`, 'ปกติ: ลากอุปกรณ์ทำตามขั้นตอนสำเร็จ', 'normal', false);

  setTimeout(() => {
    appState.isAdvancing = false;
    if (idx < steps.length - 1) {
      startGuided3dStep(idx + 1);
    } else {
      switchTab('sim');
    }
  }, 450);
}

// ============================================================================
// 8. TAB 3: HANDS-ON 3D PRACTICE WITH DIRECTIONAL SWAB DRAG
// ============================================================================
const SIM1_ITEMS = [
  { id: 'nss', name: 'น้ำเกลือ 0.9% NSS', icon: '🧴', ok: true },
  { id: 'ygauze', name: 'ผ้าก๊อซตัว Y ไร้ขุย', icon: '🩹', ok: true },
  { id: 'swabs', name: 'ไม้พันสำลีไร้เชื้อ', icon: '🥢', ok: true },
  { id: 'brush', name: 'แปรงขัดท่อชั้นใน', icon: '🪥', ok: true },
  { id: 'gloves', name: 'ถุงมือสะอาด', icon: '🧤', ok: true },
  { id: 'bowl', name: 'หม้อต้ม/ถ้วยแช่ท่อ', icon: '🍲', ok: true },
  { id: 'bad_gauze', name: 'ก๊อซตัดเองมีด้ายรุ่ย', icon: '✂️', ok: false },
  { id: 'bad_alc', name: 'แอลกอฮอล์ราดรูแผล', icon: '🔥', ok: false },
  { id: 'bad_tap', name: 'น้ำประปาเช็ดแผลสด', icon: '🚰', ok: false }
];

function switchSimStage(num) {
  playUiSound('click');
  appState.currentSimStage = num;
  appState.isCompletingStep = false;
  for (let i = 1; i <= 4; i++) {
    document.getElementById('simTab' + i)?.classList.toggle('active', i === num);
  }
  document.getElementById('simStageHeaderBadge').textContent = `ด่านฝึกปฏิบัติ 3 มิติ ด่านที่ ${num} / 4`;
  renderSim3dStage();
  speakSimInstruction();
}

function speakSimInstruction() {
  const num = appState.currentSimStage;
  const voices = {
    1: 'ด่านที่หนึ่ง แตะเลือกอุปกรณ์ทำแผลและล้างท่อที่ปราศจากเชื้อให้ครบหกชิ้น ห้ามหยิบผ้าก๊อซที่มีด้ายรุ่ย และห้ามใช้แอลกอฮอล์ราดแผลเปิดนะคะ',
    2: 'ด่านที่สอง กดค้างที่ไม้พันสำลีชิดโคนท่อ แล้วลากปาดออกไปตามทิศลูกศรให้ครบทั้งสี่ทิศนะคะ',
    3: 'ด่านที่สาม กดค้างที่ด้ามแปรงล้างท่อสีเหลืองบนจอ แล้วลากไปทางขวาเพื่อขัดคราบเสมหะและหมุนล็อคท่อชั้นในค่ะ',
    4: 'ด่านที่สี่ กดค้างที่วาล์วสีฟ้าบนสายดูดเสมหะ แล้วลากดึงสายออกจากรูท่อที่คอตามลูกศรให้เสมหะออกหมดนะคะ'
  };
  speakNaturalThaiFemale(voices[num]);
}

function updateSimProgressBadges() {
  let cnt = 0;
  for (let i = 1; i <= 4; i++) {
    const ok = appState.simPassed[i];
    if (ok) cnt++;
    const tick = document.getElementById('simTick' + i);
    if (tick) tick.textContent = ok ? '✅' : '⬜';
  }
  document.getElementById('simScoreBadge').textContent = `${cnt}/4 ด่าน`;
}

function renderSim3dStage() {
  const num = appState.currentSimStage;
  const canvas = document.getElementById('sim3dCanvasContainer');
  const overlay = document.getElementById('sim3dControlOverlay');
  if (!canvas || !overlay) return;

  if (num === 1) {
    const okCount = SIM1_ITEMS.filter(x => x.ok && appState.sim1Selected.has(x.id)).length;
    canvas.innerHTML = `
      <div style="width:100%;">
        <div class="equip-visual-grid">
          ${SIM1_ITEMS.map(item => {
            const picked = appState.sim1Selected.has(item.id);
            const cls = picked ? (item.ok ? 'picked-ok' : 'picked-bad') : '';
            return `
              <div class="equip-tile ${cls}" onclick="toggleSim1Equip('${item.id}')">
                <div style="font-size:2.1rem;">${item.icon}</div>
                <div style="font-weight:700; font-size:0.84rem; margin-top:0.2rem;">${item.name}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    overlay.innerHTML = `
      <div class="explanation-with-pip">
        <div class="pip-visual-box">${buildPipAnimationSvg('pip_no_boil_plastic')}</div>
        <div class="narration-subtitle-box">
          ด่านที่ 1: แตะเลือกอุปกรณ์ปราศจากเชื้อให้ครบ 6 ชิ้น (<span class="hl-danger">ห้ามใช้ก๊อซตัดเองที่มีขุยด้าย และห้ามใช้แอลกอฮอล์ราดรูแผล</span>) • เลือกถูกแล้ว <strong>${okCount} / 6 ชิ้น</strong>
        </div>
      </div>
    `;
    return;
  }

  if (num === 2) {
    const activeDir = appState.sim2CleanedQuads.size;
    canvas.innerHTML = build3dMannequinSvg({
      showYgauze: activeDir === 4,
      showWipeZones: true,
      activeWipeDir: activeDir,
      wipeDragPct: appState.sim2WipePct,
      cleanedQuads: appState.sim2CleanedQuads
    });
    overlay.innerHTML = `
      <div class="explanation-with-pip">
        <div class="pip-visual-box">${buildPipAnimationSvg('pip_wipe_outward')}</div>
        <div>
          <div class="narration-subtitle-box">
            ด่านที่ 2: <span class="hl-must">กดค้างที่ไม้พันสำลีชิดโคนท่อ แล้วลากปาดออกไปตามทิศลูกศร</span> ให้ครบทั้ง 4 ทิศ (สะอาดแล้ว ${appState.sim2CleanedQuads.size} / 4 ทิศ)
          </div>
        </div>
      </div>
    `;
    if (activeDir < 4) {
      const dirVectors = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 }
      ];
      const curVec = dirVectors[activeDir];
      attachDirectEquipmentDrag(
        canvas,
        curVec.dx,
        curVec.dy,
        65,
        (newPct) => {
          appState.sim2WipePct = newPct;
          renderSim3dStage();
        },
        () => {
          appState.sim2CleanedQuads.add(activeDir);
          appState.sim2WipePct = 0;
          if (appState.sim2CleanedQuads.size < 4) {
            appState.isCompletingStep = false;
            renderSim3dStage();
          } else {
            appState.simPassed[2] = true;
            updateSimProgressBadges();
            renderSim3dStage();
            silentAutoSyncInteraction('ผ่านด่านฝึกปฏิบัติ 3 มิติ ด่านที่ 2: ลากเช็ดแผลรอบโคนท่อครบ 4 ทิศ', 'ปกติ: ทำแผลปราศจากเชื้อ', 'normal', true);
            speakNaturalThaiFemale('ยอดเยี่ยมค่ะ ลากเช็ดแผลรอบโคนท่อสะอาดครบทั้งสี่ทิศแล้ว ไปด่านที่สามกันนะคะ', () => switchSimStage(3));
          }
        }
      );
    }
    return;
  }

  if (num === 3) {
    canvas.innerHTML = build3dMannequinSvg({
      showBrush: appState.sim3ScrubVal < 95,
      slidePct: appState.sim3ScrubVal,
      lockDeg: appState.sim3ScrubVal * 0.9,
      dragMode: 'drag_brush'
    });
    overlay.innerHTML = `
      <div class="explanation-with-pip">
        <div class="pip-visual-box">${buildPipAnimationSvg('pip_brush_scrub')}</div>
        <div>
          <div class="narration-subtitle-box">
            ด่านที่ 3: <span class="hl-must">กดค้างที่ด้ามแปรงสีเหลืองบนท่อชั้นใน แล้วลากไปทางขวา ➡️</span> เพื่อขัดคราบเสมหะ สอดท่อคืน และหมุนล็อค 90° (${Math.round(appState.sim3ScrubVal)}%)
          </div>
        </div>
      </div>
    `;
    attachDirectEquipmentDrag(
      canvas,
      1,
      0,
      105,
      (newPct) => {
        appState.sim3ScrubVal = newPct;
        renderSim3dStage();
      },
      () => {
        appState.simPassed[3] = true;
        updateSimProgressBadges();
        silentAutoSyncInteraction('ผ่านด่านฝึกปฏิบัติ 3 มิติ ด่านที่ 3: ลากแปรงขัดท่อและหมุนล็อคสำเร็จ', 'ปกติ: ล็อคท่อแน่นหนา', 'normal', true);
        speakNaturalThaiFemale('เก่งมากค่ะ ขัดล้างท่อสะอาดและหมุนสลักล็อคแน่นหนาแล้ว ไปด่านที่สี่กันนะคะ', () => switchSimStage(4));
      }
    );
    return;
  }

  if (num === 4) {
    canvas.innerHTML = build3dMannequinSvg({
      showSuctionCatheter: true,
      suctionMode: 'withdraw',
      showMucus: true,
      suctionDepthPct: appState.sim4ElapsedSeconds,
      dragMode: 'drag_suction_withdraw'
    });
    overlay.innerHTML = `
      <div class="explanation-with-pip">
        <div class="pip-visual-box">${buildPipAnimationSvg('pip_suction_valve')}</div>
        <div>
          <div class="narration-subtitle-box">
            ด่านที่ 4: <span class="hl-must">กดค้างที่รูควบคุมแรงดูดสีฟ้า แล้วลากดึงสายออกจากรูท่อที่คอตามลูกศร ⬅️</span> เพื่อดูดเสมหะออกจากหลอดลม (${Math.round(appState.sim4ElapsedSeconds)}%)
          </div>
        </div>
      </div>
    `;
    attachDirectEquipmentDrag(
      canvas,
      -1,
      -0.2,
      105,
      (newPct) => {
        appState.sim4ElapsedSeconds = newPct;
        renderSim3dStage();
      },
      () => {
        appState.simPassed[4] = true;
        updateSimProgressBadges();
        silentAutoSyncInteraction('ผ่านด่านฝึกปฏิบัติ 3 มิติ ด่านที่ 4: ลากสายดูดเสมหะออกจากรูท่อที่คอสำเร็จ', 'ปกติ: ดูดเสมหะปลอดภัย', 'normal', true);
        speakNaturalThaiFemale('ยอดเยี่ยมมากค่ะ คุณผ่านการฝึกปฏิบัติครบทั้งสี่ด่านแล้วค่ะ');
      }
    );
  }
}

function toggleSim1Equip(id) {
  const item = SIM1_ITEMS.find(x => x.id === id);
  if (!item) return;
  appState.sim1Selected.add(id);

  if (!item.ok) {
    playUiSound('alert');
    speakNaturalThaiFemale(`ห้ามใช้ ${item.name} นะคะ เพราะเป็นอันตรายต่อทางเดินหายใจค่ะ`);
    setTimeout(() => {
      appState.sim1Selected.delete(id);
      renderSim3dStage();
    }, 1000);
  } else {
    playUiSound('click');
    const okCount = SIM1_ITEMS.filter(x => x.ok && appState.sim1Selected.has(x.id)).length;
    if (okCount === 6) {
      playUiSound('success');
      appState.simPassed[1] = true;
      updateSimProgressBadges();
      silentAutoSyncInteraction('ผ่านด่านฝึกปฏิบัติ 3 มิติ ด่านที่ 1: จัดถาดอุปกรณ์ไร้เชื้อครบ 6 ชิ้น', 'ปกติ: เลือกอุปกรณ์ถูกต้อง', 'normal', true);
      speakNaturalThaiFemale('เก่งมากค่ะ เลือกอุปกรณ์ถูกต้องครบทั้งหกชิ้น ไปด่านที่สองกันนะคะ', () => switchSimStage(2));
    }
  }
  renderSim3dStage();
}

// ============================================================================
// 9. TAB 4: REAL CLINICAL SPUTUM PHOTOGRAPHS & STOMA COMPARISON
// ============================================================================
const REALISTIC_SPUTUM_SAMPLES = [
  {
    id: 'clear',
    title: '1. ขาวใส / ขาวขุ่นเล็กน้อย (ปกติ)',
    sub: 'เสมหะมูกขาวใส ไม่เหนียวหนืด ไม่มีกลิ่นเหม็น',
    imgUrl: 'images/real_sputum_clear.jpg'
  },
  {
    id: 'thick',
    title: '2. เหลืองอ่อนเหนียวข้นเป็นก้อนหนืด',
    sub: 'เสมหะเหนียวหนืดเกาะท่อ (ร่างกายขาดน้ำ / อากาศแห้ง)',
    imgUrl: 'images/real_sputum_thick_yellow.jpg'
  },
  {
    id: 'yellow_green',
    title: '3. เขียวข้นปนหนอง / เหลืองเข้มมีกลิ่น',
    sub: 'เสมหะขุ่นทึบสีเขียวเหลือง (สัญญาณติดเชื้อแบคทีเรีย)',
    imgUrl: 'images/real_sputum_1.jpg'
  },
  {
    id: 'pink_blood',
    title: '4. ชมพูจางๆ / มีเส้นเลือดฝอยปนเล็กน้อย',
    sub: 'มีจุดเลือดฝอยปนเล็กน้อยจากเยื่อบุหลอดลมระคายเคือง',
    imgUrl: 'images/real_sputum_2.jpg'
  },
  {
    id: 'fresh_blood',
    title: '5. เลือดสีแดงสด / ลิ่มเลือดบนผ้าก๊อซ (ฉุกเฉิน!)',
    sub: 'เลือดออกสดจากท่อเจาะคอหรือรอบแผล (ต้องพบแพทย์ทันที)',
    imgUrl: 'images/real_blood_gauze.jpg'
  }
];

const REALISTIC_STOMA_SAMPLES = [
  {
    id: 'normal',
    title: '1. แผลแห้งสะอาด ผ้าก๊อซตัว Y รองเรียบร้อย',
    sub: 'ขอบแผลสะอาด สายผูกคอสอดนิ้วได้ 1–2 นิ้วพอดี',
    imgUrl: 'images/pdf_stoma_2.jpg'
  },
  {
    id: 'wet_red',
    title: '2. ผิวรอบรูเจาะคอชื้นแดง / ระคายเคือง',
    sub: 'ผิวรอบแป้นท่อชื้นจากเสมหะซึมขัง ต้องเปลี่ยนก๊อซทันที',
    imgUrl: 'images/pdf_stoma_3.jpg'
  },
  {
    id: 'infected',
    title: '3. ขอบแผลเจาะคอบวมแดงร้อน / มีหนองซึม',
    sub: 'แผลอักเสบติดเชื้อหรือมีติ่งเนื้อนูนรอบรูเจาะคอ',
    imgUrl: 'images/pdf_stoma_5.jpg'
  },
  {
    id: 'plugged',
    title: '4. หายใจหอบเหนื่อย / เสียงครืดคราดดัง (ท่อตัน)',
    sub: 'ก้อนเสมหะอุดตันท่อชั้นใน ต้องรีบถอดท่อชั้นในออกล้างทันที',
    imgUrl: 'images/real_tracheostomia.jpg'
  },
  {
    id: 'pulsating',
    title: '5. ท่อหลุดออกจากรูเจาะคอ / เลือดออกมาก (ฉุกเฉิน!)',
    sub: 'รูเปิดหลอดลมคอเมื่อท่อหลุด หรือท่อเต้นตามชีพจร รีบส่ง รพ.',
    imgUrl: 'images/real_tracheostoma.jpg'
  }
];

function renderRealisticSputumAndStomaSwatches() {
  const secGrid = document.getElementById('secSwatchGrid');
  if (secGrid) {
    secGrid.innerHTML = REALISTIC_SPUTUM_SAMPLES.map(s => `
      <div class="specimen-card ${appState.visualSec === s.id ? 'active' : ''}" onclick="pickVisualSign('sec', '${s.id}')">
        <img src="${s.imgUrl}" alt="${s.title}" class="specimen-photo-img" loading="eager" />
        <div style="font-weight:800; font-size:0.88rem; color:var(--text-main);">${s.title}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${s.sub}</div>
      </div>
    `).join('');
  }

  const stomaGrid = document.getElementById('stomaSwatchGrid');
  if (stomaGrid) {
    stomaGrid.innerHTML = REALISTIC_STOMA_SAMPLES.map(st => `
      <div class="specimen-card ${appState.visualStoma === st.id ? 'active' : ''}" onclick="pickVisualSign('stoma', '${st.id}')">
        <img src="${st.imgUrl}" alt="${st.title}" class="specimen-photo-img" loading="eager" />
        <div style="font-weight:800; font-size:0.88rem; color:var(--text-main);">${st.title}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${st.sub}</div>
      </div>
    `).join('');
  }
}

function pickVisualSign(type, val) {
  playUiSound('click');
  if (type === 'sec') appState.visualSec = val;
  else appState.visualStoma = val;
  renderRealisticSputumAndStomaSwatches();
  renderVisualTriageResult(true);
}

function renderVisualTriageResult(shouldSpeak = false) {
  const sec = appState.visualSec;
  const stoma = appState.visualStoma;
  const box = document.getElementById('visualTriageResultBox');
  if (!box) return;

  if (sec === 'fresh_blood' || stoma === 'pulsating' || stoma === 'plugged') {
    box.style.background = '#fbf4f5';
    box.style.borderColor = '#7d2930';
    box.innerHTML = `
      <div style="font-size:2.8rem;">🔴</div>
      <div style="flex:1;">
        <div style="font-size:1.15rem; font-weight:800; color:#5c1f24;">🚨 ฉุกเฉินวิกฤต! ต้องแก้ไขเฉพาะหน้าและนำส่งโรงพยาบาลทันที</div>
        <div style="font-size:0.94rem; font-weight:700; color:#7d2930; margin-top:0.25rem;">
          • <strong>กรณีหอบเหนื่อย/สงสัยก้อนเสมหะอุดตันท่อ:</strong> รีบหมุนปลดล็อค <strong>"ถอดท่อชั้นในออกมาทันที!"</strong> เพื่อให้ผู้ป่วยหายใจผ่านท่อชั้นนอกได้โล่ง แล้วดูดเสมหะ<br/>
          • <strong>กรณีเลือดสีแดงสดออกมาก หรือท่อเต้นตามจังหวะชีพจร:</strong> ห้ามดึงท่อชั้นนอกออกเองเด็ดขาด! จัดท่าศีรษะสูงแล้วโทร <strong>1669</strong> ทันที
        </div>
      </div>
    `;
    if (shouldSpeak) {
      speakNaturalThaiFemale('สัญญาณฉุกเฉินวิกฤตค่ะ หากผู้ป่วยหอบเหนื่อยสงสัยเสมหะอุดตันท่อ ให้รีบถอดท่อชั้นในออกมาทันทีเพื่อให้หายใจโล่ง แต่หากมีเลือดสีแดงสดออกมาก ห้ามดึงท่อชั้นนอกออกเอง ให้รีบโทรหนึ่งหกหกเก้าทันทีค่ะ');
      silentAutoSyncInteraction('เทียบภาพถ่ายเสมหะจริง: พบสัญญาณฉุกเฉิน', 'ฉุกเฉิน: ต้องรับการช่วยเหลือทันที', 'critical', false);
    }
    return;
  }

  if (sec === 'yellow_green' || stoma === 'infected') {
    box.style.background = '#f7ead9';
    box.style.borderColor = '#9a5b25';
    box.innerHTML = `
      <div style="font-size:2.8rem;">🟡</div>
      <div style="flex:1;">
        <div style="font-size:1.15rem; font-weight:800; color:#783f12;">⚠️ พบสัญญาณติดเชื้อ (ควรพาผู้ป่วยมาพบแพทย์)</div>
        <div style="font-size:0.94rem; font-weight:600; color:#9a5b25; margin-top:0.2rem;">
          เสมหะสีเขียวข้นปนหนองมีกลิ่นเหม็น หรือแผลบวมแดงร้อนมีหนองซึม: ให้ทำแผลด้วย 0.9% NSS ล้างท่อชั้นในให้สะอาด และพาผู้ป่วยมาพบแพทย์ค่ะ
        </div>
      </div>
    `;
    if (shouldSpeak) {
      speakNaturalThaiFemale('พบสัญญาณเฝ้าระวังการติดเชื้อค่ะ เสมหะมีสีเขียวข้นหรือแผลบวมแดงมีหนอง ให้ทำความสะอาดแผลด้วยน้ำเกลือและพาผู้ป่วยมาพบแพทย์นะคะ');
      silentAutoSyncInteraction('เทียบภาพถ่ายเสมหะจริง: เสมหะเขียวข้น/แผลบวมแดง', 'เฝ้าระวัง: สงสัยการติดเชื้อ', 'warning', false);
    }
    return;
  }

  if (sec === 'thick' || sec === 'pink_blood' || stoma === 'wet_red') {
    box.style.background = '#f1f5f8';
    box.style.borderColor = '#4b5f73';
    box.innerHTML = `
      <div style="font-size:2.8rem;">🔵</div>
      <div style="flex:1;">
        <div style="font-size:1.15rem; font-weight:800; color:#2c3947;">ℹ️ ปรับการดูแลที่บ้าน (เสมหะเหนียวข้น / มีเส้นเลือดฝอยปนเล็กน้อย / แผลเปียกชื้น)</div>
        <div style="font-size:0.94rem; font-weight:600; color:#4b5f73; margin-top:0.2rem;">
          พ่นละอองน้ำเกลือ 0.9% NSS เพิ่มความชุ่มชื้น กระตุ้นดื่มน้ำอุ่น ถอดล้างท่อชั้นในบ่อยขึ้น (3–4 ครั้ง/วัน) เปลี่ยนผ้าก๊อซตัว Y เมื่อเปียกแฉะ และระวังอย่าใช้แรงดันดูดเสมหะเกิน 150 mmHg ค่ะ
        </div>
      </div>
    `;
    if (shouldSpeak) {
      speakNaturalThaiFemale('เสมหะเหนียวข้นหรือแผลเปียกชื้นค่ะ แนะนำให้พ่นละอองน้ำเกลือเพิ่มความชุ่มชื้น ดื่มน้ำอุ่น ถอดล้างท่อชั้นในบ่อยขึ้น และเปลี่ยนผ้าก๊อซตัววายทันทีเมื่อเปียกแฉะนะคะ');
      silentAutoSyncInteraction('เทียบภาพถ่ายเสมหะจริง: เสมหะเหนียว/ชมพูจางๆ/แผลชื้น', 'เฝ้าระวัง: ปรับการดูแลความชุ่มชื้น', 'warning', false);
    }
    return;
  }

  box.style.background = '#f4f6ef';
  box.style.borderColor = '#525c32';
  box.innerHTML = `
    <div style="font-size:2.8rem;">🟢</div>
    <div style="flex:1;">
      <div style="font-size:1.15rem; font-weight:800; color:#3d4524;">✅ สถานะปกติ (ปลอดภัย)</div>
      <div style="font-size:0.94rem; font-weight:600; color:#525c32; margin-top:0.2rem;">
        เสมหะขาวใสปกติ แผลแห้งสะอาดดี หายใจโล่ง ให้ทำแผลวันละ 1–2 ครั้ง และถอดล้างท่อชั้นในวันละ 2–3 ครั้งตามปกติค่ะ
      </div>
    </div>
  `;
  if (shouldSpeak) {
    speakNaturalThaiFemale('ลักษณะเสมหะและแผลเจาะคออยู่ในเกณฑ์ปกติและปลอดภัยค่ะ ให้ทำแผลวันละหนึ่งถึงสองครั้ง และล้างท่อชั้นในวันละสองถึงสามครั้งตามปกตินะคะ');
  }
}

// ============================================================================
// 10. TAB 5 (สมุดพก) & TAB 6 (ADMIN DASHBOARD WITH PASSWORD dmknj)
// ============================================================================
const CAREGIVER_RUBRIC_8 = [
  { id: 1, text: 'ล้างมือแบบ hygienic hand washing ก่อนทำความสะอาดท่อหลอดลมคอ', methods: 'O, D' },
  { id: 2, text: 'เตรียมอุปกรณ์เครื่องใช้ในการทำความสะอาดท่อหลอดลมคอได้ถูกต้องครบถ้วน', methods: 'O, D' },
  { id: 3, text: 'ทำแผลท่อหลอดลมคอโดยใช้เทคนิคปราศจากเชื้อทุกขั้นตอน (เช็ดในออกนอก)', methods: 'O, D' },
  { id: 4, text: 'จับแป้นประคองและถอดท่อชั้นในออกจากท่อชั้นนอกโดยใช้เทคนิคปราศจากเชื้อ', methods: 'O, D' },
  { id: 5, text: 'ใส่ท่อชั้นในกลับคืนโดยใช้เทคนิคปราศจากเชื้อและหมุนสลักล็อคแน่นหนา', methods: 'O, D' },
  { id: 6, text: 'ล้างมือแบบ hygienic hand washing หลังทำความสะอาดท่อหลอดลมคอ', methods: 'O, D' },
  { id: 7, text: 'ล้างท่อชั้นในถูกวิธีตามชนิดท่อ (โลหะต้มน้ำเดือด 30 นาที/พลาสติกห้ามต้ม) และสลัดน้ำแห้งสนิท', methods: 'O, D, V' },
  { id: 8, text: 'ประเมินลักษณะ สี กลิ่น ปริมาณเสมหะ และอาการผิดปกติของผู้ป่วยได้ถูกต้อง', methods: 'O, V' }
];

function getTotalEvalScore() {
  return CAREGIVER_RUBRIC_8.reduce((sum, item) => sum + (appState.evalScores[item.id] === 1 ? 1 : 0), 0);
}

function renderEvaluationTable() {
  const tbody = document.getElementById('evalTableBody');
  if (!tbody) return;

  tbody.innerHTML = CAREGIVER_RUBRIC_8.map(item => {
    const sc = appState.evalScores[item.id];
    return `
      <tr>
        <td style="text-align:center; font-weight:800;">${item.id}</td>
        <td style="font-weight:600;">${item.text}</td>
        <td><span class="badge badge-blue">${item.methods}</span></td>
        <td><span class="badge ${sc === 1 ? 'badge-green' : 'badge-amber'}">${sc === 1 ? '✅ ผ่านเกณฑ์ (1)' : '⏳ รอฝึก (0)'}</span></td>
        <td style="font-size:0.84rem; color:var(--text-muted);">${appState.evalNotes[item.id] || '-'}</td>
      </tr>
    `;
  }).join('');

  const total = getTotalEvalScore();
  const pct = Math.round((total / 8) * 100);
  const logs = getHomeCareLogs();

  document.getElementById('headerPatientId').textContent = appState.patientId;
  const nbId = document.getElementById('notebookPatientId');
  if (nbId) nbId.textContent = appState.patientId;

  const scoreEl = document.getElementById('opdCardEvalScore');
  if (scoreEl) scoreEl.textContent = `${total} / 8 (${pct}%)`;
  const logCntEl = document.getElementById('opdCardLogCount');
  if (logCntEl) logCntEl.textContent = `${logs.length} ครั้ง`;
}

function getHomeCareLogs() {
  try {
    const raw = localStorage.getItem('trachome_home_logs_v4');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [
    {
      date: 'วันนี้ 08:30 น.',
      patientId: appState.patientId,
      tube: 'ท่อโลหะ Jackson',
      activity: 'ทำแผลเจาะคอ + ล้างท่อชั้นในครบขั้นตอน',
      secretion: 'ปกติ: เสมหะขาวใส แผลแห้งสะอาดดี',
      risk: 'normal'
    }
  ];
}

function classifySecretionRisk(secText) {
  if (!secText) return 'normal';
  if (secText.includes('ฉุกเฉิน') || secText.includes('เลือดสด')) return 'critical';
  if (secText.includes('เฝ้าระวัง') || secText.includes('เหลือง') || secText.includes('เหนียว')) return 'warning';
  return 'normal';
}

function autoLogNotebookSelection() {
  playUiSound('click');
  const act = document.getElementById('logActivity')?.value || 'ทำแผลเจาะคอ + ล้างท่อชั้นในครบขั้นตอน';
  const sec = document.getElementById('logSecretion')?.value || 'ปกติ: เสมหะขาวใส แผลแห้งสะอาดดี';
  const risk = classifySecretionRisk(sec);
  silentAutoSyncInteraction(act, sec, risk, false);
}

function renderHomeCareLogs() {
  const tbody = document.getElementById('homeLogTableBody');
  if (!tbody) return;
  const logs = getHomeCareLogs();
  tbody.innerHTML = logs.map(l => {
    const cls = l.risk === 'critical' ? 'badge-red' : (l.risk === 'warning' ? 'badge-amber' : 'badge-green');
    const pid = (l.patientId || appState.patientId).replace('TC-', 'TH-');
    return `
      <tr>
        <td style="font-weight:700; white-space:nowrap;">${l.date}</td>
        <td><span class="badge badge-blue">${pid}</span></td>
        <td><span class="badge badge-teal">${l.tube}</span></td>
        <td>${l.activity}</td>
        <td><span class="badge ${cls}">${l.secretion}</span></td>
      </tr>
    `;
  }).join('');
}

// ============================================================================
// 11. MANDATORY LOGIN & REGISTRATION GATE (TH-XXXXXX ID, Clean Labels)
// ============================================================================
function openAuthModal() {
  playUiSound('click');
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.add('open');
  const closeBtn = document.getElementById('authCloseBtn');
  if (closeBtn) closeBtn.style.display = appState.isAuthenticated ? 'inline-flex' : 'none';
}

function closeAuthModal() {
  if (!appState.isAuthenticated) return; // Mandatory gate until logged in!
  playUiSound('click');
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.remove('open');
    modal.classList.remove('mandatory-gate');
  }
}

function switchAuthTab(mode) {
  playUiSound('click');
  const isLogin = mode === 'login';
  document.getElementById('authLoginPanel').style.display = isLogin ? 'block' : 'none';
  document.getElementById('authRegisterPanel').style.display = isLogin ? 'none' : 'block';
  document.getElementById('btnAuthTabLogin').className = isLogin ? 'btn btn-primary' : 'btn btn-outline';
  document.getElementById('btnAuthTabReg').className = !isLogin ? 'btn btn-primary' : 'btn btn-outline';
  document.getElementById('authFeedbackBox').style.display = 'none';
}

async function submitPatientLogin() {
  playUiSound('click');
  ensureBackgroundMusicStarted();
  const ident = document.getElementById('loginIdentifier')?.value.trim() || 'TH-841029';
  const pin = document.getElementById('loginPin')?.value.trim() || '1234';
  const fb = document.getElementById('authFeedbackBox');
  fb.style.display = 'block';

  try {
    const resp = await fetch('/api/gsheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login_patient', identifier: ident, pin })
    });
    const data = await resp.json();
    if (data && data.ok) {
      appState.isAuthenticated = true;
      appState.patientId = (data.patientId || 'TH-841029').replace('TC-', 'TH-');
      const closeBtn = document.getElementById('authCloseBtn');
      if (closeBtn) closeBtn.style.display = 'inline-flex';
      closeAuthModal();
      renderEvaluationTable();
      renderHomeCareLogs();
      if (data.tubeType && TUBE_TYPES[data.tubeType]) {
        selectTubeType(data.tubeType);
      } else {
        selectLab3dModule(0);
      }
    }
  } catch (e) {
    appState.isAuthenticated = true;
    closeAuthModal();
    selectLab3dModule(0);
  }
}

function getClientDefaultVault() {
  const saved = localStorage.getItem('trachome_vault_v4');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return {
    'TH-841029': { patientId: 'TH-841029', hn: 'HN-690104', patientName: 'นายสมศักดิ์ (CA Larynx)', caregiverName: 'นางบัวผัน (คู่สมรส)', relation: 'ญาติสายตรง', tubeType: 'jackson' },
    'TH-592310': { patientId: 'TH-592310', hn: 'HN-690219', patientName: 'นางคำมูล (Subglottic Stenosis)', caregiverName: 'น.ส.กานดา (บุตรสาว)', relation: 'ญาติสายตรง', tubeType: 'shiley' },
    'TH-319482': { patientId: 'TH-319482', hn: 'HN-690342', patientName: 'นายอินทร์ (Post-op Head & Neck)', caregiverName: 'นายวีระ (บุตรชาย)', relation: 'ญาติสายตรง', tubeType: 'shiley' },
    'TH-704195': { patientId: 'TH-704195', hn: 'HN-690418', patientName: 'นายบุญมี (Vocal Cord Paralysis)', caregiverName: 'นางสายหยุด (คู่สมรส)', relation: 'ญาติสายตรง', tubeType: 'fenestrated' },
    'TH-628514': { patientId: 'TH-628514', hn: 'HN-690509', patientName: 'น.ส.อรทัย (Tracheal Stenosis)', caregiverName: 'ดูแลตนเอง + มารดา', relation: 'ญาติสายตรง', tubeType: 'ttube' },
    'TH-915203': { patientId: 'TH-915203', hn: 'HN-690621', patientName: 'นายคำปัน (CA Hypopharynx)', caregiverName: 'นางจันทร์เพ็ญ (หลาน)', relation: 'ไม่เป็นญาติสายตรง', tubeType: 'jackson' }
  };
}

function generateClientThId(hnStr) {
  const clean = (hnStr || 'HN000').trim().toUpperCase();
  let h = 2166136261;
  for (let i = 0; i < clean.length; i++) {
    h ^= clean.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const num = (Math.abs(h) % 900000) + 100000;
  return `TH-${num}`;
}

async function submitPatientRegistration() {
  playUiSound('click');
  ensureBackgroundMusicStarted();
  const hn = document.getElementById('regHN')?.value.trim();
  const ptName = document.getElementById('regPatientName')?.value.trim();
  const cgName = document.getElementById('regCaregiverName')?.value.trim();
  const tubeType = document.getElementById('regTubeType')?.value || 'jackson';
  const pin = document.getElementById('regPin')?.value.trim() || '1234';
  const fb = document.getElementById('authFeedbackBox');
  fb.style.display = 'block';

  if (!hn || !ptName) {
    playUiSound('alert');
    fb.style.background = '#f5e4e6';
    fb.style.color = '#5c1f24';
    fb.textContent = '⚠️ กรุณากรอกเลข HN และชื่อ-นามสกุลผู้ป่วยค่ะ';
    return;
  }

  let newPatientId = generateClientThId(hn);
  try {
    const resp = await fetch('/api/gsheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register_patient',
        hn,
        patientName: ptName,
        caregiverName: cgName || 'ผู้ดูแลหลัก',
        relation: 'ญาติสายตรง',
        tubeType,
        pin
      })
    });
    const data = await resp.json();
    if (data && data.ok && data.patientId) {
      newPatientId = data.patientId;
    }
  } catch (e) {}

  // Save anonymized mapping locally for static GitHub Pages mode (never storing plaintext PIN)
  const localVault = getClientDefaultVault();
  localVault[newPatientId] = {
    patientId: newPatientId,
    hn,
    patientName: ptName,
    caregiverName: cgName || 'ผู้ดูแลหลัก',
    relation: 'ญาติสายตรง',
    tubeType
  };
  localStorage.setItem('trachome_vault_v4', JSON.stringify(localVault));

  playUiSound('success');
  appState.isAuthenticated = true;
  appState.patientId = newPatientId;
  document.getElementById('regHN').value = '';
  document.getElementById('regPatientName').value = '';
  document.getElementById('regCaregiverName').value = '';

  const closeBtn = document.getElementById('authCloseBtn');
  if (closeBtn) closeBtn.style.display = 'inline-flex';
  closeAuthModal();
  selectTubeType(tubeType);
  renderEvaluationTable();
  renderHomeCareLogs();
}

// ============================================================================
// 12. ADMIN DASHBOARD (Password: dmknj, No Patient PIN Access)
// ============================================================================
let isAdminAuthenticated = false;
let liveAdminEvaluations = [];
let liveAdminHomeLogs = [];
let livePdpaVault = {};

async function unlockAdminDashboard() {
  playUiSound('click');
  const pin = document.getElementById('adminPassInput')?.value.trim();
  const err = document.getElementById('adminLoginError');
  if (pin !== 'dmknj') {
    playUiSound('alert');
    err.style.display = 'block';
    err.textContent = '❌ รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง';
    return;
  }
  playUiSound('success');
  isAdminAuthenticated = true;
  err.style.display = 'none';
  document.getElementById('adminLockScreen').style.display = 'none';
  document.getElementById('adminDashboardContent').style.display = 'block';
  await fetchAdminDataFromGoogleSheets();
}

function lockAdminDashboard() {
  playUiSound('click');
  isAdminAuthenticated = false;
  document.getElementById('adminLockScreen').style.display = 'block';
  document.getElementById('adminDashboardContent').style.display = 'none';
}

async function fetchAdminDataFromGoogleSheets() {
  if (!isAdminAuthenticated) return;
  try {
    const resp = await fetch('/api/gsheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_admin_dashboard', adminKey: 'dmknj' })
    });
    const data = await resp.json();
    if (data && (data.ok || data.pdpaVault)) {
      livePdpaVault = data.pdpaVault || {};
      if (Array.isArray(data.sheets) && data.sheets.length > 0) {
        const evalSheet = data.sheets.find(s => s.sheet.includes('1_Caregiver_Evaluations'));
        const logSheet = data.sheets.find(s => s.sheet.includes('2_Home_Care_Daily_Logs'));
        liveAdminEvaluations = (evalSheet?.rows || []).slice(1);
        liveAdminHomeLogs = (logSheet?.rows || []).slice(1);
      }
      if (!liveAdminHomeLogs.length) {
        liveAdminHomeLogs = Object.values(livePdpaVault).map((v, i) => [
          `SEED-${i + 1}`,
          'วันนี้',
          `${v.patientId} [${v.hn}]`,
          v.patientName,
          v.caregiverName,
          TUBE_TYPES[v.tubeType]?.shortName || v.tubeType,
          'ลงทะเบียนและฝึกปฏิบัติในระบบ TRACHOME',
          'ปกติ: เสมหะขาวใส แผลแห้งสะอาดดี',
          'normal'
        ]);
      }
      renderAdminDashboard();
    }
  } catch (e) {
    // Static GitHub Pages fallback using local vault (no PIN stored)
    livePdpaVault = getClientDefaultVault();
    liveAdminHomeLogs = Object.values(livePdpaVault).map((v, i) => [
      `SEED-${i + 1}`,
      'วันนี้',
      `${v.patientId} [${v.hn}]`,
      v.patientName,
      v.caregiverName,
      TUBE_TYPES[v.tubeType]?.shortName || v.tubeType,
      'ลงทะเบียนและฝึกปฏิบัติในระบบ TRACHOME',
      'ปกติ: เสมหะขาวใส แผลแห้งสะอาดดี',
      'normal'
    ]);
    renderAdminDashboard();
  }
}

function renderAdminDashboard() {
  if (!isAdminAuthenticated) return;

  const vaultTbody = document.getElementById('adminPdpaVaultTableBody');
  if (vaultTbody) {
    vaultTbody.innerHTML = Object.values(livePdpaVault).map(v => `
      <tr>
        <td><span class="badge badge-blue" style="font-size:0.86rem;">${(v.patientId || '').replace('TC-', 'TH-')}</span></td>
        <td><strong style="color:var(--merlot);">${v.hn}</strong></td>
        <td style="font-weight:700;">${v.patientName}</td>
        <td>${v.caregiverName}</td>
        <td>${v.relation || 'ญาติสายตรง'}</td>
        <td><span class="badge badge-teal">${TUBE_TYPES[v.tubeType]?.shortName || v.tubeType}</span></td>
      </tr>
    `).join('');
  }

  const evalRows = liveAdminEvaluations;
  const logRows = liveAdminHomeLogs;
  const totalEval = evalRows.length || 1;
  const passedEval = evalRows.filter(r => Number(r[17] || 0) >= 7).length;
  const passPct = Math.round((passedEval / totalEval) * 100);

  document.getElementById('adminKpiPassRate').textContent = `${passPct}% (${passedEval}/${evalRows.length} ราย)`;
  document.getElementById('adminKpiAdherence').textContent = `${logRows.length} ครั้ง`;

  const totalLogs = logRows.length || 1;
  const normalLogs = logRows.filter(r => (r[8] || 'normal') === 'normal').length;
  const alertLogs = logRows.filter(r => (r[8] || 'normal') !== 'normal').length;
  document.getElementById('adminKpiNormalStoma').textContent = `${Math.round((normalLogs / totalLogs) * 100)}%`;
  document.getElementById('adminKpiAlertCases').textContent = `${alertLogs} รายการ`;

  const barsBox = document.getElementById('adminRubricBarsContainer');
  if (barsBox) {
    barsBox.innerHTML = CAREGIVER_RUBRIC_8.map((item, idx) => {
      const colIdx = 9 + idx;
      const passCnt = evalRows.filter(r => Number(r[colIdx] ?? 1) === 1).length;
      const pct = evalRows.length ? Math.round((passCnt / totalEval) * 100) : 100;
      return `
        <div class="bar-row">
          <div class="bar-label-line">
            <span>ข้อ ${item.id}: ${item.text}</span>
            <span>${pct}% (${passCnt}/${evalRows.length})</span>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%;"></div></div>
        </div>
      `;
    }).join('');
  }

  const q = (document.getElementById('adminSearchInput')?.value || '').toLowerCase().trim();
  const rf = document.getElementById('adminFilterRisk')?.value || 'all';
  const filteredLogs = logRows.slice().reverse().filter(r => {
    const idHn = (r[2] || '').toLowerCase().replace('tc-', 'th-');
    const pt = (r[3] || '').toLowerCase();
    const cg = (r[4] || '').toLowerCase();
    const risk = r[8] || 'normal';
    const matchQ = !q || idHn.includes(q) || pt.includes(q) || cg.includes(q);
    const matchR = rf === 'all' || (rf === 'alert' && risk !== 'normal') || (rf === 'normal' && risk === 'normal');
    return matchQ && matchR;
  });

  const tbody = document.getElementById('adminRegistryTableBody');
  if (tbody) {
    tbody.innerHTML = filteredLogs.map(r => {
      const idHn = (r[2] || '-').replace('TC-', 'TH-');
      const pt = r[3] || '-';
      const cg = r[4] || '-';
      const tube = r[5] || '-';
      const act = r[6] || '-';
      const sec = r[7] || '-';
      const risk = r[8] || 'normal';
      const isAlert = risk !== 'normal';

      return `
        <tr style="${isAlert ? 'background:#fbf4f5;' : ''}">
          <td><strong>${idHn}</strong></td>
          <td><div style="font-weight:700;">${pt}</div><small style="color:var(--text-muted);">ผู้ดูแล: ${cg}</small></td>
          <td><span class="badge badge-teal">${tube}</span></td>
          <td><span class="badge badge-green">ผ่านเกณฑ์ (≥80%)</span></td>
          <td><div style="font-weight:700;">${act}</div><div style="font-size:0.8rem; color:${isAlert ? '#7d2930' : '#3d4524'};">${sec}</div></td>
          <td><span class="badge ${isAlert ? 'badge-red' : 'badge-green'}">${isAlert ? '⚠️ เฝ้าระวัง' : '✅ ปกติ'}</span></td>
        </tr>
      `;
    }).join('');
  }
}

function exportAdminDataCSV() {
  if (!isAdminAuthenticated) return;
  playUiSound('click');
  const headers = ['Log_ID', 'Timestamp', 'TH_ID_And_HN', 'Patient_Name', 'Caregiver_Name', 'Tube_Type', 'Interaction_Activity', 'Secretion_Status', 'Risk_Level'];
  const csv = '\uFEFF' + [headers.join(','), ...liveAdminHomeLogs.map(r => r.slice(0, 9).map(c => `"${String(c || '').replace('TC-', 'TH-').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `TRACHOME_Admin_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

function switchTab(tabId) {
  playUiSound('click');
  stopActiveVoice();
  if (demoAnimInterval) clearInterval(demoAnimInterval);
  document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.target === tabId));
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.toggle('active', sec.id === 'view-' + tabId));
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (tabId === 'tubes') selectLab3dModule(appState.labModuleIdx);
  if (tabId === 'guided') startGuided3dStep(appState.currentStepIndex);
  if (tabId === 'sim') switchSimStage(appState.currentSimStage);
  if (tabId === 'safety') renderRealisticSputumAndStomaSwatches();
}

function preloadInitialVoices() {
  // Preload all Tab 1, Tab 2, and Tab 3 voices into instant Blob URL cache for 0ms playback!
  const mods = getLab3dModules(appState.selectedTube);
  mods.forEach(m => preloadVoiceText(m.voice.replace(/ลองทำตามตัวอย่างนะคะ/g, 'ลองทำตามตัวอย่างดูนะคะ')));

  const guided = get3dGuidedSteps(appState.selectedTube);
  Object.values(guided).forEach(stepList => {
    stepList.forEach(s => preloadVoiceText(s.voice.replace(/ลองทำตามตัวอย่างนะคะ/g, 'ลองทำตามตัวอย่างดูนะคะ')));
  });

  [
    'ลองทำตามตัวอย่างดูนะคะ',
    'ด่านที่หนึ่ง แตะเลือกอุปกรณ์ทำแผลและล้างท่อที่ปราศจากเชื้อให้ครบหกชิ้น ห้ามหยิบผ้าก๊อซที่มีด้ายรุ่ย และห้ามใช้แอลกอฮอล์ราดแผลเปิดนะคะ',
    'ด่านที่สอง กดค้างที่ไม้พันสำลีชิดโคนท่อ แล้วลากปาดออกไปตามทิศลูกศรให้ครบทั้งสี่ทิศนะคะ',
    'ด่านที่สาม กดค้างที่ด้ามแปรงล้างท่อสีเหลืองบนจอ แล้วลากไปทางขวาเพื่อขัดคราบเสมหะและหมุนล็อคท่อชั้นในค่ะ',
    'ด่านที่สี่ กดค้างที่วาล์วสีฟ้าบนสายดูดเสมหะ แล้วลากดึงสายออกจากรูท่อที่คอตามลูกศรให้เสมหะออกหมดนะคะ'
  ].forEach(preloadVoiceText);
}

document.addEventListener('DOMContentLoaded', () => {
  ensureBackgroundMusicStarted();
  loadStaticTtsManifest().then(() => preloadInitialVoices());

  // Global button click sound FX & BGM auto-unlock on any user interaction
  document.addEventListener('pointerdown', (e) => {
    ensureBackgroundMusicStarted();
    const interactiveEl = e.target.closest('button, .specimen-card, .equip-tile, select');
    if (interactiveEl) {
      playUiSound('click');
    }
  }, { passive: true });

  renderTubeSelectorStrip();
  renderLab3dModulePills();
  renderLab3dMannequinScene(0, true);
  renderLab3dPhaseUI();
  updateSuctionCalc();
  updateSimProgressBadges();
  renderRealisticSputumAndStomaSwatches();
  renderVisualTriageResult(false);
  renderEvaluationTable();
  renderHomeCareLogs();
});
