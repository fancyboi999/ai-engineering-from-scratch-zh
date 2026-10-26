'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-6-3', {
  height: 236,
  title: '拆分 prefill 和 decode：KV cache 在两台服务器间传输',
  desc: 'Router 将新请求发给 prefill server，由它计算提示词并写入 KV cache。NixlConnector 将缓存复制给 decode server，再由后者流式返回 token。两台服务器都要在 --kv-transfer-config 中设置 kv_connector。',
}, f => {
  const router = f.box({ x: 20, y: 60, w: 120, h: 54, hue: 'olive', title: 'router', sub: '选择两台服务器' });
  const pre = f.box({ x: 190, y: 20, w: 170, h: 54, hue: 'plum', title: 'prefill server', sub: '计算提示词' });
  const dec = f.box({ x: 190, y: 130, w: 170, h: 54, hue: 'plum', title: 'decode server', sub: '生成 token' });
  const kv = f.box({ x: 440, y: 76, w: 180, h: 54, hue: 'green', title: 'NixlConnector', sub: '复制 KV block' });
  f.arrow([140, 76], [189, 47], { style: 'call', label: '' });
  f.arrow([360, 47], [439, 92], { style: 'write' });
  f.arrow([439, 116], [361, 157], { style: 'write' });
  f.arrow([189, 157], [141, 100], { style: 'event' });
  f.text(20, 214, '两台服务器都设置 --kv-transfer-config，并指定 kv_connector 为 NixlConnector。', { size: 11.5, serif: true, hue: 'ink-soft' });
});
