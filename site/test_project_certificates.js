'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validate, certificate } = require('./project-certificates');
const project = { id: 'test', title: 'Test <project>', languages: ['Python'], manifestHash: 'a'.repeat(64), stages: [{ id: 'one' }, { id: 'two' }] };
function report() {
  return { schemaVersion: 1, generatedAt: '2026-09-28T00:00:00Z', projects: [{ id: 'test', mode: 'learner', manifestHash: project.manifestHash, allStagesPassed: true, certificateEligible: true, stages: project.stages.map(s => ({ id: s.id, status: 'pass', tests: 5, skippedTests: 0 })) }] };
}
test('full learner evidence is accepted', () => assert.equal(validate(report(), project).id, 'test'));
test('reference solution evidence cannot earn a certificate', () => { const r = report(); r.projects[0].mode = 'solution'; assert.throws(() => validate(r, project), /自己的工作区/); });
test('partial reports are rejected despite a forged summary', () => { const r = report(); r.projects[0].stages.pop(); assert.throws(() => validate(r, project), /所有阶段/); });
test('skipped checks are rejected', () => { const r = report(); r.projects[0].stages[0].skippedTests = 1; assert.throws(() => validate(r, project), /跳过项/); });
test('zero tests are rejected', () => { const r = report(); r.projects[0].stages[0].tests = 0; assert.throws(() => validate(r, project), /通过测试/); });
test('stage order and identity are checked', () => { const r = report(); r.projects[0].stages.reverse(); assert.throws(() => validate(r, project), /每阶段/); });
test('stale manifest hash is rejected', () => { const r = report(); r.projects[0].manifestHash = 'b'.repeat(64); assert.throws(() => validate(r, project), /已变化/); });
test('duplicate matching results are rejected', () => { const r = report(); r.projects.push(r.projects[0]); assert.throws(() => validate(r, project), /一条本项目结果/); });
test('certificate escapes learner and project text', () => { const result = certificate(report(), project, '<img onerror=alert(1)>'); assert.ok(!result.includes('<img')); assert.ok(result.includes('&lt;project&gt;')); assert.ok(result.includes('非监考')); });
