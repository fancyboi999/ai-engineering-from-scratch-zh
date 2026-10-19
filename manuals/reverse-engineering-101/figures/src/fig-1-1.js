'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const rea = [
  { hue: 'blue', title: "CLI 与 MCP", sub: ["153 条命令、207 个工具、6 个 prompt", "两者共用一个 BinarySession"] },
  { hue: 'blue', title: 'BinarySession', sub: ["一个目标、一个绑定 provider", "注册表只选择，不替换"] },
  { hue: 'teal', title: 'Evidence', sub: ["16 个字段、ev_ 内容 hash", "EvidenceLedger、快照、bundle"] },
  { hue: 'blue', title: "契约与错误", sub: ["各工具均有 Zod schema", 'code, category, message, retryable'] },
  { hue: 'violet', title: 'GhidraProvider, GhidraClient', sub: ["配置摘要、私有副本", "通过 bridge.sock 传递 JSON 行"] },
];
const ghidra = [
  { hue: 'violet', title: 'ReaGhidraBridge.java', sub: ["GhidraScript，最后的 -postScript", "一个 Program、一个 socket 客户端"] },
  { hue: 'violet', title: "analyzeHeadless 导入", sub: ["根据文件头选择加载器", "-readOnly，默认自动分析"] },
  { hue: 'violet', title: 'FunctionManager, ReferenceManager', sub: ["BasicBlockModel、Listing 文本", "此处 13 个过程、39 个字符串"] },
  { hue: 'violet', title: 'DecompInterface, decompile', sub: ["mac_arm_64 原生二进制", "伪代码与高层 p-code"] },
  { hue: 'violet', title: "Program 数据库", sub: ["地址、符号、引用", "关闭时删除：-deleteProject"] },
];

module.exports = figure('fig-1-1', {
  height: 492,
  title: "rea 统一什么，又将什么交给 Ghidra",
  desc: "宿主横栏下有两个栈，环境为 macOS 26.2 arm64、Node 22.22.0、JDK 21.0.12.1。左栈为 rea 6.7.0：共用一个 BinarySession 的 CLI 和 MCP 适配器，有 153 条命令、207 个工具、6 个 prompt；会话保持一个目标和一个注册表选定且不替换的 provider；EvidenceLedger 保存含 16 字段和 ev_ 内容 hash 的 Evidence；Zod 契约和含 code、category、message、retryable 的错误投影；GhidraProvider 与 GhidraClient 通过 bridge.sock 传递 JSON 行。右栈为 Ghidra 12.1.4：作为最后 post-script 的 ReaGhidraBridge.java；根据头部选择加载器的 analyzeHeadless 导入；发现 13 个过程、39 个字符串的 FunctionManager、ReferenceManager、BasicBlockModel；使用 mac_arm_64 原生 decompile 的 DecompInterface；关闭即删除的 Program 数据库。底部为产物 ledger-arm64-O1 及私有副本 target-01b5d08b08fb.bin。",
}, f => {
  f.rect(20, 28, 600, 30, { fill: color('paper'), stroke: color('ink-mute') });
  f.text(30, 47, "宿主 · macOS 26.2 arm64 · Node 22.22.0 · JDK 21.0.12.1 · 已设置 GHIDRA_INSTALL_DIR", { size: 11, hue: 'ink-soft' });
  f.rule(320, 66, 320, 414, { dash: 'dashed' });
  f.kicker(20, 80, "rea 6.7.0 · 统一的部分");
  f.kicker(336, 80, "Ghidra 12.1.4 · rea 交给它的部分");
  rea.forEach((item, index) => f.box({ x: 20, y: 90 + index * 66, w: 284, h: 56, titleSize: 12, ...item }));
  ghidra.forEach((item, index) => f.box({ x: 336, y: 90 + index * 66, w: 284, h: 56, titleSize: 12, ...item }));
  f.box({ x: 20, y: 424, w: 284, h: 56, hue: 'green', title: 'ledger-arm64-O1', sub: ["mach-o arm64，33872 字节", "sha256 以 01b5d08b 开头"], titleSize: 12 });
  f.box({ x: 336, y: 424, w: 284, h: 56, hue: 'green', title: 'target-01b5d08b08fb.bin', sub: ["Ghidra 导入的私有副本", "相同字节，关闭时删除"], titleSize: 12 });
});
