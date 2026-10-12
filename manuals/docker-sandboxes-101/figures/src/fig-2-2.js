'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-2-2', {
  height: 292,
  title: '从停止沙箱到模板、tar和新沙箱',
  desc: '顶行从左到右：带标记文件的已停止 m101-demo，template save 将 library/m101-tpl:v1 写运行时镜像存储，--output 导出 OCI 布局 m101-tpl.tar。底行：create --pull never -t m101-tpl:v1 从存储创建带标记的 m101-from-tpl；tar 复制到另一宿主，由 template load 导入。',
}, f => {
  f.kicker(20, 40, '在录制 Mac');
  const demo = f.box({ x: 20, y: 60, w: 150, h: 65, hue: 'blue', title: 'm101-demo', sub: ['sbx stop m101-demo', '/opt/marker-from-demo'] });
  const store = f.box({ x: 260, y: 60, w: 170, h: 65, hue: 'green', title: '运行时镜像存储', sub: ['library/m101-tpl:v1', 'flavor shell'] });
  const tar = f.box({ x: 490, y: 60, w: 130, h: 65, hue: 'green', title: 'm101-tpl.tar', sub: ['OCI layout', 'blobs/sha256/'] });
  const fresh = f.box({ x: 260, y: 200, w: 170, h: 65, hue: 'blue', title: 'm101-from-tpl', sub: ['无工作区挂载', '/opt/marker-from-demo'] });
  const other = f.box({ x: 490, y: 200, w: 130, h: 65, hue: 'grey', title: '另一宿主', sub: ['sbx template load', 'm101-tpl.tar'] });
  f.arrow(demo.right(), [store.x - 1, demo.cy], { style: 'write', label: 'template save', labelSize: 11, note: '先停止' });
  f.arrow(store.right(), [tar.x - 1, store.cy], { style: 'write', label: '--output', labelSize: 11, note: 'tar文件' });
  f.arrow(store.bottom(), [store.cx, fresh.y - 1], { style: 'call', label: 'sbx create shell', note: '--pull never -t m101-tpl:v1' });
  f.arrow(tar.bottom(), [tar.cx, other.y - 1], { style: 'effect', label: '复制', note: '手动' });
  f.text(20, 284, '另一宿主的加载依据帮助，未录制', { size: 11, serif: true, hue: 'ink-soft' });
});
