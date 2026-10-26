'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-4-3', {
  height: 458,
  title: '从 spec.yaml 到签名产物，再入沙箱',
  desc: '首行已录：hello-mixin含spec.yaml/files，validate验证，pack写hello-mixin.zip。第二行未运行，依据帮助：sign --key写spec旁kit.sig.bundle，push --sign向HTTPS registry推manifest、签名/溯源referrer。第三行未运行：verify/provenance读回，旁有四项准入设置。第四行已录：create --kit建m101-kit，装tree并复制HELLO.md；kit add追加env-mixin至m101-demo的swap容器；hello-mixin因声明文件被拒。',
}, f => {
  f.kicker(20, 18, '编写/打包（12-validate.txt、12-pack.txt）');
  const dir = f.box({ x: 20, y: 28, w: 140, h: 52, hue: 'green', title: 'hello-mixin/', sub: ['spec.yaml, files/'] });
  const validate = f.box({ x: 180, y: 28, w: 130, h: 52, hue: 'blue', title: 'sbx kit validate', sub: ['VALID (directory)'], titleSize: 12, pad: 6 });
  const pack = f.box({ x: 330, y: 28, w: 130, h: 52, hue: 'blue', title: 'sbx kit pack -o', sub: ['Packed artifact to'], titleSize: 12, pad: 8 });
  const zip = f.box({ x: 480, y: 28, w: 140, h: 52, hue: 'green', title: 'hello-mixin.zip', sub: ['spec.yaml and files/'], pad: 8 });
  f.arrow(dir.right(), [validate.x - 1, dir.cy], { style: 'call' });
  f.arrow(validate.right(), [pack.x - 1, dir.cy], { style: 'call' });
  f.arrow(pack.right(), [zip.x - 1, dir.cy], { style: 'write' });

  f.kicker(110, 118, '签名/发布（help-sbx，未运行）');
  const sign = f.box({ x: 20, y: 128, w: 160, h: 66, hue: 'blue', dash: 'dashed', title: 'sbx kit sign --key', sub: ['写 kit.sig.bundle', '在 spec.yaml 旁'], titleSize: 12 });
  const push = f.box({ x: 200, y: 128, w: 180, h: 66, hue: 'blue', dash: 'dashed', title: 'sbx kit push --sign', sub: ['DIR REF，形式由', 'schemaVersion 1/2决定'], titleSize: 12 });
  const registry = f.box({ x: 400, y: 128, w: 220, h: 66, hue: 'grey', dash: 'dashed', title: 'HTTPS 镜像仓库', sub: ['manifest、config、一个层', '签名与溯源 referrers'], titleSize: 12 });
  f.arrow([dir.cx, 80], [dir.cx, 127], { style: 'call' });
  f.arrow(sign.right(), [push.x - 1, sign.cy], { style: 'call' });
  f.arrow(push.right(), [registry.x - 1, sign.cy], { style: 'write', label: 'push' });

  f.kicker(20, 232, '读回（未运行）');
  const verify = f.box({ x: 300, y: 242, w: 140, h: 52, hue: 'blue', dash: 'dashed', title: 'sbx kit verify', sub: ['--key cosign.pub'], titleSize: 12 });
  const provenance = f.box({ x: 460, y: 242, w: 160, h: 52, hue: 'blue', dash: 'dashed', title: 'sbx kit provenance', sub: ['UNSIGNED or VERIFIED'], titleSize: 12, pad: 8 });
  f.arrow([registry.cx - 50, 194], [verify.cx, 241], { style: 'reply', packet: false });
  f.arrow([registry.cx + 50, 194], [provenance.cx, 241], { style: 'reply', packet: false });
  f.box({ x: 20, y: 242, w: 276, h: 52, hue: 'teal', title: 'kit 准入设置', sub: ['kit.allowedSources, kit.requireSignature,', 'kit.trustedSigners, kit.allowLocalKits'], titleSize: 12 });

  f.kicker(20, 332, '消费（12-run-kit.txt、12-kit-add.txt、12-kit-add-files.txt）');
  f.box({ x: 20, y: 342, w: 200, h: 70, hue: 'blue', title: 'sbx create shell --kit', sub: ['m101-kit：安装tree，', 'HELLO.md, allow example.com'], titleSize: 12, pad: 8 });
  f.box({ x: 236, y: 342, w: 190, h: 70, hue: 'blue', title: 'sbx kit add env-mixin', sub: ['m101-demo重建于', 'swap容器，设置变量'], titleSize: 12, pad: 8 });
  f.box({ x: 442, y: 342, w: 178, h: 70, hue: 'rose', title: 'sbx kit add hello-mixin', sub: ['拒绝：kit', '声明文件'], titleSize: 11.5, pad: 8 });
  f.text(20, 440, '虚线框依据帮助、未运行；实线框来自 capture/out/12-*。', { size: 11, serif: true, hue: 'ink-soft' });
})
  // 保留冻结背景几何，只替换最终 SVG 中的完整文字节点。
  .replace(">push</text>", ">推送</text>");
