'use strict';

const { figure } = require('../../../_shared/figkit.js');

const rows = [
  ['检查点行指名了一个类', ['被编辑过的 SqliteSaver 行，', '用 get_state 读取'], '默认：get_state 构建了实验用的类', 'LANGGRAPH_STRICT_MSGPACK=true：原始字段'],
  ['用户 id 为 *', ['由该 id 构造的', 'store 前缀'], 'list_namespaces 列出了每个用户', '对同一前缀的 search：只有一个用户'],
  ['编辑切换了工具', ['send_email 被编辑成', 'delete_file 的调用'], 'batched：delete_file 在 3 次运行中全部运行', 'per_call：ValidationError，没有运行'],
  ['本地追踪中的 agent', ['tracing_context，', 'enabled="local"'], '向 api.smith.langchain.com 发出请求', 'enabled=False：没有发送运行'],
];

module.exports = figure('fig-8-4', {
  height: 452,
  title: '输入跨入代码之处：默认情况与设置之后',
  desc: '四行，每行从左侧的输入指向右侧的两个结果：玫红色是默认结果，紫色是使用某项设置后的结果。指名了一个类的、被编辑过的 SqliteSaver 检查点行，会让 get_state 构建该类，而 LANGGRAPH_STRICT_MSGPACK=true 返回原始字段。用户 id 为星号时，list_namespaces 列出所有用户，而对同一前缀的 search 只返回一个用户。批量审批下，把 send_email 编辑成 delete_file 会让 delete_file 运行，逐个调用审批则抛出 ValidationError。在 enabled 为 local 的 tracing_context 内，agent 会向 api.smith.langchain.com 发出请求，而 enabled 为 False 时不发送任何运行，只有一次 GET /info。',
}, f => {
  f.kicker(20, 22, '输入');
  f.kicker(300, 22, '默认结果，然后是改动后的结果');
  rows.forEach(([title, sub, bad, good], i) => {
    const y = 34 + i * 96;
    const input = f.box({ x: 20, y, w: 252, h: 76, hue: 'grey', title, sub, align: 'left' });
    const worse = f.box({ x: 300, y, w: 320, h: 34, hue: 'rose', title: bad, align: 'left', titleSize: 11.5 });
    const better = f.box({ x: 300, y: y + 42, w: 320, h: 34, hue: 'violet', title: good, align: 'left', titleSize: 11.5 });
    f.path(`M${input.x + input.w} ${worse.cy} H${worse.x - 1}`, { style: 'fail' });
    f.path(`M${input.x + input.w} ${better.cy} H${better.x - 1}`, { style: 'call' });
  });
  f.text(20, 428, '玫红：默认设置下的结果。紫色：改动之后的结果。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 444, '每个结果都是 Mac 或 x86 服务器虚拟机上的一次录制运行，或录制工具包的一份录制。', { size: 11, serif: true, hue: 'ink-soft' });
});
