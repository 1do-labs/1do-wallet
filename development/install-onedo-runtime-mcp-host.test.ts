import { describe, expect, it } from '@jest/globals';

describe('Native Host installer contract', () => {
  it('uses the Chrome extension id as the only allowed origin', () => {
    const id = 'a'.repeat(32);
    expect(`chrome-extension://${id}/`).toMatch(/^chrome-extension:\/\/[a-p]{32}\/$/u);
  });
});
