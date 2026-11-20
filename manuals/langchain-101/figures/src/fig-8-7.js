'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const drill = load(path.join(__dirname, '../../capture/lab/summary/failure-drill-x86.json'));
const by = n => drill.cases[String(n)].runs[0];
const c1 = by(1);
const c2 = by(2);
const c3 = by(3);
const c4 = by(4);
const c5 = by(5);
const c7 = by(7);

const rows = [
  ['重试层', `${c1.requests} 个请求，${c1.run_s} s`, '每个连接都被断开', `${c1.requests_after_fix} 个请求，${c1.run_s_after_fix} s`, '模型上设 max_retries=0'],
  ['扣款后崩溃', `${c2.charges} 次扣款`, 'SIGKILL，然后恢复', `带键时 ${c2.charges_after_fix} 次`, '每个模型调用 id 一次'],
  ['跳过审批', `运行了 ${c3.ran_before_decision} 次，没有决定`, '批量模式', `运行了 ${c3.ran_after_fix} 次，1 次中断`, 'interrupt_mode per_call'],
  ['没有结构化输出', `${c4.runs.length} 条提示词中 ${c4.none_count} 条为 None`, 'ToolStrategy 加一个工具', '你的检查会抛出异常', '检查是否为 None'],
  ['追踪端点宕机', `运行后 ${c5.exit_lag_s} s 退出`, '一次运行，无人监听', `运行后 ${c5.exit_lag_s_after_fix} s 退出`, '先探测，再关闭追踪'],
  ['同一工具名出现两次', '绑定了 1 个工具，没有报错', 'refunds 函数运行了', '发现重复', '先检查名称'],
  ['无休止的工具调用', `${c7.model_calls} 次模型调用时抛出`, 'recursion_limit 10', `${c7.after_fix[1].model_calls} 次调用时结束`, '调用上限 3，递归上限 25'],
];

module.exports = figure('fig-8-7', {
  height: 470,
  title: '演练中的七个故障，修复前后',
  desc: `一张七行的表，每行是 x86 服务器虚拟机上 Qwen3 4B 故障演练的一个案例，左侧是症状，右侧是修复后的结果。重试层：${c1.requests} 个请求，对比 ${c1.requests_after_fix} 个。扣款后崩溃：${c2.charges} 次扣款，对比带键时的 ${c2.charges_after_fix} 次，因为模型要求了两次扣款。跳过审批的中间件：工具在任何决定之前就运行了，逐个调用模式拦住了它。没有结构化输出：${c4.runs.length} 条提示词中有 ${c4.none_count} 条得到 None 且没有异常，而检查会抛出异常。追踪端点宕机：运行后 ${c5.exit_lag_s} s 退出，对比 ${c5.exit_lag_s_after_fix} s。同一工具名出现两次：绑定了一个工具，没有报错。无休止的工具调用：在上限 10 处出现 GraphRecursionError，而 3 次模型调用上限在 3 次调用后结束运行，同时递归上限提高到 25。`,
}, f => {
  f.kicker(176, 20, '症状');
  f.kicker(408, 20, '修复之后');
  rows.forEach(([label, left, leftSub, right, rightSub], i) => {
    const y = 32 + i * 58;
    f.text(20, y + 27, label, { size: 11.5, weight: 700, max: 150 });
    f.box({ x: 176, y, w: 220, h: 46, hue: 'rose', title: left, sub: leftSub, align: 'left', titleSize: 12 });
    f.box({ x: 408, y, w: 212, h: 46, hue: 'teal', title: right, sub: rightSub, align: 'left', titleSize: 12 });
  });
  f.text(20, 452, 'x86 服务器虚拟机上，用 Ollama 里的 Qwen3 4B 运行 drill.py 三次中的第一次。', { size: 11, serif: true, hue: 'ink-soft' });
});
