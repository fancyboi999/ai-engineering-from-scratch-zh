'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/prodapp-mac/summary/fix-mac.json'));
const CASE = 'new_message_while_waiting_for_approval';
const MODELS = [['qwen3-4b', 'Qwen3 4B'], ['qwen3-14b', 'Qwen3 14B']];
const rowsOf = rep => (rep.refund_rows || {})[CASE] || [];
const proposed = rep => (rep.approvals_and_results || []).find(p => p.case === CASE && p.amount_cents !== undefined);
const result = rep => (rep.approvals_and_results || []).find(p => p.case === CASE && p.result);
const sample = proposed(data.after['qwen3-14b'][0]) || proposed(data.after['qwen3-4b'][0]);
const desc = sample.description.split('. ');

module.exports = figure('fig-9-3b', {
  height: 330,
  title: '工具检查金额前后的 0 cent 退款',
  desc: `评估要求退款 ORD-e19-3，并批准模型提出的内容。修复前，${MODELS.map(([k, l]) => `${l} 在 ${data.before[k].length} 次运行中写入了 ${data.before[k].filter(r => rowsOf(r).length).length} 行 0 cent 记录`).join('，')}。修复后，${MODELS.map(([k, l]) => `${l} 在 ${data.after[k].length} 次运行中写入了 ${data.after[k].filter(r => rowsOf(r).length).length} 行`).join('，')}。修复后的审批文本：${sample.description}`,
}, f => {
  f.kicker(150, 22, '修复前');
  f.kicker(400, 22, '修复后');
  MODELS.forEach(([key, label], m) => {
    const y = 44 + m * 80;
    f.text(16, y + 22, label, { size: 11.5, weight: 700 });
    f.text(16, y + 38, '退款 ORD-e19-3', { size: 11, serif: true, hue: 'ink-soft' });
    data.before[key].forEach((rep, i) => {
      const rows = rowsOf(rep);
      const bad = rows.some(r => r.amount_cents === 0);
      f.box({ x: 150 + i * 78, y, w: 74, h: 52, pad: 4, hue: bad ? 'rose' : 'teal', title: `运行 ${i + 1}`, sub: [bad ? '0 cent 行' : `${rows.length} 行`] });
    });
    data.after[key].forEach((rep, i) => {
      const rows = rowsOf(rep);
      const p = proposed(rep);
      const refused = result(rep) && /must be positive/.test(result(rep).result);
      f.box({ x: 400 + i * 78, y, w: 74, h: 52, pad: 4, hue: rows.length ? 'rose' : 'teal', title: `运行 ${i + 1}`, sub: [p ? `请求 ${p.amount_cents}` : '未请求', refused ? '被拒绝' : `${rows.length} 行`] });
    });
  });
  f.kicker(16, 222, '修复后审批人读到的内容');
  desc.forEach((line, i) => f.text(16, 244 + i * 16, line.endsWith('.') ? line : `${line}.`, { size: 11, serif: true, max: 608 }));
});
