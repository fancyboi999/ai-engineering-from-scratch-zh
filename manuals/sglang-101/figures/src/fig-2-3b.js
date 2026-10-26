'use strict';

const { figure } = require('../../../_shared/figkit.js');

const X0 = 70;
const PER_STEP = 0.675;
const Y0 = 200;
const PER_UNIT = 228.6;
const x = step => X0 + step * PER_STEP;
const y = ratio => Y0 - ratio * PER_UNIT;

module.exports = figure('fig-2-3b', {
  height: 252,
  title: "600 个 decode 步中的新 token 比例",
  desc: "曲线从 decode 第 0 步比例 0.7 开始，线性降至第 600 步 0.098，随后持平。第 700 步回撤使其重置为 0.714，即 issue 8463 日志中的值，曲线再次下降。",
}, f => {
  f.rule(X0, Y0, 610, Y0, { hue: 'ink' });
  f.rule(X0, 30, X0, Y0, { hue: 'ink' });
  for (const step of [0, 200, 400, 600, 800]) {
    f.rule(x(step), Y0, x(step), Y0 + 5, { hue: 'ink' });
    f.text(x(step), Y0 + 18, String(step), { size: 11, hue: 'ink-soft', anchor: 'middle' });
  }
  f.kicker(X0, Y0 + 40, "decode 步数");
  f.text(X0 - 6, y(0.7) + 4, '0.7', { size: 11, hue: 'ink-soft', anchor: 'end' });
  f.text(X0 - 6, y(0.098) + 4, '0.098', { size: 11, hue: 'ink-soft', anchor: 'end' });
  f.rule(X0, y(0.098), x(600), y(0.098), { hue: 'ink-mute', dash: 'dotted' });

  const after = 0.714 - (0.7 - 0.098) / 600 * 100;
  f.path(`M${x(0)} ${y(0.7)} L${x(600)} ${y(0.098)} L${x(700)} ${y(0.098)} L${x(700)} ${y(0.714)} L${x(800)} ${y(after)}`, { style: 'state', head: false });
  f.rule(x(700), 30, x(700), Y0, { hue: 'rose', dash: 'dashed' });
  f.text(x(700), 22, '回撤', { size: 11, hue: 'rose', anchor: 'middle', weight: 700 });
  f.text(x(700) - 12, 110, "0.098 升至 0.714", { size: 11, hue: 'ink-soft', anchor: 'end' });
  f.text(x(300), y(0.4) - 8, "准入逐渐大胆", { size: 11, serif: true, hue: 'amber' });
});
