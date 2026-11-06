/* 小脑袋乐园 · Service Worker v16（核心优先预缓存版 + 语音/音效共享模块）
 *
 * 背景：v14 的 install 需要一次性拉完 181 条 / 7.39 MB（含 126 张游戏图片），
 * 在国内访问 GitHub Pages 时平均 746 ms/请求、最慢 17~31 s，首次安装要数分钟，
 * Safari 一旦切到后台 install 就被中断，缓存停在半途，表现为"还是没装上"。
 *
 * v15 策略：
 *  1) 预缓存只放核心文件（HTML / JS / CSS / manifest / 图标），约 1.9 MB，
 *     安装几十秒内即可完成，首页离线打开视觉完整。
 *  2) 126 张游戏图片不进预缓存，改为运行时缓存：同源 GET、response.ok、
 *     type 为 basic/default 时才 cache.put —— 打开过的游戏，图片会自动落地。
 *  3) sw.js 自身永不入缓存，避免更新被旧缓存拦住。
 *  4) 逐条容错 install + skipWaiting + 清理旧版本缓存 + clients.claim + 导航离线兜底。
 *
 * v16 变化：只新增 voice.js / sound.js / parent.html 三个条目，其余策略不变。
 * v18 变化：全站图片在平板上放大（7 个含图页面的内联样式已改），版本号 +1 以刷新缓存。
 * v19 变化：新增第二批 4 个页面（应用题 / 看图写话 / 自然科学 / 小古文）并加入预缓存。
 * v20 变化：新增幼儿园 5 个页面（安全 / 情绪 / 方位 / 关联配对 / 作息顺序），形状扩到 8 种。
 * v21 变化：新增现代语文基础、单词消消乐；补入阅读理解 / 近反义词 / 单词图配 / 钟表与人民币；移除调试页。
 * v22 变化：新增外链书架（只放站内链接与说明，不内嵌外部资源）。
 * v23 变化：移除成语分类页；去掉英语/古诗/语文百科的开始按钮（进入即出题）。
 * v24 变化：新增英语听力选择页（100 题，含细节辨图）。
 * v25 变化：英语听力页新增「细节辨图 30 题」练习模式（页内切换 + ?type=detail，含分年级小结）。
 * v26 变化：英语听力题库扩到 200 题（各年级 50 题），细节辨图增至 52 题，模式与小结随题量动态显示。
 * v27 变化：新增「找不同」页（100 关，内联 SVG/emoji 绘制，三档难度，点图找差异）。
 * v28 变化：新增 4 个游戏页（计时挑战 / 打地鼠认单词 / 看图选句 / 情景对话），加入预缓存。
 * v29 变化：阅读理解页扩到「60 篇基础 + 100 题新题型」，页面无新增，版本号 +1。
 * v30 变化：首页改为幼儿园 / 低年级 / 高年级 / 家长 四 tab，parent.html 年龄档同步，页面无新增。
 * v31 变化：逻辑推理页扩到 40 道（30 常规 + 10 挑战），逐题唯一解已校验，页面无新增。
 * v32 变化：新增共享洗牌模块 deck.js 并加入预缓存；幼儿园 / 低年级题库型页面开局顺序随机且不连续重复。
 * v33 变化：幼儿园档可用性改造——大图选项 kidopt.js、一次点一步排序 kidseq.js、
 *           动物叫声 animal-voice.js、全站右上角回首页 homebtn.js，均加入预缓存。
 * v34 变化：连续语速滑杆（0.5~2.0）、首页 5 入口单排、右上角统一工具条（🏠+🔊）、
 *           形状页首题修复、天气页 SVG 场景、全站配图放大、单词图配照片兜底结构、
 *           打地鼠放慢、逻辑推理线索全显；新增 img/words/index.json 入预缓存（照片不入）。
 * v35 变化：6 条真实动物录音 + animal-voice.js 优先真实录音；音频清单 CREDITS/index.json。
 * v36 变化：首页语速滑杆改为常显（0.5~2.0，步进 0.05）；每次朗读前重读 xnly_speed，
 *           讲解模式语速统一走滑杆值（取消 iOS/安卓两档）；voice.js / index.html / sudoku-ui.js 更新。
 *           打地鼠 whack-word 改为「命中即换词」（去掉 3 周期才换的 gate，同词第二只不重复计分）。
 * v37 变化：看图选句 90 题全部重做——emoji 拼贴改为 Unsplash 实景照片
 *           （games/img/sentences/q01~q90.webp，512×384，单张 ≤80 KB，总量 1.6 MB），
 *           图片不进预缓存，走运行时缓存；题目改为「图能唯一决定答案」。
 * v38 变化：看图选句四/五年级句子难度回调到年级水平——四年级由 5.6 词升至 8.5 词
 *           （现进时动作+状语 / there be / 情态），五年级由 5.8 词升至 9.6 词
 *           （because / when 从句、频率副词、be going to），四五年级 A1 裸指认句归零；
 *           图片与三年级题目不变，页面无新增文件。
 * v39 变化：① 答对后等语音播完再跳题：voice.js 新增 speakThen（按朗读队列 onend 回调，
 *              多句全部读完才触发；兜底 字数×220ms+1500ms；手动换题 cancel 不回调），
 *              21 个游戏页的 setTimeout 跳转改为语音完成回调；
 *           ② 成语页每题补 explain（≤30 字）与 source（出处），答对后弹出结果卡，
 *              122 条答案并集 100% 覆盖，朗读不念出处；
 *           ③ 全站朗读入口统一到右上角工具条一个 🔊，删除/隐藏 8 处页内重复按钮
 *              （beat-clock / bingju / wenyan / dialogue-choice / gushi /
 *              yuwen-baike / english 等），点选项即朗读行为保留；
 *           ④ idioms.html 横屏（≥900px 宽）改左图右题两栏，竖屏保持上下结构；
 *              图片容器按 1:1 预留空间（固定高度 + aspect-ratio + 占位底色），
 *              加载中/失败不塌陷、文字不下移，超高整体滚动不裁切。
 * v40 变化：① 四页图标放大到约 1.5 倍（count / big-small / more-less / number-match），
 *              1024×768 与 768×1024 均一屏放下；② shape-insert 改为触屏拖拽填空
 *              （Pointer Events + setPointerCapture，吸附/回弹，60px 容差，保留点选兜底）；
 *           ③ whack-word 改 60 秒一局，词库扩到 146 个小学常见词（12 主题，去重），
 *              同主题不重复干扰项、局内目标词不重复，结算显示得分/正确/错误；
 *           ④ animal-chess 更名「斗兽棋」，棋盘宽度铺满可视区（横屏≥88%、竖屏≥92%），
 *              横竖间距独立计算，棋子/文字同步放大且不裁边。
 * v41 变化：① 新增「写作赏析 · 好句积累」页（writing-showcase.html）：12 类场景 264 句，
 *              每句含原句/场景标签/适用题目提示，支持分组浏览 + 搜索 + 统一语音朗读，
 *              并迁移保留原看图写话的 40 组场景词库；
 *           ② 删除看图写话 / 应用题小博士 / 形近字找家三个页面及首页卡片、预缓存条目；
 *           ③ 首页与各年级 tab 按科目分组（语文/数学/英语/认知与科学/综合游戏），
 *              组内按难度从易到难，组间加分组标题与间距。
 * v42 变化：语文小百科新增「同类词语」14 组 210 条（词/读音/基本义/与同组词差别/例句），
 *           覆盖水名、道路、量词、手/看/说/走、山部位、建筑、风雨、声音、颜色、时间、心情；
 *           页面新增全站搜索框，可按词、读音、意思或例句检索。
 * v43 变化：① 动物找妈妈改为「成年妈妈 + 幼崽」两张不同的真实照片（20 组 40 张，
 *              512×384 WebP ≤80 KB，来源与授权见 games/img/pairs/CREDITS.md，图片不进预缓存）；
 *              妈妈图在版面中明显大于幼崽图。
 *           ② 成语闯关删除「配一配」「演一演」两种题型（数据、样式、模式入口、键盘 3/4 一并移除），
 *              只保留「猜一猜」「填一填」；24 张成语配图全部重做为统一儿童水彩绘本风，
 *              900×900，画面只表现字面情节、无文字无水印。
 * v44 变化：新增「成语大全」页（idioms-all.html）：数据放 data/idioms-all.json，
 *           首批 145 条（计划 500 条），拼音首字母索引 + 搜索 + 分页懒加载；
 *           释义为小学生可读短句，出处仅标注可核查者（17 条），其余不标。
 * v45 变化：删除「军棋 · 翻开版」页（games/junqi.html），同步移除首页卡片、科目映射
 *           与预缓存条目；其它页面无变化。
 * v46 变化：成语大全补至 265 条（新增 J–Q 120 条），新增条目补齐最终含义 / 例句 /
 *           近反义 / 来历 / 演变字段，卡片可点击「展开详解」；首字母索引与搜索覆盖新数据。
 * v47 变化：成语大全补至 380 条（新增 R–Z 115 条），字段与展示方式同上一批；
 *           去重后无重复，首字母索引与搜索随数据自动覆盖。
 * v48 变化：新增「谜语大全」页（games/riddles-all.html）；谜语数据抽成共享
 *           data/riddles.json（507 条，含谜目/解析/难度/年级），猜谜语游戏改为读同一份数据。
 * v49 变化：成语大全补齐到 507 条（超出目标 500），新增 A–H 批次 127 条；
 *           去重后无重复，有出处 77 条，首字母索引与搜索自动覆盖。
 * v50 变化：首页改回一整块连续卡片网格，去掉科目分组标题与分组容器；
 *           只保留「同一科目相邻」的排序（语文→数学→英语→认知与科学→综合游戏），
 *           各年级 tab 同样处理，卡片样式与列数不变。
 * v51 变化：成语大全补齐缺失字段（第 4 批 90 条）：来历 / 演变按可核查典故或如实说明，
 *           最终含义 / 例句 / 近反义一并补齐；数据仍为 507 条。
 * v52 变化：成语大全补齐缺失字段（第 5 批 88 条），口径同上一批；数据仍为 507 条。
 * v53 变化：成语大全补齐缺失字段（第 3 批 92 条），口径同上一批；数据仍为 507 条。
 * v54 变化：成语大全补齐缺失字段（第 1 批 87 条），口径同上一批；数据仍为 507 条。
 * v55 变化：成语大全补齐缺失字段（第 2 批 96 条 + 3 条无常用反义如实标注），
 *           释义 / 来历 / 演变 / 最终含义 / 例句 / 近义 / 反义 覆盖率均达 100%。
 */
