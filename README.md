# camunda-deploy

[![Build Status](https://travis-ci.com/nikku/camunda-deploy.svg?branch=master)](https://travis-ci.com/nikku/camunda-deploy)

Deploy to [Camunda](https://camunda.com/products/bpmn-engine/) via command-line.


## Installation

Install the command-line utility globally via:

```sh
npm install camunda-deploy -g
```

Alternatively, use it directly via `npx`:

```sh
npx camunda-deploy -n my-deployment *.bpmn
```


## Usage

```sh
Usage

  $ camunda-deploy [options...] <resources...>

Options

  -n, --name <name>       The deployment name
  -t, --tenant-id <id>    The (optional) tenant to deploy to
  -S, --source <source>   The (optional) deployment source

  --verbose               Log verbose output
  --quite                 Log no output
  --json                  Output deployed resources as JSON

Endpoint Configuration

  The CLI will read the Camunda endpoint as well as authentication
  credentials from the following environment variables:

  CAMUNDA_URL
  CAMUNDA_AUTH_USERNAME
  CAMUNDA_AUTH_PASSWORD
  CAMUNDA_AUTH_BEARER

  To retrieve the values it will read a .env file, if found, too.

Examples

  $ camunda-deploy -n invoice -s node-worker-1 *.bpmn
  
   ○ preparing deployment (5 resources)
   ○ deploying to Camunda
   ✔ 3 artifacts deployed (2 added, 1 updated)

  $ camunda-deploy -n invoice --json *.bpmn > result.json
```


## LICENSE

MIT
