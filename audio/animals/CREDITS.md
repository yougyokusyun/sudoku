# 动物叫声来源与许可

本目录存放**真实动物录音** `<slug>.mp3`：单声道、44.1 kHz、MP3 40 kbps、已裁掉首尾静音、时长 0.5~3 秒、单条 ≤ 40 KB。

## A 档：可随包分发（已进公开仓库与离线包）

| # | 文件 | 动物 | 站点条目 | 来源页面 | 作者 | 许可 | 字节 | 时长 | 抓取日期 | 处理 |
|---|------|------|----------|----------|------|------|------|------|----------|------|
| 1 | `dog.mp3` | 狗 | Dog | https://mixkit.co/free-sound-effects/dog/ | Mixkit | Mixkit License（免署名，可用于商业项目） | 5094 | 1.02s | 2026-11-05 | 裁首尾静音 + 截断至 ≤2.4s + 转单声道 44.1kHz 40kbps MP3 |
| 2 | `cat.mp3` | 猫 | Cat | https://mixkit.co/free-sound-effects/cat/ | Mixkit | Mixkit License（免署名，可用于商业项目） | 3004 | 0.6s | 2026-11-05 | 裁首尾静音 + 截断至 ≤2.4s + 转单声道 44.1kHz 40kbps MP3 |
| 3 | `cow.mp3` | 奶牛 | Cow | https://mixkit.co/free-sound-effects/cow/ | Mixkit | Mixkit License（免署名，可用于商业项目） | 8751 | 1.75s | 2026-11-05 | 裁首尾静音 + 截断至 ≤2.4s + 转单声道 44.1kHz 40kbps MP3 |
| 4 | `horse.mp3` | 马 | Horse | https://mixkit.co/free-sound-effects/horse/ | Mixkit | Mixkit License（免署名，可用于商业项目） | 8490 | 1.7s | 2026-11-05 | 裁首尾静音 + 截断至 ≤2.4s + 转单声道 44.1kHz 40kbps MP3 |
| 5 | `monkey.mp3` | 猴子 | Monkey | https://mixkit.co/free-sound-effects/monkey/ | Mixkit | Mixkit License（免署名，可用于商业项目） | 8490 | 1.7s | 2026-11-05 | 裁首尾静音 + 截断至 ≤2.4s + 转单声道 44.1kHz 40kbps MP3 |
| 6 | `bird.mp3` | 小鸟 | Bird | https://mixkit.co/free-sound-effects/bird/ | Mixkit | Mixkit License（免署名，可用于商业项目） | 12147 | 2.43s | 2026-11-05 | 裁首尾静音 + 截断至 ≤2.4s + 转单声道 44.1kHz 40kbps MP3 |

A 档合计：6 条，45976 字节。Mixkit License 要求：可免费用於商业/非商业项目、无需署名；不得把音效本身作为独立素材再次分发或转售。本项目为随应用分发的用法。

## B 档：仅个人使用（未上传公开仓库）

本批次 **0 条**：爱给网（403）、光厂（反爬页）、Sonilo（需登录）均未取得可合规随包分发的素材，因此没有 B 档文件，也没有新增 `personal/` 目录。

## 未取得真实录音、仍用合成音的 slug（30 种）

sheep, panda, lion, tiger, bear, elephant, frog, chick, swallow, woodpecker, duck, goose, owl, pig, hamster, mouse, rabbit, squirrel, bee, crab, ant, caterpillar, snail, fish, turtle, fox, koala, penguin, hedgehog, giraffe

## 复现方法

1. 取 Mixkit 对应条目页 → 下载 `-preview.mp3`。
2. `ffmpeg -i src.mp3 -af "silenceremove=start_periods=1:start_duration=0.05:start_threshold=-40dB,areverse,silenceremove=...,areverse" -t 2.4 -ac 1 -ar 44100 -codec:a libmp3lame -b:a 40k -id3v2_version 0 -write_xing 0 <slug>.mp3`。
3. 在本文件与 `index.json` 登记。
