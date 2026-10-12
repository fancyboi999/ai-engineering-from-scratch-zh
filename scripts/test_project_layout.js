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
    for (const width of [1440, 390]) for (const id of ['agent-budget-planner', 'dataset-split-auditor', 'research-report-agent']) {
      await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: width, screenHeight: 900 });
      await command('Page.navigate', { url: `${base}/project.html?id=${id}` });
      let loaded = false;
      for (let attempt = 0; attempt < 200; attempt++) {
        loaded = await evaluate("!!document.querySelector('#pjDoc pre .code-copy')");
        if (loaded) break; await delay(50);
      }
      if (!loaded) throw Error(`${id}: actual stage code did not load`);
      await delay(100);
      const row = await evaluate(`(async function(){
        const pres=[...document.querySelectorAll('#pjDoc pre')].filter(pre=>pre.querySelector('code')&&pre.querySelector('.code-copy'));
        const pre=pres.sort((a,b)=>b.scrollWidth-a.scrollWidth)[0];
        const button=pre.querySelector('.code-copy'); const text=button.getAttribute('data-code');
        const preserved=pre.querySelector('code').textContent===text;
        Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__copied=value;}}});
        button.click(); await new Promise(resolve=>setTimeout(resolve,20));
        pre.scrollLeft=pre.scrollWidth;
        const strings=[...document.querySelectorAll('#pjProjectHero li')].map(li=>({text:li.textContent,href:li.querySelector('a')?.getAttribute('href')||null}));
        return {id:${JSON.stringify(id)},width:${width},innerWidth:innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
          preWidth:pre.clientWidth,preScrollWidth:pre.scrollWidth,tailScroll:pre.scrollLeft,overflowX:getComputedStyle(pre).overflowX,
          codePreserved:preserved,copyPreserved:window.__copied===text,codeChars:text.length,requirements:strings};
      })()`);
      row.layoutViewport = (await command('Page.getLayoutMetrics')).cssLayoutViewport;
      rows.push(row);
    }
    console.log(JSON.stringify({ root, rows }, null, 2));
    for (const row of rows) {
      assert.equal(row.innerWidth, row.width, 'Do not emulate a narrow screenshot with a wide layout viewport');
      assert.ok(row.scrollWidth <= row.clientWidth, `${row.id}@${row.width}: ${row.scrollWidth} > ${row.clientWidth}`);
      assert.equal(row.codePreserved, true); assert.equal(row.copyPreserved, true);
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
