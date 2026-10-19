#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const assert = require('node:assert/strict');
const rootFlag = process.argv.indexOf('--root');
const root = rootFlag < 0 ? path.resolve(__dirname, '..') : path.resolve(process.argv[rootFlag + 1]);
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const longChinese = '这是一个需要保持完整可访问名称的很长中文阶段名称'.repeat(4);
const longMixed = 'LLM Engineering 与需要验证的中文阶段名称 Long Delivery Pipeline '.repeat(3);

async function main() {
  if (!fs.existsSync(chromePath)) throw Error('UI display gate requires Chrome; set CHROME_PATH');
  const data = vm.runInNewContext(fs.readFileSync(path.join(root, 'site/data.js'), 'utf8') + '\n({PHASES,ROADMAP_PREREQS})');
  const sourceServer = require(path.join(root, 'scripts/serve-agent-site')).createServer();
  const sourceRequest = sourceServer.listeners('request')[0];
  let fixture = 'long';
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Security-Policy', "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; img-src 'self' data:");
    if (new URL(req.url, 'http://localhost').pathname === '/data.js') {
      // Synthetic display data exists only in this response; never edit data.js or manifests.
      const phases = JSON.parse(JSON.stringify(data.PHASES));
      phases[0].name = longChinese; phases[1].name = longMixed; phases[2].name = '短名';
      res.setHeader('Content-Type', 'application/javascript'); res.setHeader('Cache-Control', 'no-store');
      res.end('const PHASES=' + JSON.stringify(fixture === 'empty' ? [] : phases) + ';const ROADMAP_PREREQS=' + JSON.stringify(fixture === 'empty' ? {} : data.ROADMAP_PREREQS) + ';const GLOSSARY=[];const LEARNING_PATHS=[];const ARTIFACTS=[];');
    } else sourceRequest(req, res);
  });
  const profile = fs.mkdtempSync('/tmp/aifs-ui-display-');
  let browser, browserError, socket, watchdog; let sequence = 0;
  const pending = new Map(), rows = [];
  try {
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    browser = spawn(chromePath, ['--headless=new', '--disable-gpu', '--disable-extensions', '--disable-background-networking', '--no-first-run', '--no-default-browser-check', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
    browser.on('error', error => { browserError = error; });
    const active = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 200 && !browserError && !fs.existsSync(active); i++) await delay(50);
    if (browserError) throw browserError;
    if (!fs.existsSync(active)) throw Error('Chrome startup failed; not a passing UI gate');
    const port = fs.readFileSync(active, 'utf8').split('\n')[0];
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    socket.addEventListener('message', event => { const result = JSON.parse(event.data), operation = pending.get(result.id); if (!operation) return; pending.delete(result.id); if (result.error) operation.reject(Error(JSON.stringify(result.error))); else operation.resolve(result.result); });
    const command = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    const evaluate = async expression => { const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.text); return result.result.value; };
    watchdog = setTimeout(() => { for (const operation of pending.values()) operation.reject(Error('UI DOM gate timeout')); socket.close(); }, 90000);
    await command('Page.enable'); await command('Network.setCacheDisabled', { cacheDisabled: true });
    for (const width of [390, 1440]) for (const kind of ['long', 'empty']) {
      fixture = kind;
      await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: width, screenHeight: 900 });
      await command('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/prereqs.html?displayFixture=${kind}` });
      let loaded = false;
      for (let i = 0; i < 200; i++) {
        loaded = await evaluate(kind === 'long' ? "document.querySelectorAll('.roadmap-node').length===20" : "!!document.querySelector('.roadmap-graph-message')");
        if (loaded) break; await delay(50);
      }
      if (!loaded) {
        rows.push(await evaluate("({width:innerWidth,fixture:" + JSON.stringify(kind) + ",message:document.getElementById('roadmapGraphWrap')?.textContent})"));
        console.log(JSON.stringify({ root, rows }, null, 2)); throw Error(`${kind}: synthetic UI did not reach its expected state`);
      }
      await evaluate('document.fonts.ready.then(()=>true)'); await delay(50);
      const row = await evaluate(`(function(){
        const nodes=[...document.querySelectorAll('.roadmap-node')].slice(0,3).map(node=>({id:node.getAttribute('data-phase'),title:node.querySelector('title')?.textContent||'',aria:node.getAttribute('aria-label'),lines:[...node.querySelectorAll('.roadmap-node-title')].map(text=>({text:text.textContent,width:text.getComputedTextLength()}))}));
        const fixtureHost=document.createElement('div'); fixtureHost.style.width='320px'; fixtureHost.style.maxWidth='100%';
        const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='/certifications.css';document.head.appendChild(sheet);
        return new Promise(resolve=>{sheet.onload=()=>{
          const field=document.createElement('fieldset');field.className='cert-question';
          const legend=document.createElement('legend');const head=document.createElement('div');head.className='cert-question-head';
          const text=document.createElement('span');text.textContent='很长的中文题目'+('UnbrokenLongQuestion'.repeat(50));head.appendChild(text);legend.appendChild(head);field.appendChild(legend);fixtureHost.appendChild(field);document.body.appendChild(fixtureHost);
          resolve({kind:${JSON.stringify(kind)},width:${width},innerWidth:innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,nodes,
            stats:['roadmapPhaseCount','roadmapLessonCount','roadmapProgressCount','roadmapNextPhase'].map(id=>document.getElementById(id)?.textContent),
            message:document.querySelector('.roadmap-graph-message')?.textContent||'',graphSvg:!!document.getElementById('roadmapGraph'),
            fieldset:{width:field.offsetWidth,clientWidth:field.clientWidth,scrollWidth:field.scrollWidth,minInlineSize:getComputedStyle(field).minInlineSize}});
        };});
      })()`);
      rows.push(row);
    }
    console.log(JSON.stringify({ root, rows }, null, 2));
    for (const row of rows) {
      assert.equal(row.innerWidth, row.width); assert.ok(row.scrollWidth <= row.clientWidth);
      assert.equal(row.fieldset.minInlineSize, '0px'); assert.ok(row.fieldset.width <= 320); assert.ok(row.fieldset.scrollWidth <= row.fieldset.clientWidth);
      if (row.kind === 'long') {
        assert.equal(row.nodes[0].title, longChinese); assert.equal(row.nodes[1].title, longMixed); assert.equal(row.nodes[2].title, '短名');
        assert.ok(row.nodes[0].aria.includes(longChinese)); assert.ok(row.nodes[1].aria.includes(longMixed));
        assert.equal(row.nodes[2].lines[0].text, '短名');
        for (const node of row.nodes) for (const line of node.lines) assert.ok(line.width <= 182, JSON.stringify(line));
      } else {
        assert.equal(row.message, '还没有已发布的阶段。'); assert.equal(row.graphSvg, false);
        assert.deepEqual(row.stats, ['0', '0', '0 / 0', '暂无阶段']);
      }
    }
    // Real shared header and generated glossary index, with external fonts blocked.
    for (const width of [1920, 1600, 1561, 1560, 1481, 1401, 1400, 820, 390, 320]) {
      await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await command('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/glossary.html` });
      let loaded = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        loaded = await evaluate("!!document.querySelector('.header-nav[aria-label=\"主导航\"]') && !!document.querySelector('.glossary-index-groups a')");
        if (loaded) break;
        await delay(50);
      }
      assert.ok(loaded, 'actual glossary/header did not initialize');
      await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
      const row = await evaluate(`(function(){
        const inner=document.querySelector('.header-inner'),logo=inner.querySelector('.logo');
        const range=document.createRange();range.selectNodeContents(logo);
        const boxes=[...inner.children].filter(e=>getComputedStyle(e).display!=='none'&&getComputedStyle(e).position!=='absolute').map(e=>({name:e.className,...e.getBoundingClientRect().toJSON()})).sort((a,b)=>a.left-b.left);
        const groups=document.querySelector('.glossary-index-groups');
        const group=groups.firstElementChild,heading=group.querySelector('h3'),link=group.querySelector('a');
        return {width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
          boxes,labelRight:range.getBoundingClientRect().right,logoRight:logo.getBoundingClientRect().right,
          columns:getComputedStyle(groups).gridTemplateColumns.split(' ').length,
          headingGap:link.getBoundingClientRect().top-heading.getBoundingClientRect().bottom,
          listStyle:getComputedStyle(group.querySelector('ul')).listStyleType};
      })()`);
      for (let index = 1; index < row.boxes.length; index++) {
        assert.ok(row.boxes[index].left >= row.boxes[index-1].right-1, JSON.stringify(row));
      }
      assert.ok(row.boxes.at(-1).right <= row.client+1, JSON.stringify(row));
      assert.ok(row.scroll <= row.client+1, JSON.stringify(row));
      if (width > 1400) assert.ok(row.labelRight <= row.logoRight+1, JSON.stringify(row));
      assert.equal(row.columns, width <= 600 ? 1 : width <= 1000 ? 2 : 3);
      assert.ok(row.headingGap >= 12, JSON.stringify(row));
      assert.equal(row.listStyle, 'none');
      console.log('header/glossary layout:', JSON.stringify({width,columns:row.columns,headingGap:row.headingGap,overlap:false}));
    }
  } finally {
    clearTimeout(watchdog); if (socket) socket.close(); server.closeAllConnections(); server.close();
    if (browser && browser.pid && browser.exitCode === null) { const stopped = new Promise(resolve => browser.once('exit', resolve)); browser.kill(); await stopped; }
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
