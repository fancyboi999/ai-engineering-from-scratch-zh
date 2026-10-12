'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-3-5', {
  height: 300,
  title: 'api.github.com 的主机允许与 kit HTTP 规则',
  desc: '两列。左为 balanced 的 default-code-and-containers，允许 github.com:443及子域；携带数据正文的 POST api.github.com /repos/o/r/issues 被允许，因为主机规则只读主机/端口。右为 network-policy@2，对hosts api.github.com、methods DELETE拒绝，阻止DELETE /repos/o/r，原POST仍通过；拒绝只在方法匹配时优先。',
}, f => {
  f.kicker(20, 18, 'A · 主机允许，balanced 预设');
  f.kicker(336, 18, 'B · kit HTTP 规则，network-policy@2');
  f.rule(320, 8, 320, 292, { dash: 'dashed' });
  const left = [
    { hue: 'teal', title: 'default-code-and-containers', sub: ['github.com:443 · **.github.com:443', 'allow · net:connect:tcp'] },
    { hue: 'indigo', title: 'POST api.github.com /repos/o/r/issues', sub: '正文：你的数据', titleSize: 11.5 },
    { hue: 'indigo', title: '允许：任意方法、路径、正文', sub: '主机规则只读主机与端口' },
  ];
  const right = [
    { hue: 'teal', title: 'runtime.deny 条目', sub: ['hosts: [api.github.com]', 'methods: [DELETE]'] },
    { hue: 'rose', title: 'DELETE api.github.com /repos/o/r', sub: '被 HTTP 规则阻止', titleSize: 11.5 },
    { hue: 'indigo', title: 'POST /repos/o/r/issues 仍放行', sub: '拒绝仅在匹配处优先', titleSize: 11.5 },
  ];
  [[left, 20], [right, 336]].forEach(([column, x]) => {
    column.forEach((item, index) => {
      const y = 30 + index * 90;
      f.box({ x, y, w: 284, h: 60, ...item });
      if (index < column.length - 1) f.arrow([x + 142, y + 60], [x + 142, y + 89], { style: index === 0 ? 'call' : (item.hue === 'rose' ? 'fail' : 'state') });
    });
  });
});
