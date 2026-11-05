/* 小脑袋乐园 · animal-voice.js —— 动物叫声播放器
 * 优先播放本地真实录音 audio/animals/<slug>.mp3（若 index.json 中登记且可解码）
 * 取不到合规录音时，用 WebAudio 合成可辨识的近似叫声（页面已明示「合成近似音」）
 * 点动物：先叫声，0.3 秒后朗读中文名字；首次手势自动 resume AudioContext
 */
(function () {
  'use strict';
  var X = window.XNLY = window.XNLY || {};
  if (X.animalVoice) return;

  var ctx = null, unlocked = false;
  var buffers = {};        /* slug -> AudioBuffer */
  var failed = {};         /* slug -> true */
  var indexReady = false, realList = null;
  var AUDIO_BASE = /[\/\\]games[\/\\]/.test(location.pathname) ? '../audio/animals/' : 'audio/animals/';

  function ensureCtx() {
    if (!ctx) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { } }
    return ctx;
  }

  document.addEventListener('pointerdown', function () {
    if (unlocked) return;
    unlocked = true;
    ensureCtx();
  }, true);

  /* ---------- 本地真实录音 ---------- */
  function loadIndex(cb) {
    if (indexReady) { cb(); return; }
    indexReady = true;
    realList = [];
    if (!window.fetch) { cb(); return; }
    fetch(AUDIO_BASE + 'index.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && Array.isArray(j.files)) realList = j.files;
        cb();
      })
      .catch(function () { cb(); })
      .then(function () { cb = function () { }; });
  }

  function loadFile(slug, done) {
    if (buffers[slug] || failed[slug] || !ctx || !window.fetch) { done(); return; }
    loadIndex(function () {
      if (!realList || realList.indexOf(slug) < 0) { failed[slug] = true; done(); return; }
      fetch(AUDIO_BASE + slug + '.mp3')
        .then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
        .then(function (ab) { return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); }); })
        .then(function (buf) { buffers[slug] = buf; done(); })
        .catch(function () { failed[slug] = true; done(); });
    });
  }

  function preload(list) {
    (list || []).slice(0, 3).forEach(function (slug) { loadFile(slug, function () { }); });
  }

  /* ---------- WebAudio 合成近似音 ---------- */
  function now() { return ctx ? ctx.currentTime : 0; }

  function tone(freq, dur, type, gain, slideTo, delay) {
    if (!ctx) return;
    var t0 = now() + (delay || 0);
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.02, gain || 0.28), t0 + Math.min(0.08, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(dur, cutoff, gain, delay, type) {
    if (!ctx) return;
    var t0 = now() + (delay || 0);
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = cutoff || 800;
    var g = ctx.createGain(); g.gain.value = gain || 0.22;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start(t0); src.stop(t0 + dur);
  }

  function synth(slug) {
    if (!ctx) return 0;
    switch (slug) {
      case 'dog':
        noise(0.12, 900, 0.35); tone(260, 0.14, 'sawtooth', 0.3, 120);
        noise(0.12, 900, 0.3, 0.32); tone(240, 0.14, 'sawtooth', 0.3, 110, 0.32);
        return 0.8;
      case 'cat':
        tone(520, 0.55, 'triangle', 0.3, 900); tone(880, 0.5, 'triangle', 0.18, 380, 0.25);
        return 1.0;
      case 'cow':
        tone(120, 1.1, 'sawtooth', 0.32, 78); noise(0.9, 500, 0.08);
        return 1.2;
      case 'sheep':
      case 'panda':
        tone(300, 0.7, 'square', 0.22, 220); tone(280, 0.55, 'square', 0.18, 200, 0.4);
        return 1.0;
      case 'lion':
      case 'tiger':
      case 'bear':
        noise(1.1, 380, 0.4); tone(90, 1.0, 'sawtooth', 0.3, 60);
        return 1.2;
      case 'elephant':
        tone(150, 1.0, 'sawtooth', 0.34, 520); tone(420, 0.8, 'square', 0.16, 700, 0.2);
        return 1.2;
      case 'frog':
        tone(180, 0.12, 'square', 0.3, 120); tone(170, 0.12, 'square', 0.3, 115, 0.22);
        tone(165, 0.12, 'square', 0.3, 110, 0.44);
        return 0.7;
      case 'chick':
      case 'bird':
      case 'swallow':
      case 'woodpecker':
        for (var i = 0; i < 4; i++) tone(1600 + i * 120, 0.08, 'sine', 0.22, 2200, i * 0.14);
        return 0.7;
      case 'duck':
      case 'goose':
        tone(340, 0.18, 'square', 0.28, 250); tone(320, 0.16, 'square', 0.26, 240, 0.3);
        return 0.7;
      case 'owl':
        tone(320, 0.35, 'sine', 0.3, 280); tone(300, 0.3, 'sine', 0.24, 260, 0.5);
        return 1.0;
      case 'pig':
      case 'hamster':
      case 'mouse':
      case 'rabbit':
        tone(700, 0.09, 'sawtooth', 0.22, 400); tone(650, 0.08, 'sawtooth', 0.2, 380, 0.2);
        return 0.5;
      case 'horse':
        for (var j = 0; j < 5; j++) tone(700 - j * 90, 0.1, 'sawtooth', 0.24, 300, j * 0.11);
        return 0.9;
      case 'monkey':
      case 'squirrel':
        for (var k = 0; k < 5; k++) tone(900 + (k % 2) * 250, 0.07, 'triangle', 0.2, 700, k * 0.1);
        return 0.8;
      case 'bee':
        tone(220, 0.9, 'sawtooth', 0.2); tone(260, 0.9, 'sawtooth', 0.12);
        return 1.0;
      case 'crab':
        for (var m = 0; m < 4; m++) noise(0.05, 2400, 0.18, m * 0.12, 'highpass');
        return 0.6;
      case 'ant':
      case 'caterpillar':
      case 'snail':
        noise(0.5, 1200, 0.1);
        return 0.6;
      case 'fish':
      case 'turtle':
        for (var n = 0; n < 3; n++) tone(400 + n * 120, 0.06, 'sine', 0.16, 700, n * 0.18);
        return 0.7;
      case 'fox':
      case 'koala':
      case 'penguin':
        tone(800, 0.25, 'triangle', 0.26, 500); tone(600, 0.2, 'triangle', 0.2, 380, 0.3);
        return 0.7;
      case 'hedgehog':
        noise(0.35, 2000, 0.14, 0, 'bandpass');
        return 0.5;
      case 'giraffe':
        tone(260, 0.6, 'triangle', 0.24, 180);
        return 0.7;
      default:
        tone(800, 0.18, 'sine', 0.22, 1200); tone(1000, 0.16, 'sine', 0.18, 700, 0.25);
        return 0.6;
    }
  }

  function playBuffer(slug) {
    var buf = buffers[slug];
    if (!buf || !ctx) return false;
    try {
      var src = ctx.createBufferSource(); src.buffer = buf;
      var g = ctx.createGain(); g.gain.value = 0.9;
      src.connect(g); g.connect(ctx.destination);
      src.start(0);
      return true;
    } catch (e) { return false; }
  }

  function call(slug) {
    ensureCtx();
    if (!ctx) return false;
    if (playBuffer(slug)) return true;
    synth(slug);
    return true;
  }

  function say(text) {
    try {
      if (X.voice && X.voice.speak) { X.voice.speak(String(text)); return; }
      if (!(window.speechSynthesis && window.SpeechSynthesisUtterance)) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(text));
      u.lang = 'zh-CN'; u.rate = 0.95; u.pitch = 1.12;
      window.speechSynthesis.speak(u);
    } catch (e) { }
  }

  /* 点动物：叫声 → 0.3 秒后名字 */
  function play(slug, name, extraText) {
    var ok = call(slug);
    var delay = ok ? 300 : 0;
    if (name) setTimeout(function () { say(name + (extraText || '')); }, delay);
  }

  X.animalVoice = {
    call: call,
    play: play,
    say: say,
    preload: preload,
    hasReal: function (slug) { return !!buffers[slug]; }
  };
})();
