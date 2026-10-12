const fs = require('node:fs');
const path = require('node:path');
const { ORIGIN, PAGES } = require('../lib/agent-content');

const ROOT = path.join(__dirname, '..');
const REPO = 'https://github.com/fancyboi999/ai-engineering-from-scratch-zh';

function pageMarkdown(html, filename) {
  const content = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || '';
  const title = html.match(/<title>(.*?)<\/title>/i)?.[1] || filename;
  const text = content.replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, value) => '\n\n' + '#'.repeat(Number(level)) + ' ' + value + '\n\n')
    .replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, value) => `[${value.replace(/<[^>]*>/g, '').trim()}](${new URL(href.replace(/&amp;/g, '&'), ORIGIN + '/' + filename).href})`)
    .replace(/<li\b[^>]*>/gi, '\n- ').replace(/<\/(?:p|div|section|ul|ol|pre)>/gi, '\n\n')
    .replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '')
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, entity => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' })[entity])
    .replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return `# ${title}\n\n规范页面：${ORIGIN}/${filename === 'index.html' ? '' : filename}\n\n${text}\n\n[课程索引](${ORIGIN}/llms.txt) | [API 与 MCP 文档](${ORIGIN}/docs)\n`;
}

function phaseLabel(phase) {
  return `阶段 ${String(phase.id).padStart(2, '0')}：${phase.name}`;
}

function curriculumMarkdown(phases, manifest) {
  const total = phases.reduce((sum, phase) => sum + phase.lessons.length, 0);
  const lines = [`## 课程目录：${phases.length} 个阶段，${total} 节课`];
  for (const phase of phases) {
    lines.push('', `### ${phaseLabel(phase)}`, '', phase.desc || '');
    for (const lesson of phase.lessons) {
      const resourcePath = lesson.url.replace(`${REPO}/tree/main/`, '').replace(/\/+$/, '');
      const entry = manifest.lessons[resourcePath];
      if (!entry) throw new Error(`Missing published lesson metadata: ${resourcePath}`);
      lines.push(`- [${entry.title}](${entry.canonicalUrl}) · ${lesson.type} · ${lesson.lang}${lesson.summary ? `：${lesson.summary}` : ''}`);
    }
  }
  return lines.join('\n');
}

