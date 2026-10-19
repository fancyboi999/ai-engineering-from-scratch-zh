'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-4-4', {
  height: 330,
  title: "SGLang 如何选择权重格式",
  desc: "四行各列 checkpoint 与量化参数。FP8 checkpoint 不加参数，以 fp8 运行。Modelopt checkpoint 配 modelopt_fp4 是已知兼容组合，可运行。GPTQ checkpoint 无参数时在运行时转换，使用 Marlin 内核。CUDA build 上 GPTQ checkpoint 配 gptq 参数会跳过转换，启动因 Unknown quantization method 失败。",
}, f => {
  f.kicker(20, 18, "Checkpoint quant_method");
  f.kicker(230, 18, '--quantization');
  f.kicker(430, 18, "启动结果");
  const rows = [
    { ckpt: 'fp8', flag: "未设置", result: 'fp8', sub: "从 checkpoint 读取", ok: true },
    { ckpt: 'modelopt', flag: 'modelopt_fp4', result: 'modelopt_fp4', sub: "已知兼容组合", ok: true },
    { ckpt: 'gptq', flag: "未设置", result: 'gptq_marlin', sub: "运行时转换", ok: true },
    { ckpt: 'gptq', flag: 'gptq', result: "启动错误", sub: 'Unknown quantization method', ok: false },
  ];
  rows.forEach((row, index) => {
    const y = 30 + index * 74;
    const ckpt = f.box({ x: 20, y, w: 150, h: 48, hue: 'teal', title: row.ckpt, sub: "磁盘权重" });
    const flag = f.box({ x: 230, y, w: 150, h: 48, hue: 'olive', title: row.flag, sub: "你的命令行" });
    f.box({ x: 430, y, w: 190, h: 48, hue: row.ok ? 'violet' : 'rose', title: row.result, sub: row.sub, dash: row.ok ? undefined : 'dashed' });
    f.arrow(ckpt.right(), [229, y + 24], { style: 'call' });
    f.arrow(flag.right(), [429, y + 24], { style: row.ok ? 'call' : 'fail' });
  });
});
