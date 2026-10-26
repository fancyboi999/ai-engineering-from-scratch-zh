#!/usr/bin/env node
'use strict';

// Render the actual providers and Chinese overlay in isolated Chrome. The JSON
// is an inventory, not a claim that arbitrary English-looking values are prose.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const site = path.join(root, 'site');
const { buildFigureProviderManifest } = require('../site/build');
const args = process.argv.slice(2);
const flag = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const mode = flag('--mode', 'default');
const output = path.resolve(flag('--output', path.join('/tmp', 'aifs-figure-localization-' + mode + '.json')));
const selected = flag('--figure', '');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function collectFiles(directory, result = []) {
  if (!fs.existsSync(directory)) return result;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(file, result);
    else if (entry.name === 'zh.md') result.push(file);
  }
  return result;
}

function lessonCases() {
  const cases = new Map();
  for (const directory of ['phases', 'certifications']) for (const file of collectFiles(path.join(root, directory))) {
    const markdown = fs.readFileSync(file, 'utf8');
    for (const match of markdown.matchAll(/```figure\s*\r?\n([\s\S]*?)```/g)) {
      const raw = match[1].trim();
      if (!raw) continue;
      const id = raw.split(/\s+/)[0];
      const suffix = raw.slice(id.length).trim();
      let config = {};
      if (suffix) { try { config = JSON.parse(suffix); } catch (_) {} }
      const key = id + ' ' + JSON.stringify(config);
      if (!cases.has(key)) cases.set(key, { id, config, raw, sourceLessons: [] });
      cases.get(key).sourceLessons.push(path.relative(root, file));
    }
  }
  return [...cases.values()];
}

