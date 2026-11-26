const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');
const test = require('node:test');
const { nodeFileTrace } = require('@vercel/nft');
const { getTransformedRoutes } = require('@vercel/routing-utils');
const { globSync } = createRequire(require.resolve('@vercel/nft'))('glob');

const ROOT = path.join(__dirname, '..');
const config = require('../vercel.json');
const { PAGES } = require('../lib/agent-pages');
const budgets = { certification: 5, lesson: 30, markdown: 15, 'v1/markdown': 15, og: 10 };

test('deployment routing compiles with the Vercel platform parser', () => {
  const transformed = getTransformedRoutes(config);
  assert.ok(!transformed.error, transformed.error && transformed.error.message);
  assert.ok(transformed.routes.length > 0, 'the complete deployment routes must be compiled');
  const staticMarkdown = config.routes.filter(route => route.dest && route.dest.startsWith('/agent-pages/practice/'));
  assert.equal(staticMarkdown.length, 3);
  for (const route of staticMarkdown) {
    assert.equal(route.headers && route.headers.Vary, 'Accept, Accept-Encoding', 'conditional static Markdown must carry Vary on the matching route');
    assert.equal(route.headers && route.headers['Cache-Control'], 'public, max-age=0, must-revalidate');
  }
  const invalid = getTransformedRoutes({
    ...config,
    headers: [{ source: '/manual-[a-z0-9-]+/[a-z0-9-]+', headers: [{ key: 'Vary', value: 'Accept' }] }],
  });
  assert.equal(invalid.error && invalid.error.code, 'invalid_header', 'raw RegExp syntax must not bypass path-to-regexp validation');
  for (const [fnName, fnConfig] of Object.entries(config.functions || {})) {
    for (const key of ['includeFiles', 'excludeFiles']) {
      if (typeof fnConfig[key] === 'string') {
        assert.ok(fnConfig[key].length <= 256, `${fnName}.${key} is ${fnConfig[key].length} chars (Vercel maxLength is 256)`);
      }
    }
  }
});
const sourceOnly = [
  /^scripts\//,
  /^projects\/(?!.*\/docs\/zh\.md$)/,
  /^manuals\/.*\/capture\//,
  /^site\/(?:build[^/]*|test[_-][^/]*)(?:\/|$)/,
  /^(?!site\/(?:agent-pages|hubs)\/glossary\/test-oracle\.(?:md|html)$)(?:.*\/)?(?:tests?|__tests__)(?:\/|[_.-])/,
];

async function invoke(handler, url, headers = {}) {
  const parsed = new URL(url, 'https://aieng-zh.cn');
  const query = Object.fromEntries(parsed.searchParams.entries());
  const response = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = String(value); },
    end(body) { this.body = Buffer.isBuffer(body) ? body : Buffer.from(body || ''); },
  };
  await handler({ method: 'GET', url, query, headers }, response);
  return response;
}

function manifest(root, name) {
  return JSON.parse(fs.readFileSync(path.join(root, 'site', `${name}.json`), 'utf8'));
}

