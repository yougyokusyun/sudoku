单词配图目录（可选照片，按需替换）
=====================================

1. 文件命名 = 单词 slug（全部小写，空格/连字符统一成半角 -）：
   apple.webp / ice-cream.webp / icecream.webp（两种写法都识别）
   对应词表 225 个单词，slug 见 img/words/index.json 的键。

2. 建议规格：
   - 尺寸 512 × 512（正方形，页面按 1:1 裁切显示）
   - 格式 webp，质量 75；单张 ≤ 40 KB
   - 无透明背景更佳（页面用浅色底）

3. 放好照片后，运行仓库脚本重新生成 index.json：
   node D:\xnly-work\gen-word-index.js
   （脚本会优先使用 img/words/<slug>.webp，其次复用 games/img 中已有的本地照片）

4. 未放照片的词自动使用页面内置的扁平矢量插画兜底；
   照片加载失败也会自动回退插画，不会出现破图。

5. 体积策略：照片不进入 Service Worker 预缓存（PRECACHE），
   走运行时缓存；index.json 会预缓存。
   当前没有真实照片，等用户提供后按上述步骤替换即可，无需改代码。
