'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const cost = load(path.join(__dirname, '../../capture/lab/prodapp-mac/summary/cost-mac.json'));
const model = cost.models.haiku;
const convs = Object.entries(model.conversations).filter(([, c]) => c.billed_input > 0).sort(([a], [b]) => a.localeCompare(b));
const total = c => c.billed_input;
const yMax = Math.ceil(Math.max(...convs.map(([, c]) => total(c))) / 5000) * 5000;
const inside = convs.reduce((s, [, c]) => s + c.input, 0);
const outside = convs.reduce((s, [, c]) => s + c.billed_input - c.input, 0);
const ledger = model.ledger;

module.exports = figure('fig-9-4', {
  height: 330,
  title: 'Claude Haiku 5.5 每个评估对话的输入 token，在 model.call span 之内与之外',
  desc: `${convs.length} 个对话。${inside} 个输入 token 在 model.call span 之内（不含案例 16），${outside} 个计费在它们之外：摘要器调用，以及回复被测试中间件替换的调用。整个套件的 Anthropic 用量为 ${ledger.calls} 次调用、${ledger.input_tokens} 个输入 token，${ledger.cost_usd} 美元。`,
}, f => {
  f.rect(16, 12, 14, 10, { hue: 'plum' });
  f.text(36, 21, '在 model.call span 之内', { size: 11 });
  f.rect(230, 12, 14, 10, { hue: 'rose' });
  f.text(250, 21, '已计费，但不在 model.call span 中', { size: 11 });
  const c = chart(f, { x: 60, y: 56, w: 560, h: 210, xDomain: [0, convs.length], yDomain: [0, yMax], xTicks: [], yTicks: Array.from({ length: yMax / 5000 + 1 }, (_, i) => i * 5000), yLabel: '对话中的输入 token' });
  const slot = 560 / convs.length;
  convs.forEach(([user, conv], i) => {
    const x = c.px(i) + slot * 0.2;
    const w = slot * 0.6;
    f.rect(x, c.py(conv.input), w, c.py(0) - c.py(conv.input), { hue: 'plum' });
    if (total(conv) > conv.input) f.rect(x, c.py(total(conv)), w, c.py(conv.input) - c.py(total(conv)), { hue: 'rose' });
    f.text(x + w / 2, 284, user.replace('e', ''), { size: 11, anchor: 'middle', hue: 'ink-soft' });
  });
  f.text(340, 310, '评估对话，按案例编号', { size: 11.5, anchor: 'middle', serif: true, hue: 'ink-soft' });
});
