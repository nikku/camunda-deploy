const fetch = require('node-fetch');

const fs = require('fs');

const FormData = require('form-data');


/**
 * Deploy a number of resources to a running Camunda instance.
 *
 * @example
 * const endpointUrl = 'http://localhost:38080/engine-rest';
 *
 * const result = await deploy(endpointUrl, {
 *   name: 'some-deployment',
 *   resources: [
 *     { name: 'foo.bpmn', path: './foo.bpmn' },
 *     { name: 'script.js', content: 'return false;' }
 *   ]
 * });
 *
 * const { id: deploymentId } = result;
 *
 * @param {String} endpointUrl
 * @param {Object} options
 * @param {String} options.name deployment name
 * @param {String} [options.tenantId]
 * @param {String} [options.source] deployment source
 * @param {Array<Object>} options.resources
 *
 * @return {Promise<Object, Error>} deployment result
 */
module.exports = async function deploy(endpointConfig, deployment) {
  return new Deployer().deploy(endpointConfig, deployment);
}


class Deployer {

  /**
   * Deploy diagram to the given endpoint URL.
   */
  async deploy(endpointConfig, deployment) {

    const {
      auth,
      url
    } = endpointConfig;

    try {

      // TODO(nikku): validate deployment config

      const serverResponse = await fetch(`${url}/deployment/create`, {
        method: 'POST',
        body: this.getBody(deployment),
        headers: {
          ...getAuthHeaders(auth)
        }
      });

      if (!serverResponse.ok) {
        const error = await getErrorFromResponse(serverResponse);

        throw error;
      }

      let response;

      try {
        response = await serverResponse.json();
      } catch (error) {
        response = serverResponse.statusText;
      }

      return response;
    } catch (error) {
      error.deployment = deployment;

      throw error;
    }
  }

  getBody(deployment) {

    const {
      name,
      source,
      tenantId,
      resources
    } = deployment;

    const form = new FormData();

    form.append('deployment-name', name);

    if (tenantId) {
      form.append('tenant-id', tenantId);
    }

    if (source) {
      form.append('deployment-source', source);
    }

    form.append('deploy-changed-only', 'true');

    for (const resource of resources) {
      const { name, path } = resource;

      form.append(name, fs.createReadStream(path));
    }

    return form;
  }

}


function getAuthHeaders(auth) {

  switch (auth.type) {
  case 'none':
    return { };
  case 'bearer':
    return {
      'Authorization': `Bearer ${auth.token}`
    };
  case 'basic':
    return {
      'Authorization': `Basic ${btoa(`${auth.username}:${auth.password}`)}`
    }
  default:
    throw new Error(`unknown auth type: ${auth.type}`);
  }
}

function btoa(input) {
  return Buffer.from(input, 'utf8').toString('base64');
}

async function getErrorFromResponse(response) {
  const error = new Error();

  try {
    const body = await response.json();
    error.message = body.message;
  } catch (_) {
    error.message = response.statusText;
  }

  error.status = response.status;
  error.statusText = response.statusText;
  error.url = response.url;

  return error;
}