'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const frames = [
  { n: 1, x: 60, hue: 'amber', time: '09:00:01.750Z' },
  { n: 2, x: 310, hue: 'amber', time: '09:00:02.000Z', gap: 185 },
  ...[3, 4, 5, 6, 7, 8].map((n, index) => ({ n, x: Math.round(310 + (index + 1) * 250 / 7), hue: 'green' })),
  { n: 9, x: 560, hue: 'amber', time: '09:00:02.250Z', gap: 435 },
];

const updates = {
  3: ['test-log, name: test-log.txt', "创建 artifacts[0] 和 parts[0]"],
  4: ['test-log, append: true', "添加 parts[1]"],
  5: ['test-log, append: true', "添加 parts[2]"],
  6: ['test-log, append: true', "添加 parts[3]"],
  7: ['test-log, append: true, lastChunk: true', "添加 parts[4]，最后一块"],
  8: ['summary, name: summary.json, lastChunk: true', "创建 artifacts[1]，一个 data part"],
};

const lines = [
  ['collected 12 items', false],
  ["tests/test_charges.py 的进度行，66%", true],
  ["tests/test_refunds.py 的进度行，100%", true],
  ['FAILED tests/test_refunds.py::test_partial_refund - AssertionError: 450 != 500', false],
  ['1 failed, 11 passed in 4.21s', false],
];

module.exports = figure('fig-artifact-chunks', {
  height: 474,
  title: "五个分块成为一个存储产物",
  desc: "顶部：套件时钟上的流式运行九帧。第 1、2、9 帧是状态帧，时间戳为 09:00:01.750Z、09:00:02.000Z、09:00:02.250Z，间隔 250 ms。第 3 至第 8 帧为无时间戳的产物更新，位于第二和第三个时间点之间。中部：表格列出第 3 至第 8 帧的 artifactId、标志及对存储任务的作用。第 3 帧创建 test-log 及首个 part，第 4 至第 7 帧各追加一个 part，第 7 帧设 lastChunk，第 8 帧创建 summary 产物。底部：存储的 test-log.txt 产物含五个 text part，每分块一个。",
}, f => {
  f.kicker(20, 18, "套件时钟上的九帧");
  const stops = [36, ...frames.flatMap(frame => [frame.x - 9, frame.x + 9]), 604];
  for (let i = 0; i < stops.length; i += 2) f.rule(stops[i], 70, stops[i + 1], 70, { hue: 'ink-mute' });
  f.text(435, 98, "第 3 至第 8 帧没有时间戳", { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.box({ x: 20, y: 114, w: 330, h: 26, hue: 'indigo', title: "流中：artifactId 与标志", titleSize: 12, align: 'left' });
  f.box({ x: 356, y: 114, w: 264, h: 26, hue: 'teal', title: "存储任务中", titleSize: 12, align: 'left' });

  for (const frame of frames) {
    f.beat(frame.n);
    if (frame.time) {
      f.rule(frame.x, 44, frame.x, 61, { hue: 'amber' });
      f.text(frame.x, 38, frame.time, { size: 11, hue: 'amber', anchor: 'middle' });
    }
    if (frame.gap) f.text(frame.gap, 54, '250 ms', { size: 11, hue: 'ink-soft', anchor: 'middle' });
    f.step(frame.x, 70, frame.n, { hue: frame.hue });
    const update = updates[frame.n];
    if (update) {
      const y = 140 + (frame.n - 3) * 26;
      f.rect(20, y, 330, 26, { fill: color('paper'), stroke: color('panel-edge') });
      f.rect(356, y, 264, 26, { fill: color('paper'), stroke: color('panel-edge') });
      f.step(36, y + 13, frame.n, { hue: 'green' });
      f.text(54, y + 17, update[0], { size: 11 });
      f.text(366, y + 17, update[1], { size: 11 });
    }
    if (frame.n === 3) f.box({ x: 20, y: 322, w: 600, h: 28, hue: 'green', title: 'artifacts[0] · artifactId test-log · name test-log.txt', titleSize: 12, align: 'left' });
    const part = frame.n - 3;
    if (part >= 0 && part < lines.length) {
      const [line, described] = lines[part];
      const y = 350 + part * 24;
      f.rect(20, y, 600, 24, { fill: color('paper'), stroke: color('panel-edge') });
      f.text(30, y + 16, `parts[${part}]`, { size: 11, hue: 'ink-soft' });
      f.text(94, y + 16, line, described ? { size: 11, serif: true, italic: true, hue: 'ink-soft' } : { size: 11 });
    }
  }
});
