import sum from '../sum.js';
import { describe, test, expect } from '@jest/globals';

describe('sum', () => {
  test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
  });
});