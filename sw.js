/* 小脑袋乐园 · Service Worker v14
 * 修复说明：v13 的 PRECACHE 里含有 ".nojekyll"，该文件在 GitHub Pages 上恒为 404，
 * 而 v13 用的是"全有或全无"的批量预缓存 —— 一条 404 就让整个 install 阶段 reject，
 * 结果缓存始终为空，SW 虽然后来被 skipWaiting 激活，却没有任何离线资源，
 * 表现就是"添加到主屏幕后每次打开仍要联网且很慢"。
 * v14 改为逐条容错：每条单独 fetch + cache.put，失败只忽略，不影响其它资源。
 */
var CACHE = 'xnly-v14';

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
  'games/count.html',
  'games/english.html',
  'games/gomoku.html',
  'games/guess-number.html',
  'games/gushi.html',
  'games/idiom-cat.html',
  'games/idioms.html',
  'games/img/ant.jpg',
  'games/img/apple.jpg',
  'games/img/balloon.jpg',
  'games/img/bamboo.jpg',
  'games/img/banana.jpg',
  'games/img/bear.jpg',
  'games/img/bee.jpg',
  'games/img/bicycle.jpg',
  'games/img/bird.jpg',
  'games/img/bone.jpg',
  'games/img/bread.jpg',
  'games/img/bug.jpg',
  'games/img/butterfly.jpg',
  'games/img/candy.jpg',
  'games/img/car.jpg',
  'games/img/carrot.jpg',
  'games/img/cart.jpg',
  'games/img/cat.jpg',
  'games/img/caterpillar.jpg',
  'games/img/chair.jpg',
  'games/img/cheese.jpg',
  'games/img/chick.jpg',
  'games/img/cloud.jpg',
  'games/img/coat.jpg',
  'games/img/cow.jpg',
  'games/img/crab.jpg',
  'games/img/dairycow.jpg',
  'games/img/deer.jpg',
  'games/img/dog.jpg',
  'games/img/door.jpg',
  'games/img/dress.jpg',
  'games/img/duck.jpg',
  'games/img/elephant.jpg',
  'games/img/fish.jpg',
  'games/img/fishfood.jpg',
  'games/img/flower.jpg',
  'games/img/fox.jpg',
  'games/img/frog.jpg',
  'games/img/giraffe.jpg',
  'games/img/gloves.jpg',
  'games/img/goose.jpg',
  'games/img/grape.jpg',
  'games/img/grass.jpg',
  'games/img/greens.jpg',
  'games/img/hamster.jpg',
  'games/img/hat.jpg',
  'games/img/hedgehog.jpg',
  'games/img/honey.jpg',
  'games/img/horse.jpg',
  'games/img/house.jpg',
  'games/img/icecream.jpg',
  'games/img/icon-180.png',
  'games/img/icon-192.png',
  'games/img/icon-512.png',
  'games/img/idiom/bamiaozhuzhang.jpg',
  'games/img/idiom/beigongsheying.jpg',
  'games/img/idiom/chizhiyiheng.jpg',
  'games/img/idiom/duiniutanqin.jpg',
  'games/img/idiom/gezhiyici.jpg',
  'games/img/idiom/hualongdianjing.jpg',
  'games/img/idiom/huashetianzu.jpg',
  'games/img/idiom/hujiahuwei.jpg',
  'games/img/idiom/jingdizhiwa.jpg',
  'games/img/idiom/jinggongzhiniao.jpg',
  'games/img/idiom/kezhouqiujian.jpg',
  'games/img/idiom/lanyuchongshu.jpg',
  'games/img/idiom/qishangbaxia.jpg',
  'games/img/idiom/sanxineryi.jpg',
  'games/img/idiom/shoukouruping.jpg',
  'games/img/idiom/shouzhudaitu.jpg',
  'games/img/idiom/wangyangbulao.jpg',
  'games/img/idiom/weiyuchoumou.jpg',
  'games/img/idiom/xinggaocaile.jpg',
  'games/img/idiom/yanerdaoling.jpg',
  'games/img/idiom/yegonghaolong.jpg',
  'games/img/idiom/yimingjingren.jpg',
  'games/img/idiom/yugongyishan.jpg',
  'games/img/idiom/zixiangmaodun.jpg',
  'games/img/koala.jpg',
  'games/img/lamp.jpg',
  'games/img/leaves.jpg',
  'games/img/lion.jpg',
  'games/img/meat.jpg',
  'games/img/milk.jpg',
  'games/img/monkey.jpg',
  'games/img/mosquito.jpg',
  'games/img/mouse.jpg',
  'games/img/mushroom.jpg',
  'games/img/orange.jpg',
  'games/img/owl.jpg',
  'games/img/panda.jpg',
  'games/img/pants.jpg',
  'games/img/peach.jpg',
  'games/img/peanut.jpg',
  'games/img/penguin.jpg',
  'games/img/pig.jpg',
  'games/img/pinecone.jpg',
  'games/img/pinetree.jpg',
  'games/img/rabbit.jpg',
  'games/img/rainbow.jpg',
  'games/img/rice.jpg',
  'games/img/sailboat.jpg',
  'games/img/seashell.jpg',
  'games/img/sheep.jpg',
  'games/img/shirt.jpg',
  'games/img/shrimp.jpg',
  'games/img/snail.jpg',
  'games/img/soccer.jpg',
  'games/img/socks.jpg',
  'games/img/sofa.jpg',
  'games/img/squirrel.jpg',
  'games/img/strawberry.jpg',
  'games/img/sun.jpg',
  'games/img/sunflower.jpg',
  'games/img/swallow.jpg',
  'games/img/sweetpotato.jpg',
  'games/img/tiger.jpg',
  'games/img/tractor.jpg',
  'games/img/tree.jpg',
  'games/img/turtle.jpg',
  'games/img/tv.jpg',
  'games/img/umbrella.jpg',
  'games/img/watermelon.jpg',
  'games/img/waves.jpg',
  'games/img/wheat.jpg',
  'games/img/woodpecker.jpg',
  'games/junqi.html',
  'games/klondike.html',
  'games/logic-clues.html',
  'games/memory-match.html',
  'games/more-less.html',
  'games/music-pad.html',
  'games/nearby-words.html',
  'games/number-match.html',
  'games/odd-one.html',
  'games/path-connect.html',
  'games/pattern.html',
  'games/reaction.html',
  'games/rhythm.html',
  'games/riddle.html',
  'games/scene-words.html',
  'games/sequence.html',
  'games/shadow.html',
  'games/shape-insert.html',
  'games/shapes-learn.html',
  'games/shapes-panel.html',
  'games/shapes.html',
  'games/slide15.html',
  'games/sort-home.html',
  'games/steps.html',
  'games/weather.html',
  'games/xiangqi.html',
  'games/xiangxingzi.html',
  'games/yuwen-baike.html',
  'games/yuwen-data.js',
  'index.html',
  'manifest.json',
  'puzzles.js',
  'style.css',
  'sudoku-core.js',
  'sudoku-ui.js',
  'sudoku.html',
  'sw.js',
];

/* 逐条预缓存：单条失败不会让整个 install 失败 */
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
        return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (resp) {
        if (resp && resp.ok && e.request.url.indexOf(self.location.origin) === 0) {
          var clone = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, clone); });
        }
        return resp;
      }).catch(function () {
        if (e.request.mode === 'navigate') {
          return caches.match('index.html').then(function (f) {
            return f || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
          });
        }
        return Response.error();
      });
    })
  );
});
