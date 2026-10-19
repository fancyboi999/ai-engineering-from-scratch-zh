'use strict';

const { figure } = require('../../../_shared/figkit.js');

const rows = [
  { metric: "基准时长", on: 48.81, off: 129.68, unit: 's', max: 140 },
  { metric: "首 token 时间中位数", on: 1358, off: 7222, unit: 'ms', max: 8000 },
  { metric: "每秒输出 token", on: 83.91, off: 31.59, unit: 'tok/s', max: 100 },
];

module.exports = figure('fig-3-3', {
  height: 300,
  title: "同一基准，两种缓存设置",
  desc: "捕获 Mac 共享前缀基准的三对条形，比较开启基数缓存与 --disable-radix-cache。时长 48.81 对 129.68 s，TTFT 中位数 1,358 对 7,222 ms，输出吞吐量 83.91 对 31.59 token/s。",
}, f => {
  f.rect(20, 16, 14, 12, { hue: 'green' });
  f.text(40, 26, "基数缓存开启", { size: 11.5 });
  f.rect(170, 16, 14, 12, { hue: 'rose', dash: 'dashed' });
  f.text(190, 26, '--disable-radix-cache', { size: 11.5 });
  rows.forEach((row, index) => {
    const y = 52 + index * 84;
    f.kicker(20, y, row.metric);
    const scale = 420 / row.max;
    const onWidth = row.on * scale;
    const offWidth = row.off * scale;
    f.rect(20, y + 8, onWidth, 22, { hue: 'green' });
    f.text(28 + onWidth, y + 24, `${row.on.toLocaleString('en-US')} ${row.unit}`, { size: 11.5 });
    f.rect(20, y + 36, offWidth, 22, { hue: 'rose', dash: 'dashed' });
    f.text(28 + offWidth, y + 52, `${row.off.toLocaleString('en-US')} ${row.unit}`, { size: 11.5 });
  });
  f.text(20, 292, "64 prompt · 4 组各 16 · 共享 system prompt 2,048 token · 最大并发 8", { size: 11, serif: true, hue: 'ink-soft' });
});
