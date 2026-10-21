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
    if (new URL(req.url, 'http://localhost').pathname === '/data.js' && fixture !== 'real') {
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
    fixture = 'real';
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
    const menu = ['课程目录', '课程表', '路线图', '学习路径', '认证', '实战项目', '技术手册', '术语表', '速查表', '学习方法', 'Agent 技能', 'Agent 内部机制', '我的高亮', '关于'];
    const priorities = ['课程目录', '课程表', '学习路径'];
    const contexts = [
      ['index.html#contents', null, false], ['prereqs.html', '路线图', true],
      ['roadmap', '路线图', true], ['path', '路线图', true],
      ['catalog.html', '课程表', false], ['glossary.html', '术语表', true],
      ['projects.html', '实战项目', true], ['manuals.html', '技术手册', true],
      ['manual-reverse-engineering-101.html', '技术手册', true],
      ['contact.html', null, false], ['privacy.html', null, false], ['developer.html', null, false],
      ['skills.html', 'Agent 技能', true], ['how-to-learn.html', '学习方法', true],
      ['inside-an-ai-agent.html', 'Agent 内部机制', true], ['certifications.html', '认证', true],
      ['certification?id=claude-ccao-f', '认证', true],
      ['lessons/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/', '课程表', true],
      ['project/binary-inspector/', '实战项目', true],
      ['hubs/phase/tools-and-protocols.html', '课程表', true],
      ['hubs/glossary/activation-checkpointing.html', '术语表', true],
      ['cheatsheets/sglang-serving.html', '速查表', true],
    ];
    for (const width of [1920, 1280, 390]) {
      // Every generator on desktop; the two originally inconsistent pages at each breakpoint.
      for (const [page, active, narration] of (width === 1920 ? contexts : contexts.filter(([page]) => ['catalog.html', 'certifications.html', 'contact.html'].includes(page)))) {
        await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
        await command('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/${page}` });
        let ready = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          ready = await evaluate("document.readyState==='complete' && !!document.querySelector('.header-menu-toggle')");
          if (ready) break;
          await delay(50);
        }
        assert.ok(ready, page + ' header did not initialize');
        await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
        const state = await evaluate(`({
          links:[...document.querySelectorAll('.header-nav>a:not(.header-github)')].map(a=>a.textContent.trim()),
          priority:[...document.querySelectorAll('.header-priority-nav>a')].map(a=>a.textContent.trim()),
          active:document.querySelector('.header-nav a[aria-current="page"],.header-priority-nav a[aria-current="page"]')?.textContent.trim()||null,
          home:document.querySelector('.logo')?.getAttribute('aria-current'),
          narration:!!document.getElementById('ttsToggle'),
          narrationRequested:!!document.querySelector('script[data-aifs-tts]'),
          github:document.querySelectorAll('.site-header .header-github').length,
          searchSvg:!!document.querySelector('.search-toggle svg circle'),
          searchSize:[document.querySelector('.search-toggle').offsetWidth,document.querySelector('.search-toggle').offsetHeight],
          slot:!!document.querySelector('.header-narration-slot'),
          themeSize:['width','height'].map(key=>parseFloat(getComputedStyle(document.querySelector('#themeToggle'))[key]))
        })`);
        assert.deepEqual(state.links, width > 820 && width <= 1400 ? menu.filter(label => !priorities.includes(label)) : menu, page);
        assert.deepEqual(state.priority, width > 820 && width <= 1400 ? priorities : [], page);
        assert.equal(state.active, active, page);
        assert.equal(state.home, page.startsWith('index.html') ? 'page' : null, page);
        assert.equal(state.narration, narration, page);
        if (!narration) assert.equal(state.narrationRequested, false, page);
        assert.equal(state.github, 1, page);
        assert.equal(state.searchSvg, true, page);
        assert.deepEqual(state.searchSize, width <= 600 ? [44,44] : [36,36], page);
        assert.equal(state.slot, true, page);
        assert.deepEqual(state.themeSize, width > 1400 ? [36,36] : [44,44], page);
        console.log('shared navigation:', JSON.stringify({page,width,active,narration,consistent:true}));
      }
    }
    // Real content: narrow poster tables must stay in the card, not merely in
    // a document whose overflow is hidden. Include all generated topics.
    const sheetFiles = fs.readdirSync(path.join(root, 'site/cheatsheets')).filter(file => file.endsWith('.html'));
    for (const width of [320, 390, 768, 1440]) {
      await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      for (const file of sheetFiles) {
        await command('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/cheatsheets/${file}` });
        let ready = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          ready = await evaluate("document.readyState==='complete' && !!document.querySelector('.cs-page')");
          if (ready) break;
          await delay(50);
        }
        assert.ok(ready, file + ' did not load');
        const layout = await evaluate(`({
          client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
          grid:[...document.querySelectorAll('.cs-tile')].map(tile=>({right:tile.getBoundingClientRect().right,parentRight:tile.parentElement.getBoundingClientRect().right})),
          tables:[...document.querySelectorAll('.cs-table')].map(table=>({right:table.getBoundingClientRect().right,parentRight:table.closest('.cs-block').getBoundingClientRect().right})),
          clipped:[...document.querySelectorAll('.cs-table th,.cs-table td')].filter(cell=>cell.scrollWidth>cell.clientWidth+2).map(cell=>cell.textContent.slice(0,60)),
          diagramLabels:[...document.querySelectorAll('.cs-arch')].filter(svg=>svg.getBoundingClientRect().width>0).flatMap(svg=>[...svg.querySelectorAll('.cs-arch-node')].flatMap(node=>{
            const box=node.getBBox(),outside=[];
            for(let text=node.nextElementSibling;text&&!text.classList.contains('cs-arch-node');text=text.nextElementSibling){
              if(!text.matches('.cs-arch-label,.cs-arch-sub'))continue;
              const rect=text.getBBox();
              if(rect.x<box.x-1||rect.x+rect.width>box.x+box.width+1||rect.y<box.y-1||rect.y+rect.height>box.y+box.height+1)outside.push(text.textContent);
            }
            return outside;
          }))
        })`);
        assert.ok(layout.scroll <= layout.client + 1, file + ' scrolls horizontally at ' + width);
        assert.ok(layout.grid.every(box=>box.right<=box.parentRight+1), file + ' tiles escape their grid');
        assert.ok(layout.tables.every(box=>box.right<=box.parentRight+1), file + ' table escapes its card at ' + width);
        assert.deepEqual(layout.clipped, [], file + ' has overflowing table-cell content');
        assert.deepEqual(layout.diagramLabels, [], file + ' SVG labels escape their node boxes at ' + width);
      }
    }
    for (const page of ['contact.html', 'privacy.html', 'developer.html', 'how-to-learn.html']) {
      await command('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/${page}` });
      for (let attempt = 0; attempt < 100; attempt++) {
        if (await evaluate("document.readyState==='complete' && !!document.querySelector('.trust-page h1')")) break;
        await delay(50);
      }
      const gaps = await evaluate(`({
        title:(()=>{const h=document.querySelector('.trust-page h1');return h.nextElementSibling.getBoundingClientRect().top-h.getBoundingClientRect().bottom;})(),
        headerGap:document.querySelector('.trust-page').firstElementChild.getBoundingClientRect().top-document.querySelector('.site-header').getBoundingClientRect().bottom,
        sections:[...document.querySelectorAll('.trust-page h2')].map(h=>h.nextElementSibling.getBoundingClientRect().top-h.getBoundingClientRect().bottom)
      })`);
      assert.ok(gaps.headerGap >= 24, page + ' document begins against the fixed header');
      assert.ok(gaps.title >= 20, page + ' title touches its lead');
      assert.ok(gaps.sections.every(gap=>gap>=12), page + ' section heading touches its content');
    }
    await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await command('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/__layout-audit-missing/nested` });
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate("document.readyState==='complete' && !!document.querySelector('h1')")) break;
      await delay(50);
    }
    assert.equal(await evaluate('innerWidth'), 390, '404 uses a desktop layout viewport on phones');
    assert.equal(await evaluate("getComputedStyle(document.documentElement).getPropertyValue('--ink-mute').trim()"), '#666660', 'nested 404 does not load the site stylesheet');
    // Shared muted text remains readable on each supported surface in both themes.
    const contrast = await evaluate(`(()=>{
      const luminance=color=>{const c=color.match(/[\\d.]+/g).slice(0,3).map(Number).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
      return ['light','dark'].flatMap(theme=>{document.documentElement.setAttribute('data-theme',theme);const style=getComputedStyle(document.documentElement);const probe=document.createElement('span');document.body.appendChild(probe);const colors=['--ink-mute','--bg','--bg-surface','--bg-surface-hover'].map(key=>{probe.style.color=style.getPropertyValue(key);return luminance(getComputedStyle(probe).color);});probe.remove();return colors.slice(1).map(background=>(Math.max(colors[0],background)+.05)/(Math.min(colors[0],background)+.05));});
    })()`);
    assert.ok(contrast.every(ratio=>ratio>=4.5), 'muted text contrast: ' + JSON.stringify(contrast));
    await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: false });
    await command('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/manual-a2a-101.html` });
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate("document.readyState==='complete' && !!document.querySelector('.manual')")) break;
      await delay(50);
    }
    const manualContrast = await evaluate(`(()=>{
      const luminance=color=>{const c=color.match(/[\\d.]+/g).slice(0,3).map(Number).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
      return ['light','dark'].flatMap(theme=>{document.documentElement.setAttribute('data-theme',theme);const style=getComputedStyle(document.documentElement);const probe=document.createElement('span');document.body.appendChild(probe);const colors=['--m-ink-mute','--m-paper','--m-panel','--m-code-bg'].map(key=>{probe.style.color=style.getPropertyValue(key);return luminance(getComputedStyle(probe).color);});probe.remove();return colors.slice(1).map(background=>(Math.max(colors[0],background)+.05)/(Math.min(colors[0],background)+.05));});
    })()`);
    assert.ok(manualContrast.every(ratio=>ratio>=4.5), 'manual muted text contrast: ' + JSON.stringify(manualContrast));
    console.log('site layout: 26 cheat sheets at 320/390/768/1440px, four document flows, mobile 404, and 12 muted-text contrasts passed');
    // Exercise the real lazy-load boundary, including a failed request and retry.
    await command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await command('Network.enable');
    await command('Network.setBlockedURLs', { urls: ['*cmdpalette.js*'] });
    await command('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/contact.html` });
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate("document.readyState==='complete' && !!document.querySelector('.header-menu-toggle')")) break;
      await delay(50);
    }
    assert.equal(await evaluate("typeof CmdPalette"), 'undefined');
    await evaluate("document.querySelector('.search-toggle').click()");
    let failed = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      failed = await evaluate("document.querySelector('.search-toggle').hasAttribute('data-search-error')");
      if (failed) break;
      await delay(50);
    }
    assert.ok(failed, 'search request failure was not exposed for retry');
    await command('Network.setBlockedURLs', { urls: [] });
    await evaluate("document.querySelector('.search-toggle').click()");
    let opened = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      opened = await evaluate("!!document.querySelector('#cmdPalette input') && document.body.hasAttribute('data-palette-open')");
      if (opened) break;
      await delay(50);
    }
    assert.ok(opened, 'search retry did not open the palette');
    assert.equal(await evaluate("document.querySelector('.search-toggle').title"), '搜索（⌘K）');
    await evaluate("(function(){const input=document.querySelector('#cmdPalette input');input.value='反向传播';input.dispatchEvent(new Event('input',{bubbles:true}));})()");
    let results = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      results = await evaluate("!!document.querySelector('#cmdPalette [data-href*=\"/lessons/\"]')");
      if (results) break;
      await delay(50);
    }
    assert.ok(results, 'lazy search lacks the real lesson index');
    await evaluate("window.CmdPalette.close();document.querySelector('.header-menu-toggle').click()");
    const beforeTheme = await evaluate("document.documentElement.getAttribute('data-theme')");
    await evaluate("document.getElementById('themeToggle').click()");
    const afterTheme = await evaluate("({theme:document.documentElement.getAttribute('data-theme'),stored:localStorage.getItem('theme')})");
    assert.notEqual(afterTheme.theme, beforeTheme);
    assert.equal(afterTheme.theme, afterTheme.stored);
    console.log('shared header controls: lazy search failure/retry, course result, and single theme toggle passed');
  } finally {
    clearTimeout(watchdog); if (socket) socket.close(); server.closeAllConnections(); server.close();
    if (browser && browser.pid && browser.exitCode === null) { const stopped = new Promise(resolve => browser.once('exit', resolve)); browser.kill(); await stopped; }
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