function navigationMarkdown(filename, html, data, manifest) {
  const { phases, glossaryTerms, roadmapPrereqs } = data;
  const title = html.match(/<title>(.*?)<\/title>/i)?.[1] || filename;
  const header = `# ${title}\n\n规范页面：${ORIGIN}/${filename}\n\n`;
  const footer = `\n\n[课程索引](${ORIGIN}/llms.txt) | [API 与 MCP 文档](${ORIGIN}/docs)\n`;
  if (filename === 'glossary.html') {
    const lines = [`共 ${glossaryTerms.length} 个术语。`];
    const fields = { says: '常见说法', means: '实际含义', whyItMatters: '为什么重要', example: '实际使用', confusion: '常见混淆', whyCalled: '名称由来' };
    for (const term of glossaryTerms) {
      lines.push('', `## [${term.term}](${ORIGIN}/glossary.html#${term.slug})`, '', `分类：${term.category}`);
      if (term.aliases.length) lines.push('', `别名：${term.aliases.join('、')}`);
      for (const [field, label] of Object.entries(fields)) if (term[field]) lines.push('', `**${label}：** ${term[field]}`);
      if (term.related.length) lines.push('', `相关术语：${term.related.join('、')}`);
      if (term.lessons.length) lines.push('', '学习课程：', ...term.lessons.map(lesson => {
        const lessonPath = lesson.url.replace(/^\.\.\//, '').replace(/\/+$/, '');
        const url = manifest.lessons[lessonPath]?.canonicalUrl || new URL(lesson.url, `${REPO}/blob/main/glossary/terms.md`).href;
        return `- [${lesson.label}](${url})`;
      }));
      if (term.sources.length) lines.push('', '来源：', ...term.sources.map(source => `- [${source.label}](${source.url})`));
    }
    return header + lines.join('\n') + footer;
  }
  if (filename === 'prereqs.html') {
    const total = phases.reduce((sum, phase) => sum + phase.lessons.length, 0);
    const lines = [`${phases.length} 个阶段，${total} 节课。依赖来自课程路线图。个人进度保存在浏览器中，不包含在公开 Markdown 内。`];
    const byId = new Map(phases.map(phase => [phase.id, phase]));
    for (const phase of phases) {
      const required = (roadmapPrereqs[phase.id] || []).map(id => {
        const prerequisite = byId.get(id);
        if (!prerequisite) throw new Error(`Unknown prerequisite phase: ${id}`);
        return `[${phaseLabel(prerequisite)}](${ORIGIN}/prereqs.html#phase-${String(id).padStart(2, '0')})`;
      });
      lines.push('', `## ${phaseLabel(phase)}`, '', phase.desc || '', '', `课程数：${phase.lessons.length}`, '', `前置阶段：${required.length ? required.join('、') : '无'}`);
    }
    return header + lines.join('\n') + footer;
  }
  if (filename === 'catalog.html') return header + curriculumMarkdown(phases, manifest) + footer;
  if (filename === 'index.html') {
    const publicHtml = html
      .replace(/<section\b[^>]*class="stat-block[^\"]*"[^>]*>[\s\S]*?<\/section>/i, '')
      .replace(/<div\b[^>]*id="modalOverlay"[^>]*>[\s\S]*?(?=<section\b|<\/main>)/i, '');
    return pageMarkdown(publicHtml, filename) + '\n' + curriculumMarkdown(phases, manifest) + '\n';
  }
  return null;
}

function build(navigation) {
  if (!navigation) {
    // data.js 是本站构建器生成的受信任数据；独立 CLI 与浏览器使用同一份课程事实。
    const data = require('node:vm').runInNewContext(fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8') + '\n;({PHASES,GLOSSARY,ROADMAP_PREREQS})', Object.create(null), { timeout: 1000 });
    navigation = { phases: data.PHASES, glossaryTerms: data.GLOSSARY, roadmapPrereqs: data.ROADMAP_PREREQS };
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'lesson-seo.json'), 'utf8'));
  const entries = Object.values(manifest.lessons).map(entry => ({
    path: entry.path, kind: 'lesson', title: entry.title, description: entry.description,
    url: entry.canonicalUrl, sourceUrl: `${REPO}/blob/main/${entry.path}/docs/zh.md`,
    markdown: fs.readFileSync(path.join(ROOT, entry.path, 'docs/zh.md'), 'utf8'),
  }));
  for (const directory of fs.readdirSync(path.join(ROOT, 'projects')).sort()) {
    if (directory.startsWith('_') || !fs.existsSync(path.join(ROOT, 'projects', directory, 'project.json'))) continue;
    const project = JSON.parse(fs.readFileSync(path.join(ROOT, 'projects', directory, 'project.json'), 'utf8'));
    if (project.status !== 'ready') continue;
    const resourcePath = `projects/${directory}`;
    entries.push({ path: resourcePath, kind: 'project', title: project.title,
      description: project.summary, url: `${ORIGIN}/project.html?id=${encodeURIComponent(project.id)}`,
      sourceUrl: `${REPO}/blob/main/${resourcePath}/README.md`,
      markdown: fs.readFileSync(path.join(ROOT, resourcePath, 'README.md'), 'utf8'),
    });
  }
  entries.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  fs.mkdirSync(path.join(ROOT, 'generated'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'generated/agent-content.json'), JSON.stringify(entries));
  fs.mkdirSync(path.join(__dirname, 'agent-pages'), { recursive: true });
  for (const filename of new Set(Object.values(PAGES))) {
    const markdown = filename === 'developer.html'
      ? fs.readFileSync(path.join(__dirname, 'developer.md'), 'utf8')
      : (() => {
        const html = fs.readFileSync(path.join(__dirname, filename), 'utf8');
        return navigationMarkdown(filename, html, navigation, manifest) ?? pageMarkdown(html, filename);
      })();
    fs.writeFileSync(path.join(__dirname, 'agent-pages', filename.replace('.html', '.md')), markdown);
  }
  const llmsPath = path.join(__dirname, 'llms.txt');
  const llms = fs.readFileSync(llmsPath, 'utf8');
  const discovery = `## API 与 MCP\n\n- [开发者文档](${ORIGIN}/docs)：公开只读 API、错误、配额和版本约定。\n- [OpenAPI 3.1](${ORIGIN}/openapi.json)：REST 接口定义。\n- [MCP 清单](${ORIGIN}/server.json)：Streamable HTTP 地址 ${ORIGIN}/mcp。\n\n`;
  if (!llms.includes('## API 与 MCP')) fs.writeFileSync(llmsPath, llms.replace(/\n\n/, '\n\n' + discovery));
  console.log(`Built ${entries.length} Chinese agent resources and ${new Set(Object.values(PAGES)).size} Markdown pages.`);
}

if (require.main === module) build();
module.exports = { pageMarkdown, navigationMarkdown, build };
