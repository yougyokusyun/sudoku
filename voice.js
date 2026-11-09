/* 小脑袋乐园 · voice.js —— 共享语音 + 学习记录
 *
 * 1) 语音（全站共用）
 *    - speak(text, {rate, queue, lang})：默认打断上一句；queue:true 时排队连播
 *    - 长句自动按「。！？；」拆成多句依次播报，避免 iOS 一次读不完被截断
 *    - 语速连续可调：0.5 ~ 2.0（步进 0.05），存 localStorage('xnly_speed')
 *      兼容旧值：以前存的 1.0 / 1.3 直接当数值用
 *    - makeSpeedUI()：全站统一的语速滑杆（家长页、首页、右键小面板复用）
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

  /* 语音分组：speakThen() 用。同一组的多句全部读完才回调一次。
     cancel() 会让整组作废（不回调）；用户手动点「下一题」走的就是 cancel。 */
  var groups = {};
  var gidSeq = 0;
  var stickyBusy = false;      /* 当前播放属于「必须读完再跳」的组：点击不打断 */

  var SPEED_MIN = 0.5, SPEED_MAX = 2.0, SPEED_STEP = 0.05, SPEED_DEF = 1.0;

  function clampSpeed(v) {
    v = parseFloat(v);
    if (!isFinite(v)) return SPEED_DEF;
    v = Math.round(v / SPEED_STEP) * SPEED_STEP;
    return Math.min(SPEED_MAX, Math.max(SPEED_MIN, v));
  }
  /* 连续语速；旧版本存的 1.0 / 1.3 直接当数值用 */
  function speed() {
    var v = parseFloat(lsGet('xnly_speed'));
    return isFinite(v) ? clampSpeed(v) : SPEED_DEF;
  }
  function setSpeed(v) {
    var s = clampSpeed(v);
    lsSet('xnly_speed', s.toFixed(2));
    return s;
  }

  /* 全局朗读开关：关闭后不再自动朗读；手动「再听一遍」传 force:true 仍可播一次 */
  function voiceMuted() { return lsGet('xnly_voice_off') === '1'; }
  function setVoiceMuted(off) { lsSet('xnly_voice_off', off ? '1' : '0'); }

  /* 下一次朗读强制放行（供各页自定义 replayCurrent 的「再听一遍」使用） */
  var forceOnce = false;
  function forceNext() { forceOnce = true; }

  /* TTS 音量：与音效共用 xnly_vol（0~100），Web Speech 的 volume 参数（0~1） */
  function ttsVolume() {
    try {
      var raw = localStorage.getItem('xnly_vol');
      if (raw == null) return 1;
      var n = Number(raw);
      if (!isFinite(n)) return 1;
      return Math.max(0, Math.min(100, n)) / 100;
    } catch (e) { return 1; }
  }

  /* 全站语速强制：不少页面自己 new SpeechSynthesisUtterance 并写死 rate。
     这里把实例的 rate 改为只读的滑杆值，保证「滑杆优先于页面写死的 rate」，
     页面本身不用逐页改代码；不支持的浏览器自动退回原生行为。 */
  (function enforceRate() {
    var Native = window.SpeechSynthesisUtterance;
    if (!Native || !Object.defineProperty) return;
    function Wrapped(text) {
      var u = new Native(text);
      try {
        Object.defineProperty(u, 'rate', {
          configurable: true,
          get: function () { return speed(); },
          set: function () { }
        });
      } catch (e) { }
      return u;
    }
    Wrapped.prototype = Native.prototype;
    window.SpeechSynthesisUtterance = Wrapped;
  })();

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
        if (hasWord(buf)) out.push(buf.trim());
        buf = '';
      }
    }
    if (hasWord(buf)) out.push(buf.trim());
    return out;
  }
  /* 只有标点/空白的片段不单独播报（避免出现只读一个「。」） */
  function hasWord(s) { return /[A-Za-z0-9\u4e00-\u9fff]/.test(s || ''); }

  function cancel() {
    queue.length = 0;
    seq++;
    busy = false;
    stickyBusy = false;
    /* 整组作废：手动换题/切模式时不该再触发自动跳转 */
    Object.keys(groups).forEach(function (id) {
      var g = groups[id];
      if (g) { g.dead = true; clearTimeout(g.timer); }
      delete groups[id];
    });
    try { if (synth) synth.cancel(); } catch (e) { }
  }

  function fireGroup(id) {
    var g = groups[id];
    if (!g || g.fired) return;
    g.fired = true;
    clearTimeout(g.timer);
    delete groups[id];
    try { if (g.cb) g.cb(); } catch (e) { }
  }

  function pump() {
    if (busy || !queue.length) return;
    var job = queue.shift();
    var mySeq = ++seq;
    busy = true;
    lastStart = Date.now();
    stickyBusy = !!(job.gid && groups[job.gid] && groups[job.gid].sticky);

    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      if (job.gid && groups[job.gid]) {
        var g = groups[job.gid];
        g.left--;
        if (g.left <= 0) fireGroup(job.gid);
      }
      if (mySeq === seq) { busy = false; stickyBusy = false; pump(); }
    };

    /* 每次开口前重读 localStorage('xnly_speed')：首页改完滑杆，
       其它页面（哪怕早就打开着）下一次朗读立即生效 */
    var rate = speed();
    var u = new Utter(job.text);
    u.lang = job.lang;
    u.rate = rate;
    u.pitch = job.pitch;
    u.volume = ttsVolume();
    u.onend = finish;
    u.onerror = finish;

    try { synth.speak(u); } catch (e) { finish(); return; }

    /* 看门狗：个别浏览器 onend 不触发，按字数估时兜底放行，避免队列卡死 */
    var guess = Math.max(1500, job.text.length * 320 / Math.max(0.7, rate));
    setTimeout(function () {
      if (done) return;
      if (mySeq !== seq) { finish(); return; }
      try { synth.cancel(); } catch (e) { }
      finish();
    }, guess + 1200);
  }

  function speak(text, opts) {
    opts = opts || {};
    if (forceOnce) { opts.force = true; forceOnce = false; }
    text = String(text == null ? '' : text).trim();
    if (!text) return;
    if (!opts.force && voiceMuted()) return;
    if (!supported) { degrade(); return; }

    if (!opts.queue) cancel();

    /* 全站统一语速：以用户滑杆为准，忽略页面里写死的 rate。
       具体数值在 pump() 每次开口前才读，保证「改完立即生效」 */
    var lang = opts.lang || langOf(text);
    /* single:true → 整句一次 utterance（工具条重听用，保证 speak 只调用 1 次） */
    var parts = opts.single ? [text] : splitSentences(text);
    for (var i = 0; i < parts.length; i++) {
      queue.push({ text: parts[i], lang: lang, pitch: opts.pitch || 1.12 });
    }
    pump();
    watchSilent();
  }

  /* speakThen(text, cb, opts)
   * 读完 text 的每一句之后才执行 cb（只执行一次），用于「答对后等语音播完再跳下一题」。
   * - 多句拆开后全部读完才回调
   * - 兜底：不再依赖 iOS 的 onend，字数 × 220ms + 1500ms 到点也会回调
   * - 手动换题：调用返回句柄的 cancel() 或 XNLY.voice.cancel()，整组作废、不回调
   * - 朗读期间点击屏幕不会打断（sticky），避免孩子乱点把语音掐断、提前跳题 */
  function speakThen(text, cb, opts) {
    opts = opts || {};
    text = String(text == null ? '' : text).trim();
    if (!text) { if (cb) setTimeout(function () { try { cb(); } catch (e) { } }, 0); return { cancel: cancel }; }

    /* 朗读关闭时：自动流程直接放行，不朗读也不阻塞跳题 */
    if (!opts.force && voiceMuted()) {
      if (cb) setTimeout(function () { try { cb(); } catch (e) { } }, 200);
      return { cancel: cancel };
    }

    if (!supported) {
      degrade();
      setTimeout(function () { try { if (cb) cb(); } catch (e) { } }, 300);
      return { cancel: cancel };
    }

    if (!opts.queue) cancel();

    var gid = ++gidSeq;
    var lang = opts.lang || langOf(text);
    var parts, chars;
    if (opts.parts && opts.parts.length) {
      /* 多语种分段：如「中文 + 英文单词」各用各的语音 */
      parts = opts.parts.map(function (p) {
        if (typeof p === 'string') return { text: p, lang: langOf(p) };
        return { text: String(p.text || ''), lang: p.lang || langOf(p.text) };
      });
      chars = parts.map(function (p) { return p.text; }).join('').replace(/\s+/g, '').length;
    } else {
      parts = (opts.single ? [text] : splitSentences(text)).map(function (p) { return { text: p, lang: lang }; });
      chars = text.replace(/\s+/g, '').length;
    }
    if (!parts.length) parts = [{ text: text, lang: lang }];

    var g = groups[gid] = {
      left: parts.length,
      cb: cb,
      fired: false,
      dead: false,
      sticky: opts.sticky !== false,
      /* 兜底超时：按字数估算 + 余量，onend 不触发也能跳 */
      timer: setTimeout(function () { fireGroup(gid); }, Math.max(1500, chars * 220) + 1500)
    };

    for (var i = 0; i < parts.length; i++) {
      queue.push({ text: parts[i].text, lang: parts[i].lang, pitch: opts.pitch || 1.12, gid: gid });
    }
    pump();
    watchSilent();
    return { cancel: cancel };
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
    /* 点击打断：已经播了 400ms 以上的长句，按一下停掉。
       「读完再跳下一题」的组不打断（stickyBusy），否则语音会半截停掉、提前跳题 */
    if (busy && !stickyBusy && Date.now() - lastStart > 400) cancel();
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

  /* ======================= 语速滑杆（全站共用） ======================= */

  function speedCSS() {
    if (document.getElementById('xnlySpeedStyle')) return;
    var st = document.createElement('style');
    st.id = 'xnlySpeedStyle';
    st.textContent = [
      '.xnly-speed{width:100%;max-width:100%;font-family:inherit;color:#243b53;}',
      '.xnly-speed .xs-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:900;}',
      '.xnly-speed .xs-title{font-size:1rem;}',
      '.xnly-speed .xs-val{font-size:1.3rem;color:#7c5cff;font-weight:900;font-variant-numeric:tabular-nums;}',
      '.xnly-speed .xs-now{text-align:center;margin:2px 0 -2px;}',
      '.xnly-speed .xs-row{display:flex;align-items:center;gap:8px;margin:10px 0 4px;}',
      '.xnly-speed .xs-end{font-size:.76rem;color:#7b8ea8;font-weight:800;white-space:nowrap;}',
      '.xnly-speed .xs-range{flex:1 1 auto;min-width:0;width:100%;height:48px;margin:0;background:transparent;',
      '-webkit-appearance:none;appearance:none;touch-action:pan-y;cursor:pointer;}',
      '.xnly-speed .xs-range::-webkit-slider-runnable-track{height:8px;border-radius:999px;background:#e8eef7;}',
      '.xnly-speed .xs-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:44px;height:44px;',
      'margin-top:-18px;border-radius:50%;background:#7c5cff;border:4px solid #fff;box-shadow:0 4px 12px rgba(92,100,255,.35);}',
      '.xnly-speed .xs-range::-moz-range-track{height:8px;border-radius:999px;background:#e8eef7;}',
      '.xnly-speed .xs-range::-moz-range-thumb{width:36px;height:36px;border-radius:50%;background:#7c5cff;border:4px solid #fff;}',
      '.xnly-speed .xs-foot{display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;}',
      '.xnly-speed .xs-btn{min-height:44px;padding:8px 14px;border-radius:12px;border:1px solid rgba(36,59,83,.12);',
      'background:#fff;color:#3b5370;font-family:inherit;font-size:.88rem;font-weight:800;cursor:pointer;}',
      '.xnly-speed .xs-btn.primary{background:#f2edff;border-color:#d9ccff;color:#5b3fd6;}'
    ].join('');
    document.head.appendChild(st);
  }

  function fmtSpeed(v) { return v.toFixed(2) + '×'; }

  /* 生成一条语速滑杆；opts.onChange(v) 可选，用于外部按钮同步显示 */
  function makeSpeedUI(opts) {
    opts = opts || {};
    speedCSS();
    var box = document.createElement('div');
    box.className = 'xnly-speed';
    box.innerHTML =
      '<div class="xs-head"><span class="xs-title">🔊 朗读语速</span><span class="xs-end">全站生效</span></div>' +
      '<div class="xs-now"><span class="xs-val">' + fmtSpeed(speed()) + '</span></div>' +
      '<div class="xs-row"><span class="xs-end">慢 0.5×</span>' +
      '<input class="xs-range" type="range" min="0.5" max="2" step="0.05" aria-label="朗读语速" value="' + speed() + '">' +
      '<span class="xs-end">快 2.0×</span></div>' +
      '<div class="xs-foot"><button type="button" class="xs-btn primary xs-reset">恢复 1.0×</button>' +
      '<button type="button" class="xs-btn xs-sample">试听</button></div>';
    var input = box.querySelector('.xs-range');
    var val = box.querySelector('.xs-val');
    var lastCommit = 0;

    function paint(v) {
      val.textContent = fmtSpeed(v);
      if (opts.onChange) { try { opts.onChange(v); } catch (e) { } }
    }
    function commit() {
      var now = Date.now();
      if (now - lastCommit < 400) return;   /* change 与 pointerup 去重 */
      lastCommit = now;
      var v = setSpeed(input.value);
      input.value = v;
      paint(v);
      speak('这是现在的语速。');
    }
    /* 拖动中：数字实时变，同时写入 localStorage（其它页面下一次朗读立即用新值） */
    input.addEventListener('input', function () {
      var v = clampSpeed(input.value);
      setSpeed(v);
      paint(v);
    });
    input.addEventListener('change', commit);
    input.addEventListener('pointerup', commit);
    box.querySelector('.xs-reset').addEventListener('click', function () {
      var v = setSpeed(SPEED_DEF);
      input.value = v;
      paint(v);
      speak('这是现在的语速。');
    });
    box.querySelector('.xs-sample').addEventListener('click', function () {
      speak('这是现在的语速。', { force: true });
    });
    paint(speed());
    return box;
  }

  X.voice = {
    supported: supported,
    speak: speak,
    speakThen: speakThen,
    cancel: cancel,
    speed: speed,
    setSpeed: setSpeed,
    muted: voiceMuted,
    setMuted: setVoiceMuted,
    forceNext: forceNext,
    makeSpeedUI: makeSpeedUI,
    SPEED_MIN: SPEED_MIN,
    SPEED_MAX: SPEED_MAX,
    SPEED_STEP: SPEED_STEP,
    SPEED_DEF: SPEED_DEF,
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
