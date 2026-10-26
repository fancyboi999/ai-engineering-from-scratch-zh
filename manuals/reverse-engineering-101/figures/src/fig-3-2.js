'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-3-2', {
  height: 232,
  title: "录制 Mac 上的两种布局命令",
  desc: "左侧：rea inspect-binary-layout 对 ledger-x86_64-O1.o 调用 pwntools-elf provider，其配置仅支持 Linux x64，因此返回 capability_unavailable，类别 unsupported_provider，命令退出 1。右侧：rea inspect-macho 对 ledger-arm64-O1 调用 native-macos，通过 xcrun 查找并运行 lipo、otool、nm、dyld_info、dwarfdump、vtool，返回含 17 条加载命令、4 段的 Evidence 记录，退出 0。",
}, f => {
  f.kicker(20, 18, 'A · inspect-binary-layout');
  f.kicker(336, 18, 'B · inspect-macho');
  f.rule(320, 8, 320, 224, { dash: 'dashed' });
  const left = [
    { hue: 'blue', title: 'rea inspect-binary-layout', sub: 'fixtures/ledger-x86_64-O1.o' },
    { hue: 'blue', title: '提供方 pwntools-elf', sub: "需要 Linux x64 和 REA_PWNTOOLS_PYTHON" },
    { hue: 'rose', title: 'capability_unavailable', sub: "unsupported_provider · 退出 1", dash: 'dashed' },
  ];
  const right = [
    { hue: 'blue', title: 'rea inspect-macho', sub: 'fixtures/ledger-arm64-O1' },
    { hue: 'grey', title: 'otool nm dyld_info dwarfdump', sub: "另有 lipo、vtool，均通过 xcrun 查找" },
    { hue: 'green', title: '证据 ev_497834aa', sub: "17 条加载命令 · 4 段 · 退出 0" },
  ];
  [[left, 20, ['call', 'fail']], [right, 336, ['call', 'reply']]].forEach(([column, x, styles]) => {
    column.forEach((item, index) => {
      const y = 30 + index * 70;
      f.box({ x, y, w: 284, h: 46, ...item });
      if (index < column.length - 1) f.arrow([x + 142, y + 46], [x + 142, y + 69], { style: styles[index], packet: false });
    });
  });
});
