'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

function block(f, x, y, w, hue, head, lines) {
  const h = 26 + lines.length * 15 + 6;
  f.rect(x, y, w, h, { fill: color(`${hue}-fill`), stroke: color(`${hue}-ink`) });
  f.text(x + 10, y + 18, head, { size: 12, weight: 700, hue });
  lines.forEach((line, index) => f.text(x + 10, y + 36 + index * 15, line, { size: 11 }));
  return { x, y, w, h, cx: x + w / 2, bottom: y + h };
}

module.exports = figure('fig-5-4', {
  height: 404,
  title: "一次 analyze_function 调用经过快照缓存",
  desc: "顶行：procedure _percent_change 的 analyze_function 通过可缓存检查，因为 Ghidra 将操作标为 cachePolicy snapshot、mutatesArtifact false，随后生成 query ID。中间：query ID 是 canonical JSON 的 SHA-256，内容包括目标摘要 01b5d08b08fb、kind executable、format mach-o、architecture arm64，provider ghidra 12.1.4 与 profile digest 3fc72c9b4b7 的绑定，以及操作和参数。左下命中后重放条目，并注明未重新运行 provider。右下未命中则 Ghidra bridge 回答，记录 Evidence ev_b492c85e，按 ID 存条目。末行：annotate_native_function 等修改操作在 rea 分派给 Ghidra 前就使缓存失效，即使后续响应失败，之后快照导出也会被拒绝。",
}, f => {
  const call = f.box({ x: 20, y: 28, w: 220, h: 52, hue: 'blue', title: 'analyze_function', sub: '{"procedure": "_percent_change"}' });
  const gate = f.box({ x: 270, y: 28, w: 160, h: 52, hue: 'grey', title: "可缓存？", sub: ['cachePolicy snapshot', 'mutatesArtifact false'] });
  const key = f.box({ x: 460, y: 28, w: 160, h: 52, hue: 'teal', title: "Query ID", sub: ["query_ 加 SHA-256"] });
  f.arrow(call.right(), [gate.x - 1, call.cy], { style: 'call' });
  f.arrow(gate.right(), [key.x - 1, gate.cy], { style: 'call', label: "是" });
  const contents = block(f, 20, 104, 600, 'teal', "query_ = canonical JSON 的 SHA-256", [
    'target: sha256 01b5d08b, executable, mach-o, arm64',
    'binding: provider ghidra 12.1.4, analysis_profile digest 3fc72c9b',
    'operation: analyze_function',
    'parameters: {"procedure": "_percent_change"}',
  ]);
  f.arrow([key.cx, 80], [key.cx, contents.y - 1], { style: 'call' });
  const hit = f.box({ x: 20, y: 236, w: 290, h: 74, hue: 'teal', title: "找到条目：重放", sub: ["添加限制：来自本地", "REA 分析快照；本次调用", "未重新运行 provider。"] });
  const miss = f.box({ x: 330, y: 236, w: 290, h: 74, hue: 'violet', title: "无条目：调用 Ghidra bridge", sub: ["目标首次调用需 5 至 7 s，", "随后记录 Evidence ev_b492c85e", "并按 ID 保存条目"] });
  f.arrow([165, contents.bottom], [165, hit.y - 1], { style: 'reply', label: "命中" });
  f.arrow([475, contents.bottom], [475, miss.y - 1], { style: 'call', label: "未命中" });
  const mutate = f.box({ x: 20, y: 334, w: 290, h: 56, hue: 'amber', title: 'annotate_native_function', sub: ["修改操作，在 rea", "分派给 Ghidra 之前"] });
  const off = f.box({ x: 330, y: 334, w: 290, h: 56, hue: 'rose', title: 'invalidateSnapshot', sub: ["即使调用失败也丢弃条目，", "查询未命中，拒绝快照导出"] });
  f.arrow(mutate.right(), [off.x - 1, mutate.cy], { style: 'state' });
});
