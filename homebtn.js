/* 小脑袋乐园 · homebtn.js —— 全站统一的右上角工具条
 *  - 固定定位 top:12px，🏠 在左、🔊 在右，88×88 可点区、8px 间距，全站坐标一致
 *  - 🏠：返回首页（aria-label="返回首页"）
 *  - 🔊：朗读当前屏幕内容（题干 + 当前选项）；页面上不再出现第二个语音或调速控件
 *  - 语速只在首页右上角 ⚙️ 全局设置里调，游戏页不放调速控件
 *  - 纯操作页（没有可朗读内容）只留 🏠，🔊 不渲染
 *  - 顶部预留 112px，避免遮挡标题
 */
(function () {
  'use strict';
  var last = location.pathname.split('/').filter(function (s) { return s; }).pop() || '';
  if (last === 'index.html' || last === '') return;    /* 首页自身不显示 */

  var inGames = /[\/\\]games[\/\\]/.test(location.pathname);
  var homeHref = inGames ? '../index.html' : 'index.html';

  var CSS = [
    '#xnlyTopTools{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));',
    'left:calc(100vw - 200px);right:auto;z-index:90;display:flex;align-items:center;gap:8px;}',
    '.xnly-tool{width:88px;height:88px;border-radius:20px;border:0;background:rgba(255,255,255,.9);',
    'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 6px 18px rgba(36,59,83,.14);',
    'display:flex;align-items:center;justify-content:center;font-size:40px;line-height:1;cursor:pointer;',
    'color:#243b53;-webkit-tap-highlight-color:transparent;}',
    '.xnly-tool:active{transform:scale(.96);}',
    '.xnly-tool.xnly-hidden{display:none !important;}',
    'body{padding-top:112px !important;}'
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

  function init() {
    if (document.getElementById('xnlyTopTools')) return;
    var st = document.createElement('style');
    st.id = 'xnlyTopStyle'; st.textContent = CSS;
    document.head.appendChild(st);

    var tools = document.createElement('div');
    tools.id = 'xnlyTopTools';

    var home = document.createElement('button');
    home.type = 'button';
    home.className = 'xnly-tool';
    home.textContent = '🏠';
    home.setAttribute('aria-label', '返回首页');
    home.addEventListener('click', function () { location.href = homeHref; });
    tools.appendChild(home);

    /* 先移除旧按钮，再判断本页有没有可读内容 */
    dropOldReplay(document);

    var speech = currentSpeech();
    var snd = document.createElement('button');
    snd.type = 'button';
    snd.className = 'xnly-tool';
    snd.textContent = '🔊';
    snd.setAttribute('aria-label', '再听一遍');
    if (!speech) snd.classList.add('xnly-hidden');   /* 纯操作页不显示 🔊 */

    /* 手动重听：force 绕过「朗读语音已关闭」，保证仍能听一次 */
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
    tools.appendChild(snd);
    document.body.appendChild(tools);

    /* 动态创建的旧重听按钮也要清掉；内容后置渲染时补显示 🔊 */
    if (window.MutationObserver) {
      var mo = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          for (var j = 0; j < muts[i].addedNodes.length; j++) {
            var n = muts[i].addedNodes[j];
            if (n.nodeType === 1) dropOldReplay(n);
          }
        }
        if (snd.classList.contains('xnly-hidden') && currentSpeech()) {
          snd.classList.remove('xnly-hidden');
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }

    /* 隐藏旧的回首页入口 */
    Array.prototype.forEach.call(document.querySelectorAll('header a[href$="index.html"], a.back'), function (el) {
      el.style.display = 'none';
    });
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
