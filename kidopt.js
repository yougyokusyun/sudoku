/* 小脑袋乐园 · kidopt.js —— 幼儿园档「大图 + 极短标签」选项渲染
 *  - 选项卡片最小 140×140（窄屏 120×120），整卡可点
 *  - 点按卡片：朗读该选项的完整含义（屏幕上只显示图 + ≤4 字短标签）
 *  - 图下可带 14~16px 灰字说明，供家长/老师阅读
 *  - 数据可传字符串，也可传 {text, emoji, short, say, noLabel}
 */
(function () {
  'use strict';
  var X = window.XNLY = window.XNLY || {};
  if (X.kid) return;

  /* 选项文案 → [图, 短标签]（短标签 ≤4 个汉字） */
  var OPT = {
    /* ===== 安全常识 ===== */
    '斑马线': ['🚸', '斑马线'],
    '马路中间': ['🛣️', '路中间'],
    '汽车旁边': ['🚗', '汽车旁'],
    '停下来等': ['🛑', '停下'],
    '快跑过去': ['🏃', '快跑'],
    '慢慢走过去': ['🚶', '慢走'],
    '左右看看': ['👀', '左右看'],
    '闭着眼睛跑': ['🙈', '蒙眼跑'],
    '低头看手机': ['📱', '看手机'],
    '不可以': ['🙅', '不可以'],
    '可以': ['😊', '可以'],
    '车少的时候可以': ['🚗', '车少时'],
    '不要，拒绝他': ['🙅', '拒绝'],
    '马上吃掉': ['🍬', '吃掉'],
    '跟他走': ['🚶', '跟他走'],
    '不跟他走，找警察': ['👮', '找警察'],
    '马上上车': ['🚗', '上车'],
    '不开门，给爸妈打电话': ['🚪', '不开门'],
    '开门看看': ['🔓', '开门'],
    '告诉他家里没人': ['🗣️', '说没人'],
    '不可以，会触电': ['⚡', '会触电'],
    '用铁钉戳': ['🔩', '铁钉戳'],
    '擦干再按': ['🧻', '擦干'],
    '直接按': ['👆', '直接按'],
    '用舌头舔': ['👅', '舔'],
    '不能摸，会烫伤': ['♨️', '会烫伤'],
    '可以摸': ['🖐️', '摸摸'],
    '用脸贴上去': ['😖', '脸贴上'],
    '不能，要先问大人': ['🙅', '问大人'],
    '可以吃': ['💊', '可以吃'],
    '吃一颗试试': ['😋', '吃一颗'],
    '不能喝，有毒': ['☠️', '有毒'],
    '可以喝': ['🥤', '可以喝'],
    '喝一点点': ['🥄', '喝一点'],
    '不可以，会着火': ['🔥', '会着火'],
    '点纸玩': ['📄', '点纸玩'],
    '不碰，叫大人来': ['🙅', '叫大人'],
    '自己点上': ['🕯️', '自己点'],
    '拿去床上玩': ['🛏️', '床上玩'],
    '找收银台的工作人员': ['🧑‍💼', '找店员'],
    '自己跑出超市': ['🏃', '跑出去'],
    '躲起来哭': ['😭', '躲着哭'],
    '穿制服的保安或警察': ['👮', '找保安'],
    '随便一个陌生人': ['🧍', '找陌生人'],
    '自己走回家': ['🏠', '走回家'],
    '爸爸妈妈的电话': ['📞', '爸妈电话'],
    '动画片的名字': ['📺', '动画名'],
    '零食的名字': ['🍪', '零食名'],
    '穿制服的警察': ['👮', '找警察'],
    '发传单的人': ['📄', '发传单'],
    '陌生叔叔': ['🧍', '陌生人'],
    '按紧急按钮呼救': ['🔔', '按按钮'],
    '用手扒门': ['👐', '扒门'],
    '跳一跳': ['🦘', '跳一跳'],
    '大声呼救并离开': ['📢', '呼救离开'],
    '躲进衣柜': ['🧥', '躲衣柜'],
    '先找玩具': ['🧸', '找玩具'],
    '弯腰捂鼻快走': ['🚶', '弯腰走'],
    '坐电梯': ['🛗', '坐电梯'],
    '站着看': ['🧍', '站着看'],
    '大声呼救找大人': ['📢', '呼救'],
    '自己跳下去救': ['🏊', '自己跳'],
    '装没看见': ['🙈', '没看见'],
    '不能去': ['🙅', '不能去'],
    '可以去': ['😊', '可以去'],
    '水浅就可以': ['🌊', '水浅去'],
    '跟着大人，在浅水区': ['🏊', '陪大人'],
    '自己跑到深水区': ['🌊', '深水区'],
    '在泳池边追跑': ['🏃', '池边跑'],
    '捏住插头拔': ['🔌', '捏插头'],
    '拉电线': ['🪢', '拉电线'],
    '用剪刀剪': ['✂️', '剪电线'],
    '握住剪刀尖，把柄朝对方': ['✂️', '握尖递柄'],
    '剪刀尖朝对方': ['🗡️', '尖朝人'],
    '直接扔过去': ['🎯', '扔过去'],
    '不可以，会噎住': ['🈲', '会噎住'],
    '含一会儿再吐': ['👄', '含着'],
    '举手示意大人帮忙': ['🙋', '举手'],
    '继续大口吃': ['🍽️', '继续吃'],
    '边跑边吃': ['🏃', '边跑吃'],
    '不可以，要站稳扶好': ['🧍', '站稳扶好'],
    '倒着走更好玩': ['🔄', '倒着走'],
    '不可以，会摔下去': ['🚫', '会摔下'],
    '站上去看风景': ['👀', '看风景'],
    '不可以，很危险': ['🚫', '很危险'],
    '有纱窗就可以': ['🪟', '有纱窗'],
    '拒绝，并告诉家长': ['🙅', '拒绝'],
    '摆好姿势': ['📸', '摆姿势'],
    '跟他去别处拍': ['🚶', '跟他走'],
    '拒绝，去找大人': ['🙅', '拒绝'],
    '带他走': ['🚶', '带他走'],
    '上他的车': ['🚗', '上车'],
    '坐安全座椅系好安全带': ['🪑', '安全座椅'],
    '站在座位上': ['🧍', '站着'],
    '坐副驾驶': ['💺', '副驾驶'],
    '头盔': ['⛑️', '头盔'],
    '大帽子': ['👒', '大帽子'],
    '什么都不戴': ['🙅', '不戴'],
    '绿色安全出口标志': ['🟩', '安全出口'],
    '电梯标志': ['🛗', '电梯'],
    '厕所标志': ['🚻', '厕所'],
    '自己躲起来': ['🙈', '躲起来'],
    '谁也不告诉': ['🤐', '不告诉'],
    '119': ['🚒', '119'],
    '110': ['👮', '110'],
    '120': ['🚑', '120'],

    /* ===== 情绪与社交 ===== */
    '开心': ['😀', '开心'],
    '难过': ['😢', '难过'],
    '生气': ['😠', '生气'],
    '害怕': ['😨', '害怕'],
    '惊讶': ['😲', '惊讶'],
    '平静': ['😐', '平静'],
    '在想事情': ['🤔', '在想事'],
    '困了': ['😴', '困了'],
    '可以借我玩一下吗？': ['🙋', '借我玩'],
    '直接抢过来': ['😠', '抢过来'],
    '躺地上哭': ['😭', '躺地哭'],
    '分给他一块': ['🤝', '分一块'],
    '藏起来不让他看见': ['🙈', '藏起来'],
    '全部吃掉': ['😋', '全吃掉'],
    '对不起，我扶你起来': ['🙇', '对不起'],
    '赶快跑开': ['🏃', '跑开'],
    '笑他摔倒了': ['😆', '笑他'],
    '我可以和你们一起玩吗？': ['🙋', '一起玩'],
    '直接挤进去': ['🚪', '挤进去'],
    '把别人推开': ['👐', '推别人'],
    '谢谢你': ['🙏', '谢谢'],
    '我不要': ['🙅', '不要'],
    '抢过来就跑': ['🏃', '抢就跑'],
    '不理他': ['🙄', '不理'],
    '你怎么这么慢': ['😤', '嫌他慢'],
    '请让一下，谢谢': ['🙏', '请让让'],
    '用手推开他': ['👐', '推开'],
    '大声吼他': ['📢', '吼他'],
    '把玩具收进盒子': ['🧺', '收玩具'],
    '扔在地上': ['🗑️', '扔地上'],
    '留给别人收': ['🧍', '留别人'],
    '等大家一起吃': ['🍽️', '等大家'],
    '把菜都拉到自己面前': ['🍲', '拉过来'],
    '大声嚷嚷': ['📢', '嚷嚷'],
    '扶他起来，问他疼不疼': ['🤝', '扶起来'],
    '哈哈大笑': ['😆', '大笑'],
    '假装没看见': ['🙈', '装没看'],
    '认真听，等他说完': ['👂', '认真听'],
    '大声打断': ['📢', '打断'],
    '扭头走开': ['🚶', '走开'],
    '安安静静': ['🤫', '安静'],
    '大声唱歌': ['🎤', '唱歌'],
    '在床上跳': ['🛏️', '床上跳'],
    '轮流用': ['🔄', '轮流'],
    '抢过来自己画': ['😠', '抢过来'],
    '藏起来': ['🙈', '藏起来'],
    '站到队尾排队': ['🧍', '站队尾'],
    '插到最前面': ['🏃', '插队'],
    '往前挤': ['👐', '往前挤'],
    '先问主人可不可以': ['🙋', '先问主人'],
    '直接伸手摸': ['🖐️', '伸手摸'],
    '拽小狗尾巴': ['🐕', '拽尾巴'],
    '安慰他，陪陪他': ['🤗', '安慰他'],
    '笑他': ['😆', '笑他'],
    '走开不管': ['🚶', '走开']
  };

  var CSS = [
    '.kid-opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;width:100%;max-width:840px;margin:0 auto;}',
    '.kid-opt{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;',
    'min-width:140px;min-height:140px;padding:10px 8px;border:3px solid rgba(36,59,83,.12);border-radius:22px;',
    'background:#fff;cursor:pointer;font-family:inherit;color:#243b53;box-shadow:0 6px 16px rgba(36,59,83,.12);',
    '-webkit-tap-highlight-color:transparent;transition:transform .12s ease;}',
    '.kid-opt:active{transform:scale(.96);}',
    '.kid-opt .kfig{font-size:clamp(2.6rem,8vw,3.8rem);line-height:1.1;}',
    '.kid-opt .klabel{font-size:1.3rem;font-weight:900;line-height:1.2;}',
    '.kid-opt .kdesc{font-size:.9rem;font-weight:700;color:#6b7f95;line-height:1.25;text-align:center;}',
    '.kid-opt.good{border-color:#2fb344;background:#eaf8ee;}',
    '.kid-opt.bad{border-color:#e6b800;background:#fff8e1;animation:none;}',
    '.kid-opt.faded{opacity:.45;}',
    '@media(max-width:430px){.kid-opts{grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;}',
    '.kid-opt{min-width:120px;min-height:120px;}.kid-opt .klabel{font-size:1.25rem;}}',
    '@media(max-height:430px){.kid-opt{min-width:120px;min-height:120px;}.kid-opt .kfig{font-size:2.2rem;}}'
  ].join('');

  function inject() {
    if (document.getElementById('kidoptStyle')) return;
    var s = document.createElement('style');
    s.id = 'kidoptStyle'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function say(text) {
    try {
      if (X.voice && X.voice.speak) { X.voice.speak(String(text)); return; }
      if (!(window.speechSynthesis && window.SpeechSynthesisUtterance)) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(text));
      u.lang = 'zh-CN'; u.rate = .95; u.pitch = 1.12;
      window.speechSynthesis.speak(u);
    } catch (e) { }
  }

  function meta(o) {
    if (o && typeof o === 'object') {
      return { text: String(o.text || ''), fig: o.emoji || '🔹', short: o.short || '', desc: o.text || '', noLabel: !!o.noLabel };
    }
    var t = String(o || '');
    var m = OPT[t];
    if (m) return { text: t, fig: m[0], short: m[1], desc: t, noLabel: false };
    return { text: t, fig: '🔹', short: t.length <= 4 ? t : t.slice(0, 4), desc: t, noLabel: false };
  }

  /* container：放卡片的容器；options：字符串或对象数组；onPick(btn, text) */
  function build(container, options, onPick, opts) {
    opts = opts || {};
    inject();
    container.innerHTML = '';
    container.classList.add('kid-opts');
    (options || []).forEach(function (o) {
      var m = meta(o);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'kid-opt opt';
      b.setAttribute('aria-label', m.text);
      b.dataset.say = m.text;

      var fig = document.createElement('span');
      fig.className = 'kfig'; fig.textContent = m.fig;
      b.appendChild(fig);

      if (!opts.noLabel && !m.noLabel && m.short) {
        var lab = document.createElement('span');
        lab.className = 'klabel'; lab.textContent = m.short;
        b.appendChild(lab);
      }
      if (opts.desc !== false && m.desc) {
        var d = document.createElement('span');
        d.className = 'kdesc'; d.textContent = m.desc;
        b.appendChild(d);
      }

      /* 手指按下就朗读完整含义（不依赖识字） */
      b.addEventListener('pointerdown', function () { say(m.text); });
      b.addEventListener('click', function () { if (onPick) onPick(b, m.text); });
      container.appendChild(b);
    });
  }

  X.kid = { build: build, say: say, meta: meta, opt: OPT };
})();
