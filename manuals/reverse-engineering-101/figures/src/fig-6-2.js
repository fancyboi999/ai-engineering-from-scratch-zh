'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

function block(f, x, y, w, hue, head, lines) {
  const h = 26 + lines.length * 15 + 6;
  f.rect(x, y, w, h, { fill: color(`${hue}-fill`), stroke: color(`${hue}-ink`) });
  f.text(x + 10, y + 18, head, { size: 12, weight: 700, hue });
  lines.forEach((line, index) => f.text(x + 10, y + 36 + index * 15, line, { size: 11 }));
  return { x, y, w, h, cx: x + w / 2, bottom: y + h };
}

module.exports = figure('fig-6-2', {
  height: 416,
  title: "对 ledger.wasm 执行 inspect_wasm_artifact",
  desc: "顶行两个入口：CLI 命令 rea inspect-wasm-artifact 和 MCP tools/call inspect_wasm_artifact。两者到达 wabt-artifact provider，读取 REA_WABT_BIN_DIRECTORY=/opt/homebrew/bin，把 290 字节、SHA-256 699f6ff7 的 ledger.wasm 复制到私有工作区只读 module.wasm。第三行三个 WABT 1.0.42 程序对副本运行：wasm-validate --enable-all、wasm-objdump -h -x、wasm2wat --enable-all。底部是 observed 的 Evidence ev_3a09e4b0，含 validation valid、七个 section、一导入五导出的接口、SHA-256 37eab56a 的解码 WAT、tool profile 和五条 limitations。runtime_execution 与 network_fetch 为 not-performed。CLI 打印记录，MCP 以 structuredContent 返回同一记录并带不可信内容标记。",
}, f => {
  const cli = f.box({ x: 20, y: 28, w: 290, h: 48, hue: 'blue', title: 'rea inspect-wasm-artifact', sub: "CLI，1.5 s 后退出 0" });
  const mcp = f.box({ x: 330, y: 28, w: 290, h: 48, hue: 'indigo', title: 'tools/call inspect_wasm_artifact', sub: "MCP 步骤 24，404 ms 后 ok" });
  const adapter = f.box({ x: 20, y: 104, w: 600, h: 56, hue: 'blue', title: 'wabt-artifact 提供方，REA_WABT_BIN_DIRECTORY=/opt/homebrew/bin', titleSize: 12, sub: ["复制 ledger.wasm，290 字节、sha256 699f6ff7，至只读 module.wasm"] });
  f.arrow([cli.cx, 76], [cli.cx, adapter.y - 1], { style: 'call', label: 'path' });
  f.arrow([mcp.cx, 76], [mcp.cx, adapter.y - 1], { style: 'call', label: 'path' });

  const programs = [
    ['wasm-validate', '--enable-all', "结果：valid"],
    ['wasm-objdump', '-h -x', "结果：7 个 section"],
    ['wasm2wat', '--enable-all', "结果：已解码 WAT"],
  ].map(([tool, args, result], index) => {
    const x = 20 + index * 205;
    const box = f.box({ x, y: 196, w: 190, h: 62, hue: 'grey', title: tool, sub: [`${args}，版本 1.0.42`, result] });
    f.arrow([box.cx, adapter.y + adapter.h], [box.cx, box.y - 1], { style: 'call' });
    return box;
  });

  const record = block(f, 20, 294, 600, 'teal', '证据 ev_3a09e4b0，置信度 observed', [
    "节：Type、Import、Function、Memory、Export、Code、Data",
    "接口：1 个 import env.log，5 个带类型签名的 export",
    "wat: decoded-wat、sha256 37eab56a，tool_profile: 3 命令",
    "limitations: 5，runtime_execution 与 network_fetch 为 not-performed",
  ]);
  programs.forEach(box => f.arrow([box.cx, box.y + box.h], [box.cx, record.y - 1], { style: 'reply' }));
  f.text(20, record.bottom + 20, "CLI 打印本记录，MCP 以 structuredContent 返回同一 ID。", { size: 11, serif: true, hue: 'ink-soft' });
});
