const classifierOutputsService = require('../../../classifiers/dao/outputs')
const classifierDeploymentsService = require('../../../classifiers/dao/deployments')
const { sequelize } = require('../../../_models')

/**
 * Update a classifier deployment
 * @param {*} params
 * @param {boolean} params.deployed
 * @param {float} params.ignoreThreshold
 */
async function update (params) {
  return sequelize.transaction(async (transaction) => {
    const options = {
      transaction
    }

    const classifierDeployment = await classifierDeploymentsService.get(params.id, { fields: 'classifier', transaction })
    if (params.ignoreThreshold) {
      const output = {
        ignoreThreshold: params.ignoreThreshold
      }
      const classifierId = classifierDeployment.classifier.id
      await classifierOutputsService.update(classifierId, output, options)
    }

    const deployment = {
      deployed: params.deployed
    }
    return await classifierDeploymentsService.update(params.id, deployment, options)
  })
}

module.exports = {
  update
}
