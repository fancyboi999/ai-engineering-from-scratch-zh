const assert = require('node:assert/strict');
const test = require('node:test');
const walk = require('./lesson-walkthrough.js');

const { DAY, INTERVAL_DAYS, sectionIndexAt, stepAt, nextRevisit, recordRevisit, daysAgo } = walk;
const T0 = Date.UTC(2026, 9, 21);

test('the current section is the last heading above the reading line', () => {
  const tops = [100, 600, 1400];
  assert.equal(sectionIndexAt(tops, 50), -1);
  assert.equal(sectionIndexAt(tops, 100), 0);
  assert.equal(sectionIndexAt(tops, 900), 1);
  assert.equal(sectionIndexAt(tops, 9000), 2);
});

test('a step is lit only between its heading and the end of its section', () => {
  const tops = [1000, 1400, 1900];
  assert.equal(stepAt(tops, 2600, 900), -1);
  assert.equal(stepAt(tops, 2600, 1500), 1);
  assert.equal(stepAt(tops, 2600, 2599), 2);
  assert.equal(stepAt(tops, 2600, 2600), -1);
  assert.equal(stepAt(tops, null, 99999), 2);
});

test('a lesson is due one day after completion, never before', () => {
  const lessons = { 'phases/a/b': { completedAt: T0 } };
  assert.equal(nextRevisit(lessons, {}, T0 + DAY - 1, ''), null);
  assert.equal(nextRevisit(lessons, {}, T0 + DAY, ''), 'phases/a/b');
});

test('the lesson on screen and unfinished lessons are never suggested', () => {
  const lessons = { 'phases/a/b': { completedAt: T0 }, 'phases/a/c': { completedAt: null } };
  assert.equal(nextRevisit(lessons, {}, T0 + 10 * DAY, 'phases/a/b'), null);
});

test('the most overdue lesson comes first', () => {
  const lessons = { 'phases/a/new': { completedAt: T0 + 5 * DAY }, 'phases/a/old': { completedAt: T0 } };
  assert.equal(nextRevisit(lessons, {}, T0 + 7 * DAY, ''), 'phases/a/old');
});

test('recall widens the interval, forgetting resets it, later keeps it', () => {
  let state = recordRevisit({}, 'p', 'recalled', T0);
  assert.deepEqual(state.p, { step: 1, at: T0 });
  const lessons = { p: { completedAt: T0 - 10 * DAY } };
  assert.equal(nextRevisit(lessons, state, T0 + INTERVAL_DAYS[1] * DAY - 1, ''), null);
  assert.equal(nextRevisit(lessons, state, T0 + INTERVAL_DAYS[1] * DAY, ''), 'p');
  state = recordRevisit(state, 'p', 'later', T0 + DAY);
  assert.deepEqual(state.p, { step: 1, at: T0 + DAY });
  state = recordRevisit(state, 'p', 'forgot', T0 + 2 * DAY);
  assert.deepEqual(state.p, { step: 0, at: T0 + 2 * DAY });
});

test('a lesson recalled at every interval retires from review', () => {
  let state = {};
  for (let i = 0; i < INTERVAL_DAYS.length; i++) state = recordRevisit(state, 'p', 'recalled', T0);
  assert.equal(nextRevisit({ p: { completedAt: T0 } }, state, T0 + 1000 * DAY, ''), null);
});

test('a retired lesson completed again starts a fresh schedule', () => {
  let state = {};
  for (let i = 0; i < INTERVAL_DAYS.length; i++) state = recordRevisit(state, 'p', 'recalled', T0);
  const again = { p: { completedAt: T0 + 30 * DAY } };
  assert.equal(nextRevisit(again, state, T0 + 31 * DAY - 1, ''), null);
  assert.equal(nextRevisit(again, state, T0 + 31 * DAY, ''), 'p');
});

test('recordRevisit does not mutate its input', () => {
  const before = { p: { step: 2, at: T0 } };
  recordRevisit(before, 'p', 'recalled', T0 + DAY);
  assert.deepEqual(before, { p: { step: 2, at: T0 } });
});

test('ages read as plain words', () => {
  assert.equal(daysAgo(T0, T0 + 1000), '今天');
  assert.equal(daysAgo(T0, T0 + DAY), '昨天');
  assert.equal(daysAgo(T0, T0 + 6 * DAY), '6 天前');
});
