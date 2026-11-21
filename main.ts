// THE WORLD TODAY — Saturday 21 November 2026
// One 1024x1024 PNG summarising 12 world news stories, drawn entirely
// from geometric shapes onto a pixel buffer, with a hand-written 5x7
// bitmap font and a hand-written PNG encoder (Node stdlib zlib only).
// No network, no randomness, no clock: two runs produce identical bytes.

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const PAPER: RGB = [247, 243, 232];
const INK: RGB = [17, 17, 17];
const MUTED: RGB = [90, 86, 76];
const RULE: RGB = [180, 172, 152];
const RED: RGB = [178, 34, 34];
const BLUE: RGB = [31, 78, 121];
const GREEN: RGB = [32, 112, 74];
const AMBER: RGB = [196, 124, 16];
const TEAL: RGB = [18, 110, 110];
const PURPLE: RGB = [96, 58, 130];

type RGB = [number, number, number];

// ---------------------------------------------------------------- buffer
const px = new Uint8Array(W * H * 3);
function fill(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}
function set(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c);
}
function hline(x0: number, x1: number, y: number, c: RGB, t = 1): void {
  for (let t2 = 0; t2 < t; t2++) for (let x = x0; x <= x1; x++) set(x, y + t2, c);
}
function vline(x: number, y0: number, y1: number, c: RGB, t = 1): void {
  for (let t2 = 0; t2 < t; t2++) for (let y = y0; y <= y1; y++) set(x + t2, y, c);
}
function line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) set(x + a, y + b, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}
function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) set(cx + x, cy + y, c);
    }
  }
}
function ring(cx: number, cy: number, r: number, c: RGB, t = 3): void {
  for (let a = 0; a < 360; a++) {
    const rad = (a * Math.PI) / 180;
    for (let k = 0; k < t; k++) {
      set(Math.round(cx + (r - k) * Math.cos(rad)), Math.round(cy + (r - k) * Math.sin(rad)), c);
    }
  }
}
function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const minX = Math.min(x0, x1, x2);
  const maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2);
  const maxY = Math.max(y0, y1, y2);
  const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
      const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
      const g = 1 - a - b;
      if ((a >= 0 && b >= 0 && g >= 0) || (a <= 0 && b <= 0 && g <= 0)) set(x, y, c);
    }
  }
}
function arc(cx: number, cy: number, r: number, a0: number, a1: number, c: RGB, t = 4): void {
  for (let a = a0; a <= a1; a += 2) {
    const rad = (a * Math.PI) / 180;
    for (let k = 0; k < t; k++) {
      set(Math.round(cx + (r - k) * Math.cos(rad)), Math.round(cy + (r - k) * Math.sin(rad)), c);
    }
  }
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows, each row 5 bits (bit 4 = leftmost column).
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0],
  "-": [0, 0, 0, 0x1f, 0, 0, 0],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "%": [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  "$": [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  "*": [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0],
};

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale; // 5px glyph + 1px gap, per char
}
function drawChar(ch: string, x: number, y: number, scale: number, c: RGB): void {
  const g = FONT[ch] ?? FONT[" "];
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if ((g[r] >> (4 - col)) & 1) {
        rect(x + col * scale, y + r * scale, scale, scale, c);
      }
    }
  }
}
function drawText(s: string, x: number, y: number, scale: number, c: RGB): void {
  for (let i = 0; i < s.length; i++) {
    drawChar(s[i], x + i * 6 * scale, y, scale, c);
  }
}
function drawTextCentered(s: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}
// Wrap a headline into lines that fit maxW, at the given scale.
function wrap(s: string, scale: number, maxW: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? cur + " " + w : w;
    if (textWidth(cand, scale) <= maxW) {
      cur = cand;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------- pictograms
// Each draws inside a ~110x84 box centred at (cx, cy). Accent colour given.
function burst(cx: number, cy: number, r: number, c: RGB): void {
  for (let a = 0; a < 8; a++) {
    const ang = (a * Math.PI) / 4;
    const x1 = Math.round(cx + r * Math.cos(ang));
    const y1 = Math.round(cy + r * Math.sin(ang));
    const x2 = Math.round(cx + (r * 0.45) * Math.cos(ang + 0.4));
    const y2 = Math.round(cy + (r * 0.45) * Math.sin(ang + 0.4));
    tri(cx, cy, x1, y1, x2, y2, c);
  }
  disc(cx, cy, Math.round(r * 0.35), c);
}
function missile(cx: number, cy: number, len: number, c: RGB): void {
  // diagonal rocket body, nose top-right
  line(cx - len, cy + len, cx + len, cy - len, c, 7);
  tri(cx + len, cy - len, cx + len - 14, cy - len + 2, cx + len - 2, cy - len + 14, c);
  line(cx - len, cy + len, cx - len - 10, cy + len + 12, AMBER, 4);
  line(cx - len, cy + len, cx - len - 14, cy + len + 2, AMBER, 4);
}
function chartDown(cx: number, cy: number, c: RGB): void {
  vline(cx - 52, cy - 34, cy + 34, INK, 4);
  hline(cx - 52, cx + 52, cy + 34, INK, 4);
  line(cx - 44, cy - 26, cx - 16, cy - 8, c, 5);
  line(cx - 16, cy - 8, cx + 8, cy - 16, c, 5);
  line(cx + 8, cy - 16, cx + 44, cy + 26, c, 5);
  tri(cx + 44, cy + 26, cx + 30, cy + 26, cx + 44, cy + 12, c);
}
function chartUp(cx: number, cy: number, c: RGB): void {
  vline(cx - 52, cy - 34, cy + 34, INK, 4);
  hline(cx - 52, cx + 52, cy + 34, INK, 4);
  line(cx - 44, cy + 26, cx - 16, cy + 6, c, 5);
  line(cx - 16, cy + 6, cx + 8, cy + 14, c, 5);
  line(cx + 8, cy + 14, cx + 44, cy - 28, c, 5);
  tri(cx + 44, cy - 28, cx + 30, cy - 28, cx + 44, cy - 14, c);
}
function building(cx: number, cy: number, w: number, h: number, c: RGB): void {
  rect(cx - w / 2, cy - h / 2, w, h, c);
  for (let r = 0; r < 3; r++) {
    for (let k = 0; k < 2; k++) {
      rect(cx - w / 2 + 7 + k * 14, cy - h / 2 + 8 + r * 14, 6, 6, PAPER);
    }
  }
}
function globe(cx: number, cy: number, r: number, c: RGB): void {
  ring(cx, cy, r, c, 4);
  hline(cx - r, cx + r, cy, c, 3);
  vline(cx, cy - r, cy + r, c, 3);
  arc(cx, cy, Math.round(r * 0.55), 200, 340, c, 3);
  arc(cx, cy, Math.round(r * 0.55), 20, 160, c, 3);
}
function ship(cx: number, cy: number, c: RGB): void {
  rect(cx - 30, cy - 18, 60, 16, c);
  tri(cx - 38, cy - 2, cx + 38, cy - 2, cx + 28, cy + 16, c);
  rect(cx - 4, cy - 40, 8, 24, INK);
  tri(cx + 4, cy - 40, cx + 26, cy - 32, cx + 4, cy - 24, RED);
  for (let k = 0; k < 3; k++) {
    arc(cx - 34 + k * 30, cy + 26, 12, 200, 340, BLUE, 3);
  }
}
function chip(cx: number, cy: number, c: RGB): void {
  rect(cx - 26, cy - 26, 52, 52, c);
  rect(cx - 12, cy - 12, 24, 24, PAPER);
  rect(cx - 5, cy - 5, 10, 10, RED);
  for (let k = -1; k <= 1; k++) {
    hline(cx - 38, cx - 26, cy + k * 16, INK, 3);
    hline(cx + 26, cx + 38, cy + k * 16, INK, 3);
    vline(cx + k * 16, cy - 38, cy - 26, INK, 3);
    vline(cx + k * 16, cy + 26, cy + 38, INK, 3);
  }
}
function bars(cx: number, cy: number, c: RGB): void {
  for (let k = 0; k < 5; k++) {
    rect(cx - 50 + k * 22, cy - 34, 12, 68, c);
  }
  rect(cx - 50, cy - 34, 12, 68, INK);
  disc(cx + 44, cy - 40, 12, AMBER);
  rect(cx + 38, cy - 34, 12, 8, INK);
}
function flag(cx: number, cy: number, c: RGB): void {
  vline(cx - 30, cy - 42, cy + 42, INK, 4);
  rect(cx - 26, cy - 42, 56, 34, c);
  hline(cx - 26, cx + 30, cy - 25, PAPER, 6);
  disc(cx + 2, cy - 25, 7, PAPER);
}

type Story = {
  head: string;
  label: string;
  accent: RGB;
  draw: (cx: number, cy: number) => void;
};

const STORIES: Story[] = [
  {
    head: "RUSSIA'S BIGGEST STRIKE",
    label: "UKRAINE WAR",
    accent: RED,
    draw: (cx, cy) => {
      burst(cx - 18, cy - 6, 30, RED);
      missile(cx + 22, cy + 8, 16, INK);
      building(cx - 46, cy + 30, 22, 26, MUTED);
      building(cx + 46, cy + 32, 18, 22, MUTED);
    },
  },
  {
    head: "MISSILES FALL IN POLAND",
    label: "POLAND / NATO",
    accent: RED,
    draw: (cx, cy) => {
      // shield outline + falling missile
      arc(cx, cy - 8, 34, 0, 180, BLUE, 5);
      vline(cx - 34, cy - 8, cy + 18, BLUE, 5);
      vline(cx + 34, cy - 8, cy + 18, BLUE, 5);
      line(cx - 34, cy + 18, cx, cy + 38, BLUE, 5);
      line(cx + 34, cy + 18, cx, cy + 38, BLUE, 5);
      missile(cx + 4, cy - 2, 12, RED);
      burst(cx - 22, cy + 26, 12, AMBER);
    },
  },
  {
    head: "AI STOCKS PLUNGE",
    label: "US MARKETS",
    accent: RED,
    draw: (cx, cy) => chartDown(cx, cy, RED),
  },
  {
    head: "QUAKE ROCKS PERU",
    label: "PERU 6.8",
    accent: AMBER,
    draw: (cx, cy) => {
      building(cx - 34, cy - 4, 26, 44, INK);
      building(cx + 30, cy + 2, 24, 38, MUTED);
      line(cx - 52, cy + 36, cx - 20, cy + 26, AMBER, 5);
      line(cx - 20, cy + 26, cx + 4, cy + 38, AMBER, 5);
      line(cx + 4, cy + 38, cx + 34, cy + 28, AMBER, 5);
      line(cx + 34, cy + 28, cx + 52, cy + 36, AMBER, 5);
      disc(cx, cy - 34, 6, RED);
      disc(cx - 14, cy - 28, 4, RED);
      disc(cx + 14, cy - 28, 4, RED);
    },
  },
  {
    head: "CLIMATE TALKS STALL",
    label: "COP31 / TURKIYE",
    accent: GREEN,
    draw: (cx, cy) => {
      globe(cx - 8, cy, 32, GREEN);
      // stalled clock: circle + hands stuck
      ring(cx + 34, cy + 22, 16, INK, 4);
      line(cx + 34, cy + 22, cx + 34, cy + 10, INK, 3);
      line(cx + 34, cy + 22, cx + 44, cy + 22, INK, 3);
    },
  },
  {
    head: "IRAN-US STANDOFF",
    label: "HORMUZ / DIPLOMACY",
    accent: TEAL,
    draw: (cx, cy) => ship(cx, cy, TEAL),
  },
  {
    head: "MISSILES OVER RIYADH",
    label: "YEMEN / SAUDI",
    accent: RED,
    draw: (cx, cy) => {
      // interception dome over a skyline
      arc(cx, cy + 30, 52, 180, 360, BLUE, 5);
      building(cx - 44, cy + 18, 18, 26, INK);
      building(cx - 16, cy + 8, 20, 36, MUTED);
      building(cx + 12, cy + 14, 18, 30, INK);
      building(cx + 36, cy + 22, 16, 22, MUTED);
      burst(cx - 20, cy - 26, 14, AMBER);
      burst(cx + 24, cy - 32, 12, RED);
      line(cx - 30, cy - 18, cx + 34, cy - 34, RED, 4);
    },
  },
  {
    head: "UK-EU RESET DEAL",
    label: "BREXIT / BRUSSELS",
    accent: BLUE,
    draw: (cx, cy) => {
      // bridge arch + circle of stars
      arc(cx, cy + 34, 46, 180, 360, BLUE, 6);
      vline(cx - 46, cy + 20, cy + 34, BLUE, 5);
      vline(cx + 46, cy + 20, cy + 34, BLUE, 5);
      hline(cx - 52, cx + 52, cy + 34, BLUE, 5);
      for (let a = 0; a < 8; a++) {
        const ang = (a * Math.PI) / 4;
        disc(Math.round(cx + 26 * Math.cos(ang)), Math.round(cy - 16 + 26 * Math.sin(ang)), 3, AMBER);
      }
    },
  },
  {
    head: "NVIDIA UNDER PROBE",
    label: "SEC / CHIPS",
    accent: GREEN,
    draw: (cx, cy) => {
      chip(cx - 14, cy, GREEN);
      ring(cx + 32, cy + 24, 16, INK, 4);
      line(cx + 32, cy + 24, cx + 46, cy + 38, INK, 4);
    },
  },
  {
    head: "RECORD INDIA INFLOWS",
    label: "INDIA MARKETS",
    accent: GREEN,
    draw: (cx, cy) => {
      chartUp(cx - 8, cy, GREEN);
      disc(cx + 44, cy - 28, 16, AMBER);
      drawText("$", cx + 44 - 9, cy - 28 - 10, 3, INK);
    },
  },
  {
    head: "RIKERS TO CLOSE",
    label: "NEW YORK 2032",
    accent: PURPLE,
    draw: (cx, cy) => bars(cx, cy, PURPLE),
  },
  {
    head: "NEPAL PM IN DELHI",
    label: "NEPAL / CRICKET",
    accent: BLUE,
    draw: (cx, cy) => {
      flag(cx - 14, cy - 4, RED);
      // cricket bat + ball
      line(cx + 30, cy - 34, cx + 44, cy + 30, INK, 8);
      rect(cx + 26, cy - 40, 10, 12, INK);
      disc(cx + 48, cy + 34, 9, RED);
    },
  },
];

// ---------------------------------------------------------------- layout
fill(PAPER);

// outer frame
rect(0, 0, W, 10, INK);
rect(0, H - 10, W, 10, INK);
rect(0, 0, 10, H, INK);
rect(W - 10, 0, 10, H, INK);

// masthead
const MAST_TOP = 26;
drawTextCentered("THE WORLD TODAY", W / 2, MAST_TOP, 6, INK);
drawTextCentered("SATURDAY 21 NOVEMBER 2026", W / 2, MAST_TOP + 52, 3, RED);
hline(28, W - 28, MAST_TOP + 88, INK, 4);
hline(28, W - 28, MAST_TOP + 98, INK, 2);

// grid: 3 cols x 4 rows below masthead
const GRID_TOP = 150;
const GRID_H = H - GRID_TOP - 10;
const ROW_H = Math.floor(GRID_H / 4);
const COL_W = [341, 342, 341];
const COL_X = [10, 351, 693];

for (let i = 0; i < 12; i++) {
  const r = Math.floor(i / 3);
  const c = i % 3;
  const x0 = COL_X[c];
  const y0 = GRID_TOP + r * ROW_H;
  const w = COL_W[c];
  const h = ROW_H;
  const s = STORIES[i];

  // cell frame
  rect(x0, y0, w, 3, INK);
  if (r === 3) rect(x0, y0 + h - 3, w, 3, INK);
  if (c < 2) rect(x0 + w - 2, y0, 2, h, RULE);
  if (r < 3) rect(x0, y0 + h - 2, w, 2, RULE);

  // accent number chip
  rect(x0 + 12, y0 + 10, 34, 24, s.accent);
  drawText(String(i + 1).padStart(2, "0"), x0 + 12 + 17 - Math.floor(textWidth(String(i + 1).padStart(2, "0"), 2) / 2), y0 + 15, 2, PAPER);

  // pictogram
  const cx = x0 + Math.floor(w / 2); // integer: fractional x silently writes nothing into the pixel buffer
  const cy = y0 + 66;
  s.draw(cx, cy);

  // headline, wrapped, scale 3
  const lines = wrap(s.head, 3, w - 44); // keep clear of the outer frame
  let ty = y0 + 122;
  for (const ln of lines) {
    drawTextCentered(ln, cx, ty, 3, INK);
    ty += 24;
  }
  // label under headline
  drawTextCentered(s.label, cx, y0 + h - 30, 2, s.accent);
}

// ---------------------------------------------------------------- PNG encode
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 3)] = 0; // filter: none
  raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // colour type RGB
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.png"), png);
console.log(`wrote ${join(outDir, "entry.png")} ${png.length} bytes ${W}x${H}`);
