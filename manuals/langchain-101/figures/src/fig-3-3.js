'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');

const out = name => fs.readFileSync(path.join(__dirname, '../../capture/out', name), 'utf8');
const run = out('06-agent-run.txt');
const start = run.indexOf('\n[\n', run.indexOf('"messages"\n]')) + 1;
const final = JSON.parse(run.slice(start, run.indexOf('\n]\n', start) + 2));
const [, ask, answer, reply] = final;
const call = ask.tool_calls[0];
const usage = JSON.parse(/"usage_metadata": (\{[\s\S]*?\})/.exec(out('02-messages.txt'))[1]);
const show = value => (typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value).replace(/"/g, '').replace(/,/g, ', ').replace(/:/g, ': '));

module.exports = figure('fig-3-3', {
  height: 400,
  title: 'AIMessage 及其 ToolMessage 的字段',
  desc: `三张卡片，读自同一次 agent 运行。第一张是请求工具的 AIMessage：content 为 ${show(ask.content)}，id 为 ${ask.id}，tool_calls 中 name 为 ${call.name}、args 为 ${show(call.args)}、id 为 ${call.id}。第二张是回答它的 ToolMessage：content 为 ${show(answer.content)}，name 为 ${answer.name}，tool_call_id 为 ${answer.tool_call_id}，status 为 ${answer.status}。一条虚线把工具调用里的 id ${call.id} 与 tool_call_id ${answer.tool_call_id} 连起来。下方第三张是最终的 AIMessage，content 为 ${show(reply.content)}，没有 tool_calls，循环到此结束。真实 provider 的回复还带有 usage_metadata，例如 messages 录制里的 ${usage.input_tokens} 个输入 token 和 ${usage.output_tokens} 个输出 token。`,
}, f => {
  const card = (x, y, w, h, hue, title, rows) => {
    f.rect(x, y, w, h, { hue });
    f.text(x + 14, y + 22, title, { size: 13, weight: 700, hue });
    return rows.map(([k, v, strong], i) => {
      const ry = y + 50 + i * 24;
      f.text(x + 14, ry, k, { size: 11.5, hue: 'ink-soft' });
      f.text(x + 128, ry, v, { size: 11.5, weight: strong ? 700 : undefined, hue: strong ? hue : undefined, max: w - 140 });
      return ry;
    });
  };
  f.beat(1);
  const left = card(20, 14, 280, 200, 'plum', 'AIMessage', [['content', show(ask.content)], ['id', ask.id], ['tool_calls', ''], ['  .name', call.name], ['  .args', show(call.args)], ['  .id', call.id, true]]);
  f.beat(2);
  const right = card(340, 14, 280, 200, 'green', answer.type, [['content', show(answer.content)], ['name', answer.name], ['id', answer.id], ['tool_call_id', answer.tool_call_id, true], ['status', answer.status]]);
  f.path(`M${128 + 20 + call.id.length * 6.9 + 6} ${left[5] - 4} L318 ${left[5] - 4} L318 ${right[3] - 4} L339 ${right[3] - 4}`, { style: 'reply' });
  f.text(318, left[5] + 14, '相同的 id', { size: 11, serif: true, anchor: 'middle', hue: 'ink-soft', knock: true });
  f.beat(3);
  f.arrow([400, 214], [400, 241], { style: 'model' });
  f.text(410, 232, '下一次模型调用会读取这两条', { size: 11, serif: true, hue: 'plum' });
  card(20, 242, 600, 112, 'plum', `${reply.type}，最终回答`, [['content', show(reply.content)], ['tool_calls', '无，所以 agent 停止'], ['usage_metadata', `输入 ${usage.input_tokens}，输出 ${usage.output_tokens}，由 provider 报告时才有`]]);
  f.beat(0);
  f.text(20, 376, '请求工具的信息在 tool_calls 里，已经解析好，content 为空。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 392, 'ToolMessage 重复它所回答的那次调用的 id。', { size: 11, serif: true, hue: 'ink-soft' });
});
