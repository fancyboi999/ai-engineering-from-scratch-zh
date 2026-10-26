'use strict';

const { figure } = require('../../../_shared/figkit.js');

const groups = [
  { label: '服务器无法启动', hue: 'rose', rows: [
    ['下载模型时卡住', '缓存目录大小', 'hf download'],
    ['模型不受支持', '错误中的架构名称', '支持列表'],
    ['driver 或 PTX 错误', '错误文本', '升级 driver'],
    ['KV cache 无法满足最大长度', '错误中的长度', '2.2'],
    ['空闲显存不足', 'nvidia-smi', '2.2'],
    ['FP8 KV cache 导致崩溃', 'backend 日志行', '2.4'],
    ['DGX Spark 显存不足', 'free -g', '2.3'],
    ['GB10 首次启动缓慢', 'Model loading took', '2.3'],
    ['编译阶段失败', 'torch.compile 错误', '清除缓存'],
    ['多 GPU 启动卡住', 'NCCL_DEBUG=TRACE', '6.1'],
    ['最大长度变短', '推导长度', '2.6'],
  ] },
  { label: '请求失败', hue: 'rose', rows: [
    ['HTTP 400，超出 context length', '错误中的 token 数', '缩短请求'],
    ['所有请求都失败', 'EngineCore 错误', '重启'],
  ] },
  { label: '服务器速度较慢', hue: 'amber', rows: [
    ['首 token 等待数秒', 'waiting 与 KV 使用率', '3.1'],
    ['并发用户多，token 间隔长', 'P99 对比中位数', '3.3'],
    ['preemption 增长', 'num_preemptions', '3.1'],
    ['N-gram 收益较低', 'async warning', '4.2'],
    ['eager mode 首次启动慢', '首批请求', '4.3'],
    ['GB10 上 NVFP4 较慢', 'TPOT 对比 0.28', '固定版本'],
  ] },
  { label: '输出不正确', hue: 'violet', rows: [
    ['回答开头包含 think', 'content 字段', '3.10'],
    ['命中缓存后重复一个 token', 'cache hit 与 spec', '关闭其中一个'],
    ['开启 spec 后 JSON 无效', '关闭 spec 再运行', '3.5'],
    ['不同运行输出变化', '单独发送相同请求', '3.8'],
  ] },
  { label: '基准测试结果异常', hue: 'olive', rows: [
    ['第二次运行更快', 'prefix cache hits', '5.1'],
  ] },
];

const ROW = 21;
const HEAD = 22;
const count = groups.reduce((n, g) => n + g.rows.length, 0);
const height = 34 + groups.length * HEAD + count * ROW + 6;

module.exports = figure('fig-7-1', {
  height,
  title: '每项排障信息：症状、第一项检查和修复位置',
  desc: '24 种症状分为五组：服务器无法启动、请求失败、服务器速度较慢、输出不正确和基准测试结果异常。每行给出优先检查的日志或指标，以及对应的修复章节或操作。',
}, f => {
  f.kicker(20, 18, '症状');
  f.kicker(300, 18, '首先检查');
  f.kicker(500, 18, '再修复');
  let y = 30;
  for (const group of groups) {
    f.rect(20, y + 3, 600, HEAD - 6, { hue: group.hue });
    f.text(28, y + 15, group.label, { size: 11, weight: 700, max: 580 });
    y += HEAD;
    for (const [symptom, check, then] of group.rows) {
      f.text(28, y + 14, symptom, { size: 11, max: 264 });
      f.text(300, y + 14, check, { size: 11, serif: true, hue: 'ink-soft', max: 190 });
      f.text(500, y + 14, then, { size: 11, hue: 'blue', max: 118 });
      f.rule(20, y + ROW, 620, y + ROW, { hue: 'grey' });
      y += ROW;
    }
  }
});
