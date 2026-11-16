/* 小脑袋乐园 · audio-en.js —— 预生成神经语音（edge-tts）播放器
 *
 * 为什么要有它：系统 speechSynthesis 的英语发音机械、无法分角色。
 * 页面里的英文句子已经离线合成为 mp3（audio/en/<hash>.mp3），
 * 这里负责按文本取文件、播放、失败时回退到 XNLY.voice（系统语音）。
 *
 * 约定（必须和 build_audio_en.py 一致）：
 *   canonical = 把 \r\n 换 \n，按 \n 分行，逐行 trim，去掉空行，再用 \n 连接
 *   file      = FNV-1a(32bit) over UTF-8 bytes 的 8 位十六进制
 *
 * 用法：
 *   XNLYSay.play('A: Hi Ben...\nB: ...', { rate: 0.85, onend: fn })
 *   XNLYSay.stop()
 *   XNLYSay.unlock()   // 首次点击时调用，解锁 iOS 的自动播放
 */
(function (W) {
  if (W.XNLYSay) return;

  var BASE = W.XNLY_AUDIO_BASE || '../audio/en/';
  var el = null;
  var seq = 0;
  var cb = null;
  var ready = false;
  var enc = (typeof W.TextEncoder === 'function') ? new W.TextEncoder() : null;

  function canon(t) {
    var s = String(t == null ? '' : t).replace(/\r\n/g, '\n');
    var parts = s.split('\n'), out = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].replace(/^\s+|\s+$/g, '');
      if (p) out.push(p);
    }
    return out.join('\n');
  }

  function hash(text) {
    var bytes;
    if (enc) bytes = enc.encode(canon(text));
    else {
      bytes = [];
      var s = canon(text);
      for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c < 128) bytes.push(c);
        else if (c < 2048) bytes.push(192 | (c >> 6), 128 | (c & 63));
        else bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
      }
    }
    var h = 0x811c9dc5;
    for (var k = 0; k < bytes.length; k++) {
      h ^= bytes[k];
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  function muted() {
    try { return localStorage.getItem('xnly_voice_off') === '1'; } catch (e) { return false; }
  }

  function globalSpeed() {
    try {
      var v = parseFloat(localStorage.getItem('xnly_speed'));
      return isFinite(v) ? Math.min(2, Math.max(0.5, v)) : 1;
    } catch (e) { return 1; }
  }

  function ensure() {
    if (el) return el;
    el = new W.Audio();
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    el.addEventListener('ended', function () { fire(); });
    el.addEventListener('error', function () { fail(); });
    return el;
  }

  function fire() {
    var f = cb; cb = null;
    if (f) { try { f(); } catch (e) { } }
  }

  /* 文件缺失/播放被拒：退回系统语音，保证还有声音 */
  function fail() {
    if (el && el.__silent) { el.__silent = false; return; }
    var text = el && el.__text;
    var rate = el && el.__rate;
    var done = cb; cb = null;
    if (W.XNLY && XNLY.voice && text) {
      try { XNLY.voice.forceNext(); XNLY.voice.speak(text, { lang: 'en-US', rate: rate }); } catch (e) { }
    }
    if (done) { try { done(); } catch (e) { } }
  }

  function play(text, opts) {
    opts = opts || {};
    text = canon(text);
    if (!text) { if (opts.onend) opts.onend(); return false; }
    if (!opts.force && muted()) { if (opts.onend) opts.onend(); return false; }
    var a = ensure();
    stop();
    var rate = (opts.rate || 1) * globalSpeed();
    a.__text = text;
    a.__rate = opts.rate || 1;
    a.src = BASE + hash(text) + '.mp3';
    try { a.playbackRate = Math.min(2, Math.max(0.5, rate)); } catch (e) { }
    try { a.preservesPitch = true; a.webkitPreservesPitch = true; } catch (e) { }
    cb = opts.onend || null;
    var my = ++seq;
    var p = a.play();
    if (p && p.catch) {
      p.catch(function () {
        if (my !== seq) return;
        fail();
      });
    }
    return true;
  }

  function stop() {
    seq++;
    cb = null;
    if (!el) return;
    try { el.pause(); } catch (e) { }
    try { el.currentTime = 0; } catch (e) { }
  }

  /* iOS 要求先有一次用户手势；第一次点击时用 80ms 静音片段把元素“解锁”。
     片段由 ffmpeg 生成（anullsrc），是合法 mp3，出错也不走降级逻辑。 */
  var unlocked = false;
  var SILENT = 'data:audio/mp3;base64,SUQzBAAAAAAAIlRTU0UAAAAOAAADTGF2ZjYzLjEuMTAyAAAAAAAAAAAAAAD/84TAAAAAAAAAAAAASW5mbwAAAA8AAAAGAAACcABsbGxsbGxsbGxsbGxsbGxsiYmJiYmJiYmJiYmJiYmJiYmnp6enp6enp6enp6enp6enxMTExMTExMTExMTExMTExMTi4uLi4uLi4uLi4uLi4uLi4v////////////////////8AAAAATGF2YzYzLjEuAAAAAAAAAAAAAAAAJAPAAAAAAAAAAnC83ShJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8zTEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVX/8zTEOwAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVX/8zTEdgAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/8zTEsQAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/8zTExAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/8zTExAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=';
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    var a = ensure();
    a.__silent = true;
    try {
      a.src = SILENT;
      var p = a.play();
      if (p && p.then) p.then(function () { a.__silent = false; try { a.pause(); } catch (e) { } },
        function () { a.__silent = false; });
    } catch (e) { a.__silent = false; }
  }

  W.XNLYSay = {
    canon: canon, hash: hash, play: play, stop: stop, unlock: unlock,
    base: function (v) { BASE = v; }
  };
})(window);
