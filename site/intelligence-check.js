(function (root) {
  'use strict';

  var replies = [
    ['先定义“到了”。', '在此期间，动手造点东西。'],
    ['先定义“智能”。', '一个不错的起点。'],
    ['反向传播仍然值得学。', '有些问题最好通过动手构建来回答。']
  ];

  function init(doc, environment) {
    var card = doc && doc.querySelector('[data-intelligence-check]');
    if (!card || card.getAttribute('data-intelligence-ready') === 'true') return false;

    var button = card.querySelector('[data-intelligence-trigger]');
    var answer = card.querySelector('[data-intelligence-answer]');
    var hint = card.querySelector('[data-intelligence-hint]');
    var label = card.querySelector('[data-intelligence-label]');
    if (!button || !answer || !hint) return false;

    var runtime = environment || root;
    var count = 0;
    button.addEventListener('click', function (event) {
      var reduced = typeof runtime.matchMedia === 'function' && runtime.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var index = count % replies.length;
      count += 1;
      card.setAttribute('data-motion', event.detail === 0 || reduced ? 'instant' : 'animate');
      card.setAttribute('data-state', 'answered');
      card.setAttribute('data-check', String(count));
      card.setAttribute('data-dial', String(index + 1));
      answer.textContent = replies[index][0];
      hint.textContent = replies[index][1];
      if (label) label.textContent = '再问一次';
    });

    card.setAttribute('data-intelligence-ready', 'true');
    button.disabled = false;
    return true;
  }

  if (typeof module === 'object' && module.exports) module.exports = { init: init };
  if (root.document) init(root.document, root);
})(typeof window !== 'undefined' ? window : globalThis);
