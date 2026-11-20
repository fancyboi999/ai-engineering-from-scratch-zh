'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const lab = path.join(__dirname, '../../capture/lab/prodapp-mac/summary');
const loadData = load(path.join(lab, 'load-mac.json'));
const iso = load(path.join(lab, 'service-mac.json')).isolation;
const cell = loadData.cells.find(c => c.workers === 1 && c.users === Math.max(...loadData.cells.map(x => x.users)));
const per = name => (cell.checkpoint_rows[name] / cell.runs).toFixed(2);
const kb = (cell.checkpoint_data_bytes_per_run / 1000).toFixed(1);

module.exports = figure('fig-9-2', {
  height: 430,
  title: '服务的 Postgres 行，以及隔离用户的两道检查',
  desc: `服务的各张表与 store 命名空间，以及 ${cell.users} 个用户、一个 worker 的负载测试中每次运行写入的行数：checkpoints ${per('checkpoints')}，checkpoint_blobs ${per('checkpoint_blobs')}，checkpoint_writes ${per('checkpoint_writes')}，约 ${kb} KB 行数据。对另一个用户的线程发出请求，state 得到 ${iso.bob_state}，runs 得到 ${iso.bob_run}，approve 得到 ${iso.bob_approve}。工具从 runtime.context 读取用户。`,
}, f => {
  f.kicker(16, 22, 'HTTP 请求');
  const req = f.box({ x: 16, y: 34, w: 150, hue: 'violet', title: 'Bearer tok-bob', sub: ['alice 的线程 id'] });
  const gate = f.box({ x: 16, y: 118, w: 150, hue: 'amber', title: 'owned()', sub: ['threads.user_id', '等于调用者？'] });
  f.arrow(req.bottom(), [req.cx, gate.y - 1], { style: 'call' });
  const deny = f.box({ x: 16, y: 222, w: 150, hue: 'rose', title: `${iso.bob_state}`, sub: ['thread not found', 'state, runs, approve'] });
  f.arrow(gate.bottom(), [gate.cx, deny.y - 1], { style: 'fail', label: '否' });

  f.kicker(214, 22, 'Postgres，一个连接池');
  const rows = [
    ['threads', 'thread_id, user_id', '每个线程一行'],
    ['checkpoints', 'thread_id, checkpoint_id', `每次运行 ${per('checkpoints')} 行`],
    ['checkpoint_blobs', 'thread_id, channel, version', `每次运行 ${per('checkpoint_blobs')} 行`],
    ['checkpoint_writes', 'thread_id, task_id, idx', `每次运行 ${per('checkpoint_writes')} 行`],
    ['store', '前缀 memories.<user>，key', '每条笔记一行'],
    ['orders, refunds, tickets', 'user_id, idempotency_key', '应用表'],
  ];
  const boxes = rows.map(([title, key, note], i) => {
    const b = f.box({ x: 214, y: 34 + i * 58, w: 230, h: 48, hue: 'teal', title, sub: [key], align: 'left' });
    f.text(452, 34 + i * 58 + 30, note, { size: 11, serif: true, hue: 'ink-soft' });
    return b;
  });
  f.arrow(gate.right(18), [boxes[0].x - 1, boxes[0].y + 22], { style: 'call', label: '读取' });
  f.text(452, 34 + 58 + 46, `每次运行 ${kb} KB 行数据`, { size: 11, serif: true, hue: 'teal' });
  f.text(452, 34 + 2 * 58 + 46, '没有列记录用户', { size: 11, serif: true, hue: 'rose' });

  const tool = f.box({ x: 16, y: 318, w: 150, hue: 'green', title: '工具调用', sub: ['用户取自', 'runtime.context'] });
  f.path(`M${tool.right()[0]} ${tool.cy} H190 V${boxes[4].cy} H${boxes[4].x - 1}`, { style: 'call' });
  f.path(`M190 ${tool.cy} V${boxes[5].cy} H${boxes[5].x - 1}`, { style: 'call' });
  f.text(196, 410, `bob 的 recall_notes 返回 ${iso.bob_recall_results.join(' ')}，alice 的返回 ${JSON.parse(iso.alice_recall_results[0]).length} 条笔记`, { size: 11, serif: true, hue: 'ink-soft' });
});
