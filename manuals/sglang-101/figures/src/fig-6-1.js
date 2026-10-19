'use strict';

const { figure } = require('../../../_shared/figkit.js');

const X0 = 200;
const STEP = 54;
const SIDE = 44;

function gpus(f, y) {
  for (let i = 0; i < 8; i += 1) {
    f.box({ x: X0 + i * STEP, y, w: SIDE, h: 26, hue: 'grey', title: `g${i}`, titleSize: 12 });
  }
}

module.exports = figure('fig-6-1', {
  height: 318,
  title: "八 GPU 的一个 TP 组，三种切分",
  desc: "g0 至 g7 八 GPU 绘成三行。tp-size 8 时，每层跨全部八卡切分；attn-dp-size 4 时，注意力层分四组各两卡：g0/g1、g2/g3、g4/g5、g6/g7，各有独立 scheduler 和 KV 缓存；ep-size 8 时，专家层用同八卡构成一组。",
}, f => {
  f.kicker(20, 18, "参数与层");
  f.kicker(X0 - 4, 18, "同样八张 GPU");

  f.text(20, 52, '--tp-size 8', { size: 12, weight: 700 });
  f.text(20, 70, "稠密层与 FFN 层", { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(X0 - 6, 30, 8 * STEP + 6, 80, { hue: 'violet' });
  gpus(f, 40);
  f.text(X0, 96, "一个 TP 组：每权重矩阵分八份", { size: 11, serif: true, hue: 'ink-soft' });

  f.text(20, 142, '--attn-dp-size 4', { size: 12, weight: 700 });
  f.text(20, 160, "注意力层", { size: 11, serif: true, hue: 'ink-soft' });
  for (let g = 0; g < 4; g += 1) {
    f.rect(X0 - 4 + g * 2 * STEP, 120, 2 * STEP - 2, 80, { hue: 'blue' });
    f.text(X0 + g * 2 * STEP + 2, 186, `分组 ${g}`, { size: 11, hue: 'blue', weight: 700 });
  }
  gpus(f, 130);
  f.text(20, 220, "各组独立 scheduler、请求与 KV 缓存", { size: 11, serif: true, hue: 'ink-soft' });

  f.text(20, 252, '--ep-size 8', { size: 12, weight: 700 });
  f.text(20, 270, "专家层", { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(X0 - 6, 236, 8 * STEP + 6, 72, { hue: 'violet' });
  gpus(f, 244);
  f.text(X0, 296, "一个专家组，等同 TP 组", { size: 11, serif: true, hue: 'ink-soft' });
});
