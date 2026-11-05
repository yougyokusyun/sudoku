/* 小脑袋乐园 · kidseq.js —— 幼儿园档「一次点一步」排序引导
 *  - 上方图卡区，下方 ①②③④ 空槽
 *  - 点一张卡：正确则 300ms 飞入下一个空槽并朗读「第 N 步：xxx」
 *  - 放错不判错：槽内轻微抖动、语音提示、自动退回图卡区，可重试
 *  - 连错 2 次让正确卡片放大闪烁
 *  - 全部填完朗读整条顺序 + 完成音效，2 秒后自动下一轮
 *  - 无拖拽、无提交、无计时、无扣分
 */
(function () {
  'use strict';
  var X = window.XNLY = window.XNLY || {};
  if (X.kidseq) return;

  var CSS = [
    '.kidseq-pool{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;width:100%;max-width:860px;margin:0 auto;}',
    '.seqcard{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;',
    'min-width:140px;min-height:140px;padding:10px 8px;border:3px solid rgba(36,59,83,.12);border-radius:22px;',
    'background:#fff;cursor:pointer;font-family:inherit;color:#243b53;box-shadow:0 6px 16px rgba(36,59,83,.12);',
    '-webkit-tap-highlight-color:transparent;}',
    '.seqcard .fig{font-size:clamp(2.2rem,7vw,3.2rem);line-height:1.1;}',
    '.seqcard .lab{font-size:1.25rem;font-weight:900;line-height:1.2;text-align:center;}',
    '.seqcard.miss{box-shadow:0 0 0 3px #e6b800 inset;animation:kseqshake .5s ease;}',
    '.seqcard.pulse{animation:kseqpulse .8s ease 2;}',
    '.seqcard.settled{box-shadow:none;}',
    '.kidseq-slots{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;width:100%;max-width:860px;margin:0 auto;}',
    '.seqslot{position:relative;min-width:140px;min-height:140px;border:3px dashed #b6c4d3;border-radius:20px;',
    'background:rgba(255,255,255,.7);display:flex;align-items:center;justify-content:center;}',
    '.seqslot .num{position:absolute;top:-14px;left:-10px;width:44px;height:44px;border-radius:50%;',
    'background:#7c5cff;color:#fff;font-size:1.35rem;font-weight:900;display:flex;align-items:center;justify-content:center;',
    'box-shadow:0 3px 8px rgba(124,92,255,.35);z-index:2;}',
    '.seqslot.next{border-color:#7c5cff;animation:kseqglow 1.6s ease-in-out infinite;}',
    '.seqslot.next::after{content:"👇";position:absolute;top:-42px;left:50%;transform:translateX(-50%);font-size:1.35rem;}',
    '.seqslot.filled{border-style:solid;border-color:#2fb344;background:#eaf8ee;}',
    '.seqslot .seqcard{min-width:0;min-height:0;width:100%;height:100%;box-shadow:none;border:0;background:transparent;}',
    '@keyframes kseqglow{0%,100%{box-shadow:0 0 0 0 rgba(124,92,255,.15)}50%{box-shadow:0 0 0 10px rgba(124,92,255,.22)}}',
    '@keyframes kseqshake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}',
    '@keyframes kseqpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}',
    '@media(max-width:430px){.kidseq-pool,.kidseq-slots{grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;}',
    '.seqcard,.seqslot{min-width:120px;min-height:120px;}.seqcard .lab{font-size:1.25rem;}}'
  ].join('');

  function inject() {
    if (document.getElementById('kidseqStyle')) return;
    var s = document.createElement('style');
    s.id = 'kidseqStyle'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function say(t) {
    try {
      if (X.voice && X.voice.speak) { X.voice.speak(String(t)); return; }
      if (!(window.speechSynthesis && window.SpeechSynthesisUtterance)) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(t));
      u.lang = 'zh-CN'; u.rate = .92; u.pitch = 1.12;
      window.speechSynthesis.speak(u);
    } catch (e) { }
  }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function ordinal(n) { return ['一', '二', '三', '四'][n - 1] || String(n); }

  function mount(o) {
    inject();
    var pool = o.pool, slots = o.slots, fb = o.feedback, prompt = o.prompt;
    var rounds = o.rounds || [];
    var deck = X.deck ? X.deck.make(rounds.map(function (_, i) { return i; }), String(o.key || 'kidseq') + '.rounds', { head: Math.min(3, rounds.length - 1) })
      : { next: (function () { var i = 0; return function () { return rounds[i++ % rounds.length]; }; })() };

    var round = null, step = 0, locked = false, wrong = 0, timers = [];
    var curCards = [];

    function clear() { timers.forEach(clearTimeout); timers = []; }
    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }

    function fly(card, target, done) {
      var a = card.getBoundingClientRect();
      target.appendChild(card);
      var b = card.getBoundingClientRect();
      card.style.transition = 'none';
      card.style.transform = 'translate(' + (a.left - b.left) + 'px,' + (a.top - b.top) + 'px)';
      void card.offsetWidth;
      requestAnimationFrame(function () {
        card.style.transition = 'transform .3s ease';
        card.style.transform = 'none';
      });
      later(function () { card.style.transition = ''; card.style.transform = ''; if (done) done(); }, 320);
    }

    function markNext() {
      Array.prototype.forEach.call(slots.children, function (c, i) {
        c.classList.toggle('next', i === step);
      });
    }

    function makeCard(it) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'seqcard';
      b.setAttribute('aria-label', it.text);
      var f = document.createElement('span'); f.className = 'fig'; f.textContent = it.emoji || '🔹';
      var l = document.createElement('span'); l.className = 'lab'; l.textContent = it.short || it.text;
      b.appendChild(f); b.appendChild(l);
      b.addEventListener('pointerdown', function () { say(it.text); });
      b.addEventListener('click', function () { pick(it, b); });
      return b;
    }

    function startRound() {
      clear();
      var ri = deck.next();
      round = rounds[ri];
      step = 0; locked = false; wrong = 0;
      if (o.onStart) { try { o.onStart(ri, rounds.length); } catch (e) { } }
      prompt.textContent = '按顺序点一点：先做什么？';
      fb.className = 'feedback'; fb.textContent = '';
      if (o.sentence) { o.sentence.className = 'sentence'; o.sentence.textContent = ''; }
      pool.innerHTML = ''; slots.innerHTML = '';
      curCards = shuffle(round.items.slice()).map(function (it) {
        var c = makeCard(it); pool.appendChild(c); return c;
      });
      round.items.forEach(function (_, i) {
        var cell = document.createElement('div');
        cell.className = 'seqslot';
        var n = document.createElement('span');
        n.className = 'num'; n.textContent = String(i + 1);
        cell.appendChild(n);
        slots.appendChild(cell);
      });
      markNext();
      say('按顺序点一点，先做什么？');
    }

    function pick(it, card) {
      if (locked || card.parentElement !== pool) return;
      var want = round.items[step];
      if (!want) return;
      if (it.text === want.text) {
        locked = true;
        var cell = slots.children[step];
        cell.classList.add('filled');
        fly(card, cell, function () {
          card.classList.add('settled');
          step++;
          wrong = 0;
          markNext();
          say('第' + ordinal(step) + '步：' + it.text + '。');
          locked = false;
          if (step >= round.items.length) finish();
        });
      } else {
        locked = true;
        var cell2 = slots.children[step];
        cell2.classList.add('filled');
        fly(card, cell2, function () {
          card.classList.add('miss');
          wrong++;
          fb.className = 'feedback bad';
          fb.textContent = '💛 再想想，先做哪一件？';
          say(wrong >= 2 ? '先找一找，哪一件应该先做？' : '咦，再想想哪件事先做？');
          if (wrong >= 2) {
            var ok = null;
            curCards.forEach(function (c) {
              if (c.parentElement === pool && c.getAttribute('aria-label') === want.text) ok = c;
            });
            if (ok) { ok.classList.remove('pulse'); void ok.offsetWidth; ok.classList.add('pulse'); }
          }
          later(function () {
            card.classList.remove('miss');
            cell2.classList.remove('filled');
            fly(card, pool, null);
            locked = false;
          }, 700);
        });
      }
    }

    function finish() {
      locked = true;
      fb.className = 'feedback ok'; fb.textContent = '🎉 排好啦！';
      var text = round.sentence || round.items.map(function (x) { return x.text; }).join('，');
      if (o.sentence) o.sentence.textContent = '📝 ' + text;
      if (o.sentence) o.sentence.className = 'sentence show';
      say(text);
      try { if (X.mark) X.mark('right'); } catch (e) { }
      try { if (X.sound && X.sound.win) X.sound.win(); } catch (e) { }
      if (o.onComplete) { try { o.onComplete(round); } catch (e) { } }
      later(function () {
        if (o.repeat === false) { locked = false; return; }
        startRound();
      }, 2000);
    }

    var api = {
      start: startRound,
      replay: function () { say('按顺序点一点，先做什么？'); },
      round: function () { return round; }
    };
    startRound();
    return api;
  }

  X.kidseq = { mount: mount, ordinal: ordinal };
})();
