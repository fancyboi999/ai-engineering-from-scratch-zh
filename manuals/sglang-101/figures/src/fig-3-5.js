'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-3-5', {
  height: 330,
  title: "一个前缀经过 HiCache 三层",
  desc: "从左到右三层：L1 是 GPU KV 池，L2 为实例私有的锁页主机内存，L3 为 file、mooncake、hf3fs、nixl 等存储。write_through 首次命中即复制到 L2，write_through_selective 等第二次。L1 淘汰仍保留主机副本，后续匹配将主机部分载入新 GPU 槽位，领先计算一层。L3 命中不足 256 token 时跳过存储预取。",
}, f => {
  const l1 = f.box({ x: 20, y: 40, w: 150, h: 70, hue: 'green', title: "L1 · GPU 池", sub: ["设备内存", "请求与缓存"] });
  const l2 = f.box({ x: 245, y: 40, w: 150, h: 70, hue: 'teal', title: "L2 · 主机", sub: ["锁页内存", "单实例私有"] });
  const l3 = f.box({ x: 470, y: 40, w: 150, h: 70, hue: 'teal', title: "L3 · 存储", sub: ["服务器间共享", 'file, mooncake'] });
  f.kicker(20, 150, "前缀何时有主机副本");
  const rows = [
    ["write_through（默认）", "首次命中 · 阈值 1"],
    ['write_through_selective', "第二次命中 · 阈值 2"],
    ['write_back', "仅 L1 淘汰时"],
  ];
  rows.forEach(([policy, rule], index) => {
    const y = 162 + index * 34;
    f.box({ x: 20, y, w: 230, h: 28, hue: 'amber', title: policy, titleSize: 12, align: 'left' });
    f.text(266, y + 19, rule, { size: 12, serif: true });
  });
  f.kicker(20, 282, "v0.5.22 存储预取");
  f.text(20, 304, "匹配不足 256 token 则跳过 · 等待 1.0 s + 每 1,024 token 加 0.25 s", { size: 11.5, serif: true, hue: 'ink-soft' });
  f.beat(1);
  f.arrow([l1.x + l1.w, 60], [l2.x - 1, 60], { style: 'write', label: "复制" });
  f.beat(2);
  f.arrow([l2.x + l2.w, 60], [l3.x - 1, 60], { style: 'write', label: "备份" });
  f.beat(3);
  f.arrow([l3.x - 1, 96], [l2.x + l2.w + 1, 96], { style: 'reply', label: "取回" });
  f.beat(4);
  f.arrow([l2.x - 1, 96], [l1.x + l1.w + 1, 96], { style: 'reply', label: "载入" });
});
