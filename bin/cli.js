#!/usr/bin/env node

const glob = require('glob');

const isGlob = require('is-glob');

const deploy = require('../lib/deploy');

const path = require('path');

const chalk = require('chalk');

const mri = require('mri');

const SUCCESS = chalk.green('✔');
const ERROR = chalk.red('✖');
const PROGRESS = chalk.gray('○');
const DONE = chalk.gray('●');
const NONE = '';

require('dotenv').config();


// main script
(async function() {

  const args = mri(process.argv.slice(2), {
    alias: {
      t: 'tenant-id',
      S: 'source',
      n: 'name'
    },
    boolean: [
      'verbose',
      'quite',
      'json',
      'help'
    ],
    string: [
      'tenant-id',
      'source',
      'name'
    ]
  });

  if (!args.json) {
    console.log();
  }

  if (args.help) {
    return printHelp();
  }

  if (args.json && args.verbose) {
    return errorExit(args, new Error('--verbose and --json are exclusive'));
  }

  // suppress all console output if JSON output is desired
  if (args.json) {
    args.quite = true;
  }

  try {
    const result = await run(args);

    if (args.json) {
      console.log(stringify(result));
    }
  } catch (error) {
    return errorExit(args, error);
  }
})();


async function run(args) {

  const log = args.quite ? () => {} : createLog(args.verbose);

  const cwd = process.cwd();

  const resourceGlobs = args._;

  const resources = getAssetPaths(cwd, resourceGlobs);

  const endpointConfig = getEndpointConfig(process.env);

  const deploymentConfig = {
    tenantId: args['tenant-id'],
    source: args['source'],
    name: args['name']
  };

  if (!deploymentConfig.name) {
    throw new Error('missing deployment name');
  }

  log(PROGRESS, `preparing deployment (${resources.length} resources)`, {
    ...deploymentConfig,
    resources: resources.map(r => r.name)
  });

  log(PROGRESS, `deploying to Camunda`, endpointConfig);

  const deployment = await deploy(endpointConfig, {
    ...deploymentConfig,
    resources
  });

  let createdCount = 0;
  let updatedCount = 0;

  const deployedArtifacts = {};

  [
    { key: 'deployedProcessDefinitions', name: 'processDefinitions' },
    { key: 'deployedCaseDefinitions', name: 'caseDefinitions' },
    { key: 'deployedDecisionDefinitions', name: 'decisionDefinitions' },
    { key: 'deployedDecisionRequirementsDefinitions', name: 'decisionRequirementsDefinitions' }
  ].forEach((deployedType) => {

    const {
      key,
      name
    } = deployedType;

    const deployed = Object.values(deployment[key] || {});

    const actualDeployed = deployed.map(d => ({
      key: d.key,
      resource: d.resource,
      version: d.version,
      versionTag: d.versionTag
    }));

    if (actualDeployed.length) {
      deployedArtifacts[name] = actualDeployed;
    }

    createdCount += actualDeployed.filter(a => a.version === 1).length;
    updatedCount += actualDeployed.filter(a => a.version !== 1).length;
  });

  if (!createdCount && !updatedCount) {
    log(DONE, bold('no artifacts updated/added'));
  } else {
    log(
      SUCCESS,
      bold(`${createdCount + updatedCount} artifacts deployed (${createdCount} added, ${updatedCount} updated)`),
      deployedArtifacts
    );
  }

  return deployedArtifacts;
}


// helpers ///////////////////////////

function getAssetPaths(cwd, globs) {
  return Object.keys(
    globs.reduce((assets, maybeGlob) => {

      if (isGlob(maybeGlob)) {
        glob.sync(maybeGlob).forEach((file) => {
          assets[file] = true;
        });
      } else {
        assets[maybeGlob] = true;
      }

      return assets;
    }, {})
  ).map(name => {
    return { name, path: path.join(cwd, name) };
  });
}


function getEndpointConfig(env) {

  const url = env.CAMUNDA_URL;

  if (!url) {
    throw new Error('CAMUNDA_URL not configured, please specify it via environment variable');
  }

  const auth = (
    env.CAMUNDA_AUTH_USERNAME ? {
      type: 'basic',
      username: env.CAMUNDA_AUTH_USERNAME,
      password: env.CAMUNDA_AUTH_PASSWORD
    } : (
      env.CAMUNDA_AUTH_BEARER ? {
        type: 'bearer',
        token: env.CAMUNDA_AUTH_BEARER
      } : {
        type: 'none'
      }
    )
  );

  return {
    url,
    auth
  };
};


function filterNull(key, value) {
  if (typeof value === 'undefined' || value === null) {
    return undefined;
  }

  if (key === 'password' || key === 'token') {
    return '************';
  }

  return value;
}


function indent(str, chars) {
  return `${chars}` + str.split(/\n/g).join(`\n${chars}`);
}

function createLog(verbose) {
  return function log(type, msg, payload) {
    console[
      type === ERROR ? 'error' : 'log'
    ](` ${type} ${msg}`);

    if (verbose && payload) {
      const serializedPayload = stringify(payload);

      console[
        type === ERROR ? 'error' : 'log'
      ](`${indent(serializedPayload, '   ')}`);
    }
  }

}

function errorExit(args, error) {
  console.error(` ${ERROR} ${error.message}`);

  if (args.verbose) {
    console.error(error);
  }

  if (args.json) {
    console.log('null');
  } else {

    if (!args.verbose) {
      console.log(`
Run with --verbose for additional debug output.`
      );
    }
  }

  process.exit(1);
}

function stringify(obj) {
  return JSON.stringify(obj, filterNull, '  ');
}

function printHelp() {

  const help = `
${bold('Usage')}

  $ camunda-deploy [options...] <resources...>

${bold('Options')}

  -n, --name <name>       The deployment name
  -t, --tenant-id <id>    The (optional) tenant to deploy to
  -S, --source <source>   The (optional) deployment source

  --verbose               Log verbose output
  --quite                 Log no output
  --json                  Output deployed resources as JSON

${bold('Endpoint Configuration')}

  The CLI will read the Camunda endpoint as well as authentication
  credentials from the following environment variables:

  CAMUNDA_URL
  CAMUNDA_AUTH_USERNAME
  CAMUNDA_AUTH_PASSWORD
  CAMUNDA_AUTH_BEARER

  To retrieve the values it will read a .env file, if found, too.

${bold('Examples')}

  $ camunda-deploy -n invoice -S node-worker-1 *.bpmn

   ○ preparing deployment (5 resources)
   ○ deploying to Camunda
   ✔ 3 artifacts deployed (2 added, 1 updated)

  $ camunda-deploy -n invoice --json *.bpmn > result.json
    `.trim();

  console.log(help);
}

function bold(str) {
  return chalk.bold(str);
}