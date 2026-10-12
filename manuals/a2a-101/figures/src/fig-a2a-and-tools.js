'use strict';

const { figure } = require('../../../_shared/figkit.js');

const agents = [
  { title: 'test-runner :41241', skills: ['run-tests'], tool: ["Git、CI 执行器", "检出提交，运行测试"] },
  { title: 'code-reviewer :41242', skills: ['review-diff', 'answer-question'], tool: ['Git', "获取基准分支"] },
  { title: 'deployer :41243', skills: ['deploy'], tool: ["部署 API", "发布到 staging"] },
];

const colW = 186;
const xs = [20, 227, 434];

module.exports = figure('fig-a2a-and-tools', {
  height: 414,
  title: "agent 之间用 A2A，各自内部用工具",
  desc: "客户端 agent planner 通过 A2A 向三个远程 agent 发送 SendMessage：端口 41241 的 test-runner 提供 run-tests 技能，端口 41242 的 code-reviewer 提供 review-diff 和 answer-question，端口 41243 的 deployer 提供 deploy。planner 只看到卡片和端点。虚线下的内容对 planner 隐藏，各 agent 运行自身逻辑，把各自系统作为工具：test-runner 用 Git 和 CI 执行器，code-reviewer 用 Git，deployer 用部署 API。",
}, f => {
  f.kicker(20, 18, "客户端 agent");
  const planner = f.box({ x: 170, y: 26, w: 300, h: 44, hue: 'violet', title: 'planner', sub: "交付 payments-api：测试、审查、部署" });

  f.kicker(20, 96, "A2A · planner 可见内容");
  f.rule(20, 102, 620, 102, { dash: 'dashed' });
  f.kicker(20, 230, "对 planner 隐藏");
  f.rule(20, 236, 620, 236, { dash: 'dashed' });
  f.text(320, 404, "套件用 Python 模拟这些系统。真实 agent 通过 MCP 或任意 API 调用它们。", { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });

  f.beat(1);
  agents.forEach((agent, index) => {
    const x = xs[index];
    const mid = x + colW / 2;
    f.path(`M${planner.cx} ${planner.y + planner.h} V112 H${mid} V139`, { style: 'call' });
    f.text(mid + 6, 132, 'SendMessage', { size: 11.5 });
    f.box({ x, y: 140, w: colW, h: 62, hue: 'blue', title: agent.title, sub: agent.skills, titleSize: 12 });
  });

  f.beat(2);
  const logic = agents.map((agent, index) => f.box({ x: xs[index], y: 248, w: colW, h: 44, hue: 'plum', title: "自身逻辑", sub: "模型与代码", titleSize: 12 }));

  f.beat(3);
  agents.forEach((agent, index) => {
    const x = xs[index];
    const mid = x + colW / 2;
    f.arrow([mid, logic[index].y + logic[index].h], [mid, 335], { style: 'call', label: "工具调用", knock: true });
    f.box({ x, y: 336, w: colW, h: 46, hue: 'olive', title: agent.tool[0], sub: agent.tool[1], titleSize: 12 });
  });
});
