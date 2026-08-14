import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrastTextColor } from './contrast.js';

test('picks black text over a light background', () => {
  assert.equal(contrastTextColor('#fff3a3'), '#000000');
});

test('picks white text over a dark background', () => {
  assert.equal(contrastTextColor('#4d4d4d'), '#ffffff');
});

test('picks black over pure white and white over pure black', () => {
  assert.equal(contrastTextColor('#ffffff'), '#000000');
  assert.equal(contrastTextColor('#000000'), '#ffffff');
});

test('handles 3-digit hex shorthand', () => {
  assert.equal(contrastTextColor('#fff'), '#000000');
  assert.equal(contrastTextColor('#000'), '#ffffff');
});
