import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ExplanationToggle from '../../app/features/recommendation/components/ExplanationToggle.tsx';
test('explanation toggle uses a native keyboard button and exposes its state', () => {
  for (const checked of [false, true]) {
    const html = renderToStaticMarkup(React.createElement(ExplanationToggle, { checked, onChange() {} }));
    assert.match(html, /<button type="button"/);
    assert.ok(html.includes(`aria-pressed="${checked}"`));
    assert.match(html, /Vì sao có bài này/);
  }
  let next;
  ExplanationToggle({ checked: false, onChange: value => { next = value; } }).props.onClick();
  assert.equal(next, true);
});
