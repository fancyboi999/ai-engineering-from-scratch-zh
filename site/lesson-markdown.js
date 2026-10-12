'use strict';

// API 阅读器仍使用 md-render.js；这里仅负责受课程清单约束的本地源码读取。
const fs = require('node:fs');
const path = require('node:path');
const MDRender = require('./md-render');

function readLessonMarkdown(root, lessonPath, manifest) {
  if (!/^(?:phases\/[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*|certifications\/(?:claude|mcpa)\/lessons\/[a-z0-9][a-z0-9-]*)$/.test(lessonPath || '') ||
      !manifest || !manifest.lessons || !Object.prototype.hasOwnProperty.call(manifest.lessons, lessonPath) ||
      !manifest.lessons[lessonPath] || manifest.lessons[lessonPath].path !== lessonPath) {
    throw new Error('SourceBoundary: lesson is outside the published manifest');
  }
  const sourceRoot = path.resolve(root);
  const relative = `${lessonPath}/docs/zh.md`;
  let filename = sourceRoot;
  // 不允许任何一级目录或正文是符号链接，即使目标仍在仓库内。
  for (const segment of relative.split('/')) {
    filename = path.join(filename, segment);
    if (fs.lstatSync(filename).isSymbolicLink()) throw new Error('SourceBoundary: symlink');
  }
  const realRoot = fs.realpathSync(sourceRoot);
  const realFile = fs.realpathSync(filename);
  if (!realFile.startsWith(realRoot + path.sep)) throw new Error('SourceBoundary: source escaped root');
  const fd = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const opened = fs.fstatSync(fd);
    const current = fs.lstatSync(filename);
    if (!opened.isFile() || current.isSymbolicLink() || opened.dev !== current.dev || opened.ino !== current.ino ||
        fs.realpathSync(filename) !== realFile) throw new Error('SourceBoundary: source changed during open');
    return fs.readFileSync(fd, 'utf8');
  } finally {
    fs.closeSync(fd);
  }
}

module.exports = { ...MDRender, readLessonMarkdown };