var CACHE = 'xnly-v55';

var PRECACHE = [
  './',
  'games/24point.html',
  'games/animal-chess.html',
  'games/animal-feed.html',
  'games/animals-learn.html',
  'games/animals-mom.html',
  'games/big-small.html',
  'games/bingju.html',
  'games/blackjack.html',
  'games/bubble.html',
  'games/color.html',
  'games/chinese-basics.html',
  'games/clock-money.html',
  'games/count.html',
  'games/daily-order.html',
  'games/emotions.html',
  'games/english.html',
  'games/english-listening.html',
  'games/find-diff.html',
  'games/beat-clock.html',
  'games/picture-sentence.html',
  'games/whack-word.html',
  'games/writing-showcase.html',
  'games/idioms-all.html',
  'games/riddles-all.html',
  'games/dialogue-choice.html',
  'games/gomoku.html',
  'games/guess-number.html',
  'games/gushi.html',
  'games/idioms.html',
  'data/idioms-all.json',
  'data/riddles.json',
  'games/img/icon-180.png',
  'games/img/icon-192.png',
  'games/img/icon-512.png',
  'games/klondike.html',
  'games/links.html',
  'games/logic-clues.html',
  'games/memory-match.html',
  'games/more-less.html',
  'games/music-pad.html',
  'games/near-syn.html',
  'games/number-match.html',
  'games/odd-one.html',
  'games/english-words.html',
  'games/pairs.html',
  'games/path-connect.html',
  'games/pattern.html',
  'games/reaction.html',
  'games/rhythm.html',
  'games/read-comp.html',
  'games/riddle.html',
  'games/safety.html',
  'games/science-nature.html',
  'games/scene-words.html',
  'games/sequence.html',
  'games/shadow.html',
  'games/shape-insert.html',
  'games/shapes-learn.html',
  'games/shapes-panel.html',
  'games/shapes.html',
  'games/slide15.html',
  'games/sort-home.html',
  'games/spatial.html',
  'games/steps.html',
  'games/weather.html',
  'games/wenyan.html',
  'games/word-match.html',
  'games/xiangqi.html',
  'games/xiangxingzi.html',
  'games/yuwen-baike.html',
  'games/yuwen-data.js',
  'games/yuwen-similar.js',
  'animal-voice.js',
  'audio/animals/index.json',
  'deck.js',
  'homebtn.js',
  'img/words/index.json',
  'index.html',
  'kidopt.js',
  'kidseq.js',
  'manifest.json',
  'parent.html',
  'puzzles.js',
  'sound.js',
  'style.css',
  'sudoku-core.js',
  'sudoku-ui.js',
  'sudoku.html',
  'voice.js',
];

