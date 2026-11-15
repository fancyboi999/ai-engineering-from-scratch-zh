'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { lessonCleanPath, lessonStaticPath } = require('./hub-routes');

test('lessonCleanPath and lessonStaticPath map course paths without colliding across published lessons', () => {
  assert.equal(
    lessonCleanPath('phases/00-setup-and-tooling/01-dev-environment'),
    '/learn/setup-and-tooling/dev-environment'
  );
  assert.equal(
    lessonStaticPath('phases/00-setup-and-tooling/01-dev-environment'),
    '/lessons/00-setup-and-tooling/01-dev-environment/'
  );
  for (const invalid of [
    '',
    null,
    'certifications/claude/lessons/01-models',
    'phases/../secret/01-dev-environment',
    'phases/00-setup-and-tooling/01-dev-environment/extra',
  ]) {
    assert.equal(lessonCleanPath(invalid), '');
    assert.equal(lessonStaticPath(invalid), '');
  }

  const manifestPath = path.join(__dirname, '..', 'site', 'lesson-seo.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const coursePaths = Object.keys(manifest.lessons).filter(p => p.startsWith('phases/'));
    const cleanPaths = coursePaths.map(lessonCleanPath);
    assert.ok(cleanPaths.every(Boolean));
    assert.equal(new Set(cleanPaths).size, coursePaths.length);
  }
});
