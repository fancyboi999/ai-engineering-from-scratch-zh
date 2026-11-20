'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-7-7', {
  height: 380,
  title: 'evaluate 在两种目标上使用 upload_results=False',
  desc: '两栏，各是一次 evaluate 调用，都把 upload_results 设为 False，并使用记录请求的客户端。左栏的目标是一个把两数相加的普通函数，共三个示例，评估器为 exact，汇总评估器为 accuracy。三行得分为 true、false、true，accuracy 为 0.667，客户端没有收到请求。右栏的目标是 Qwen3 4B 上的 create_agent 运行，一个示例，评估器为 same_answer。答案 2 + 3 = 5. 与参考答案 The sum is 5. 不一致，所以该行得分为 false，客户端收到 7 次 POST /runs 和 7 次 PATCH，因为 evaluate 在 enabled 为 local 的 tracing_context 内运行目标。',
}, f => {
  f.kicker(20, 20, '普通函数目标');
  f.kicker(330, 20, 'create_agent 目标');
  const col = (x, title, sub, ev, rows, out) => {
    const data = f.box({ x, y: 32, w: 290, h: 46, hue: 'violet', title, sub, align: 'left' });
    const target = f.box({ x, y: 108, w: 290, h: 46, hue: 'grey', title: 'tracing_context 中的目标', sub: 'enabled="local"，由 evaluate 设置', align: 'left' });
    const evals = f.box({ x, y: 178, w: 200, h: 58, hue: 'green', title: ev, sub: rows, align: 'left' });
    const sent = f.box({ x, y: 278, w: 290, h: 52, hue: out[0], title: out[1], sub: out[2], align: 'left' });
    f.arrow([x + 40, data.y + data.h], [x + 40, target.y - 1], { style: 'call' });
    f.arrow([x + 40, target.y + target.h], [x + 40, evals.y - 1], { style: 'reply' });
    f.path(`M${x + 250} ${target.y + target.h} V${sent.y - 1}`, { style: out[0] === 'rose' ? 'fail' : 'reply' });
    f.text(x + 244, 262, '请求', { size: 11, serif: true, hue: 'ink-soft', anchor: 'end' });
  };
  col(20, '3 个示例：a + b', 'adder()，故意错一个答案', 'exact，然后 accuracy', ['true, false, true', 'accuracy 0.667'], ['grey', '客户端收到 0 个请求', '没有任何内容离开进程']);
  col(330, '1 个示例：What is 2 + 3?', 'Qwen3 4B 上的 create_agent', 'same_answer', 'false: 2 + 3 = 5.', ['rose', 'POST /runs 7, PATCH 7', '智能体的 LangChain 运行']);
  f.text(20, 362, '来自录制工具包，langsmith 0.14.17，客户端会记录每个请求。', { size: 11, serif: true, hue: 'ink-soft' });
});
