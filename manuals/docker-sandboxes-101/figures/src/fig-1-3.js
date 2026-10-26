'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { title: '操作者', sub: '你的 shell', hue: 'grey' },
  { title: 'docker-agent', sub: 'v1.149.0', hue: 'violet' },
  { title: '.m101 目录', sub: '在工作区', hue: 'teal' },
  { title: 'sbx', sub: '与 sandboxd', hue: 'blue' },
  { title: '沙箱 VM', sub: '客户机', hue: 'blue' },
  { title: 'proxy :3128', sub: '在宿主', hue: 'indigo' },
  { title: 'Model Runner', sub: ':12434', hue: 'plum' },
];
const cx = index => 52 + index * 89;

const rows = [
  [0, 1, 'call', 'sandbox allow', 'localhost:12434'],
  [1, 2, 'write', '+ localhost:12434', '持久允许列表'],
  [0, 1, 'call', 'run --sandbox --exec', 'files-sandbox.yaml', 100],
  [1, 2, 'write', 'sandbox-kits/<hash>', '自动 kit'],
  [1, 3, 'call', 'create docker-agent-<hash>', 'docker-agent-sbx-templates:latest'],
  [3, 4, 'state', '已创建，running', 'cpu 10, memory 32 GiB'],
  [1, 5, 'write', 'allow models.dev', 'and localhost:12434'],
  [4, 2, 'fail', 'readonly database (1032)', '创建会话存储'],
  [0, 4, 'call', 'sbx exec docker-agent run', '数据目录 /tmp/m101'],
  [4, 5, 'model', 'host.docker.internal:12434', '经 HTTP_PROXY'],
  [5, 6, 'model', 'localhost:12434', '沙箱允许规则'],
  [6, 4, 'event', 'chat.completion.chunk', '流式答案'],
  [4, 0, 'reply', 'README.md with 1 line', 'exit 0'],
  [0, 3, 'call', 'sbx rm --force', null],
  [3, 4, 'state', 'removed', null],
];

module.exports = figure('fig-1-3', {
  height: 716,
  title: '一次 docker-agent run --sandbox 的逐步流程',
  desc: '七条生命线：操作者、宿主 v1.149.0 docker-agent、工作区 .m101 状态目录、sbx/sandboxd、VM、3128代理、12434 Model Runner。十五行：sandbox allow 写 localhost:12434；run --sandbox --exec 暂存 sandbox-kits/<hash>，请求从 docker-agent-sbx-templates:latest 创建 docker-agent-<hash>，以10 CPU/32 GiB运行，代理放行 models.dev 与 localhost:12434。内部会话存储报 readonly database (1032)。随后 sbx exec 以 /tmp/m101 数据目录运行；模型请求经代理从 host.docker.internal:12434 到 localhost:12434，chat.completion.chunk 流返回 README.md 一行答案；最后 rm --force 移除。',
}, f => {
  lanes.forEach((lane, index) => {
    f.box({ x: cx(index), y: 8, w: 86, h: 40, hue: lane.hue, title: lane.title, sub: lane.sub, titleSize: 11, anchor: 'middle', pad: 3 });
    f.lifeline(cx(index), 48, 708);
  });
  rows.forEach(([from, to, style, label, note, labelX], index) => {
    const y = 80 + index * 42;
    f.beat(index + 1);
    f.step(16, y, index + 1, { hue: style === 'fail' ? 'rose' : undefined });
    const x1 = cx(from);
    const x2 = cx(to);
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note: note || undefined, labelX });
  });
});

// 先用原标签计算图形尺寸，再只替换完整文字节点，保持几何与实测数据不变。
const readerCopy = {
  "proxy :3128": "代理 :3128",
  "sandbox allow": "沙箱放行",
  "cpu 10, memory 32 GiB": "CPU 10、内存 32 GiB",
  "allow models.dev": "允许 models.dev",
  "and localhost:12434": "及 localhost:12434",
  "README.md with 1 line": "README.md 含 1 行",
  "exit 0": "退出 0",
  "removed": "已移除"
};
module.exports = module.exports.replace(/>([^<]*)</g, (node, text) =>
  Object.prototype.hasOwnProperty.call(readerCopy, text) ? `>${readerCopy[text]}<` : node);