/* 逐条预缓存：单条失败只跳过，不会让整个 install 失败 */
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(PRECACHE.map(function (url) {
        return fetch(url, { cache: 'no-cache' }).then(function (resp) {
          if (!resp || !resp.ok) return;
          return c.put(url, resp.clone());
        }).catch(function () {
          /* 忽略单条失败 */
        });
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k !== CACHE;
      }).map(function (k) {
        return caches.delete(k);   /* 清掉 xnly-v13 / v14 等旧缓存 */
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* 是否可以写入运行时缓存 */
function cacheable(request, resp, url) {
  if (request.method !== 'GET') return false;
  if (!resp || !resp.ok || resp.status !== 200) return false;       // 失败/非 200 不缓存
  if (resp.type !== 'basic' && resp.type !== 'default') return false; // 跨域 opaque 不缓存
  if (url.origin !== self.location.origin) return false;            // 仅同源
  if (/\/sw\.js$/.test(url.pathname)) return false;                // 不缓存 sw.js 自身
  return true;
}

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var reqUrl = new URL(e.request.url);
  if (reqUrl.origin !== self.location.origin) return;               // 跨域交给浏览器

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (resp) {
        if (cacheable(e.request, resp, reqUrl)) {
          var clone = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, clone); });
        }
        return resp;
      }).catch(function () {
        if (e.request.mode === 'navigate') {
          return caches.match('index.html').then(function (f) {
            return f || caches.match('./').then(function (g) {
              return g || new Response('离线中，且该页面尚未缓存', {
                status: 503,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
              });
            });
          });
        }
        return Response.error();
      });
    })
  );
});