async function main() {
  if (!fs.existsSync(chrome)) throw Error('Real DOM audit requires Chrome; set CHROME_PATH');
  if (!['default', 'dynamic'].includes(mode)) throw Error('--mode must be default or dynamic');
  const manifest = buildFigureProviderManifest(root, site);
  const locales = fs.existsSync(path.join(site, 'figure-locales'))
    ? fs.readdirSync(path.join(site, 'figure-locales')).filter(file => file.endsWith('.js')).sort().map(file => 'figure-locales/' + file) : [];
  const files = ['lesson-figures.js', ...manifest.providerOrder, ...locales, 'figures-i18n-zh.js'];
  const profile = fs.mkdtempSync('/tmp/aifs-figure-localization-');
  const cases = lessonCases();
  const records = [];
  let browser, server, timer;
  const script = `
  const lessonCases=${JSON.stringify(cases)};
  const selected=${JSON.stringify(selected)};
  const mode=${JSON.stringify(mode)};
  const warnings=[];
  const originalWarn=console.warn;
  console.warn=(...values)=>{warnings.push(values.map(value=>String(value)).join(' '));originalWarn(...values);};
  const registered=Object.keys(window.LESSON_FIGURES||{}).sort();
  const known=new Set(lessonCases.map(item=>item.id));
  for(const id of registered) if(!known.has(id)) lessonCases.push({id,config:{},raw:id,sourceLessons:[]});
  function classify(node,value){
    if(node.closest('pre,code,script,style'))return 'protected-code';
    if(!/[A-Za-z]/.test(value))return 'non-english';
    if(/[\\u3400-\\u9fff]/.test(value))return 'mixed';
    if(/^(?:agent|token|prompt|transformer|LLM|MCP|API|GPU|CPU|PyTorch|NumPy|Python|CUDA|BF16|FP8|KV|JSON|HTTP|HTTPS|SSE|UTF-8|ReLU|softmax|sigmoid|tanh)$/i.test(value.trim()))return 'protected-technical-term';
    if(/^(?:https?:\\/\\/|[.\\/]?[A-Za-z0-9_.-]+\\.(?:py|js|json|md|txt|csv|yaml|yml)(?:$|[:/]))/.test(value.trim()))return 'protected-path-or-url';
    if(/^[A-Z_][A-Z_0-9]*$/.test(value.trim())&&value.trim().includes('_'))return 'protected-machine-enum';
    if(!/\\b[a-zA-Z]{3,}\\b/.test(value))return 'protected-symbol';
    return 'candidate';
  }
  function texts(host){
    const values=[];const seen=new Set();
    const figureId=(host.dataset.figure||'').split(/\\s+/)[0];
    const provider=window.__figureAuditProviders[figureId];
    const reviewed=window.AIFS_FIGURE_LOCALES?.[provider]?.[figureId]?.preserve||[];
    function push(node,field,text){text=String(text||'').trim();if(!text)return;const key=node.tagName+'|'+field+'|'+text;if(seen.has(key))return;seen.add(key);const keep=reviewed.find(entry=>entry.text===text&&entry.reason);values.push({tag:node.tagName.toLowerCase(),field,text,classification:keep?'preserved-reviewed':classify(node,text),...(keep?{reason:keep.reason}:{})});}
    const walk=document.createTreeWalker(host,NodeFilter.SHOW_TEXT);
    while(walk.nextNode()){const node=walk.currentNode.parentElement;if(!node||node.closest('script,style'))continue;const css=getComputedStyle(node);if(css.display==='none'||css.visibility==='hidden')continue;push(node,'text',walk.currentNode.nodeValue);}
    for(const node of [host,...host.querySelectorAll('[aria-label],[aria-description],[aria-roledescription],[aria-valuetext],[title],svg title,svg desc,input[placeholder],textarea[placeholder]')]){
      for(const attr of ['aria-label','aria-description','aria-roledescription','aria-valuetext','title','placeholder'])if(node.hasAttribute(attr))push(node,attr,node.getAttribute(attr));
      if(['title','desc'].includes(node.tagName.toLowerCase()))push(node,node.tagName.toLowerCase(),node.textContent);
    }
    return values;
  }
  function snapshot(host,name){return {name,texts:texts(host)};}
  async function settle(){await new Promise(resolve=>setTimeout(resolve,0));}
  function controlSpec(node,index){return {index,tag:node.tagName.toLowerCase(),type:node.type,label:node.getAttribute('aria-label')||node.closest('label')?.textContent||node.closest('.lf-ctrl')?.querySelector('label')?.textContent||node.textContent?.slice(0,80)||'',value:node.value,options:node.options?[...node.options].map(option=>({value:option.value,text:option.textContent})):undefined,min:node.min,max:node.max};}
  async function post(url,value){const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});if(!response.ok)throw Error('Audit result sink failed');}
  (async()=>{
    const fixture=document.getElementById('fixture');
    for(const item of lessonCases){
      if(selected&&item.id!==selected)continue;
      const begin=warnings.length;fixture.innerHTML='';
      const host=document.createElement('section');host.className='lesson-figure';host.dataset.figure=item.raw;fixture.appendChild(host);
      window.mountLessonFigures(fixture);
      await settle();
      const record={...item,provider:window.__figureAuditProviders[item.id]||null,registered:!!window.LESSON_FIGURES[item.id],mounted:host.dataset.lfMounted==='1',states:[],controls:[]};
      if(record.mounted){
        record.states.push(snapshot(host,'default'));
        const controls=[...host.querySelectorAll('input,select,button')];record.controls=controls.map(controlSpec);
        if(mode==='dynamic'){
          for(let index=0;index<record.controls.length;index++){
            const spec=record.controls[index];
            const values=spec.tag==='select'?spec.options.slice(0,12).map(option=>option.value):spec.type==='range'?[spec.min,spec.max]:['checkbox','radio'].includes(spec.type)?[true,false]:[];
            for(const value of values){const node=host.querySelectorAll('input,select,button')[index];if(!node)continue;if(['checkbox','radio'].includes(spec.type))node.checked=value;else node.value=value;node.dispatchEvent(new Event(spec.tag==='select'?'change':'input',{bubbles:true}));if(['checkbox','radio'].includes(spec.type))node.dispatchEvent(new Event('change',{bubbles:true}));await settle();record.states.push(snapshot(host,'control '+index+' = '+value));}
          }
          const buttons=[...host.querySelectorAll('button')].filter(node=>!node.matches('.lf-motion-toggle,.lf-motion-replay,.lf-replay')).slice(0,12);
          for(let index=0;index<buttons.length;index++){const button=[...host.querySelectorAll('button')].filter(node=>!node.matches('.lf-motion-toggle,.lf-motion-replay,.lf-replay'))[index];if(!button||button.disabled)continue;const label=button.textContent.slice(0,60);button.click();await settle();record.states.push(snapshot(host,'button '+index+' '+label));}
        }
      }
      record.warnings=warnings.slice(begin);
      await post('/record',record);
      if(window.AIFSFigureRuntime)window.AIFSFigureRuntime.disposeRoot(fixture);
    }
    await post('/done',{registered:registered.length,registeredIds:registered});
  })().catch(async error=>{await post('/failed',{message:error.stack||String(error)});});
  `;
  const html = '<!doctype html><meta charset="utf-8"><style>body{width:1100px}#fixture{width:1000px}svg{max-width:100%}</style><div id="fixture"></div>' +
    '<script>window.__figureAuditProviders={};window.__figureAuditFunctions={};</script>'+files.map(file => '<script src="/' + file + '"></script><script>for(const [id,renderer] of Object.entries(window.LESSON_FIGURES||{})){if(window.__figureAuditFunctions[id]!==renderer){window.__figureAuditProviders[id]='+JSON.stringify(file)+';window.__figureAuditFunctions[id]=renderer;}}</script>').join('') + '<script>' + script.replace(/<\/script/gi, '<\\/script') + '</script>';
  try {
    const result = await new Promise((resolve, reject) => {
      server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://localhost');
        if (req.method === 'POST') {
          let text = ''; req.on('data', bytes => { text += bytes; if (text.length > 32 * 1024 * 1024) req.destroy(); });
          req.on('end', () => { try { const value = JSON.parse(text); res.end('ok'); if (url.pathname === '/record') { records.push(value); if (records.length % 100 === 0) console.error('audited ' + records.length); } else if (url.pathname === '/done') resolve(value); else if (url.pathname === '/failed') reject(Error(value.message)); } catch (error) { reject(error); } });
        } else if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); }
        else {
          const file = path.resolve(site, '.' + url.pathname);
          if (!file.startsWith(site + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.statusCode = 404; res.end(); return; }
          res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript; charset=utf-8' : 'text/plain; charset=utf-8');
          res.end(fs.readFileSync(file));
        }
      });
      timer = setTimeout(() => reject(Error('Real DOM figure audit timed out; partial records=' + records.length)), mode === 'dynamic' ? 600000 : 180000);
      server.on('error', reject);
      server.listen(0, '127.0.0.1', () => {
        browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--disable-extensions', '--disable-background-networking', '--no-first-run', '--no-default-browser-check', '--force-prefers-reduced-motion', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', `--user-data-dir=${profile}`, 'http://127.0.0.1:' + server.address().port + '/'], { stdio: 'ignore' });
        browser.on('error', reject);
      });
    });
    const summary = { mode, branches: {selectOptions:12,rangeExtremes:true,checkboxStates:2,nonMotionButtons:12,combinations:false}, figures: records.length, mounted: records.filter(row => row.mounted).length, mountFailures: records.filter(row => !row.mounted).map(row => row.id), states: records.reduce((sum, row) => sum + row.states.length, 0), candidateTexts: records.reduce((sum, row) => sum + row.states.reduce((subtotal, state) => subtotal + state.texts.filter(text => text.classification === 'candidate').length, 0), 0), ...result };
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify({ generatedAt: new Date().toISOString(), root, providers: manifest.providerOrder, localeFiles: locales, summary, figures: records }, null, 2) + '\n');
    const { registeredIds, ...brief } = summary;
    console.log(JSON.stringify({ output, ...brief }, null, 2));
    if (summary.mountFailures.length || (args.includes('--check') && summary.candidateTexts)) process.exitCode = 1;
  } finally {
    clearTimeout(timer);
    if (server) { server.closeAllConnections(); server.close(); }
    if (browser && browser.exitCode === null) { const exited = new Promise(resolve => browser.once('exit', resolve)); browser.kill(); await exited; }
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
