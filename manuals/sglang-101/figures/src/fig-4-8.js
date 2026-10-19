'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-4-8', {
  height: 330,
  title: "约束请求从到达到采样",
  desc: "带 json_schema 的请求到达 grammar manager，以 json 加 schema 为键查缓存。命中直接进入等待队列；未命中在线程池编译，请求在语法队列等待所有 rank 就绪。每个 decode 步语法填充词表 bitmask，遮蔽 logits 后 sampler 选 token，语法再接受该 token。",
}, f => {
  const req = f.box({ x: 20, y: 30, w: 190, h: 48, hue: 'olive', title: "请求", sub: 'sampling_params.json_schema' });
  const cache = f.box({ x: 240, y: 30, w: 170, h: 48, hue: 'blue', title: "语法缓存", sub: 'key ("json", schema)' });
  const waiting = f.box({ x: 460, y: 30, w: 160, h: 48, hue: 'amber', title: "等待队列", sub: "可以调度" });
  f.arrow(req.right(), [239, 54], { style: 'call' });
  f.arrow(cache.right(), [459, 54], { style: 'state', label: "命中" });
  const pool = f.box({ x: 240, y: 130, w: 170, h: 48, hue: 'blue', title: "线程池", sub: "编译，返回 future" });
  const gq = f.box({ x: 460, y: 130, w: 160, h: 48, hue: 'amber', title: "语法队列", sub: "所有 rank 都就绪？" });
  f.arrow(cache.bottom(), pool.top(), { style: 'call', label: "未命中" });
  f.arrow(pool.right(), [459, 154], { style: 'state' });
  f.arrow(gq.top(), waiting.bottom(), { style: 'state', label: "就绪" });
  const logits = f.box({ x: 20, y: 240, w: 170, h: 48, hue: 'violet', title: 'logits', sub: "每请求一行" });
  const mask = f.box({ x: 240, y: 240, w: 170, h: 48, hue: 'blue', title: "词表 bitmask", sub: "移除无效 token" });
  const sampler = f.box({ x: 460, y: 240, w: 160, h: 48, hue: 'violet', title: 'sampler', sub: "选择有效 token" });
  f.arrow(logits.right(), [239, 264], { style: 'model' });
  f.arrow(mask.right(), [459, 264], { style: 'model' });
  f.kicker(20, 226, "每个 decode 步");
  f.text(20, 316, "采样后语法接受 token，并更新状态", { size: 11, serif: true, hue: 'ink-soft' });
});
