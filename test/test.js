const assert = require('assert');


function test(expected) {
  assert.equal('passed', expected);
  console.log(`\u001B[32m✓\u001B[39m ${expected}`);
}

test('passed');
