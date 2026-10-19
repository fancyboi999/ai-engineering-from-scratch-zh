'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-5-5', {
  height: 296,
  title: "一个 bundle 从 MCP 会话到四个读取方",
  desc: "左侧 ledger-arm64-O1 的 MCP 会话有八条记录、零 unknown，由 export_evidence_bundle 写出。中间 bundle-O1.json 原写入 178,853 字节，脱敏工具副本 178,398 字节，由七个 canonical JSON 数组组成。右侧四个读取方：rea inspect-evidence-bundle 打印八行与零 unknown 修订；rea evidence-export 写出 178,397 字节的 canonical-O1.json，JSON 相同；rea evidence-import 校验后报告 imported 8、total 8；O2 MCP 会话的 import_evidence_bundle 报告 imported 6、total 15，因为八条中两条已在该账本。",
}, f => {
  f.kicker(20, 18, "账本");
  f.kicker(260, 18, "文件");
  f.kicker(440, 18, "读取方");
  const session = f.box({ x: 20, y: 62, w: 180, h: 72, hue: 'indigo', title: "MCP 会话，O1", sub: ["8 记录，0 unknown", "一次连接的账本"] });
  const bundle = f.box({ x: 260, y: 62, w: 160, h: 72, hue: 'teal', title: 'bundle-O1.json', sub: ["写入 178,853 字节", "工具副本 178,398 字节", "7 个数组，canonical"] });
  f.arrow(session.right(), [bundle.x - 1, session.cy], { style: 'write', label: 'export' });
  const readers = [
    { y: 28, hue: 'blue', title: 'inspect-evidence-bundle', sub: "8 行，0 unknown" },
    { y: 88, hue: 'blue', title: 'evidence-export', sub: ["178,397 字节，相同 JSON", 'sha256 47160c2d'] },
    { y: 148, hue: 'blue', title: 'evidence-import', sub: "imported 8，total 8" },
    { y: 208, hue: 'indigo', title: 'import_evidence_bundle', sub: ["导入 O2 会话", "imported 6，total 15"] },
  ];
  readers.forEach(reader => f.box({ x: 440, y: reader.y, w: 180, h: reader.sub.length === 2 ? 52 : 44, hue: reader.hue, title: reader.title, titleSize: 11, sub: reader.sub }));
  f.path('M420 98 H430 V50 H439', { style: 'call' });
  f.path('M420 98 H430 V114 H439', { style: 'call' });
  f.path('M420 98 H430 V170 H439', { style: 'call' });
  f.path('M420 98 H430 V234 H439', { style: 'call' });
  f.text(20, 170, "服务器写入 178,853 字节，工具脱敏路径并", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 185, "添加换行，故副本 178,398 字节；去除换行后，", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 200, "其摘要与 canonical-O1.json 相同。", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(440, 284, "8 条中 2 条已在账本", { size: 11, serif: true, hue: 'ink-soft' });
});
