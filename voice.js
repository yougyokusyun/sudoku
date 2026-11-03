/* 小脑袋乐园 · voice.js —— 共享语音 + 学习记录
 *
 * 1) 语音（全站共用）
 *    - speak(text, {rate, queue, lang})：默认打断上一句；queue:true 时排队连播
 *    - 长句自动按「。！？；」拆成多句依次播报，避免 iOS 一次读不完被截断
 *    - 语速两档：1.0 / 1.3，存 localStorage('xnly_speed')
 *    - 点击打断：手指按下时，如果上一句已经播了 400ms 以上就停掉它
 *    - iOS 手势解锁检测：isUnlocked()；任何一次 pointerdown 都会标记已解锁
 * 2) 降级：不支持 / getVoices() 一直为空时，播提示音 + 右上角「🔇」小图标，不静默失败
 * 3) 学习记录（家长面板数据源）：记录每个页面每天的停留时长、答对/答错次数
 *
 * 全部 localStorage 读写都包了 try/catch，file:// 打开或隐私模式也不会报错。
 */
(function () {
  'use strict';
  var X = window.XNLY = window.XNLY || {};
  if (X.voice) return;

  var synth = window.speechSynthesis;
  var Utter = window.SpeechSynthesisUtterance;
  var supported = !!(synth && Utter);

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }

  /* ======================= 语音 ======================= */

  var queue = [];
  var busy = false;
  var seq = 0;
  var lastStart = 0;
  var unlocked = false;
  var badgeShown = false;
  var silentTimer = null;

  function speed() {
    var v = parseFloat(lsGet('xnly_speed'));
    return v === 1.3 ? 1.3 : 1.0;
  }
  function setSpeed(v) { lsSet('xnly_speed', v === 1.3 ? '1.3' : '1.0'); }

  /* 纯英文句子用 en-US，其余用中文 */
  function langOf(text) {
    var en = (text.match(/[A-Za-z]/g) || []).length;
    var zh = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    return (en > 0 && zh === 0) ? 'en-US' : 'zh-CN';
  }

  /* 按句末标点拆句（不用正则 lookbehind，老 Safari 也安全） */
  function splitSentences(text) {
    var out = [], buf = '';
    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i);
      buf += c;
      if ('。！？!?；;'.indexOf(c) >= 0) {
        if (buf.trim()) out.push(buf.trim());
        buf = '';
      }
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  function cancel() {
    queue.length = 0;
    seq++;
    busy = false;
    try { if (synth) synth.cancel(); } catch (e) { }
  }

  function pump() {
    if (busy || !queue.length) return;
    var job = queue.shift();
    var mySeq = ++seq;
    busy = true;
    lastStart = Date.now();

    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      if (mySeq === seq) { busy = false; pump(); }
    };

    var u = new Utter(job.text);
    u.lang = job.lang;
    u.rate = job.rate;
    u.pitch = job.pitch;
    u.volume = 1;
    u.onend = finish;
    u.onerror = finish;

    try { synth.speak(u); } catch (e) { finish(); return; }

    /* 看门狗：个别浏览器 onend 不触发，按字数估时兜底放行，避免队列卡死 */
    var guess = Math.max(1500, job.text.length * 320 / Math.max(0.7, job.rate));
    setTimeout(function () {
      if (done) return;
      if (mySeq !== seq) { finish(); return; }
      try { synth.cancel(); } catch (e) { }
      finish();
    }, guess + 1200);
  }

  function speak(text, opts) {
    opts = opts || {};
    text = String(text == null ? '' : text).trim();
    if (!text) return;
    if (!supported) { degrade(); return; }

    if (!opts.queue) cancel();

    var rate = opts.rate || speed();
    var lang = opts.lang || langOf(text);
    var parts = splitSentences(text);
    for (var i = 0; i < parts.length; i++) {
      queue.push({ text: parts[i], rate: rate, lang: lang, pitch: opts.pitch || 1.12 });
    }
    pump();
    watchSilent();
  }

  function isUnlocked() { return unlocked; }

  /* 读了却一点声音都没有 → 图标提示 + 提示音，不静默 */
  function watchSilent() {
    clearTimeout(silentTimer);
    silentTimer = setTimeout(function () {
      var speaking = false, voices = 0;
      try { speaking = !!(synth && (synth.speaking || synth.pending)); } catch (e) { }
      try { voices = (synth.getVoices() || []).length; } catch (e) { }
      if (!speaking && voices === 0) degrade();
    }, 1300);
  }

  function degrade() {
    if (badgeShown) return;
    badgeShown = true;
    try { if (X.sound && X.sound.notice) X.sound.notice(); } catch (e) { }
    try {
      var el = document.createElement('div');
      el.id = 'xnlyVoiceBadge';
      el.textContent = '🔇 语音暂不可用';
      el.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:9998;pointer-events:none;' +
        'font:700 12px/1.4 "PingFang SC","Microsoft YaHei",system-ui,sans-serif;color:#5b6b7d;' +
        'background:rgba(255,255,255,.94);border:1px solid #e6edf5;border-radius:999px;' +
        'padding:5px 10px;box-shadow:0 4px 12px rgba(36,59,83,.10);';
      document.body.appendChild(el);
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 6000);
    } catch (e) { }
  }

  /* 手势解锁：iOS 上必须在用户手势里才能出声 */
  function onFirstGesture() {
    unlocked = true;
    try { if (synth && synth.resume) synth.resume(); } catch (e) { }
    if (X.sound && X.sound.unlock) { try { X.sound.unlock(); } catch (e) { } }
  }

  document.addEventListener('pointerdown', function () {
    if (!unlocked) onFirstGesture();
    /* 点击打断：已经播了 400ms 以上的长句，按一下停掉 */
    if (busy && Date.now() - lastStart > 400) cancel();
  }, true);
  document.addEventListener('touchstart', function () {
    if (!unlocked) onFirstGesture();
  }, { capture: true, passive: true });

  try {
    if (synth) {
      synth.addEventListener('voiceschanged', function () {
        try {
          if ((synth.getVoices() || []).length) { badgeShown = false; }
        } catch (e) { }
      });
    }
  } catch (e) { }

  X.voice = {
    supported: supported,
    speak: speak,
    cancel: cancel,
    speed: speed,
    setSpeed: setSpeed,
    langOf: langOf,
    isUnlocked: isUnlocked,
    unlock: onFirstGesture
  };

  /* 老页面的 speak() 统一接管：页面自己的 function speak 会被覆盖成共享实现，
     行为不变（仍是「打断 + 朗读」），但多了队列、语速、英文识别和降级提示 */
  function upgradeLegacy() {
    if (typeof window.speak === 'function' && !window.speak.__xnlyShared) {
      window.speak = function (t) { return speak(t); };
      window.speak.__xnlyShared = true;
    } else if (typeof window.speak !== 'function') {
      window.speak = function (t) { return speak(t); };
      window.speak.__xnlyShared = true;
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', upgradeLegacy);
  } else {
    upgradeLegacy();
  }

  /* ======================= 学习记录 ======================= */

  var SKEY = 'xnly.stats2';
  var MAXDAYS = 14;

  function dateKey(d) {
    d = d || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }

  function pageKey() {
    var segs = location.pathname.split('/').filter(function (s) { return s; });
    var last = segs[segs.length - 1] || '';
    var prev = segs[segs.length - 2] || '';
    if (!/\.html?$/i.test(last)) return 'index.html';     /* /sudoku/ 这种目录地址就是首页 */
    if (prev === 'games') return 'games/' + last;
    return last;
  }

  function loadRaw() {
    try {
      var o = JSON.parse(lsGet(SKEY) || '{}');
      return (o && typeof o === 'object') ? o : {};
    } catch (e) { return {}; }
  }

  function prune(o) {
    var keep = [];
    var now = new Date();
    for (var i = 0; i < MAXDAYS; i++) {
      keep.push(dateKey(new Date(now.getTime() - i * 86400000)));
    }
    Object.keys(o).forEach(function (k) {
      if (keep.indexOf(k) < 0) delete o[k];
    });
    return o;
  }

  function saveRaw(o) {
    try { lsSet(SKEY, JSON.stringify(prune(o))); } catch (e) { }
  }

  function bucket(o, create) {
    var dk = dateKey();
    if (!o[dk]) { if (!create) return null; o[dk] = {}; }
    var pk = pageKey();
    if (!o[dk][pk]) {
      if (!create) return null;
      o[dk][pk] = { ms: 0, right: 0, wrong: 0, title: '' };
    }
    var g = o[dk][pk];
    if (create && !g.title) {
      try { g.title = String(document.title || '').replace(/·\s*小脑袋乐园.*$/, '').trim(); } catch (e) { }
    }
    return g;
  }

  function addTime(ms) {
    if (!(ms > 0)) return;
    if (ms > 3 * 3600 * 1000) ms = 3 * 3600 * 1000;   /* 挂后台很久不记账太离谱 */
    var o = loadRaw();
    var g = bucket(o, true);
    if (!g) return;
    g.ms = (g.ms || 0) + Math.round(ms);
    saveRaw(o);
  }

  function mark(kind) {
    lastMarkAt = Date.now();      /* 给自动识别留个静默窗口，避免同一次反馈记两遍 */
    var o = loadRaw();
    var g = bucket(o, true);
    if (g) {
      if (kind === 'right') g.right = (g.right || 0) + 1;
      else if (kind === 'wrong') g.wrong = (g.wrong || 0) + 1;
      saveRaw(o);
    }
    if (kind === 'right' && X.sound && X.sound.correct) X.sound.correct();
    if (kind === 'wrong' && X.sound && X.sound.wrong) X.sound.wrong();
  }

  /* 游玩时长 = 页面打开着的时间；进后台 / 关页面时先结算一次 */
  var activeSince = Date.now();
  function flush() {
    var now = Date.now();
    if (activeSince && now - activeSince > 1000) addTime(now - activeSince);
    activeSince = now;
  }
  document.addEventListener('visibilitychange', flush);
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);

  /* 每 5 秒结算一次，避免个别浏览器不触发 pagehide 导致时长记不上 */
  setInterval(function () {
    var now = Date.now();
    if (now - activeSince >= 5000) {
      addTime(now - activeSince);
      activeSince = now;
    }
  }, 5000);

  /* 自动识别答对/答错：很多页面共用 .feedback + .ok / .bad 的写法 */
  var lastMarkAt = 0;
  (function autoWatch() {
    if (!window.MutationObserver) return;
    var seenOk = null;
    try {
      var mo = new MutationObserver(function (muts) {
        if (Date.now() - lastMarkAt < 260) return;
        for (var i = 0; i < muts.length; i++) {
          var el = muts[i].target;
          var fb = null, n = el;
          while (n && n.nodeType === 1) {
            if (n.classList && n.classList.contains('feedback')) { fb = n; break; }
            n = n.parentElement;
          }
          if (!fb) continue;
          var state = fb.classList.contains('ok') ? 'right'
            : fb.classList.contains('bad') ? 'wrong' : '';
          if (state && state !== seenOk) {
            seenOk = state;
            lastMarkAt = Date.now();
            mark(state);
            return;
          }
          if (!state) seenOk = '';
        }
      });
      mo.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
    } catch (e) { }
  })();

  /* ======================= 年龄档 ======================= */

  function getTier() {
    var v = parseInt(lsGet('xnly_age'), 10);
    return (v >= 3 && v <= 5) ? v : 3;
  }
  function setTier(v) { lsSet('xnly_age', String(v >= 3 && v <= 5 ? v : 3)); }

  X.stats = {
    pageKey: pageKey,
    dateKey: dateKey,
    load: loadRaw,
    mark: mark,
    getTier: getTier,
    setTier: setTier
  };
  X.mark = mark;

  /* 存储可用性（file:// 下 Safari 可能直接抛错） */
  X.canStore = true;
  try { localStorage.setItem('xnly_probe', '1'); localStorage.removeItem('xnly_probe'); } catch (e) { X.canStore = false; }
})();
