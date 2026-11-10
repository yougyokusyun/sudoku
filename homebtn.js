/* 小脑袋乐园 · homebtn.js —— 全站统一的单行顶栏
 *  - 固定一行 52px，不换行：🏠 → 标题（省略号）→ 统计 → 本页功能图标 → 🔊 → 全屏
 *  - 本页功能（提示 / 看一下 / 显示线索 等）统一收进这一行，原按钮隐藏，点击行为不变
 *  - 全屏：requestFullscreen / webkitRequestFullscreen；不支持或被拒绝时降级为「沉浸模式」
 *    （隐藏顶栏、内容贴满视口），提供同一个全屏按钮或右上角半透明浮层按钮退出
 *  - fullscreenchange / webkitfullscreenchange 同步按钮图标，Esc 退出后不会显示错状态
 *  - 纯操作页（没有可朗读内容）只保留 🏠 与全屏，不渲染 🔊
 */
(function () {
  'use strict';
  var last = location.pathname.split('/').filter(function (s) { return s; }).pop() || '';
  if (last === 'index.html' || last === '') return;    /* 首页自身不显示 */

  var inGames = /[\/\\]games[\/\\]/.test(location.pathname);
  var homeHref = inGames ? '../index.html' : 'index.html';

  var BAR_H = 52;   /* 顶栏高度 */
  var BTN = 42;     /* 图标按钮边长（40±2） */

  var CSS = [
    '#xnlyTopTools{position:fixed;top:0;left:0;right:0;z-index:95;box-sizing:border-box;',
    'height:calc(' + BAR_H + 'px + env(safe-area-inset-top,0px));',
    'padding:calc(5px + env(safe-area-inset-top,0px)) 8px 5px;',
    'display:flex;align-items:center;gap:8px;flex-wrap:nowrap;',
    'background:rgba(255,255,255,.94);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);',
    'border-bottom:1px solid rgba(36,59,83,.10);overflow:hidden;}',
    '.xnly-tool{flex:0 0 auto;width:' + BTN + 'px;height:' + BTN + 'px;border-radius:12px;border:0;',
    'background:rgba(244,247,251,.92);display:flex;align-items:center;justify-content:center;',
    'font-size:20px;line-height:1;cursor:pointer;color:#243b53;padding:0;',
    '-webkit-tap-highlight-color:transparent;}',
    '.xnly-tool:active{transform:scale(.94);}',
    '.xnly-tool:disabled{opacity:.4;}',
    '.xnly-tool.xnly-hidden{display:none !important;}',
    '.xnly-tool.xnly-on{background:#ffe3ef;}',
    '.xnly-title{flex:1 1 auto;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;',
    'font-size:16px;font-weight:800;color:#243b53;letter-spacing:.2px;}',
    '.xnly-stats{flex:0 1 auto;display:flex;align-items:center;gap:6px;overflow:hidden;max-width:42vw;}',
    '.xnly-stats .chip,.xnly-stats .stat-pill,.xnly-stats .pill,.xnly-stats>span{flex:0 0 auto;white-space:nowrap;',
    'font-size:12px !important;height:24px !important;min-height:24px !important;max-height:24px !important;',
    'line-height:18px !important;box-sizing:border-box !important;',
    'padding:3px 8px !important;border-radius:999px !important;background:#f1f4f9 !important;color:#43566b !important;}',
    '.xnly-stats>*{flex:0 0 auto;display:flex;align-items:center;gap:6px;height:24px;padding:0;margin:0;',
    'background:none;border:0;overflow:visible;white-space:nowrap;}',
    '.xnly-stats b{font-weight:800;color:#243b53;}',
    '.xnly-funcs{flex:0 0 auto;display:flex;align-items:center;gap:8px;}',
    '#xnlyTopTools .seg{display:flex;align-items:center;gap:8px;flex:0 0 auto;margin:0;padding:0;background:none;border:0;}',
    '#xnlyTopTools .seg button,#xnlyTopTools .iconbtn{width:' + BTN + 'px;height:' + BTN + 'px;min-width:0;',
    'padding:0;margin:0 !important;border:0;border-radius:12px;background:rgba(244,247,251,.92);',
    'display:flex;align-items:center;justify-content:center;font-size:20px;line-height:1;cursor:pointer;',
    'color:#243b53;-webkit-tap-highlight-color:transparent;}',
    '#xnlyTopTools .seg button.on{background:#ffe3ef;}',
    '@media (max-width:700px){.xnly-stats{display:none;}}',
    'body{padding-top:calc(' + (BAR_H + 8) + 'px + env(safe-area-inset-top,0px)) !important;}',
    'header.xnly-hdr-off{display:none !important;}',
    'button.xnly-src-hide{display:none !important;}',
    'html.xnly-immersive #xnlyTopTools{display:none !important;}',
    'html.xnly-immersive body{padding-top:0 !important;overflow-x:hidden;}',
    'html.xnly-immersive #xnlyExitImm{display:flex;}',
    'button.xnly-float{position:fixed !important;top:calc(12px + env(safe-area-inset-top,0px)) !important;',
    'right:calc(62px + env(safe-area-inset-right,0px)) !important;z-index:99 !important;',
    'box-shadow:0 4px 14px rgba(36,59,83,.18);}',
    '#xnlyExitImm{display:none;position:fixed;right:12px;top:calc(12px + env(safe-area-inset-top,0px));',
    'width:' + BTN + 'px;height:' + BTN + 'px;border-radius:50%;border:0;z-index:99;align-items:center;',
    'justify-content:center;font-size:20px;line-height:1;cursor:pointer;color:#243b53;',
    'background:rgba(255,255,255,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
    'box-shadow:0 4px 14px rgba(36,59,83,.18);-webkit-tap-highlight-color:transparent;}'
  ].join('');

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 4 && r.height > 4;
  }
  function txt(el) {
    var t = (el.getAttribute && el.getAttribute('aria-label')) || el.textContent || '';
    return t.replace(/\s+/g, ' ').trim();
  }

  /* 找当前屏幕上的题干 */
  function promptEl() {
    var sels = ['[data-speak]', '#qtext', '.qtext', '#prompt', '.prompt', '#question', '.question', '#scene',
      '#word', '.word', '#target', '.target', '#q', '.q', '#goalVal', '.goal-val', '#rule', '.rule'];
    for (var i = 0; i < sels.length; i++) {
      var list = document.querySelectorAll(sels[i]);
      for (var j = 0; j < list.length; j++) {
        if (visible(list[j]) && txt(list[j])) return list[j];
      }
    }
    return null;
  }
  /* 找当前屏幕上的选项关键信息（最多 4 条） */
  function optionTexts(prompt) {
    var sels = ['.kid-opt', '.choice', '.opt', '.option', '.name', '.block', '.item', '.card-opt', '.emoji-btn', '.card.up'];
    var out = [];
    for (var i = 0; i < sels.length && out.length < 4; i++) {
      var list = document.querySelectorAll(sels[i]);
      for (var j = 0; j < list.length && out.length < 4; j++) {
        var el = list[j];
        if (!visible(el) || el === prompt) continue;
        var t = txt(el);
        if (t && t.length <= 40 && out.indexOf(t) < 0) out.push(t);
      }
    }
    return out;
  }
  /* 纯操作类页面（没有可朗读内容）：只保留 🏠，不渲染 🔊 */
  function noSpeechPage() {
    return /\/bubble\.html$|\/music-pad\.html$|\/parent\.html$|\/sudoku\.html$|\/links\.html$|\/opposites\.html$|\/animal-chess\.html$|\/blackjack\.html$|\/gomoku\.html$|\/klondike\.html$|\/xiangqi\.html$/i.test(location.pathname);
  }
  /* 兜底：读内容区里当前可见的文字（跳过导航、按钮、状态条） */
  function fallbackSpeech() {
    var root = null;
    var roots = ['main', '#main', '#app', '.app', '.game', '#game', '.wrap', '.container', '.content'];
    for (var i = 0; i < roots.length; i++) {
      var el = document.querySelector(roots[i]);
      if (el && visible(el) && (el.textContent || '').trim()) { root = el; break; }
    }
    if (!root) root = document.body;
    if (!root || !window.getComputedStyle) return '';
    var out = [], seen = {};
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      var p = node.parentElement;
      if (!p) continue;
      if (p.closest('button,a,header,nav,footer,#xnlyTopTools,#xnlySpeedPanel,.chips,.chip,.controls,.stats,.summary,.pace,.tabs,.tools')) continue;
      var cs = getComputedStyle(p);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
      var t = node.textContent.replace(/\s+/g, ' ').trim();
      if (!t || !/[A-Za-z0-9\u4e00-\u9fff]/.test(t)) continue;
      if (seen[t]) continue;
      seen[t] = 1; out.push(t);
      if (out.join('，').length > 110) break;
    }
    return out.join('，').slice(0, 120);
  }
  function currentSpeech() {
    if (noSpeechPage()) return '';
    var prompt = promptEl();
    if (!prompt) {
      var fb = fallbackSpeech();
      return fb || '';
    }
    var parts = [];
    var head = (prompt.getAttribute('data-speak') || '').trim() || txt(prompt);
    if (head) parts.push(head);
    var opts = optionTexts(prompt);
    if (opts.length) parts.push((/[。！？!?；;]$/.test(head) ? '' : '。') + opts.join('，'));
    return parts.join('');
  }

  /* 旧的重听按钮：统一移除，避免出现第二个 🔊 */
  function dropOldReplay(root) {
    var sels = '#hear,[data-hear],.hear,#replay,.replay,#listen,.listen';
    Array.prototype.forEach.call((root || document).querySelectorAll(sels), function (el) {
      el.parentNode && el.parentNode.removeChild(el);
    });
    Array.prototype.forEach.call((root || document).querySelectorAll('button,a'), function (el) {
      if (el.closest && el.closest('#xnlyTopTools')) return;
      var label = (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '') + ' ' + (el.textContent || '');
      if (/再听|重听|听一遍|听一听|读给我|读一读|读一下|朗读/.test(label)) {
        el.parentNode && el.parentNode.removeChild(el);
      }
    });
  }

  /* 本页功能按钮：图标 + 匹配规则 + 无障碍名称 */
  var FNS = [
    { k: 'hint', icon: '💡', name: '提示', re: /💡|提示|看看线索|看看它像什么/ },
    { k: 'look', icon: '👀', name: '看一下', re: /看一下|看一眼|显示线索|看线索/ },
    { k: 'answer', icon: '🔑', name: '看答案', re: /看答案|显示答案|揭晓/ }
  ];

  function findFnCandidates() {
    var list = document.querySelectorAll('button');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.closest('#xnlyTopTools')) continue;
      if (el.getAttribute('data-xnly-fn')) continue;
      var t = txt(el);
      if (!t || t.length > 24) continue;
      for (var j = 0; j < FNS.length; j++) {
        if (FNS[j].re.test(t)) {
          el.setAttribute('data-xnly-fn', FNS[j].k);
          el.classList.add('xnly-src-hide');
          el.setAttribute('aria-hidden', 'true');
          break;
        }
      }
    }
  }
  /* 取当前仍在文档里的同功能源按钮（动态重建的取最新的一个） */
  function liveFn(k) {
    var list = document.querySelectorAll('[data-xnly-fn="' + k + '"]');
    var pick = null;
    for (var i = 0; i < list.length; i++) {
      if (!list[i].disabled) pick = list[i];
    }
    if (!pick && list.length) pick = list[list.length - 1];
    return pick;
  }

  function init() {
    if (document.getElementById('xnlyTopTools')) return;
    /* 先清掉页面自己的重听/朗读按钮，避免它们被当成普通功能图标搬进顶栏后失去语义 */
    dropOldReplay(document);
    var st = document.createElement('style');
    st.id = 'xnlyTopStyle'; st.textContent = CSS;
    document.head.appendChild(st);

    /* 页面自身的 header：标题进顶栏、统计移到顶栏，原 header 隐藏（顶部只保留一行） */
    var hdr = document.querySelector('body > header');
    if (!hdr) {
      /* 列表页的 header 常包在 .wrap 里，同样收进单行顶栏 */
      var any = document.querySelector('header');
      if (any && any.querySelector('h1') && !any.closest('main,section,article,.modal,.card,.dialog')) hdr = any;
    }
    var title = '';
    var statsSrcs = [];
    if (hdr) {
      var h1 = hdr.querySelector('h1');
      if (h1) title = txt(h1);
      var box = hdr.querySelector('.chips, .stats');
      if (box) statsSrcs = [box];
      else statsSrcs = Array.prototype.slice.call(hdr.querySelectorAll('.pill'));
    }
    /* 页面把答对/连对/最佳放在内容区第一行的，统一搬进顶栏（有交互控件的不搬，避免搬坏工具条） */
    if (!statsSrcs.length) {
      var STAT_RE = /答对|连对|最佳|最高|已猜|尝试|得分|进度|排对|配对|正确|完成|第\s*\d+\s*(题|篇|关|档|组)/;
      var cands = document.querySelectorAll('.chips, .stats, .bar, .hud');
      for (var ci = 0; ci < cands.length; ci++) {
        var cand = cands[ci];
        if (cand.closest('#xnlyTopTools, header, .modal')) continue;
        if (cand.querySelector('button, a, input, select, textarea')) continue;
        var cr = cand.getBoundingClientRect();
        if (cr.top > innerHeight * 0.6 || cr.width < 40 || cr.height < 4) continue;
        if (!STAT_RE.test(txt(cand))) continue;
        statsSrcs = [cand];
        break;
      }
    }
    if (!title) {
      var h1b = document.querySelector('h1');
      if (h1b) title = txt(h1b);
    }
    if (!title) title = (document.title || '').split('·')[0].trim();

    var bar = document.createElement('div');
    bar.id = 'xnlyTopTools';

    var home = document.createElement('button');
    home.type = 'button';
    home.className = 'xnly-tool';
    home.textContent = '🏠';
    home.setAttribute('aria-label', '返回首页');
    home.addEventListener('click', function () { location.href = homeHref; });
    bar.appendChild(home);

    var titleEl = document.createElement('div');
    titleEl.className = 'xnly-title';
    titleEl.textContent = title || '游戏';
    titleEl.title = title || '游戏';
    bar.appendChild(titleEl);

    var stats = document.createElement('div');
    stats.className = 'xnly-stats';
    /* 移动而非复制：页面按 id 的实时更新仍然有效；内容区不会残留第二份 */
    statsSrcs.forEach(function (n) { stats.appendChild(n); });
    bar.appendChild(stats);

    var funcs = document.createElement('div');
    funcs.className = 'xnly-funcs';

    /* 页面 header 里的功能按钮（人机/双人、悔棋、重开、新局等）：并入顶栏并改成方形图标 */
    function compactFn(el) {
      if (el.getAttribute('data-xnly-compact')) return;
      var label = txt(el);
      var icon = label.split(' ')[0] || '⚙';
      el.setAttribute('data-xnly-compact', '1');
      el.setAttribute('aria-label', label);
      el.title = label;
      el.textContent = icon;
      el.classList.add('xnly-tool');
    }
    if (hdr) {
      Array.prototype.forEach.call(hdr.querySelectorAll('.seg'), function (seg) {
        Array.prototype.forEach.call(seg.querySelectorAll('button'), compactFn);
        funcs.appendChild(seg);
      });
      Array.prototype.forEach.call(hdr.querySelectorAll('button'), function (b) {
        if (b.closest('.seg') || b.closest('#xnlyTopTools')) return;
        var t = txt(b);
        /* 提示/线索类交给下面的统一代理，避免重复入口 */
        if (/💡|提示|看一下|看线索|看答案|揭晓/.test(t)) return;
        compactFn(b);
        funcs.appendChild(b);
      });
    }

    /* 本页功能图标：点击转给仍留在原处的源按钮，逻辑完全不变 */
    var proxies = {};
    FNS.forEach(function (def) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'xnly-tool xnly-hidden';
      b.textContent = def.icon;
      b.setAttribute('aria-label', def.name);
      b.title = def.name;
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var src = liveFn(def.k);
        if (src) src.click();
      });
      proxies[def.k] = b;
      funcs.appendChild(b);
    });

    /* 先移除旧按钮，再判断本页有没有可读内容 */
    dropOldReplay(document);

    var speech = currentSpeech();
    var snd = document.createElement('button');
    snd.type = 'button';
    snd.className = 'xnly-tool';
    snd.textContent = '🔊';
    snd.setAttribute('aria-label', '再听一遍');
    if (!speech) snd.classList.add('xnly-hidden');   /* 纯操作页不显示 🔊 */

    function readNow() {
      try {
        if (typeof window.replayCurrent === 'function') {
          if (window.XNLY && XNLY.voice && XNLY.voice.forceNext) XNLY.voice.forceNext();
          window.replayCurrent();
          return;
        }
        if (window.XNLY && XNLY.voice && XNLY.voice.speak) {
          XNLY.voice.speak(currentSpeech(), { single: true, force: true });
        }
      } catch (e) { }
      try {
        if (window.XNLY && XNLY.sound && XNLY.sound.unlock) XNLY.sound.unlock();
      } catch (e) { }
    }
    snd.addEventListener('click', function (e) {
      e.stopPropagation();
      readNow();
    });
    funcs.appendChild(snd);

    /* ---- 统一「开始」图标：纯图标、无文字、42×42，排在功能图标组 ---- */
    var startBtn = document.createElement('button');
    startBtn.type = 'button';
    startBtn.className = 'xnly-tool xnly-start xnly-hidden';
    startBtn.textContent = '▶';
    startBtn.setAttribute('aria-label', '开始');
    startBtn.title = '开始';
    funcs.appendChild(startBtn);

    /* ---- 全屏 / 沉浸模式 ---- ---- ---- ---- ---- ---- ---- ---- ---- */
    var fsBtn = document.createElement('button');
    fsBtn.type = 'button';
    fsBtn.className = 'xnly-tool';
    funcs.appendChild(fsBtn);

    var exitImm = document.createElement('button');
    exitImm.id = 'xnlyExitImm';
    exitImm.type = 'button';
    exitImm.textContent = '⤡';
    exitImm.setAttribute('aria-label', '退出沉浸模式');

    function isFs() {
      return document.fullscreenElement || document.webkitFullscreenElement || null;
    }
    function immersive() {
      return document.documentElement.classList.contains('xnly-immersive');
    }
    function paintFs() {
      var on = !!isFs() || immersive();
      fsBtn.textContent = on ? '⤡' : '⤢';
      fsBtn.setAttribute('aria-label', on ? '退出全屏' : '全屏');
      fsBtn.title = on ? '退出全屏' : '全屏';
      fsBtn.classList.toggle('xnly-on', on);
    }
    function setImmersive(on) {
      document.documentElement.classList.toggle('xnly-immersive', !!on);
      /* 沉浸模式整条顶栏被隐藏，开始图标要能独立浮出来，否则没开始就进沉浸会点不到 */
      if (on && startBtn.parentNode !== document.body) {
        document.body.appendChild(startBtn);
        startBtn.classList.add('xnly-float');
      } else if (!on && startBtn.classList.contains('xnly-float')) {
        funcs.insertBefore(startBtn, fsBtn);
        startBtn.classList.remove('xnly-float');
      }
      paintFs();
    }
    function enterFs() {
      var el = document.documentElement;
      var fn = el.requestFullscreen || el.webkitRequestFullscreen;
      if (!fn) { setImmersive(true); return; }
      try {
        var p = fn.call(el);
        if (p && p['catch']) p['catch'](function () { setImmersive(true); });
      } catch (e) { setImmersive(true); }
    }
    function exitFs() {
      var fn = document.exitFullscreen || document.webkitExitFullscreen;
      try { if (fn) fn.call(document); } catch (e) { }
    }
    fsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (isFs()) exitFs();
      else if (immersive()) setImmersive(false);
      else enterFs();
    });
    exitImm.addEventListener('click', function (e) {
      e.stopPropagation();
      setImmersive(false);
    });
    document.addEventListener('fullscreenchange', paintFs);
    document.addEventListener('webkitfullscreenchange', paintFs);
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && immersive()) setImmersive(false);
    });
    paintFs();

    bar.appendChild(funcs);
    document.body.appendChild(bar);
    document.body.appendChild(exitImm);

    /* ---- 开始图标接线：页面把「开始」函数挂到 window.XNLY_START 即可，图标自动出现 ---- */
    var startFn = null;
    function armStart() {
      if (startFn) return;
      if (typeof window.XNLY_START !== 'function') return;
      startFn = window.XNLY_START;
      startBtn.classList.remove('xnly-hidden');
    }
    startBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!startFn) return;
      try { startFn(); } catch (err) { }
      startBtn.classList.add('xnly-hidden');   /* ▶ → 隐藏：这些开始都是单向的，没有“暂停”语义 */
    });
    armStart();
    setTimeout(armStart, 400);   /* 少数页面的脚本在 homebtn 之后才定义开始函数 */

    if (hdr) hdr.classList.add('xnly-hdr-off');

    /* 动态创建的本页功能按钮也收进顶栏 */
    function syncFns() {
      findFnCandidates();
      FNS.forEach(function (def) {
        var list = document.querySelectorAll('[data-xnly-fn="' + def.k + '"]');
        var b = proxies[def.k];
        if (!list.length) { b.classList.add('xnly-hidden'); return; }
        b.classList.remove('xnly-hidden');
        var any = false;
        for (var i = 0; i < list.length; i++) { if (!list[i].disabled) any = true; }
        b.disabled = !any;
      });
    }
    syncFns();

    if (window.MutationObserver) {
      var mo = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          for (var j = 0; j < muts[i].addedNodes.length; j++) {
            var n = muts[i].addedNodes[j];
            if (n.nodeType === 1) dropOldReplay(n);
          }
        }
        syncFns();
        if (snd.classList.contains('xnly-hidden') && currentSpeech()) {
          snd.classList.remove('xnly-hidden');
        }
      });
      mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'hidden'] });
    }

    /* 旧的回首页入口：统一移除，全站只留顶栏最左侧一个 🏠（含 .back / .home / .home-link 等写法） */
    function dropOldHome() {
      Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (el) {
        if (el.closest && el.closest('#xnlyTopTools')) return;
        var href = el.getAttribute('href') || '';
        if (!/(^|\/)index\.html(?:$|[?#])/.test(href)) return;
        var t = txt(el).replace(/\s+/g, '');
        if (t.length <= 8 && /首页|返回/.test(t)) {
          el.parentNode && el.parentNode.removeChild(el);
        }
      });
      Array.prototype.forEach.call(document.querySelectorAll('header a[href$="index.html"]'), function (el) {
        el.parentNode && el.parentNode.removeChild(el);
      });
    }
    dropOldHome();
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
