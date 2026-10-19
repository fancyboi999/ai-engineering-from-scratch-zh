'use strict';

const { figure } = require('../../../_shared/figkit.js');

const entries = [
  ['project/ home/ tmp/ cache/ config/ data/', "rea-project 以 -readOnly -deleteProject 导入 · 私有 HOME、tmpdir、缓存", 'violet'],
  ['target-01b5d08b08fb.bin', "ledger-arm64-O1 副本，边复制边哈希 · Ghidra 文档", 'green'],
  ['session.json', 'transport, endpoint_path, token, run_id, target_sha256, provider_version, profile_digest', 'violet'],
  ['bridge.sock', "桥接器绑定的 Unix socket，权限 rw-------，接受一个客户端", 'violet'],
  ['ownership.json', "用于核验后取消的进程归属记录", 'violet'],
  ['ghidra.log · script.log', "analyzeHeadless 的 -log 与 -scriptlog 文件", 'violet'],
];

module.exports = figure('fig-4-2', {
  height: 426,
  title: "一次 Ghidra 会话的私有运行根目录",
  desc: "目录名由 rea-ghidra- 加随机后缀组成，由 GhidraClient start() 创建，close_binary 后删除。包含六个 Ghidra 目录、名为 target-01b5d08b08fb.bin 的目标哈希副本、带七个键的 session.json 描述符、bridge.sock Unix socket、ownership.json，以及 ghidra.log 和 script.log。",
}, f => {
  f.kicker(20, 18, "会话根目录 · 每次 start() 一个");
  f.box({ x: 20, y: 26, w: 600, h: 50, hue: 'violet', title: 'rea-ghidra-<random>', sub: "GhidraClient start() 创建，close_binary 后删除" });
  f.rule(40, 76, 40, 392, { hue: 'violet' });
  entries.forEach(([title, sub, hue], index) => {
    const y = 100 + index * 54;
    f.rule(40, y + 22, 58, y + 22, { hue: 'violet' });
    f.box({ x: 60, y, w: 560, h: 44, hue, title, sub, align: 'left', titleSize: 12 });
  });
});
