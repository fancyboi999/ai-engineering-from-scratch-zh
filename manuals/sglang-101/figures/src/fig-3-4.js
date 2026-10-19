'use strict';

const { figure } = require('../../../_shared/figkit.js');

const WIDTH = 440;

module.exports = figure('fig-3-4', {
  height: 300,
  title: "相同 token，三种顺序",
  desc: "约 3,000-token prompt 的三条 token 带。稳定 prompt 复用 2,998、计算 1，TTFT 中位数 45 ms。随机 ID 在开头时只复用 5、计算约 3,029，耗时 1,255 ms。同样 ID 在末尾则复用 2,985、计算约 45，耗时 88 ms。",
}, f => {
  f.rect(20, 14, 14, 12, { hue: 'green' });
  f.text(40, 24, "基数缓存复用", { size: 11.5 });
  f.rect(260, 14, 14, 12, { hue: 'plum' });
  f.text(280, 24, "重新 prefill", { size: 11.5 });
  const rows = [
    { name: "稳定 system prompt", cached: 2998, total: 2999, ttft: '45 ms' },
    { name: "随机 ID 在开头", cached: 5, total: 3034, ttft: '1,255 ms' },
    { name: "随机 ID 在末尾", cached: 2985, total: 3028, ttft: '88 ms' },
  ];
  rows.forEach((row, index) => {
    const y = 56 + index * 76;
    f.kicker(20, y, row.name);
    const cachedWidth = Math.max(3, (row.cached / row.total) * WIDTH);
    const newWidth = Math.max(3, WIDTH - cachedWidth);
    f.rect(20, y + 10, cachedWidth, 30, { hue: 'green' });
    f.rect(20 + cachedWidth, y + 10, newWidth, 30, { hue: 'plum' });
    f.text(474, y + 22, `${row.cached.toLocaleString('en-US')} 已缓存`, { size: 11.5 });
    f.text(474, y + 38, `TTFT 中位数 ${row.ttft}`, { size: 11.5, serif: true, hue: 'ink-soft' });
  });
  f.text(20, 282, "首次不同之后的每个 token 都属于树的新分支。", { size: 11.5, serif: true, hue: 'ink-soft' });
});
