'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-6-1b', {
  height: 300,
  title: "一个模型的两个数据并行副本",
  desc: "数据并行控制器接收请求，轮流交给两个模型世界，因为未做 prefill-decode 分离时 load-balance-method auto 解析为 round_robin。世界 0 使用 g0 至 g3，世界 1 使用 g4 至 g7，各有独立 scheduler 与 KV 缓存。",
}, f => {
  const controller = f.box({ x: 170, y: 20, w: 300, h: 48, hue: 'blue', title: "数据并行控制器", sub: ["--load-balance-method auto：round_robin"] });
  const worlds = [
    { x: 20, name: "世界 0 · --tp-size 4", first: 0, reqs: "请求 1、3、5" },
    { x: 340, name: "世界 1 · --tp-size 4", first: 4, reqs: "请求 2、4、6" },
  ];
  for (const world of worlds) {
    f.rect(world.x, 150, 280, 136, { hue: 'blue' });
    f.text(world.x + 12, 170, world.name, { size: 12, weight: 700, hue: 'blue' });
    for (let i = 0; i < 4; i += 1) {
      f.box({ x: world.x + 12 + i * 66, y: 182, w: 58, h: 26, hue: 'grey', title: `g${world.first + i}`, titleSize: 12 });
    }
    f.box({ x: world.x + 12, y: 220, w: 256, h: 50, hue: 'green', title: "独立 KV 缓存", sub: ["另一世界不可见"] });
  }
  f.arrow([controller.x + 60, controller.y + controller.h], [160, 149], { style: 'call', label: worlds[0].reqs });
  f.arrow([controller.x + 240, controller.y + controller.h], [480, 149], { style: 'call', label: worlds[1].reqs });
});
