'use strict';

const fs = require('fs');
const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { flat } = require('../../../_shared/forms.js');

const text = fs.readFileSync(path.join(__dirname, '../../capture/out/29-checkpoint-sqlite.txt'), 'utf8');
const arrayAfter = (heading, from = 0) => {
  const at = text.indexOf('[', text.indexOf(heading, from));
  return JSON.parse(text.slice(at, text.indexOf('\n]', at) + 2));
};
const rows = arrayAfter('checkpoints rows: thread_id, checkpoint_ns, type, step, source:').map(([thread, ns, type, step, source]) => ({ thread, type, step, source }));
const table = name => Number(new RegExp(`^${name}: (\\d+) rows`, 'm').exec(text)[1]);
const turn2 = arrayAfter('messages after turn 2:');
const turn3 = arrayAfter('## a new process opens the same file');
const humans = turn3.filter(line => line.startsWith('human: ')).map(line => line.slice(7));
const counts = [turn2.indexOf(turn2.filter(line => line.startsWith('human: '))[1]), turn2.length, turn3.length];
if (rows.length !== table('checkpoints')) throw new Error('fig-5-2: the listed rows and the row count disagree');

const turns = [];
for (const row of rows) {
  if (row.source === 'input') turns.push([]);
  turns[turns.length - 1].push(row);
}
const px = step => 80 + (step + 1) * 42;
const restart = (turns[1][turns[1].length - 1].step + turns[2][0].step) / 2;

module.exports = figure('fig-5-2', {
  height: 300,
  title: 'SQLite 文件中同一线程的三轮',
  desc: `SqliteSaver 的 checkpoints 表中线程 ${rows[0].thread} 的 ${rows.length} 行，排在一条从 ${rows[0].step} 到 ${rows[rows.length - 1].step} 的步轴上。${turns.map((turn, i) => `第 ${i + 1} 轮“${humans[i]}”在第 ${turn[0].step} 步有一个输入检查点，在第 ${turn.slice(1).map(r => r.step).join('、')} 步有循环检查点，结束后状态里有 ${counts[i]} 条消息`).join('。')}。第 2 轮与第 3 轮之间，连接被关闭，一个新进程打开同一个文件。文件里有 ${table('checkpoints')} 行检查点和 ${table('writes')} 行待处理写入。`,
}, f => {
  f.kicker(20, 18, `线程 ${rows[0].thread}，每个检查点一行`);
  turns.forEach((turn, i) => {
    const x1 = px(turn[0].step) - 19;
    const x2 = px(turn[turn.length - 1].step) + 19;
    f.beat(i + 1);
    f.rule(x1, 62, x2, 62, { hue: 'violet' });
    f.rule(x1, 58, x1, 66, { hue: 'violet' });
    f.rule(x2, 58, x2, 66, { hue: 'violet' });
    f.text(x1 + 6, 38, `第 ${i + 1} 轮`, { size: 11, hue: 'violet', weight: 700 });
    f.text(x1 + 6, 52, humans[i], { size: 11, serif: true, hue: 'violet' });
    turn.forEach(row => {
      const hue = row.source === 'input' ? 'amber' : 'teal';
      f.rect(px(row.step) - 19, 82, 38, 34, { fill: color(`${hue}-fill`), stroke: color(`${hue}-ink`), strokeWidth: 1.3 });
      f.text(px(row.step), 104, row.source, { size: 11, anchor: 'middle', hue });
      f.rule(px(row.step), 116, px(row.step), 150, { hue: 'ink-mute', opacity: 0.5 });
    });
    f.text((x1 + x2) / 2, 210, `${counts[i]} 条消息`, { size: 11, anchor: 'middle', hue: 'teal', weight: 700 });
    f.text((x1 + x2) / 2, 224, '此后状态中的消息数', { size: 11, serif: true, anchor: 'middle', hue: 'ink-soft' });
  });
  f.beat(0);
  f.rule(px(rows[0].step) - 20, 150, px(rows[rows.length - 1].step) + 20, 150, { hue: 'ink' });
  for (const row of rows) {
    f.rule(px(row.step), 150, px(row.step), 155, { hue: 'ink' });
    f.text(px(row.step), 170, String(row.step), { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
  f.text(px(rows[0].step) - 20, 188, 'metadata.step', { size: 11, serif: true, hue: 'ink-soft' });
  f.rule(px(restart), 66, px(restart), 236, { hue: 'grey', dash: 'dashed' });
  f.text(px(restart) + 6, 252, '连接关闭，新进程', { size: 11, serif: true, hue: 'grey' });
  f.text(px(restart) + 6, 266, '打开同一个文件', { size: 11, serif: true, hue: 'grey' });

  const db = flat.cylinder(f, 584, 74, 'teal', { w: 48, h: 60 });
  f.text(584, db.y + db.h + 18, 'checkpoints.db', { size: 11, weight: 700, anchor: 'middle', hue: 'teal' });
  f.text(584, db.y + db.h + 34, `checkpoints ${table('checkpoints')}`, { size: 11, anchor: 'middle', hue: 'ink-soft' });
  f.text(584, db.y + db.h + 50, `writes ${table('writes')}`, { size: 11, anchor: 'middle', hue: 'ink-soft' });

  const legend = [['amber', 'input', '新消息已写入'], ['teal', 'loop', '一步完成后保存']];
  legend.forEach(([hue, mark, name], i) => {
    const y = 252 + i * 20;
    f.rect(20, y - 12, 40, 16, { fill: color(`${hue}-fill`), stroke: color(`${hue}-ink`) });
    f.text(40, y, mark, { size: 11, anchor: 'middle', hue });
    f.text(68, y, name, { size: 11, serif: true, hue: 'ink-soft' });
  });
});
