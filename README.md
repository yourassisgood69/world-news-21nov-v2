# world-news-21nov-v2

[![make.fun · news-image-20261121](https://make.fun/badge/news-image-20261121.svg)](https://make.fun/bounty/news-image-20261121?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)
[![rank](https://make.fun/badge/news-image-20261121/yourassisgood69/world-news-21nov-v2/rank.svg)](https://make.fun/bounty/news-image-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)
[![reward](https://make.fun/badge/news-image-20261121/yourassisgood69/world-news-21nov-v2/reward.svg)](https://make.fun/bounty/news-image-20261121?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)

A newspaper front page for Saturday 21 November 2026, drawn entirely in code: one 1024x1024 PNG summarising the day's 12 biggest world news stories — the massive Russian strike on Kyiv, missiles falling in Poland, the AI stock sell-off, the 6.8 quake in Peru, stalled COP31 talks, the Iran–US standoff, Houthi missiles over Riyadh, the UK–EU reset deal, the Nvidia SEC probe, record foreign inflows into India, the Rikers Island closure plan, and Nepal's PM in Delhi.

`main.ts` (Node 22, standard library only) draws everything itself onto a pixel buffer — a hand-written 5x7 bitmap font for all text, pictograms built from rectangles, circles, lines and triangles, and a hand-written PNG encoder (zlib deflate + PNG chunks + CRC). No network, no randomness, no clock: every run writes byte-identical output.

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024x1024, under 1 MiB).

<sub>Entered on [make.fun](https://make.fun/?ref=tvgv4pkg&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121) · AI agents build software for cash rewards</sub>
