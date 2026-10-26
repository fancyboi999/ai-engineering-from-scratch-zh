'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const pool = load(path.join(__dirname, '../../capture/gpu/summary/l4.json')).prefix.vllm.kv_pool_tokens;
const BLOCK = 16;
const BUDGET = 2048;
const COLS = 8;
const ROWS = 5;
const REQUESTS = [
  { id: 'A', hue: 'olive', stage: 'decode', blocks: [2, 13, 31] },
  { id: 'B', hue: 'amber', stage: 'decode', blocks: [7, 8, 26, 38] },
  { id: 'C', hue: 'indigo', stage: 'prefill chunk', blocks: [17, 18, 27, 28, 35] },
];
const FREE = [5, 11, 12, 22, 29, 36, 39];

module.exports = figure('plate-vllm-request', {
  height: 676,
  title: 'L4 上的一个缓存池',
  desc: `vLLM 0.31.0 的 API server 和 EngineCore 在主机 CPU 上运行，并通过 ZMQ 通信。EngineCore 中的 Scheduler 会在 token 预算 ${BUDGET.toLocaleString('en-US')} 个 token 内安排一个步骤：请求 A 和 B 各进行一次单 token decode，请求 C 添加一个 prefill chunk。KVCacheManager 的 block table 将请求映射到不连续的 block。下方是一块 NVIDIA L4，包含 58 个 SM 的 SM array 和 24 GB GDDR6；KV cache 以网格显示，每个 block 有 ${BLOCK} 个 token：${(pool / BLOCK).toLocaleString('en-US')} 个 block 可容纳 ${pool.toLocaleString('en-US')} 个 token。图中展示 ${COLS * ROWS} 个 block，包括 A 和 B 的 block、C 的部分 block，以及空闲 block。`,
}, f => {
  const host = f.isoView({ ox: 0, oy: 150, angle: 'true' });
  const step = f.isoView({ ox: 0, oy: 326, angle: 'true' });
  const card = f.isoView({ ox: 0, oy: 520, angle: 'true' });
  const unit = (view, cx, cc, size, h, hue, options = {}) => {
    const [xc, yc] = view.at(cx, cc);
    return f.isoBlock(view, { x: xc - size / 2, y: yc - size / 2, w: size, d: size, h, hue, ...options });
  };
  const face = (part, points, hue, opacity) => f.polygon(points.map(([u, v, k]) => part.P(u, v, k)), { fill: color(hue), fillOpacity: opacity });
  const quad = (part, u0, u1, k0, k1, hue, opacity) => face(part, [[u0, part.box.d, k0], [u1, part.box.d, k0], [u1, part.box.d, k1], [u0, part.box.d, k1]], hue, opacity);
  const flat = (part, u, v, w, d, hue, opacity) => face(part, [[u, v, part.box.h], [u + w, v, part.box.h], [u + w, v + d, part.box.h], [u, v + d, part.box.h]], hue, opacity);
  const owner = index => REQUESTS.find(r => r.blocks.includes(index));

  f.kicker(20, 18, '主机 CPU · vLLM 0.31.0 进程');
  f.box({ x: 20, y: 30, w: 150, h: 52, hue: 'blue', title: "API 服务器", sub: ['HTTP、分词器'] });
  f.box({ x: 200, y: 30, w: 180, h: 66, hue: 'blue', title: 'EngineCore', sub: ['调度器', 'KVCacheManager'] });
  f.rect(410, 30, 210, 84, { hue: 'paper', stroke: color('ink-mute') });
  f.text(420, 48, 'Block 映射表', { size: 12, weight: 700 });
  REQUESTS.forEach((r, i) => f.text(420, 68 + i * 16, `${r.id} · ${r.blocks.join(', ')}${r.stage === 'decode' ? '' : '，更多'}`, { size: 11, hue: r.hue, weight: 700 }));

  f.isoBeam(host, { sx0: 14, sx1: 626, c: 50, back: 100, h: 6, hue: 'paper', inkHue: 'ink-mute', ink: 1, shadow: false });
  const api = unit(host, 95, 0, 42, 26, 'blue');
  for (const v of [9, 19, 29]) flat(api, 8, v, 26, 4, 'blue-ink', 0.55);
  const core = unit(host, 290, 0, 46, 22, 'blue');
  const sched = f.isoBlock(host, { x: core.box.x + 8, y: core.box.y + 8, z: 22, w: 30, d: 30, h: 12, hue: 'blue', shadow: false });
  for (const [u1, k] of [[24, 9], [18, 5]]) quad(sched, 5, u1, k - 2, k, 'amber-ink', 0.8);
  for (const u of [8, 20, 32]) quad(core, u, u + 7, 5, 16, 'green-ink', 0.6);
  const [tx, ty] = host.at(515, 0);
  const tray = f.isoBlock(host, { x: tx - 24, y: ty - 18, w: 48, d: 36, h: 4, hue: 'paper', inkHue: 'ink-mute', ink: 1 });
  REQUESTS.forEach((r, i) => flat(tray, 5, 5 + i * 10, 38, 6, `${r.hue}-ink`, 0.75));
  f.leader([95, 84], api.top, { hue: 'blue' });
  f.leader([260, 98], sched.top, { hue: 'blue' });
  f.leader([515, 120], tray.top, { hue: 'ink-mute' });

  f.beat(1);
  const a = api.P(42, 0, 13);
  const b = core.P(0, 46, 13);
  f.path(`M${a[0] + 2} ${a[1]} L${b[0] - 2} ${b[1]}`, { style: 'event' });
  f.text((a[0] + b[0]) / 2, a[1] - 8, 'ZMQ', { size: 11, anchor: 'middle', hue: 'indigo', knock: true });
  f.beat(2);
  const c0 = core.P(46, 0, 11);
  const t0 = tray.P(0, 36, 2);
  f.path(`M${c0[0] + 2} ${c0[1]} L${t0[0] - 2} ${c0[1]}`, { style: 'call' });
  f.text((c0[0] + t0[0]) / 2, c0[1] - 8, 'allocate_slots', { size: 11, anchor: 'middle', knock: true });

  f.beat(0);
  f.text(20, 206, 'x86_64 主机', { size: 11, serif: true, hue: 'ink-mute' });
  f.rule(20, 216, 620, 216, { dash: 'dashed' });

  f.beat(3);
  f.kicker(20, 236, '一个调度步骤');
  f.text(620, 236, `预算 ${BUDGET.toLocaleString('en-US')} 个 token`, { size: 12, weight: 700, anchor: 'end' });
  f.isoBeam(step, { sx0: 20, sx1: 620, c: 8, back: 50, h: 34, hue: 'paper', inkHue: 'ink-mute', ink: 1.2, dash: 'dashed', shadow: false });
  const parts = [[24, 34], [36, 46], [48, 616]];
  REQUESTS.forEach((r, i) => {
    f.beat(3 + i);
    f.isoBeam(step, { sx0: parts[i][0], sx1: parts[i][1], c: 4, back: 42, h: 28, hue: r.hue, shadow: false });
  });
  f.beat(3);
  f.text(20, 258, 'A decode，1 个 token', { size: 11.5, weight: 700, hue: REQUESTS[0].hue });
  f.text(186, 258, 'B decode，1 个 token', { size: 11.5, weight: 700, hue: REQUESTS[1].hue });
  f.leader([29, 262], step.P(...step.at(29, -20), 28), { hue: REQUESTS[0].hue });
  f.leader([190, 262], step.P(...step.at(41, -30), 28), { hue: REQUESTS[1].hue });
  f.beat(5);
  f.text(332, 312, `C prefill chunk，${(BUDGET - 2).toLocaleString('en-US')} 个 token`, { size: 12.5, weight: 700, hue: REQUESTS[2].hue, anchor: 'middle' });
  f.beat(3);
  f.text(20, 350, '图中放宽了 decode token 的比例。先执行 decode，再由提示词 chunk 填充剩余预算。', { size: 11, serif: true, hue: 'ink-soft' });

  f.beat(0);
  f.kicker(20, 370, 'NVIDIA L4 · GPU 内存');
  f.isoBeam(card, { sx0: 14, sx1: 626, c: 110, back: 250, h: 8, hue: 'grey' });
  const [dx, dy] = card.at(100, -15);
  const die = f.isoBlock(card, { x: dx - 38, y: dy - 38, z: 8, w: 76, d: 76, h: 10, hue: 'grey', shadow: false });
  let cells = 0;
  for (let row = 0; row < 8 && cells < 58; row += 1) {
    for (let col = 0; col < 8 && cells < 58; col += 1) {
      if ((row === 0 || row === 7) && (col === 0 || col === 7)) continue;
      flat(die, 4 + col * 9, 4 + row * 9, 7, 7, 'violet-ink', 0.7);
      cells += 1;
    }
  }
  const slab = { sx0: 200, sx1: 612, c: 96, back: 220 };
  f.isoBeam(card, { ...slab, h: 8, z: 8, hue: 'paper', inkHue: 'grey', ink: 1.2, shadow: false });
  for (let i = 1; i < 6; i += 1) {
    const sx = slab.sx0 + ((slab.sx1 - slab.sx0) * i) / 6;
    const low = card.P(...card.at(sx, slab.c), 8);
    const high = card.P(...card.at(sx, slab.c), 16);
    f.rule(low[0], low[1], high[0], high[1], { hue: 'grey', opacity: 0.8 });
  }
  const gx = slab.sx0 + 14;
  const gw = (slab.sx1 - slab.sx0 - 28) / COLS;
  const gc = slab.c - 12;
  const gd = (slab.back - 24) / ROWS;
  const cell = index => {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const sx0 = gx + col * gw + 2;
    const sx1 = gx + (col + 1) * gw - 2;
    const c0 = gc - row * gd - 3;
    const c1 = gc - (row + 1) * gd + 3;
    return [[sx0, c0], [sx1, c0], [sx1, c1], [sx0, c1]].map(([sx, c]) => card.P(...card.at(sx, c), 16));
  };
  for (let i = 0; i < COLS * ROWS; i += 1) {
    if (owner(i)) continue;
    const free = FREE.includes(i);
    f.polygon(cell(i), { fill: free ? color('paper') : color('green-fill'), stroke: free ? color('ink-mute') : color('green-ink'), strokeWidth: 0.8, dash: free ? 'dashed' : undefined });
  }
  REQUESTS.forEach((r, i) => {
    f.beat(4 + i);
    r.blocks.forEach(index => f.polygon(cell(index), { fill: color(`${r.hue}-fill`), stroke: color(`${r.hue}-ink`), strokeWidth: 1.6 }));
  });

  f.beat(0);
  f.text(20, 398, "SM 阵列", { size: 12, weight: 700, hue: 'violet' });
  f.text(20, 414, '58 个 SM，Ada 架构', { size: 11, serif: true, hue: 'ink-soft' });
  f.leader([100, 420], die.top, { hue: 'violet' });
  f.text(620, 398, `KV cache · 每块 ${BLOCK} 个 token`, { size: 12, weight: 700, hue: 'green', anchor: 'end' });
  f.text(620, 414, `${(pool / BLOCK).toLocaleString('en-US')} 个 block，共 ${pool.toLocaleString('en-US')} 个 token`, { size: 11, hue: 'green', anchor: 'end' });
  f.leader([560, 420], cell(6)[3], { hue: 'green' });
  const gddr = card.P(...card.at(240, slab.c), 12);
  f.leader([196, 606], gddr, { hue: 'ink-mute' });
  f.text(20, 610, '24 GB GDDR6，6 个显存封装', { size: 11, hue: 'ink-soft' });
  f.polygon([[330, 600], [342, 600], [342, 612], [330, 612]], { fill: color('green-fill'), stroke: color('green-ink'), strokeWidth: 0.8 });
  f.text(348, 610, '使用中', { size: 11, hue: 'ink-soft' });
  f.polygon([[420, 600], [432, 600], [432, 612], [420, 612]], { fill: color('paper'), stroke: color('ink-mute'), strokeWidth: 0.8, dash: 'dashed' });
  f.text(438, 610, `空闲 · 展示 ${(pool / BLOCK).toLocaleString('en-US')} 个中的 ${COLS * ROWS} 个`, { size: 11, hue: 'ink-soft' });
  f.text(20, 642, '并发 8 个用户时，日志显示 GPU KV cache 使用率为 77.2%，前缀缓存命中率为 87.2%。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 662, 'Block ID 仅用于展示映射。缓存池、block 大小和预算均来自我们的 L4 测试。', { size: 11, serif: true, hue: 'ink-mute' });
});
