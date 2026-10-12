'use strict';

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function plainMarkdown(value) {
  return normalizeWhitespace(value)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~]+/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\\([\\`*_[\]{}()#+\-.!])/g, '$1');
}

// 长度沿用 SEO 校验器的 UTF-16 单位；不截断 surrogate pair，
// 中文正文也不回退到英文空格边界。
const CJK_SOURCE = '[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}]';
const CJK = new RegExp(CJK_SOURCE, 'u');
const NON_CJK_WORD = `(?:(?!${CJK_SOURCE})[\\p{L}\\p{N}])+`;
const TEXT_UNITS = new RegExp(`${CJK_SOURCE}|${NON_CJK_WORD}(?:['’-]${NON_CJK_WORD})*`, 'gu');

function truncateText(value, limit) {
  const text = normalizeWhitespace(value);
  if (!limit || text.length <= limit) return text;
  let clipped = '';
  for (const character of text) {
    if (clipped.length + character.length > Math.max(0, limit - 1)) break;
    clipped += character;
  }
  if (CJK.test(text)) return clipped.trimEnd() + '…';
  const boundary = clipped.lastIndexOf(' ');
  return (boundary >= Math.floor(limit * 0.65) ? clipped.slice(0, boundary) : clipped).trimEnd() + '…';
}

// 保留既有 API 名称；CJK 字符计长度单位，不按空格猜测中文词数。
function wordCount(value) {
  return textUnits(value).length;
}

function textUnits(value) {
  return [...normalizeWhitespace(value).matchAll(TEXT_UNITS)];
}

// CJK 字符计 1，其他语言词语计 2；70 单位对应上游 35 个英文词的门槛。
// 这是明确的长度启发式，不是中文分词。
function explanationUnits(value) {
  return textUnits(value).reduce((sum, match) => sum + (CJK.test(match[0]) ? 1 : 2), 0);
}

function truncateWords(value, limit) {
  const text = normalizeWhitespace(value);
  const units = textUnits(text);
  if (!limit || units.length <= limit) return text;
  const last = units[limit - 1];
  return text.slice(0, last.index + last[0].length).trimEnd() + '…';
}

function seoTitleFor(title) {
  const brandedTitle = `${title} | AI 工程从零开始`;
  return brandedTitle.length <= 60 ? brandedTitle : truncateText(title, 60);
}

function descriptionFromParts(title, parts) {
  const uniqueParts = [];
  for (const value of parts) {
    const text = normalizeWhitespace(value);
    if (text && !uniqueParts.includes(text)) uniqueParts.push(text);
  }
  let body = '';
  for (const part of uniqueParts) {
    body = normalizeWhitespace(`${body} ${part}`);
    const candidate = body.toLowerCase().startsWith(title.toLowerCase()) ? body : `${title}：${body}`;
    if (candidate.length >= 125) break;
  }
  const source = body
    ? (body.toLowerCase().startsWith(title.toLowerCase()) ? body : `${title}：${body}`)
    : title;
  return { description: truncateText(source, 160), descriptionSourceLength: source.length };
}

function lessonDocumentSeo(markdown, fallbackTitle) {
  const lines = String(markdown || '').split(/\r?\n/);
  let title = normalizeWhitespace(fallbackTitle);
  let summary = '';
  let fence = null;
  let paragraph = [];
  const paragraphs = [];

  function flushParagraph() {
    const text = plainMarkdown(paragraph.join(' '));
    if (text) paragraphs.push(text);
    paragraph = [];
  }

  for (const raw of lines) {
    const line = raw.trim();
    const marker = /^(`{3,}|~{3,})/.exec(line);
    if (marker) {
      flushParagraph();
      const token = marker[1].trim();
      if (!fence) fence = token;
      else if (token[0] === fence[0] && token.length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    if (!line) {
      flushParagraph();
      continue;
    }
    if (line.startsWith('# ')) {
      title = plainMarkdown(line.slice(2)) || title;
      flushParagraph();
      continue;
    }
    if (line.startsWith('>')) {
      if (!summary) summary = plainMarkdown(line.replace(/^>\s*/, ''));
      flushParagraph();
      continue;
    }
    const listItem = line.match(/^(?:[-*+]\s|\d+[.)]\s)(.+)$/);
    if (listItem) {
      const item = plainMarkdown(listItem[1]).replace(/^\[[ xX]\]\s*/, '');
      if (item) paragraph.push(/[.!?。！？]$/.test(item) ? item : item + (CJK.test(item) ? '。' : '.'));
      continue;
    }
    if (/^#{2,6}\s/.test(line) ||
        /^\*\*(?:Type|Languages?|Prerequisites|Time|类型|语言|前置要求|预计时间)\s*[:：]\s*\*\*/i.test(line) ||
        /^\|/.test(line) ||
        /^(?:---+|===+)$/.test(line)) {
      flushParagraph();
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();

  const proseParts = [summary].concat(paragraphs).filter(Boolean);
  const excerptSource = proseParts.join(' ') || title;
  const excerpt = truncateWords(excerptSource, 220);
  const { description, descriptionSourceLength } = descriptionFromParts(title, proseParts);
  return {
    title,
    seoTitle: seoTitleFor(title),
    description,
    excerpt,
    sourceWordCount: wordCount(excerptSource),
    descriptionSourceLength,
  };
}

module.exports = {
  normalizeWhitespace,
  plainMarkdown,
  truncateText,
  wordCount,
  explanationUnits,
  truncateWords,
  seoTitleFor,
  descriptionFromParts,
  lessonDocumentSeo,
};
