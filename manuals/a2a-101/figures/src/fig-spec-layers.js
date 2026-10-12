'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

function band(f, y, h, label, options = {}) {
  f.rect(20, y, 520, h, { fill: color('paper'), stroke: options.stroke || color('ink-mute'), dash: options.dash });
  [].concat(label).forEach((line, index) => f.text(28, y + 17 + index * 14, line, { size: 11, hue: 'ink-soft' }));
}

function bracket(f, y1, y2, lines) {
  f.rule(552, y1, 552, y2, { hue: 'ink-mute' });
  f.rule(548, y1, 552, y1, { hue: 'ink-mute' });
  f.rule(548, y2, 552, y2, { hue: 'ink-mute' });
  const top = (y1 + y2) / 2 - (lines.length - 1) * 7 + 4;
  lines.forEach((line, index) => f.text(560, top + index * 14, line, { size: 11, hue: 'ink-soft' }));
}

module.exports = figure('fig-spec-layers', {
  height: 510,
  title: "test-runner 的 A2A 协议栈",
  desc: "顶部是客户端 agent planner，含卡片缓存与接口选择。下方是 A2A 为 localhost:41241 的 test-runner 定义的三层：包含 /.well-known/agent-card.json、/a2a/jsonrpc、/a2a/rest 路径的绑定，操作，数据模型。虚线下是 test-runner 自建的 HTTP 路由器、请求处理器、任务存储、事件广播，再下面是不透明的 agent 逻辑，真实 agent 也在这里放模型与工具。",
}, f => {
  f.kicker(20, 18, "客户端 agent");
  bracket(f, 26, 90, ['你', "构建它"]);
  f.kicker(20, 118, "A2A 协议");
  band(f, 126, 60, ["卡片与", '绑定']);
  band(f, 192, 60, '操作');
  band(f, 258, 46, "数据模型");
  bracket(f, 126, 304, ['A2A', "定义它"]);
  f.rule(20, 320, 540, 320, { dash: 'dashed' });
  f.kicker(20, 344, 'test-runner · localhost:41241');
  band(f, 352, 76, '服务器');
  band(f, 434, 66, ['agent', '逻辑'], { stroke: color('plum-ink'), dash: 'dashed' });
  bracket(f, 352, 500, ["其维护者", "构建它"]);

  f.beat(1);
  f.box({ x: 20, y: 26, w: 400, h: 64, hue: 'violet', title: 'planner', sub: ["卡片缓存：按技能 ID 归组 agent", "接口：JSONRPC，版本 1.0"] });

  f.beat(2);
  f.box({ x: 96, y: 132, w: 212, h: 48, hue: 'blue', title: '/.well-known/agent-card.json', sub: "卡片，普通 GET", titleSize: 11.5, pad: 8 });
  f.arrow([202, 90], [202, 131], { style: 'call', label: "GET 卡片" });

  f.beat(3);
  f.box({ x: 316, y: 132, w: 112, h: 48, hue: 'blue', title: '/a2a/jsonrpc', sub: 'JSONRPC 1.0', titleSize: 11.5, pad: 8 });
  f.box({ x: 436, y: 132, w: 96, h: 48, hue: 'blue', title: '/a2a/rest', sub: 'HTTP+JSON 1.0', titleSize: 11.5, pad: 8 });
  f.arrow([372, 90], [372, 131], { style: 'call', label: 'POST SendMessage' });

  f.beat(4);
  ['SendMessage · SendStreamingMessage · GetTask', 'ListTasks · CancelTask · SubscribeToTask', "4 种推送配置操作 · GetExtendedAgentCard"]
    .forEach((line, index) => f.text(110, 209 + index * 15, line, { size: 11 }));

  f.beat(5);
  ['AgentCard · Task · TaskStatus · Message · Part', 'Artifact · TaskStatusUpdateEvent · TaskArtifactUpdateEvent']
    .forEach((line, index) => f.text(110, 276 + index * 15, line, { size: 11 }));

  f.beat(6);
  f.box({ x: 84, y: 358, w: 100, h: 64, hue: 'grey', title: "HTTP 路由器", sub: ['Handler', "路由 3 个路径"], titleSize: 12, pad: 8 });
  f.box({ x: 190, y: 358, w: 120, h: 64, hue: 'blue', title: "请求处理器", sub: ['Agent.send', "创建任务"], titleSize: 12, pad: 6 });
  f.box({ x: 316, y: 358, w: 92, h: 64, hue: 'teal', title: "任务存储", sub: ['Agent.tasks', "内存中"], titleSize: 12, pad: 8 });
  f.box({ x: 414, y: 358, w: 118, h: 64, hue: 'indigo', title: '广播', sub: ['Agent.broadcast', "SSE 和 webhook"], titleSize: 12, pad: 8 });

  f.beat(7);
  f.box({ x: 84, y: 442, w: 150, h: 50, hue: 'plum', title: 'run_tests()', sub: 'capture/agents.py', titleSize: 12, pad: 8 });
  f.box({ x: 242, y: 442, w: 120, h: 50, hue: 'plum', dash: 'dashed', title: '模型', sub: "套件未包含", titleSize: 12, pad: 8 });
  f.box({ x: 370, y: 442, w: 162, h: 50, hue: 'olive', dash: 'dashed', title: "Git、容器", sub: "套件未包含", titleSize: 12, pad: 8 });
});
