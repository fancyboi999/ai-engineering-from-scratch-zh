'use strict';

// 公开导航页到站点根 HTML 文件的显式映射；独立于 agent-content.js 以避免 api/markdown 静态追踪 8.6 MiB 的 generated/agent-content.json。
const PAGES = {
  '/': 'index.html', '/about': 'about.html', '/catalog': 'catalog.html',
  '/glossary': 'glossary.html', '/path': 'prereqs.html', '/roadmap': 'prereqs.html',
  '/skills': 'skills.html', '/how-to-learn': 'how-to-learn.html', '/inside-an-ai-agent': 'inside-an-ai-agent.html',
  '/inside-a-decompiler': 'inside-a-decompiler.html', '/inside-an-llm-serving-gpu': 'inside-an-llm-serving-gpu.html',
  '/developer': 'developer.html', '/docs': 'developer.html',
  '/contact': 'contact.html', '/privacy': 'privacy.html',
  '/learning-paths': 'learning-paths.html', '/certifications': 'certifications.html',
};
for (const filename of Object.values(PAGES)) PAGES['/' + filename] = filename;

module.exports = { PAGES };
