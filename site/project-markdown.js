/* Shared project link resolution. Markdown parsing stays in md-render.js. */
(function (global) {
  'use strict';
  function render(md, baseDir, renderer, repoFileUrl) {
    var source = String(md).split(/(```[\s\S]*?```|`[^`\n]+`)/g).map(function (part, index) {
      if (index % 2) return part;
      return part.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (match, label, href) {
        if (/^(?:https?:|mailto:|#)/.test(href)) return match;
        var parts = (href.indexOf('phases/') === 0 ? href : baseDir + '/' + href).split('/');
        var normalized = [];
        parts.forEach(function (part) {
          if (part === '..') normalized.pop();
          else if (part && part !== '.') normalized.push(part);
        });
        var target = normalized.join('/');
        var url;
        if (target.indexOf('phases/') === 0) {
          var lesson = target.slice('phases/'.length).replace(/\/docs\/zh\.md(?=[?#]|$)/, '');
          var suffixAt = lesson.search(/[?#]/);
          var route = suffixAt === -1 ? lesson : lesson.slice(0, suffixAt);
          url = 'https://aieng-zh.cn/lessons/' + route.replace(/\/$/, '') + '/' + (suffixAt === -1 ? '' : lesson.slice(suffixAt));
        } else url = repoFileUrl(target);
        return '[' + label + '](' + url + ')';
      });
    }).join('');
    var html = renderer.parseMd(source).replace(/href="https:\/\/aieng-zh\.cn\/lessons\//g, 'href="/lessons/');
    return { title: renderer.extractTitle(source), html: html };
  }
  if (typeof module === 'object' && module.exports) module.exports = { render: render };
  else global.AIFSProjectMarkdown = { render: render };
})(typeof window !== 'undefined' ? window : globalThis);
