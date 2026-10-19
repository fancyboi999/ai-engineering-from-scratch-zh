'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const xOf = seconds => Math.round(60 + (seconds * 560) / 340);
const marks = [
  { n: 1, seconds: 6.3, text: "6.3 s：本 Mac 的 list_procedures，ledger-arm64-O1，33,872 字节" },
  { n: 2, seconds: 64, text: "约 64 s：文档中 WSL2 / Linux x64 的 binary_overview" },
  { n: 3, seconds: 163, text: "约 163 s：文档中 Windows x64 的 binary_overview，默认 60 s 超时" },
];

module.exports = figure('fig-8-2', {
  height: 352,
  title: "两个截止时间与三次实测首次调用",
  desc: "横轴 0 至 340 秒。灰条 0 至 60 秒为 SDK 2.3.1 客户端默认 60,000 ms；灰虚线条 0 至 240 秒为文档示例客户端设置；蓝条 0 至 330 秒为 rea 启动 deadline 330,000 ms。三个编号标记是实测首次调用：本 Mac 上 33,872 字节 ledger-arm64-O1 的 list_procedures 为 6.3 秒；文档中 WSL2 下 Linux x64 的 binary_overview 约 64 秒；Windows x64 约 163 秒，后者默认 60 秒会超时。",
}, f => {
  f.text(60, 44, "客户端默认 60,000 ms（SDK 2.3.1）", { size: 11, hue: 'grey' });
  f.rect(xOf(0), 50, xOf(60) - xOf(0), 16, { fill: color('grey-fill'), stroke: color('grey-ink') });
  f.text(60, 94, "文档示例客户端设置，240,000 ms", { size: 11, hue: 'grey' });
  f.rect(xOf(0), 100, xOf(240) - xOf(0), 16, { fill: 'none', stroke: color('grey-ink'), dash: 'dashed' });
  f.text(60, 144, "rea 启动截止 330,000 ms，REA_GHIDRA_STARTUP_TIMEOUT_MS", { size: 11, hue: 'blue' });
  f.rect(xOf(0), 150, xOf(330) - xOf(0), 16, { fill: color('blue-fill'), stroke: color('blue-ink') });
  f.text(60, 194, "实测首次 Ghidra 调用", { size: 11, hue: 'violet' });
  for (const mark of marks) {
    f.rule(xOf(mark.seconds), 219, xOf(mark.seconds), 236, { hue: 'violet', dash: 'dashed', width: 1.2 });
    f.step(xOf(mark.seconds), 210, mark.n, { hue: 'violet' });
  }
  f.rule(60, 236, 620, 236, { hue: 'ink' });
  for (const seconds of [0, 60, 120, 180, 240, 300]) {
    const x = xOf(seconds);
    f.rule(x, 232, x, 240, { hue: 'ink' });
    f.text(x, 254, `${seconds} s`, { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
  f.kicker(20, 282, "实测首次调用");
  marks.forEach((mark, index) => {
    const y = 302 + index * 18;
    f.step(30, y - 4, mark.n, { hue: 'violet' });
    f.text(48, y, mark.text, { size: 11, serif: true });
  });
});
