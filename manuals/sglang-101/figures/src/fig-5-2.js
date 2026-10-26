'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-5-2', {
  height: 196,
  title: "同一服务器，两种缓存命中率",
  desc: "左侧 cache_hit_rate gauge 每个日志间隔被覆盖，最近 prefill 间隔读数 0.942。右侧 device_hit counter 为 182,079 token、input counter 为 104,057，因此全程比例为 182,079 除以 286,136，即 0.636。",
}, f => {
  f.kicker(20, 18, "A · 瞬时值（Gauge）");
  f.kicker(340, 18, "B · 累计计数（Counter）");
  f.rule(320, 8, 320, 188, { dash: 'dashed' });
  f.box({ x: 20, y: 32, w: 280, h: 52, hue: 'blue', title: 'sglang:cache_hit_rate', sub: ["Gauge，每个日志间隔覆盖"] });
  f.text(160, 128, '0.942', { size: 22, anchor: 'middle', hue: 'green', weight: 700 });
  f.text(160, 152, "仅上一 prefill 间隔", { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.box({ x: 340, y: 32, w: 130, h: 52, hue: 'green', title: 'device_hit', sub: ["182,079 token"] });
  f.box({ x: 490, y: 32, w: 130, h: 52, hue: 'plum', title: "输入", sub: ["104,057 token"] });
  f.rule(405, 84, 405, 110, { hue: 'ink' });
  f.rule(555, 84, 555, 110, { hue: 'ink' });
  f.box({ x: 340, y: 110, w: 280, h: 52, hue: 'grey', title: '182,079 / 286,136 = 0.636', sub: ["启动以来全部 prefill"] });
});
