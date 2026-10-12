'use strict';

const { figure, color } = require('../figkit.js');

module.exports = figure('tpl-flow', {
  height: 212,
  title: '所有变化经过同一队列',
  desc: '左侧三个写入者把变化送入队列，依次经过准备、存储、接纳和发布。右侧三个读取者只看已发布的结果。队列下方执行外部副作用，再将结果作为新提交送回队列。',
}, f => {
  f.kicker(20, 18, '写入者');
  f.kicker(176, 18, '每次一个提交');
  f.kicker(530, 18, '读取者');
  [['宿主', 'submit()', 30], ['任务步骤', 'commit()', 76], ['工具', 'api.commit()', 122]].forEach(([title, sub, y]) => {
    f.box({ x: 20, y, w: 130, h: 38, hue: 'grey', title, sub });
    f.path(`M150 ${y + 19} H163 V93 H175`, { style: 'call' });
  });
  f.rect(176, 58, 330, 70, { hue: 'teal' });
  const stages = [['准备', '草稿'], ['存储', '确定结果'], ['接纳', '修订'], ['发布', '入队']];
  stages.forEach(([title, sub], index) => {
    const x = 184 + index * 82;
    f.box({ x, y: 70, w: 72, h: 46, hue: index === 1 ? 'teal' : 'grey', title, sub, titleSize: 12, pad: 8 });
    if (index < stages.length - 1) f.line(x + 72, 93, x + 81, 93, { style: 'write' });
  });
  [['watch()', '帧', 30], ['wait()', '记录', 76], ['snapshot()', '值', 122]].forEach(([title, sub, y]) => {
    f.box({ x: 530, y, w: 90, h: 38, hue: 'indigo', title, sub, pad: 8, titleSize: 12 });
    f.path(`M506 93 H518 V${y + 19} H529`, { style: 'event' });
  });
  f.box({ x: 196, y: 160, w: 290, h: 42, hue: 'olive', title: '副作用：模型调用、工具', sub: '在队列外执行，以提交返回' });
  f.arrow([300, 159], [300, 129], { style: 'effect', label: '新提交' });
});
