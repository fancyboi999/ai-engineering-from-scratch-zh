'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('plate-sglang-request', {
  height: 420,
  title: "一个请求，三个进程，一个缓存",
  desc: "2,999-token prompt 的聊天请求经过 tokenizer manager、scheduler 与 detokenizer。Scheduler 从基数缓存找到 2,998 token，只 prefill 一个，34.0 ms 收到首 token。下方是同一 system prompt 的三个版本：保持不变、开头加请求 ID、末尾加 ID，并列缓存 token 与首 token 时间中位数。",
}, f => {
  f.kicker(20, 18, "一个请求 · 稳定 system prompt 第 3 轮");
  const client = f.box({ x: 20, y: 34, w: 100, h: 56, hue: 'olive', title: "客户端", sub: ["2,999 token"] });
  const tok = f.box({ x: 140, y: 34, w: 160, h: 56, hue: 'blue', title: 'TokenizerManager', sub: ["文本转 ID"] });
  const sched = f.box({ x: 320, y: 34, w: 140, h: 56, hue: 'blue', title: 'Scheduler', sub: ['match_prefix'] });
  const detok = f.box({ x: 480, y: 34, w: 140, h: 56, hue: 'blue', title: 'Detokenizer', sub: ["ID 转文本"] });
  f.beat(1);
  f.arrow([client.x + 100, 62], [tok.x - 1, 62], { style: 'call' });
  f.beat(2);
  f.arrow([tok.x + 160, 62], [sched.x - 1, 62], { style: 'event' });
  f.beat(3);
  f.arrow([sched.x + 140, 62], [detok.x - 1, 62], { style: 'event' });

  f.beat(4);

  f.kicker(20, 124, "基数缓存视角的 prompt");
  f.rect(20, 134, 590, 30, { hue: 'green' });
  f.text(30, 154, "2,998 缓存 token · system prompt 与聊天模板", { size: 12, weight: 700, hue: 'green' });
  f.beat(5);
  f.rect(610, 134, 10, 30, { hue: 'plum' });
  f.text(620, 184, "1 个新 token", { size: 11, anchor: 'end', hue: 'plum' });
  f.text(20, 184, "34.0 ms 后首 token", { size: 12, weight: 700, hue: 'plum' });

  f.beat(0);
  f.kicker(20, 226, "同一 system prompt 的三种形式 · 第 2 至 5 或 1 至 5 轮中位数");
  const rows = [
    { hue: 'green', title: "保持不变", cached: "2,999 中缓存 2,998", ttft: '45.1 ms' },
    { hue: 'rose', title: "请求 ID 在开头", cached: "3,034 中缓存 5", ttft: '1,255.3 ms' },
    { hue: 'green', title: "请求 ID 在末尾", cached: "3,028 中缓存 2,985", ttft: '88.2 ms' },
  ];
  rows.forEach((row, index) => {
    const y = 238 + index * 56;
    f.beat(6 + index);
    f.box({ x: 20, y, w: 260, h: 44, hue: row.hue, title: row.title, align: 'left' });
    f.text(300, y + 27, row.cached, { size: 12, serif: true, hue: 'ink-soft' });
    f.text(620, y + 27, row.ttft, { size: 13, weight: 700, anchor: 'end', hue: row.hue === 'rose' ? 'rose' : 'plum' });
  });
  f.beat(0);
  f.text(20, 412, "来源：capture/out/cache-experiment.txt · SGLang 0.5.22 / MLX · Qwen3-0.6B-4bit", { size: 11, serif: true, hue: 'ink-mute' });
});
