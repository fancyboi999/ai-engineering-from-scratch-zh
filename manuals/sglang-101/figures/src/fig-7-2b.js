'use strict';

const { figure } = require('../../../_shared/figkit.js');

const phases = ['生成', '释放', '训练', '载入', '更新', "载入 KV"];
const tracks = [
  ["SGLang 权重", 'violet', [1, 0, 0, 1, 1, 1]],
  ["SGLang KV 缓存", 'green', [1, 0, 0, 0, 0, 1]],
  ['CUDA graphs', 'violet', [1, 0, 0, 0, 0, 1]],
  ['训练器', 'grey', [0, 0, 1, 0, 0, 0]],
];
const left = 140;
const cell = 80;

module.exports = figure('fig-7-2b', {
  height: 300,
  title: "同卡 RL 一步中的 GPU 内存",
  desc: "共享 GPU 上 Miles 一步的六阶段。生成时 SGLang 持有权重、KV 缓存、CUDA graphs，随后释放三者，训练器独占运行。之后 SGLang 取回权重、接收新权重，最后取回 KV 缓存与 CUDA graphs。",
}, f => {
  phases.forEach((name, index) => {
    f.kicker(left + index * cell + cell / 2, 22, name, { anchor: 'middle' });
  });
  tracks.forEach(([name, hue, resident], row) => {
    const y = 40 + row * 46;
    f.text(20, y + 22, name, { size: 11.5 });
    resident.forEach((present, index) => {
      const x = left + index * cell + 4;
      if (present) f.rect(x, y, cell - 8, 32, { hue });
      else f.rect(x, y, cell - 8, 32, { stroke: 'none', fill: 'none' });
    });
    f.rule(left, y + 38, left + phases.length * cell, y + 38, { opacity: 0.4 });
  });
  f.arrow([left + cell + 4, 236], [left + cell * 2 - 4, 236], { style: 'state' });
  f.text(left + cell + 40, 258, 'POST /release_memory_occupation', { size: 11, anchor: 'middle', hue: 'amber' });
  f.text(left + cell * 4 + 40, 236, 'POST /update_weights_from_tensor', { size: 11, anchor: 'middle', hue: 'ink' });
  f.text(20, 286, "实格：内存驻留 GPU · 空格：已释放或卸载", { size: 11, serif: true, hue: 'ink-soft' });
});
