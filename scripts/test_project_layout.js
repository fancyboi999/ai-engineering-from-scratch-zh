#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const assert = require('node:assert/strict');
const rootIndex = process.argv.indexOf('--root');
const root = rootIndex < 0 ? path.resolve(__dirname, '..') : path.resolve(process.argv[rootIndex + 1]);
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function main() {
  if (!fs.existsSync(chromePath)) throw Error('Project layout gate requires Chrome; set CHROME_PATH');
  const server = require(path.join(root, 'scripts/serve-agent-site')).createServer();
  // Actual local project pages, with all off-origin requests forbidden, not a UI screenshot test.
  server.prependListener('request', (_req, res) => res.setHeader('Content-Security-Policy', "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; img-src 'self' data:; frame-src 'self'"));
  const profile = fs.mkdtempSync('/tmp/aifs-project-layout-');
  let browser, socket, watchdog, browserError;
  const pending = new Map(); let nextId = 0;
  const rows = [];
  try {
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    browser = spawn(chromePath, ['--headless=new', '--disable-gpu', '--disable-extensions', '--disable-background-networking', '--no-first-run', '--no-default-browser-check', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
    browser.on('error', error => { browserError = error; });
    const active = path.join(profile, 'DevToolsActivePort');
    for (let attempt = 0; attempt < 200 && !browserError && !fs.existsSync(active); attempt++) await delay(50);
    if (browserError) throw browserError;
    if (!fs.existsSync(active)) throw Error('Chrome debugger startup failed; not a layout result');
    const port = fs.readFileSync(active, 'utf8').split('\n')[0];
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data); const operation = pending.get(message.id);
      if (!operation) return; pending.delete(message.id);
      if (message.error) operation.reject(Error(JSON.stringify(message.error))); else operation.resolve(message.result);
    });
    const command = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
      const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw Error(result.exceptionDetails.text);
      return result.result.value;
    };
    watchdog = setTimeout(() => { for (const operation of pending.values()) operation.reject(Error('Project DOM gate timed out')); socket.close(); }, 90000);
    await command('Page.enable');
    // 测试旧 URL 的重定向行为
    for (const id of ['agent-budget-planner', 'dataset-split-auditor']) {
      await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 900 });
      await command('Page.navigate', { url: `${base}/project.html?id=${id}` });
      let finalUrl;
      for (let attempt = 0; attempt < 200; attempt++) {
        try {
          const history = await command('Page.getNavigationHistory');
          finalUrl = new URL(history.entries[history.currentIndex].url).pathname;
        } catch (error) {
          // Chrome can briefly detach the page while a navigation commits.
          let protocolError;
          try { protocolError = JSON.parse(error.message); } catch (_) {}
          if (protocolError?.code !== -32000 || protocolError.message !== 'Not attached to an active page') throw error;
        }
        if (finalUrl === `/project/${id}/`) break;
        await delay(50);
      }
      assert.equal(finalUrl, `/project/${id}/`, `旧 URL /project.html?id=${id} 应重定向到 /project/${id}/`);
    }
    // 使用新的预渲染页面 URL 进行布局测试
    for (const width of [1440, 390]) for (const theme of ['light', 'dark']) for (const id of ['agent-budget-planner', 'dataset-split-auditor', 'research-report-agent', 'csv-repair-workbench', 'dataset-contract-gate', 'web-change-brief']) {
      await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: width, screenHeight: 900 });
      await command('Page.navigate', { url: `${base}/project/${id}/` });
      let loaded = false;
      for (let attempt = 0; attempt < 200; attempt++) {
        loaded = await evaluate("!!document.querySelector('#pjDoc pre .code-copy')");
        if (loaded) break; await delay(50);
      }
      if (!loaded) throw Error(`${id}: actual stage code did not load`);
      await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
      await delay(250);
      // Keyboard activation must retain focus and copy the original MDRender literal.
      const row = await evaluate(`(async function(){
        const pres=[...document.querySelectorAll('#pjDoc pre')].filter(pre=>pre.querySelector('code')&&pre.querySelector('.code-copy'));
        const pre=pres.sort((a,b)=>b.scrollWidth-a.scrollWidth)[0];
        const button=pre.querySelector('.code-copy');
        Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__copied=value;}}});
        // Select the longest block for the scroll check; inspect every native toolbar.
        const toolbars=pres.map(block=>{
          const copy=block.querySelector('.code-copy'), label=block.querySelector('.code-lang');
          const rect=copy.getBoundingClientRect(), codeRect=block.querySelector('code').getBoundingClientRect();
          return {width:rect.width,height:rect.height,codeBelow:codeRect.top>=rect.bottom,
            separated:!label||label.getBoundingClientRect().right<=rect.left,
            preserved:block.querySelector('code').textContent===copy.getAttribute('data-code')};
        });
        const lists=[...document.querySelectorAll('#pjDoc > :is(ul, ol), #pjDoc > :is(ul, ol) :is(ul, ol)')].map(list=>({
          indent:parseFloat(getComputedStyle(list).paddingInlineStart),left:list.getBoundingClientRect().left,
          marker:getComputedStyle(list).listStyleType,position:getComputedStyle(list).listStylePosition}));
        window.__targetCopy=button; button.focus();
        return {id:${JSON.stringify(id)},theme:${JSON.stringify(theme)},width:${width},toolbars,lists};
      })()`);
      await command('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
      await command('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
      await delay(30);
      Object.assign(row, await evaluate(`(function(){
        const button=window.__targetCopy, pre=button.closest('pre'), text=button.getAttribute('data-code');
        pre.scrollLeft=pre.scrollWidth;
        const strings=[...document.querySelectorAll('#pjProjectHero li')].map(li=>({text:li.textContent,href:li.querySelector('a')?.getAttribute('href')||null}));
        return {innerWidth:innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
          codeScheme:getComputedStyle(pre).colorScheme,focused:document.activeElement===button,disabled:button.disabled,
          focusVisible:button.matches(':focus-visible'),outlineStyle:getComputedStyle(button).outlineStyle,
          outlineWidth:parseFloat(getComputedStyle(button).outlineWidth),
          preWidth:pre.clientWidth,preScrollWidth:pre.scrollWidth,tailScroll:pre.scrollLeft,overflowX:getComputedStyle(pre).overflowX,
          copyPreserved:window.__copied===text,copyFeedback:button.textContent,codeChars:text.length,requirements:strings};
      })()`));
      row.layoutViewport = (await command('Page.getLayoutMetrics')).cssLayoutViewport;
      rows.push(row);
    }
    console.log(JSON.stringify({ root, rows }, null, 2));
    for (const row of rows) {
      assert.equal(row.innerWidth, row.width, 'Do not emulate a narrow screenshot with a wide layout viewport');
      assert.ok(row.scrollWidth <= row.clientWidth, `${row.id}@${row.width}: ${row.scrollWidth} > ${row.clientWidth}`);
      assert.ok(row.toolbars.length > 0);
      for (const toolbar of row.toolbars) {
        assert.ok(toolbar.width >= 44 && toolbar.height >= 44, `${row.id}@${row.width}: native copy target too small`);
        assert.ok(toolbar.codeBelow && toolbar.separated, 'Native toolbar must not overlap its label or code');
        assert.equal(toolbar.preserved, true, 'CSS must preserve every code literal');
      }
      if (row.id === 'dataset-contract-gate') assert.ok(row.lists.length > 0, 'Exercise actual Markdown lists, not figure-generated lists');
      assert.ok(row.lists.every(list => list.indent >= 20 && list.left >= 0 && list.marker !== 'none' && list.position === 'outside'), 'Native list markers need an in-page gutter');
      assert.equal(row.codeScheme, row.theme, 'Native scrollbars must follow the project theme');
      assert.equal(row.copyPreserved, true);
      assert.equal(row.copyFeedback, '已复制');
      assert.equal(row.focused, true); assert.equal(row.disabled, false);
      assert.equal(row.focusVisible, true);
      assert.notEqual(row.outlineStyle, 'none'); assert.ok(row.outlineWidth >= 2);
      assert.equal(row.overflowX, 'auto');
      if (row.preScrollWidth > row.preWidth) assert.ok(row.tailScroll > 0, 'Long code tail must remain reachable inside pre');
      assert.ok(row.requirements.every(item => item.text.trim() && item.href !== 'lesson.html?path='));
    }
  } finally {
    clearTimeout(watchdog); if (socket) socket.close();
    server.closeAllConnections(); server.close();
    if (browser && browser.pid && browser.exitCode === null) { const stopped = new Promise(resolve => browser.once('exit', resolve)); browser.kill(); await stopped; }
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
