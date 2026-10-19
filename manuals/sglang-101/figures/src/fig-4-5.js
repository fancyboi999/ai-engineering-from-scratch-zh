'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-4-5', {
  height: 330,
  title: "Kimi K2.6 的 BF16 与 FP8 KV 缓存",
  desc: "Cloudflare 报告的各并发输出 token/s 成对条形。并发 1、8、16、32 的 BF16 与 FP8 分别为 137/125、731/689、1106/1028、1558/1489。并发 64 时 BF16 缓存内存耗尽，FP8 缓存生成 2192 token/s。",
}, f => {
  f.kicker(20, 18, "各并发的输出 tok/s");
  const data = [['c=1', 137, 125], ['c=8', 731, 689], ['c=16', 1106, 1028], ['c=32', 1558, 1489], ['c=64', null, 2192]];
  const base = 270;
  const scale = 200 / 2192;
  f.rule(40, base, 620, base, { hue: 'ink-mute' });
  data.forEach(([label, bf16, fp8], index) => {
    const x = 60 + index * 112;
    if (bf16 === null) {
      f.rect(x, base - 40, 34, 40, { hue: 'rose', dash: 'dashed' });
      f.text(x + 17, base - 46, 'OOM', { size: 11, anchor: 'middle', hue: 'rose' });
    } else {
      const h = bf16 * scale;
      f.rect(x, base - h, 34, h, { hue: 'green', dash: 'dashed' });
      f.text(x + 17, base - h - 6, String(bf16), { size: 11, anchor: 'middle' });
    }
    const h2 = fp8 * scale;
    f.rect(x + 40, base - h2, 34, h2, { hue: 'green' });
    f.text(x + 57, base - h2 - 6, String(fp8), { size: 11, anchor: 'middle' });
    f.text(x + 37, base + 18, label, { size: 11, anchor: 'middle' });
  });
  f.rect(40, 300, 12, 12, { hue: 'green', dash: 'dashed' });
  f.text(58, 311, "BF16 KV 缓存", { size: 11 });
  f.rect(200, 300, 12, 12, { hue: 'green' });
  f.text(218, 311, "FP8 KV 缓存", { size: 11 });
  f.text(360, 311, 'Cloudflare, 2026-08-03', { size: 11, serif: true, hue: 'ink-soft' });
});
