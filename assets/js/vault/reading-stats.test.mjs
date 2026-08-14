import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordCount, readingTimeMinutes, formatReadingStats } from './reading-stats.js';

test('wordCount counts whitespace-separated words', () => {
  assert.equal(wordCount('The quick brown fox'), 4);
});

test('wordCount collapses runs of whitespace, including newlines', () => {
  assert.equal(wordCount('one   two\n\nthree'), 3);
});

test('wordCount is 0 for empty or whitespace-only text', () => {
  assert.equal(wordCount(''), 0);
  assert.equal(wordCount('   \n  '), 0);
});

test('readingTimeMinutes rounds to the nearest minute at 200 wpm', () => {
  assert.equal(readingTimeMinutes(400), 2);
  assert.equal(readingTimeMinutes(250), 1); // rounds, but never below 1 once words > 0
});

test('readingTimeMinutes is 0 for 0 words', () => {
  assert.equal(readingTimeMinutes(0), 0);
});

test('formatReadingStats formats with a thousands separator and a "min read" suffix', () => {
  assert.equal(formatReadingStats('word '.repeat(1234)), '1,234 words · 6 min read');
});

test('formatReadingStats returns null for empty text', () => {
  assert.equal(formatReadingStats(''), null);
});