async function smoke(name, root) {
  const handler = require(path.join(root, 'api', `${name}.js`));
  if (name === 'certification') {
    const track = Object.values(manifest(root, 'certification-seo').tracks)[0];
    const response = await invoke(handler, `/certification?id=${encodeURIComponent(track.id)}`);
    assert.equal(response.statusCode, 200, response.body.toString());
    assert.match(response.body.toString(), /data-server-rendered="true"/);
    assert.match(response.body.toString(), /\/og\/track\/[^" ]+\.png\?v=[a-f0-9]+/);
  } else if (name === 'lesson') {
    const lessons = Object.values(manifest(root, 'lesson-seo').lessons);
    for (const kind of ['course', 'certification']) {
      const entry = lessons.find(lesson => lesson.context.kind === kind);
      assert.ok(entry, `missing ${kind} lesson`);
      const url = `/lesson?path=${encodeURIComponent(entry.path)}`;
      const response = await invoke(handler, url);
      assert.equal(response.statusCode, 200, response.body.toString());
      assert.match(response.body.toString(), /data-server-rendered="true"/);
      assert.match(response.body.toString(), /\/og\/lesson\/[^" ]+\.png\?v=[a-f0-9]+/);
      const markdown = await invoke(handler, url, { accept: 'text/markdown' });
      assert.equal(markdown.statusCode, 200);
      assert.match(markdown.headers['content-type'], /^text\/markdown/);
      assert.equal(markdown.body.toString(), fs.readFileSync(path.join(ROOT, entry.path, 'docs', 'zh.md'), 'utf8'));
      if (kind === 'course') {
        const [, phaseDir, lessonDir] = /^phases\/([^/]+)\/([^/]+)$/.exec(entry.path);
        const cleanBase = `/learn/${phaseDir.replace(/^\d+-/, '')}/${lessonDir.replace(/^\d+-/, '')}`;
        const expectedLocation = `/lessons/${phaseDir}/${lessonDir}/`;
        for (const learnUrl of [cleanBase, `${cleanBase}/`]) {
          const redirect = await invoke(handler, learnUrl);
          assert.equal(redirect.statusCode, 308, learnUrl);
          assert.equal(redirect.headers.location, expectedLocation, learnUrl);
        }
      }
    }
  } else if (name === 'markdown' || name === 'v1/markdown') {
    for (const targetPath of Object.keys(PAGES)) {
      for (const [accept, expectedType] of [['text/html', /^text\/html/], ['text/markdown', /^text\/markdown/]]) {
        const response = await invoke(handler, `/api/${name}?path=${encodeURIComponent(targetPath)}`, { accept });
        assert.equal(response.statusCode, 200, `${targetPath} (${accept})`);
        assert.match(response.headers['content-type'], expectedType);
        assert.ok(response.body.length > 0);
      }
    }
    for (const [targetPath, accept, expectedType] of [
      ['/phase/setup-and-tooling', 'text/html', /^text\/html/],
      ['/phase/setup-and-tooling', 'text/markdown', /^text\/markdown/],
      ['/glossary/activation-checkpointing', 'text/markdown', /^text\/markdown/],
    ]) {
      const response = await invoke(handler, `/api/${name}?path=${encodeURIComponent(targetPath)}`, { accept });
      assert.equal(response.statusCode, 200, `${targetPath} (${accept})`);
      assert.match(response.headers['content-type'], expectedType);
      assert.ok(response.body.length > 0);
    }
    const missing = await invoke(handler, `/api/${name}?path=/not-a-page`, { accept: 'text/html' });
    assert.equal(missing.statusCode, 404);
  } else {
    const lesson = Object.keys(manifest(root, 'lesson-seo').lessons)[0];
    const track = Object.keys(manifest(root, 'certification-seo').tracks)[0];
    for (const card of ['page/home', 'page/inside-an-ai-agent', `lesson/${lesson}`, `track/${track}`]) {
      const redirect = await invoke(handler, `/og/${card}.png`);
      assert.equal(redirect.statusCode, 307, redirect.body.toString());
      const response = await invoke(handler, redirect.headers.location);
      assert.equal(response.statusCode, 200, response.body.toString());
      assert.equal(response.headers['content-type'], 'image/png');
      assert.equal(response.body.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.equal(response.body.readUInt32BE(16), 1200);
      assert.equal(response.body.readUInt32BE(20), 630);
    }
  }
}

for (const [name, megabytes] of Object.entries(budgets)) {
  test(`${name} deployment contains only runtime files and serves from its bundle`, async function (t) {
    const entry = `api/${name}.js`;
    const fnConfig = config.functions[entry] || {};
    const trace = await nodeFileTrace([entry], {
      base: ROOT,
      ignore: ['.git', '.git/**', '.vercel/**', ...(fnConfig.excludeFiles ? [fnConfig.excludeFiles] : [])],
    });
    const excluded = new Set(fnConfig.excludeFiles ? globSync(fnConfig.excludeFiles, { cwd: ROOT, nodir: true }) : []);
    // 与 Vercel @vercel/node 真实打包口径一致：excludeFiles 只过滤动态追踪结果，includeFiles 显式并入且不受 excludeFiles 裁掉。
    const traced = [...trace.fileList].filter(file => !excluded.has(file));
    const included = fnConfig.includeFiles ? globSync(fnConfig.includeFiles, { cwd: ROOT, nodir: true }) : [];
    const files = new Set([...traced, ...included]);
    const unexpected = [...files].filter(file => sourceOnly.some(pattern => pattern.test(file)));
    assert.equal(unexpected.length, 0, `source files leaked into ${entry}: ${unexpected.slice(0, 10).join(', ')}`);
    const bytes = [...files].reduce((total, file) => total + fs.statSync(path.join(ROOT, file)).size, 0);
    assert.ok(bytes < megabytes * 1024 * 1024, `${entry} is ${(bytes / 1024 / 1024).toFixed(2)} MiB, budget ${megabytes} MiB`);
    t.diagnostic(`${files.size} files, ${(bytes / 1024 / 1024).toFixed(2)} MiB`);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `aiefs-${name.replace(/\//g, '-')}-bundle-`));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    for (const file of files) {
      const destination = path.join(root, file);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(ROOT, file), destination);
    }
    await smoke(name, root);
  });
}
