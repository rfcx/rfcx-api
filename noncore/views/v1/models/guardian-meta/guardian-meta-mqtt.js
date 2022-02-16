exports.models = {

  guardianMetaMqttBrokerConnections: function (req, res, dbMeta, modelInfo) {
    if (!Array.isArray(dbMeta)) { dbMeta = [dbMeta] }

    const jsonArray = []

    for (const i in dbMeta) {
      const dbRow = dbMeta[i]

      jsonArray.push({
        connected_at: dbRow.connected_at,
        connection_latency: dbRow.connection_latency,
        subscription_latency: dbRow.subscription_latency
      })
    }
    return jsonArray
  }

}
