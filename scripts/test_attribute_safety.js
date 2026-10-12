#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function extract(file, names) {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const pieces = names.map(name => {
    const match = source.match(new RegExp('  function ' + name + '\\([^]*?\\n  \\}'));
    if (!match) throw Error(`${file}: missing actual function ${name}`);
    return match[0];
  });
  return { file, names, sha256: crypto.createHash('sha256').update(source).digest('hex'), source: pieces.join('\n') };
}

async function main() {
  if (!fs.existsSync(CHROME)) throw Error(`Real DOM gate requires Chrome; set CHROME_PATH: ${CHROME}`);
  const extracted = [
    extract('site/app.js', ['escapeHtml', 'typeLabel', 'renderModalLessons']),
    extract('site/cmdpalette.js', ['escHtml', 'typeLabel', 'artifactKindLabel', 'highlight', 'truncate', 'renderResults']),
    extract('site/certifications.js', ['esc', 'attr', 'renderQuestion']),
  ];
  const inputs = ['中文 "双引号" \'单引号\' & < >', 'x" onmouseover="window.__injected=1', '"><img src=x onerror="window.__injected=1">中文'];
  const script = `
const inputs=${JSON.stringify(inputs)}; const findings=[];
function check(ok, detail){ if(!ok)findings.push(detail); }
function safe(container, name){
  check(!container.querySelector('img,script,iframe'), name+' added element');
  check(![...container.querySelectorAll('*')].some(el=>[...el.attributes].some(a=>/^on/i.test(a.name))),name+' added event attribute');
}
const app=(function(){${extracted[0].source};return {render:renderModalLessons};})();
const paletteCaller=(function(){${extracted[1].source};return {render:renderResults};})();
const certCaller=(function(){${extracted[2].source};return {render:renderQuestion};})();
const _listEl=()=>document.getElementById('cpResults');
const _inputEl=()=>({value:'中文'}); let _activeIdx=-1;
const _clearActiveDescendant=()=>{}; const _onItemClick=()=>{}; const _onItemMouseMove=()=>{};
for(const value of inputs){
  const modal=document.getElementById('modalLessons');
  app.render({lessons:[{name:value,type:'Build',lang:'Python',combines:value,status:'complete',url:'https://github.com/fancyboi999/ai-engineering-from-scratch-zh/tree/main/phases/01-math-foundations/01-linear-algebra-intuition/'}]});
  check(modal.querySelector('a').getAttribute('aria-label')==='打开课程：'+value,'app aria-label value');
  check(modal.querySelector('[data-type]').getAttribute('title')==='合并自：'+value,'app title value');
  check(modal.querySelector('.modal-lesson-name').textContent===value,'app visible text'); safe(modal,'app');
  paletteCaller.render([{kind:'certification-track',name:value,url:value,examCode:'TEST'}]);
  const palette=_listEl(); check(palette.querySelector('li').getAttribute('data-href')===value,'palette data-href value');
  check(palette.querySelector('.cp-item-name').textContent===value,'palette visible text'); safe(palette,'palette');
  const cert=document.getElementById('cert'); cert.innerHTML=certCaller.render({id:value,type:'single',domain:'测试',prompt:value,options:[value]},0,[]);
  check(cert.querySelector('input').getAttribute('data-question')===value,'cert data-question value');
  check(cert.querySelector('input').getAttribute('name')==='question-'+value,'cert name value');
  check(cert.querySelector('.cert-question-prompt').textContent===value,'cert visible text'); safe(cert,'cert');
}
fetch('/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({passed:findings.length===0,findings,cases:inputs.length*3})});
`;
  const html = `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'none'"><div id="modalLessons"></div><ul id="cpResults"></ul><div id="cert"></div><script>${script.replace(/<\/script/gi, '<\\/script')}</script>`;
  const profile = fs.mkdtempSync(path.join('/tmp', 'aifs-attribute-dom-'));
  let browser, timer, server;
  try {
    const report = await new Promise((resolve, reject) => {
      server = http.createServer((req, res) => {
        if (req.url === '/result' && req.method === 'POST') {
          let body = ''; req.on('data', data => { body += data; if (body.length > 20000) req.destroy(); });
          req.on('end', () => { res.end('ok'); try { resolve(JSON.parse(body)); } catch (error) { reject(error); } });
        } else if (req.url === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); }
        else { res.statusCode = 404; res.end(); }
      });
      timer = setTimeout(() => reject(Error('Chrome real DOM gate timed out; not a passing result')), 60000);
      server.listen(0, '127.0.0.1', () => {
        browser = spawn(CHROME, ['--headless=new', '--disable-gpu', '--disable-extensions', '--disable-background-networking', '--no-first-run', '--no-default-browser-check', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1', `--user-data-dir=${profile}`, `http://127.0.0.1:${server.address().port}/`], { stdio: 'ignore' });
        browser.on('error', reject);
      });
      server.on('error', reject);
    });
    console.log(JSON.stringify({ ...report, callers: extracted.map(({ source, ...record }) => record) }, null, 2));
    if (!report.passed) process.exitCode = 1;
  } finally {
    clearTimeout(timer);
    if (server) { server.closeAllConnections(); server.close(); }
    if (browser && browser.exitCode === null) { const stopped = new Promise(resolve => browser.once('exit', resolve)); browser.kill(); await stopped; }
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
