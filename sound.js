/* 小脑袋乐园 · sound.js —— 全站音效（WebAudio 合成，无任何外部音频文件）
 *
 * 玩法：
 *   XNLY.sound.tap()      点击「嗒」
 *   XNLY.sound.correct()  答对「叮」
 *   XNLY.sound.wrong()    答错「噗」
 *   XNLY.sound.notice()   提示音（语音不可用时代替朗读）
 *   XNLY.sound.win()      完成小胜利
 *
 * 默认会给 button / a / 卡片类元素自动加「嗒」的一声；不想响的元素加 data-nosfx 即可。
 * iOS 需要用户手势才能出声：第一次 pointerdown 会自动解锁 AudioContext。
 */
(function () {
  'use strict';
  var X = window.XNLY = window.XNLY || {};
  if (X.sound) return;

  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null;

  /* 全局音效开关（localStorage: xnly_sound_off） */
  function muted() {
    try { return localStorage.getItem('xnly_sound_off') === '1'; } catch (e) { return false; }
  }
  function setMuted(off) {
    try { localStorage.setItem('xnly_sound_off', off ? '1' : '0'); } catch (e) { }
  }

  function unlock() {
    if (!AC) return null;
    if (!ctx) {
      try { ctx = new AC(); } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') {
      try { ctx.resume(); } catch (e) { }
    }
    return ctx;
  }

  function tone(freq, dur, type, gain, delay) {
    var ac = unlock();
    if (!ac) return;
    var t0 = ac.currentTime + (delay || 0);
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.12, t0 + Math.min(0.02, dur / 2));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.01);
  }

  function noise(dur, decay, cutoff, gain) {
    var ac = unlock();
    if (!ac) return;
    try {
      var len = Math.max(1, Math.floor(ac.sampleRate * dur));
      var buf = ac.createBuffer(1, len, ac.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay || 2);
      }
      var src = ac.createBufferSource();
      src.buffer = buf;
      var lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(cutoff || 600, ac.currentTime);
      var g = ac.createGain();
      g.gain.setValueAtTime(gain || 0.18, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      src.connect(lp); lp.connect(g); g.connect(ac.destination);
      src.start();
    } catch (e) { }
  }

  var S = {
    unlock: unlock,
    muted: muted,
    setMuted: setMuted,
    tap: function () { if (muted()) return; tone(1180, 0.045, 'sine', 0.055); },
    correct: function () {
      if (muted()) return;
      tone(880, 0.12, 'sine', 0.11);
      tone(1318, 0.16, 'sine', 0.1, 0.11);
    },
    wrong: function () {
      if (muted()) return;
      noise(0.16, 2.6, 420, 0.16);
      tone(196, 0.12, 'sine', 0.05);
    },
    notice: function () {
      if (muted()) return;
      tone(660, 0.09, 'triangle', 0.12);
      tone(880, 0.12, 'triangle', 0.09, 0.1);
    },
    win: function () {
      if (muted()) return;
      tone(523, 0.13, 'triangle', 0.11);
      tone(659, 0.13, 'triangle', 0.1, 0.12);
      tone(784, 0.2, 'triangle', 0.1, 0.24);
    }
  };

  X.sound = S;

  /* 第一次触摸解锁音频（iOS / 部分安卓需要） */
  document.addEventListener('pointerdown', unlock, { once: true, capture: true });
  document.addEventListener('touchstart', unlock, { once: true, capture: true, passive: true });

  /* 全站「嗒」：按钮 / 链接 / 卡片 / 数字键等 */
  var last = 0;
  var SEL = 'button, a, [role="button"], .card, .num, .key, .cell, .mcard, .panel, .bs-card, .food, .opt, .opt2, .tile';
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('[data-nosfx]')) return;
    if (!t.closest(SEL)) return;
    var now = Date.now();
    if (now - last < 70) return;
    last = now;
    S.tap();
  }, true);
})();
