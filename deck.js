/* XNLY.deck — 题库开局洗牌工具（v18）
 * 用法：
 *   var d = XNLY.deck.make(pool, 'page-key', {head:5});
 *   var q = d.next();      // 取下一题（抽完自动重洗，且避开末尾）
 *   d.left();              // 牌堆剩余
 *   d.reset();             // 重新开局（避开上一局开头）
 * 标识优先用 opts.id(item,i)，其次 item.id/key/code/name/q，最后用下标。
 */
(function (global) {
  'use strict';
  var PREFIX = 'xnly.deck.';
  var VERSION = 1;

  function idOf(item, i, opts) {
    if (opts && typeof opts.id === 'function') {
      try {
        var v = opts.id(item, i);
        if (v !== undefined && v !== null) return String(v);
      } catch (e) { }
    }
    if (item && typeof item === 'object') {
      var keys = ['id', '_id', 'key', 'code', 'name', 'q', 't'];
      for (var k = 0; k < keys.length; k++) {
        var x = item[keys[k]];
        if (typeof x === 'string' || typeof x === 'number') return String(x);
      }
    }
    if (typeof item === 'string' || typeof item === 'number') return String(item);
    return '#' + i;
  }

  function read(key) {
    try {
      var raw = global.localStorage.getItem(PREFIX + key);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || typeof o !== 'object') return null;
      return {
        head: Array.isArray(o.head) ? o.head.map(String) : [],
        tail: Array.isArray(o.tail) ? o.tail.map(String) : [],
        first: o.first == null ? '' : String(o.first)
      };
    } catch (e) { return null; }
  }

  function write(key, o) {
    try {
      global.localStorage.setItem(PREFIX + key, JSON.stringify({
        v: VERSION, head: o.head, tail: o.tail, first: o.first
      }));
    } catch (e) { }
  }

  function shuffleIdx(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    for (var j = n - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var t = a[j]; a[j] = a[k]; a[k] = t;
    }
    return a;
  }

  // 把不在 forbidden 里的下标尽量提到牌堆最前 leadCount 位；
  // forbidden 至少包含上一局开头，因此首位必然不同（题库够大时整段开头都不同）。
  function arrange(deck, ids, forbidden, leadCount, prevFirst) {
    if (!deck.length) return deck;
    var fset = {};
    for (var i = 0; i < forbidden.length; i++) fset[forbidden[i]] = 1;
    var lead = [], rest = [], q;
    for (q = 0; q < deck.length; q++) {
      var idx = deck[q];
      if (lead.length < leadCount && !fset[ids[idx]]) lead.push(idx);
      else rest.push(idx);
    }
    if (!lead.length) {
      // 题库太小：至少保证第一题不是上一局第一题
      for (q = 0; q < rest.length; q++) {
        if (ids[rest[q]] !== prevFirst) {
          var pick = rest.splice(q, 1)[0];
          lead.push(pick);
          break;
        }
      }
    }
    return lead.concat(rest);
  }

  function make(pool, key, opts) {
    opts = opts || {};
    var items = Array.isArray(pool) ? pool.slice() : [];
    var n = items.length;
    key = String(key || 'default');
    var ids = [];
    for (var i = 0; i < n; i++) ids.push(idOf(items[i], i, opts));

    var wantHead = opts.head == null ? 5 : Math.max(0, Number(opts.head) || 0);
    var headCount = Math.min(wantHead, Math.max(0, n - 1));
    var tailCount = opts.tail == null ? Math.min(6, headCount || 1) : Math.max(0, Number(opts.tail) || 0);

    var saved = read(key);
    var gameHead = [];
    var gameTail = [];
    var deck = [];
    var pos = 0;
    var lastDrawn = [];

    function initialFill() {
      var head = saved ? saved.head : [];
      var tail = saved ? saved.tail : [];
      var prevFirst = (saved && saved.first) || head[0] || '';
      var forb = head.concat(tail);
      deck = arrange(shuffleIdx(n), ids, forb, headCount, prevFirst);
      pos = 0;
    }

    function refill(recent) {
      var prevFirst = recent.length ? recent[recent.length - 1] : '';
      deck = arrange(shuffleIdx(n), ids, recent, recent.length, prevFirst);
      pos = 0;
    }

    function persist() {
      var knownFirst = gameHead.length ? gameHead[0] : (saved && saved.first ? saved.first : '');
      var payload = {
        head: gameHead.slice(0, headCount),
        tail: lastDrawn.slice(-tailCount),
        first: knownFirst
      };
      saved = payload;
      write(key, payload);
    }

    function next() {
      if (!n) return undefined;
      if (pos >= deck.length) {
        // 抽完一整副：重洗并避开刚抽过的末尾若干题
        var recent = lastDrawn.slice(-tailCount);
        refill(recent);
        gameTail = [];
      }
      var item = items[deck[pos++]];
      var id = ids[deck[pos - 1]];
      lastDrawn.push(id);
      if (lastDrawn.length > tailCount) lastDrawn.shift();
      if (gameHead.length < headCount) gameHead.push(id);
      persist();
      return item;
    }

    function left() { return Math.max(0, deck.length - pos); }
    function total() { return n; }

    function reset() {
      var prev = read(key);
      saved = prev || saved;
      // 上一局开头若尚未写入（极端情况），用本局已抽到的开头兜底
      if (!saved || !saved.head.length) {
        saved = { head: gameHead.slice(0, headCount), tail: gameTail.slice(-tailCount), first: gameHead[0] || '' };
      }
      gameHead = [];
      gameTail = [];
      lastDrawn = [];
      initialFill();
      return api;
    }

    var api = { next: next, left: left, total: total, reset: reset };
    initialFill();
    return api;
  }

  var deck = { version: VERSION, make: make };
  try {
    global.XNLY = global.XNLY || {};
    global.XNLY.deck = deck;
  } catch (e) { }
  global.deck = deck;
})(typeof window !== 'undefined' ? window : globalThis);
