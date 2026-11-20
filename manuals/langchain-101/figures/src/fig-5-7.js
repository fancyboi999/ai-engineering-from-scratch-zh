'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/demos-mac.json'));
const steps = data.assistant.default;
const names = ['记住', '请求发送', '批准', '恢复', '再次批准', '第三回合', '新线程 t2'];
const X0 = 216;
const COL = 81;
const ROW = 40;
const Y0 = 62;
const cols = [
  [['下一个', '节点'], s => (s.next.length ? s.next[0] : '无'), 'amber'],
  [['检查点', '数量'], s => String(s.checkpoints), 'teal'],
  [['待审批', '数量'], s => String(s.pending), 'amber'],
  [['send_email', '运行次数'], s => String(s.attempts), 'green'],
  [['已发送', '邮件数'], s => String(s.sent), 'teal'],
];

module.exports = figure('fig-5-7', {
  height: 418,
  title: 'assistant 的七个进程，以及每个进程留下的内容',
  desc: `一张表，assistant 在 Mac 上运行的七个进程各占一行，每一列是进程结束时读到的一个计数。进程 3 批准了邮件、发出了邮件，随后以退出码 ${steps[2].exit} 被终止。进程 4 恢复后发现同一个审批又在等待。进程 5 再次批准，send_email 第二次运行，幂等键检查跳过了发送。最后 send_email 一共运行了 ${steps[6].attempts} 次，发件箱里有 ${steps[6].sent} 封邮件。新线程上的进程 7 在 store 里仍然找到 ${steps[6].memories} 条记忆。`,
}, f => {
  cols.forEach(([head], c) => head.forEach((line, k) => f.text(X0 + c * COL + (COL - 8) / 2, 22 + k * 15, line, { size: 11, anchor: 'middle', hue: 'ink-soft', weight: 700 })));
  steps.forEach((s, i) => {
    const y = Y0 + i * ROW;
    f.text(20, y + 21, `${i + 1}`, { size: 12, weight: 700, hue: s.exit ? 'rose' : 'ink' });
    f.text(40, y + 21, names[i], { size: 11.5, hue: s.exit ? 'rose' : 'ink' });
    if (s.exit !== 0) {
      f.rect(X0, y, 5 * COL - 8, ROW - 8, { fill: color('rose-fill'), stroke: color('rose-ink'), dash: 'dashed' });
      f.text(X0 + 10, y + 21, `SIGKILL，退出码 ${s.exit}：邮件已发出，该步未保存`, { size: 11.5, hue: 'rose', weight: 700 });
      return;
    }
    cols.forEach(([, value, hue], c) => {
      const x = X0 + c * COL;
      f.rect(x, y, COL - 8, ROW - 8, { fill: color(`${hue}-fill`), stroke: color(`${hue}-ink`) });
      f.text(x + (COL - 8) / 2, y + 21, value(s), { size: 12, anchor: 'middle', hue, weight: 700 });
    });
  });
  f.text(20, Y0 + 7 * ROW + 16, '每行是一个新的 Python 进程，除非注明，都在线程 t1 上。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, Y0 + 7 * ROW + 34, '计数是在进程结束时读取的。send_email 运行了两次，', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, Y0 + 7 * ROW + 52, '但只发出一封邮件，因为第二次运行在发件箱里', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, Y0 + 7 * ROW + 70, '找到了它的 tool_call_id。检查点数量是该行对应线程的行数。', { size: 11, serif: true, hue: 'ink-soft' });
});
