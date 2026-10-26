'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-2-2', {
  height: 300,
  title: '根据启动失败的位置选择要调整的设置',
  desc: '启动可能在三个阶段失败：权重加载失败说明模型对当前 GPU 太大，可使用 FP8 权重或增加 GPU；内存检查失败说明其他程序占用了内存，应降低内存比例；KV 检查失败说明最大上下文需要的缓存超出空闲空间，应缩短最大上下文。',
}, f => {
  f.kicker(20, 18, '日志停止处');
  const stages = [
    { x: 20, title: '加载权重', sub: '加载日志行之前' },
    { x: 226, title: '内存检查', sub: '空闲内存不足' },
    { x: 432, title: 'KV 检查', sub: '最大序列长度需要' },
  ];
  stages.forEach(s => f.box({ x: s.x, y: 28, w: 188, h: 50, hue: 'blue', title: s.title, sub: s.sub }));
  f.kicker(20, 120, '原因');
  const causes = [
    { x: 20, title: '权重太大', sub: '当前 GPU 无法容纳' },
    { x: 226, title: '内存被共享', sub: '其他程序占用了内存' },
    { x: 432, title: '缓存不足', sub: '无法容纳完整请求' },
  ];
  causes.forEach(c => f.box({ x: c.x, y: 130, w: 188, h: 50, hue: 'rose', title: c.title, sub: c.sub }));
  f.kicker(20, 222, '调整方式');
  const fixes = [
    { x: 20, title: 'FP8 权重', sub: '或增加 GPU 并行数' },
    { x: 226, title: '降低内存比例', sub: '--gpu-memory-utilization' },
    { x: 432, title: '缩短上下文', sub: '--max-model-len' },
  ];
  fixes.forEach(c => f.box({ x: c.x, y: 232, w: 188, h: 50, hue: 'green', title: c.title, sub: c.sub }));
  [114, 320, 526].forEach(x => {
    f.arrow([x, 78], [x, 129], { style: 'fail' });
    f.arrow([x, 180], [x, 231], { style: 'call' });
  });
});
