'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');

const read = name => fs.readFileSync(path.join(__dirname, '../../capture/out', name), 'utf8');
const retrieval = read('39-retrieval.txt');
const dimsMatch = retrieval.match(/"dims": (\d+)/);
if (!dimsMatch) throw new Error('fig-7-1: no dims in 39-retrieval.txt');
const dims = Number(dimsMatch[1]);
const agentText = read('47-retrieval-agent.txt');
const hitMatch = agentText.match(/"type": "ToolMessage",\n\s+"content": "(\[[^\]]+\] [^"]*)"/);
const chunkMatch = agentText.match(/the hit is chunk (\d+) of (\d+)/);
if (!hitMatch || !chunkMatch) throw new Error('fig-7-1: no ToolMessage or hit line in 47-retrieval-agent.txt');
const hit = hitMatch[1];
const shown = hit.length > 74 ? hit.slice(0, hit.lastIndexOf('. ', 72) + 1) : hit;
const chunks = Number(chunkMatch[2]);

module.exports = figure('fig-7-1', {
  height: 330,
  title: '检索录制的索引时与查询时',
  desc: `两行。索引时，三个 Markdown 文件交给 langchain-text-splitters 的 RecursiveCharacterTextSplitter，切成 ${chunks} 个最长 80 个字符的块。langchain-ollama 的 OllamaEmbeddings 用模型 nomic-embed-text 把每个块转成 ${dims} 个数字，langchain-core 的 InMemoryVectorStore 把它们存为 doc-0 到 doc-${chunks - 1}。查询时，create_agent 询问模型，模型调用工具 search_docs，工具调用由 as_retriever 得到的检索器（k 等于 1），检索器搜索 store，ToolMessage 把块 doc-${chunkMatch[1]} 带回模型，其开头为 "${shown}"`,
}, f => {
  f.kicker(20, 20, '索引时：只做一次');
  const files = f.box({ x: 20, y: 32, w: 128, h: 58, hue: 'violet', title: '3 个文件', sub: ['checkpoints.md', '另外两个'] });
  const split = f.box({ x: 176, y: 32, w: 136, h: 58, hue: 'blue', title: 'TextSplitter', sub: ['递归切分，大小 80', `${chunks} 个块`] });
  const embed = f.box({ x: 340, y: 32, w: 130, h: 58, hue: 'plum', title: '嵌入', sub: ['nomic-embed-text', `每块 ${dims} 个数字`] });
  const store = f.box({ x: 498, y: 32, w: 122, h: 58, hue: 'blue', title: '向量存储', sub: ['InMemory', `doc-0 to doc-${chunks - 1}`] });
  f.arrow(files.right(), [split.x - 1, files.cy], { style: 'call' });
  f.arrow(split.right(), [embed.x - 1, split.cy], { style: 'call' });
  f.arrow(embed.right(), [store.x - 1, embed.cy], { style: 'call' });
  f.text(176, 108, 'langchain-text-splitters', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(340, 108, 'langchain-ollama', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(498, 108, 'langchain-core', { size: 11, serif: true, hue: 'ink-soft' });
  f.kicker(20, 146, '查询时：每次工具调用');
  const agent = f.box({ x: 20, y: 160, w: 128, h: 58, hue: 'indigo', title: 'create_agent', sub: ['模型节点', '工具节点'] });
  const tool = f.box({ x: 176, y: 160, w: 136, h: 58, hue: 'green', title: 'search_docs', sub: ['@tool，只有一个', '参数：query'] });
  const retr = f.box({ x: 340, y: 160, w: 130, h: 58, hue: 'blue', title: 'retriever', sub: ['as_retriever', 'k=1'] });
  f.arrow(agent.right(agent.h / 2 - 12), [tool.x - 1, agent.cy - 12], { style: 'call' });
  f.arrow([tool.x - 1, agent.cy + 14], [agent.x + agent.w + 1, agent.cy + 14], { style: 'reply' });
  f.arrow(tool.right(), [retr.x - 1, tool.cy], { style: 'call' });
  f.path(`M${retr.x + retr.w} ${retr.cy} H604 V${store.y + store.h + 1}`, { style: 'call' });
  f.text(562, 160, '检索', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 246, '返回模型的 ToolMessage 的开头：', { size: 11, serif: true, hue: 'ink-soft' });
  f.box({ x: 20, y: 256, w: 600, h: 34, hue: 'green', title: shown, titleSize: 11.5, weight: 400, align: 'left' });
  f.text(20, 316, `Ollama 上的 nomic-embed-text 为模型的问题选出了 ${chunks} 个块中的第 ${chunkMatch[1]} 块。`, { size: 11, serif: true, hue: 'ink-soft' });
});
