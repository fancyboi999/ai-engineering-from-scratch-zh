'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-2-1', {
  height: 420,
  title: "SGLang 服务的三个进程",
  desc: "客户端向 PID 5782 主进程发送 POST /generate，主进程包含 HTTP 服务与 TokenizerManager。TokenizedGenerateReqInput 经 ZMQ 到运行 MLX 模型的 PID 5909 scheduler_0。BatchTokenIDOutput 送到 detokenizer，再以 BatchStrOutput 返回主进程，由主进程响应客户端。",
}, f => {
  const client = f.box({ x: 20, y: 16, w: 170, h: 40, hue: 'olive', title: "客户端", sub: ["curl 或基准程序"] });
  const main = f.box({ x: 20, y: 90, w: 170, h: 80, hue: 'blue', title: "主进程 · pid 5782", sub: ["HTTP 服务", 'TokenizerManager'] });
  const sched = f.box({ x: 235, y: 90, w: 190, h: 80, hue: 'blue', title: 'scheduler_0 · pid 5909', titleSize: 12, sub: ["队列与批次", "KV 池与基数树"] });
  const detok = f.box({ x: 470, y: 90, w: 150, h: 80, hue: 'blue', title: 'detokenizer', sub: ["token ID 转文本"] });
  const model = f.box({ x: 235, y: 214, w: 190, h: 48, hue: 'violet', title: "MLX 模型", sub: ['Qwen3-0.6B-4bit'] });

  f.arrow([70, client.y + client.h], [70, main.y - 1], { style: 'call' });
  f.step(52, 73, 1);
  f.arrow([main.x + main.w, 115], [sched.x - 1, 115], { style: 'event' });
  f.step(212, 101, 2);
  f.arrow([330, sched.y + sched.h], [330, model.y - 1], { style: 'model' });
  f.step(348, 192, 3);
  f.arrow([sched.x + sched.w, 115], [detok.x - 1, 115], { style: 'event' });
  f.step(447, 101, 4);
  f.path(`M545 ${detok.y + detok.h} L545 300 L105 300 L105 ${main.y + main.h + 1}`, { style: 'event' });
  f.step(470, 286, 5);
  f.arrow([150, main.y - 1], [150, client.y + client.h + 1], { style: 'reply' });
  f.step(168, 73, 6);

  f.kicker(20, 340, "按编号执行的步骤");
  const key = [
    ["HTTP 发送 POST /generate", 20, 362],
    ["ZMQ 发送 TokenizedGenerateReqInput", 20, 384],
    ["前向传播与采样", 20, 406],
    ["ZMQ 发送 BatchTokenIDOutput", 330, 362],
    ["ZMQ 发送 BatchStrOutput", 330, 384],
    ["带文本的 HTTP 响应", 330, 406],
  ];
  key.forEach(([label, x, y], index) => {
    f.step(x + 9, y - 4, index + 1);
    f.text(x + 26, y, label, { size: 11, serif: true, hue: 'ink-soft' });
  });
});
