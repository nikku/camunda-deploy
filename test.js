const execa = require('execa');

// mixed deployment, --verbose
execa.sync('node', [
  `${__dirname}/bin/cli.js`,
  '-n',
  'test-1',
  '--verbose',
  '*'
], {
  cwd: `${__dirname}/test/mixed-deployment`
});


// mixed deployment, --source, --json
execa.sync('node', [
  `${__dirname}/bin/cli.js`,
  '-s',
  'node-app',
  '-n',
  'test-2',
  '--json',
  '*'
], {
  cwd: `${__dirname}/test/mixed-deployment`
});


// missing name
expectFail(() => {

  execa.sync('node', [
    `${__dirname}/bin/cli.js`,
    '--quite',
    '*'
  ], {
    cwd: `${__dirname}/test/mixed-deployment`
  });

});

// mixed deployment, --tenant-id, --quite
execa.sync('node', [
  `${__dirname}/bin/cli.js`,
  '-t',
  '1',
  '-n',
  'test-2',
  '--quite',
  '*'
], {
  cwd: `${__dirname}/test/mixed-deployment`
});


// missing env, --json
expectFail(() => {

  execa.sync('node', [
    `${__dirname}/bin/cli.js`,
    '-n',
    'test-3',
    '--quite',
    '*.bpmn'
  ], {
    cwd: `${__dirname}/test/missing-env`
  });
});



function expectFail(fn) {

  let error;

  try { fn(); } catch (e) { error = e; }

  if (!error) {
    throw new Error('expected failure');
  }
}