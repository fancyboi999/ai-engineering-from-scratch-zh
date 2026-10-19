'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-3-1', {
  height: 320,
  title: "ledger-arm64-O1 的 inspect-artifact 记录",
  desc: "rea-artifact-graph provider 的一条 Evidence 记录。对象为 33872 字节 Mach-O 文件 ledger-arm64-O1，SHA-256 以 01b5d08b 开头。inventory_artifact 子步骤生成含一个节点、一个出现位置、零条边的声明。未探索分支说明尚未运行 open_binary；下一探查指向 open_binary，权威来源 native-analysis-provider。",
}, f => {
  f.kicker(20, 18, "记录");
  f.kicker(360, 18, "观察结果");
  const record = f.box({ x: 20, y: 26, w: 280, h: 62, hue: 'teal', title: 'Evidence ev_0e878985', sub: ["操作 inspect_artifact", "confidence observed · 不运行分析引擎"] });
  const subject = f.box({ x: 360, y: 26, w: 260, h: 62, hue: 'green', title: "对象 ledger-arm64-O1", sub: ["格式 mach-o · 33872 字节", "sha256 以 01b5d08b 开头"] });
  f.arrow(record.right(), [subject.x - 1, record.cy], { style: 'call', label: 'hashes', packet: false });
  const substep = f.box({ x: 20, y: 118, w: 280, h: 62, hue: 'blue', title: "子步骤 inventory_artifact", sub: ["状态 completed · 独立 Evidence", "声明 agm_8e2e5c4c · 1 节点 · 0 边"] });
  f.arrow(record.bottom(), [record.cx, substep.y - 1], { style: 'call', label: 'runs', packet: false });
  const occurrence = f.box({ x: 360, y: 118, w: 260, h: 62, hue: 'green', title: "出现位置 occ_35a9bb48", sub: ["logical_path . · entry_kind file", "类型 executable · hash 已校验"] });
  f.arrow(substep.right(), [occurrence.x - 1, substep.cy], { style: 'call', label: 'records', packet: false });
  const branch = f.box({ x: 20, y: 210, w: 280, h: 62, hue: 'amber', dash: 'dashed', title: 'unexplored_branches[0]', sub: ["原因 format-specific-analysis-required", "尚未运行 open_binary"] });
  f.arrow(substep.bottom(), [substep.cx, branch.y - 1], { style: 'state', label: 'leaves', packet: false });
  const probe = f.box({ x: 360, y: 210, w: 260, h: 62, hue: 'blue', title: "下一探查 open_binary", sub: ["权威来源 native-analysis-provider", "先绑定一个深度 provider"] });
  f.arrow(branch.right(), [probe.x - 1, branch.cy], { style: 'state', label: 'next', packet: false });
  f.text(20, 304, "覆盖 complete-within-substeps · 1 子步骤 · 1 观察 · 1 分支 · 1 探查 · 0 省略", { size: 11, serif: true, hue: 'ink-soft' });
});
