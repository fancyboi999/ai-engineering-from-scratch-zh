'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const left = 116;
const step = 100.8;
const cellX = turn => left + turn * step + 1;
const filesTurns = [
  ['list_directory', 'path .', 'olive'],
  ['answer', '1 file', 'violet'],
  ['shell', 'wc -l rejected', 'olive'],
  ['read_file', 'README.md', 'olive'],
  ['answer', '1 line', 'violet'],
];

const evals = [
  { y: 300, name: ['Count the lines of README.md'], calls: ['expected: shell', 'actual: shell'], f1: '1.0', fail: false },
  { y: 342, name: ['List the files in the', 'working directory'], calls: ['expected: list_directory', 'actual: list_directory, shell'], f1: '0.67', fail: true },
];

function cell(f, x, y, w, h, hue, title, sub, dash) {
  f.rect(x, y, w, h, { fill: color(`${hue}-fill`), stroke: color(`${hue}-ink`), dash });
  f.text(x + w / 2, y + 17, title, { size: 11, weight: 700, anchor: 'middle', hue: hue === 'rose' ? 'rose' : undefined });
  if (sub) f.text(x + w / 2, y + 32, sub, { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
}

module.exports = figure('fig-5-6', {
  height: 418,
  title: '同一轮次轴的两次运行及两项评估',
  desc: '顶为轮次0至4的三个会话，每格一个模型回复。-1/-2为files.yaml重放，依次list_directory、单文件答案、被拒wc -l、read_file README、单行答案，五轮匹配。-3为guarded的restricted，第0轮echo m101-ok首个分歧，之后不比较。相同退出0，--fail-on-divergence分歧退出1。底eval：数行预期/实际shell，F1 1.0、相关性1/1、长度S；列文件预期list_directory，实际加shell，F1 0.67、相关性1/1、长度S。',
}, f => {
  f.kicker(20, 18, 'sessions diff, 21-sessions-diff.txt');
  for (let turn = 0; turn < 5; turn += 1) f.text(cellX(turn) + 49, 40, `turn ${turn}`, { size: 11, hue: 'ink-soft', anchor: 'middle' });

  const tracks = [{ y: 50, name: '-1' }, { y: 96, name: '-2' }];
  for (const track of tracks) {
    f.text(20, track.y + 25, `${track.name} files.yaml`, { size: 11, weight: 700 });
    filesTurns.forEach(([title, sub, hue], turn) => cell(f, cellX(turn), track.y, 98, 40, hue, title, sub));
  }
  f.text(20, 167, '-3 guarded', { size: 11, weight: 700 });
  cell(f, cellX(0), 142, 98, 40, 'rose', 'shell', 'echo m101-ok');
  cell(f, cellX(1), 142, 4 * step - 2, 40, 'grey', '第1至5轮不比较', '位于分歧之后', 'dashed');
  f.rect(left - 2, 46, step + 2, 140, { stroke: color('rose-ink'), dash: 'dashed' });
  f.text(left, 204, '第0轮首个分歧：list_directory对shell', { size: 11, hue: 'rose' });
  f.text(20, 226, '-1对-2：五轮行为相同，退出0', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 242, '-1对-3：会话分歧，--fail-on-divergence退出1', { size: 11, serif: true, hue: 'ink-soft' });

  f.kicker(20, 274, 'files.yaml评估，22-eval-container-env.txt');
  const cols = [{ x: 20, w: 200, head: '评估会话' }, { x: 222, w: 190, head: '工具调用' }, { x: 414, w: 70, head: 'F1' }, { x: 486, w: 70, head: '相关性' }, { x: 558, w: 62, head: '长度' }];
  for (const col of cols) f.text(col.x + 6, 294, col.head, { size: 11, hue: 'ink-soft' });
  for (const row of evals) {
    cols.forEach((col, index) => {
      const red = index === 2 && row.fail;
      f.rect(col.x, row.y, col.w, 40, { fill: color(red ? 'rose-fill' : 'paper'), stroke: color(red ? 'rose-ink' : 'panel-edge') });
    });
    row.name.forEach((line, index) => f.text(26, row.y + 16 + index * 15, line, { size: 11 }));
    row.calls.forEach((line, index) => f.text(228, row.y + 16 + index * 15, line, { size: 11, serif: true, hue: 'ink-soft' }));
    f.text(449, row.y + 24, row.f1, { size: 11, weight: 700, anchor: 'middle', hue: row.fail ? 'rose' : undefined });
    f.text(521, row.y + 24, '1/1', { size: 11, anchor: 'middle' });
    f.text(589, row.y + 24, 'S', { size: 11, anchor: 'middle' });
  }
  f.text(20, 406, '工具调用平均F1 83.3%（2项）；长度2/2、相关性2/2通过。', { size: 11, serif: true, hue: 'ink-soft' });
});
