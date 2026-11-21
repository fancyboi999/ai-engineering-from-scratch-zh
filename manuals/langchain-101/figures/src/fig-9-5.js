'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const lab = path.join(__dirname, '../../capture/lab/prodapp-mac/summary');
const faults = load(path.join(lab, 'faults-mac.json'));
const evals = load(path.join(lab, 'evals-mac.json'));
const replies = evals.causes.replies;
const MODELS = evals.models.filter(m => faults[m.key]);
const ROWS = [
  ['flaky_faq_is_retried', 'search_faq 失败', '一次'],
  ['hung_tool_times_out', 'read_order 挂起', '每次尝试'],
  ['failed_ticket_is_not_retried', 'create_ticket', '失败一次'],
  ['primary_outage_uses_backup', '主模型', '抛出异常'],
  ['runaway_loop_hits_call_limit', '模型一直请求', 'search_faq'],
];
const ZH = {
  'no tool call,|said no data': ['没调用工具，', '称无数据'],
  'said order|not found': ['称订单', '未找到'],
  'said it could|not open one': ['称无法', '开立工单'],
  'answered|from backup': ['回答了，', '来自备用'],
  'answered|after 8 calls': ['8 次调用后', '给出回答'],
  'answered after|the retry': ['重试后', '给出回答'],
  'said it cannot|look it up now': ['称现在', '无法查询'],
  'said lookup|timed out': ['称查询', '已超时'],
};
const TOP = 80;
const ROW = 58;
const COL = 100;
const X0 = 340;

module.exports = figure('fig-9-5', {
  height: TOP + ROWS.length * ROW + 10,
  title: '五个故障、span 中的尝试，以及各模型对客户说了什么',
  desc: `对每个注入的故障，展示 Mac 上第一次套件运行的工具与模型 span，以及 ${MODELS.map(m => m.label).join('、')} 的回复。${ROWS.map(([key, a, b]) => `${a} ${b}：${MODELS.map(m => `${m.label} ${(replies[m.key] || {})[key] ? replies[m.key][key].join(' ') : '未运行'}`).join('，')}`).join('。')}。`,
}, f => {
  f.kicker(16, 24, '故障');
  f.kicker(176, 24, '运行的 span');
  MODELS.forEach((m, i) => f.text(X0 + i * COL + 4, 24, m.label.replace('Claude ', ''), { size: 11, weight: 700 }));
  f.rect(176, 36, 10, 10, { hue: 'green' });
  f.text(190, 45, '工具成功', { size: 11, hue: 'ink-soft' });
  f.rect(250, 36, 10, 10, { hue: 'rose' });
  f.text(264, 45, '错误', { size: 11, hue: 'ink-soft' });
  f.rect(176, 52, 10, 10, { hue: 'plum' });
  f.text(190, 61, '模型调用成功', { size: 11, hue: 'ink-soft' });
  ROWS.forEach(([key, a, b], r) => {
    const y = TOP + r * ROW;
    f.rule(16, y - 6, 630, y - 6, { hue: 'ink-mute', opacity: 0.4 });
    f.text(16, y + 12, a, { size: 11.5, weight: 700 });
    f.text(16, y + 27, b, { size: 11, serif: true, hue: 'ink-soft' });
    const source = MODELS.find(m => faults[m.key][key].tools.length) || MODELS[0];
    const ref = faults[source.key][key];
    const primary = key === 'primary_outage_uses_backup';
    const marks = primary ? ref.model_calls.map(c => (c.error ? 'rose' : 'plum')) : ref.tools.map(t => (t.error ? 'rose' : 'green'));
    marks.forEach((hue, k) => f.rect(176 + k * 14, y + 2, 10, 12, { hue }));
    const tag = primary ? 'model.call：主模型、备用' : `${ref.tools.length} 个工具 span，${source.label.replace('Claude ', '')}`;
    f.text(176, y + 30, tag, { size: 11, serif: true, hue: 'ink-soft' });
    MODELS.forEach((m, i) => {
      const reply = (replies[m.key] || {})[key];
      const x = X0 + i * COL;
      if (!reply) {
        f.text(x + 4, y + 12, '未运行', { size: 11, hue: 'ink-mute' });
        return;
      }
      const [en1, en2, verdict] = reply;
      const [line1, line2] = ZH[`${en1}|${en2}`] || [en1, en2];
      const bad = verdict === 'bad';
      f.rect(x, y, COL - 8, 38, { hue: bad ? 'rose' : 'plum', dash: bad ? 'dashed' : undefined });
      f.text(x + 6, y + 15, line1, { size: 11, serif: true, max: COL - 14 });
      if (line2) f.text(x + 6, y + 30, line2, { size: 11, serif: true, max: COL - 14 });
    });
  });
});
