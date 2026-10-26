'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-5-1b', {
  height: 268,
  title: "基准报告各行如何计算",
  desc: "基准报告的五行，各附 calculate_metrics 所用公式，以及并发上限 8 的运行值：Concurrency 7.96、Peak concurrent requests 16、TTFT 中位数 785.79 ms、TPOT 中位数 22.52 ms、ITL 中位数 20.35 ms。",
}, f => {
  f.kicker(20, 18, "报告行");
  f.kicker(232, 18, "计算方式");
  f.kicker(515, 18, "上限为 8");
  const rows = [
    ['并发数', "E2E 延迟总和 / 时长", '7.96'],
    ["峰值并发请求", "一秒内最多活跃请求", '16'],
    ['TTFT', "发送至首流式块", '785.79 ms'],
    ['TPOT', '(latency - TTFT) / (tokens - 1)', '22.52 ms'],
    ['ITL', "汇总两输出块间的每个间隔", '20.35 ms'],
  ];
  rows.forEach(([line, formula, value], index) => {
    const y = 32 + index * 46;
    f.box({ x: 20, y, w: 200, h: 34, hue: 'olive', title: line, titleSize: 12 });
    f.text(232, y + 22, formula, { size: 11.5, serif: true, hue: 'ink-soft' });
    f.text(515, y + 22, value, { size: 11.5 });
  });
  f.text(20, 262, "TTFT、TPOT、ITL 使用中位数。", { size: 11, serif: true, hue: 'ink-soft' });
});
