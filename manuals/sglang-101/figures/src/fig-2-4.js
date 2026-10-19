'use strict';

const { figure } = require('../../../_shared/figkit.js');

function lane(f, y, label) {
  f.kicker(20, y + 15, label);
}

function step(f, x, y, n) {
  f.rect(x, y, 100, 22, { hue: 'plum' });
  f.text(x + 50, y + 15, `step ${n}`, { size: 11, anchor: 'middle' });
}

module.exports = figure('fig-2-4', {
  height: 262,
  title: "同样三个 decode 步，关闭与开启重叠",
  desc: "两条时间线各有 GPU 与 CPU 轨道。无重叠时，每个 GPU 步后是 CPU 处理结果的斜线空隙，三步到 500 结束。有重叠时，GPU 连续执行，CPU 在下一步运行时处理前一步，两轨都在 420 完成三步。",
}, f => {
  f.kicker(80, 22, "无重叠：event_loop_normal");
  lane(f, 32, 'GPU');
  lane(f, 64, 'CPU');
  f.kicker(80, 140, "有重叠：event_loop_overlap");
  lane(f, 150, 'GPU');
  lane(f, 182, 'CPU');
  f.arrow([80, 246], [600, 246], { style: 'call' });
  f.text(608, 250, 't', { size: 11, hue: 'ink-soft' });

  for (let i = 0; i < 3; i += 1) {
    const x = 80 + i * 140;
    f.beat(i + 1);
    step(f, x, 32, i + 1);
    f.rect(x + 100, 64, 40, 22, { hue: 'blue' });
    if (i < 2) f.hatchRect(x + 100, 32, 40, 22);
  }
  f.beat(4);
  f.text(510, 48, "到 500 完成三步", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(200, 112, "GPU 等待 CPU", { size: 11, serif: true, hue: 'ink-soft' });

  for (let i = 0; i < 3; i += 1) {
    f.beat(5 + i);
    step(f, 80 + i * 100, 150, i + 1);
    f.rect(180 + i * 100, 182, 40, 22, { hue: 'blue' });
  }
  f.beat(8);
  f.text(430, 166, "到 420 完成三步", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(200, 222, "GPU 运行 N+1 时，CPU 处理 N", { size: 11, serif: true, hue: 'ink-soft' });
});
