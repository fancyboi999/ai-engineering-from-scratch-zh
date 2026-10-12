'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-3-2', {
  height: 356,
  title: '提交从克隆回到宿主',
  desc: '左侧宿主 $CAPTURE/fixtures/repo-clone 的 main 为 c7dfd56，只读 virtiofs 挂载到 m101-clone 的 /run/sandbox/source。agent 在 ext4 私有克隆工作，origin 为该挂载，提交81e11df，push因只读被拒绝。git-daemon9418发布到回环，宿主 remote sandbox-m101-clone fetch 到 refs/remotes/sandbox-m101-clone/main 与 refs/sandboxes/m101-clone/main。rm后remote消失，后者保留。',
}, f => {
  f.kicker(20, 18, '宿主 · $CAPTURE/fixtures/repo-clone');
  f.kicker(350, 18, '沙箱m101-clone');

  const repo = f.box({ x: 20, y: 26, w: 270, h: 50, hue: 'green', title: '.git与工作树', sub: 'main at c7dfd56 second' });
  const mount = f.box({ x: 350, y: 26, w: 270, h: 50, hue: 'green', dash: 'dashed', title: '/run/sandbox/source', sub: 'virtiofs ro · Read-only file system' });
  f.arrow(repo.right(), [mount.x - 1, repo.cy], { style: 'call', label: '绑定挂载，ro' });

  f.box({ x: 350, y: 110, w: 270, h: 70, hue: 'green', title: '私有克隆，相同路径', sub: ['/dev/vde ext4 rw · origin为挂载', '81e11df from sandbox'] });
  f.arrow([560, 76], [560, 109], { style: 'call', label: 'git clone' });
  f.arrow([370, 110], [370, 77], { style: 'fail', label: 'git push: unpacker error' });

  f.box({ x: 350, y: 214, w: 270, h: 50, hue: 'blue', title: 'git-daemon :9418', sub: '发布为127.0.0.1:<port>->9418/tcp4' });
  f.arrow([485, 180], [485, 213], { style: 'call', label: '提供克隆' });

  f.box({ x: 20, y: 110, w: 270, h: 70, hue: 'teal', title: 'remote sandbox-m101-clone', sub: ['git://127.0.0.1:<port>/repo-clone', '.git/config 中两条fetch refspec'] });
  f.path('M349 239 H320 V145 H291', { style: 'write' });
  f.text(300, 200, 'git fetch sandbox-m101-clone', { size: 11, hue: 'teal', anchor: 'start', knock: true });

  f.box({ x: 20, y: 214, w: 270, h: 70, hue: 'teal', title: 'fetch之后', sub: ['sandbox-m101-clone/main 81e11df', 'refs/sandboxes/m101-clone/main 81e11df'] });
  f.arrow([155, 180], [155, 213], { style: 'write' });

  f.box({ x: 20, y: 308, w: 600, h: 36, hue: 'grey', title: 'sbx rm移除remote/守护进程，refs/sandboxes/m101-clone/main保留', titleSize: 11.5, weight: 400 });
  f.arrow([155, 284], [155, 307], { style: 'state', packet: false });
});
