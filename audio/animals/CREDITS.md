# 动物叫声来源与许可

本目录用于存放**真实动物录音**（`<slug>.mp3`，0.8~1.5 秒、单声道、64~96 kbps）。

当前状态：**暂无真实录音文件**。`index.json` 的 `files` 为空，因此三个动物页面全部使用
WebAudio 合成近似音（已在页面底部明示「合成近似音，非真实录音」）。

## 放入真实录音的方法

1. 取得 CC0 / 公共领域 / CC-BY 等可自由使用的短录音，截取 0.8~1.5 秒。
2. 按下面的 slug 命名，放入本目录：`<slug>.mp3`。
3. 在 `index.json` 的 `files` 数组里登记对应 slug，例如：
   ```json
   { "files": ["dog", "cat", "cow"] }
   ```
4. 在下方表格登记来源与许可（CC-BY 必须署名）。

## 来源登记表（待补全）

| 文件 | 动物 | 来源 URL | 作者 | 许可 | 截取区间 |
|------|------|----------|------|------|----------|
| —    | —    | —        | —    | —    | —        |

## 需要覆盖的 36 种动物 slug

dog, cat, rabbit, elephant, lion, frog, pig, cow, sheep, monkey, tiger, panda, chick,
duck, horse, mouse, bird, fish, bear, fox, koala, penguin, goose, squirrel, hedgehog,
swallow, owl, turtle, crab, bee, ant, caterpillar, snail, giraffe, hamster, woodpecker
