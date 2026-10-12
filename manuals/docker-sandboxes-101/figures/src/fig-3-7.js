'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-3-7', {
  height: 440,
  title: '一次注册、两个网关、两份工具列表',
  desc: '宿主存一次m101-deepwiki，经add从https://mcp.deepwiki.com/mcp注册，无需OAuth的远程streamable-http。各沙箱独立MCP_GATEWAY_URL。静态m101-mcp列ask_wiki_question、read_wiki_contents、read_wiki_structure、code-mode、mcp-exec；动态m101-mcp-dyn起初code-mode、mcp-add、mcp-config-set、mcp-exec、mcp-find，load加入三工具并通知tools/list_changed。远程服务器在VM外，未录制OAuth。',
}, f => {
  f.kicker(20, 18, '宿主');
  f.kicker(350, 18, '沙箱');

  const remote = f.box({ x: 350, y: 26, w: 270, h: 50, hue: 'grey', title: 'mcp.deepwiki.com/mcp', sub: '远程端点，在VM外' });
  const store = f.box({ x: 20, y: 26, w: 270, h: 84, hue: 'olive', title: 'sbx mcp add m101-deepwiki', sub: ['--url https://mcp.deepwiki.com/mcp', 'remote · streamable-http', 'requires_oauth: false · auth status: []'] });
  f.arrow(store.right(26), [remote.x - 1, 52], { style: 'effect', label: '不受策略', labelX: 320 });

  const gw1 = f.box({ x: 70, y: 150, w: 230, h: 56, hue: 'olive', title: 'mcp-gateway-m101-mcp', sub: '静态 · --static-mcp' });
  const gw2 = f.box({ x: 70, y: 280, w: 230, h: 56, hue: 'olive', title: 'm101-mcp-dyn网关', sub: '动态 · sbx mcp load' });
  f.arrow([150, 110], [150, 149], { style: 'call', label: '创建时固定' });
  f.path('M40 110 V308 H69', { style: 'call' });
  f.text(48, 250, '实时加载', { size: 11.5, knock: true });

  const sb1 = f.box({ x: 380, y: 128, w: 240, h: 100, hue: 'blue', title: 'm101-mcp · tools/list', sub: ['ask_wiki_question read_wiki_contents', 'read_wiki_structure', 'code-mode mcp-exec', '无 mcp-find/mcp-add/mcp-config-set'] });
  const sb2 = f.box({ x: 380, y: 250, w: 240, h: 124, hue: 'blue', title: 'm101-mcp-dyn · tools/list', sub: ['before: code-mode mcp-add', 'mcp-config-set mcp-exec mcp-find', 'after load: + ask_wiki_question', 'read_wiki_contents', 'read_wiki_structure'] });
  f.arrow(gw1.right(), [sb1.x - 1, gw1.cy], { style: 'call', label: 'gateway URL', labelSize: 11 });
  f.arrow(gw2.right(), [sb2.x - 1, gw2.cy], { style: 'event', label: 'list_changed', labelSize: 11 });

  f.box({ x: 20, y: 386, w: 600, h: 40, hue: 'grey', dash: 'dashed', title: '<server>-authorize与sbx mcp auth：此次无OAuth服务器', titleSize: 11.5, weight: 400 });
});
