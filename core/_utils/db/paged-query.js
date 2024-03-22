async function pagedQuery (model, query) {
  const method = (!!query.limit || !!query.offset) ? 'findAndCountAll' : 'findAll'
  const data = await model[method](query)
  return method === 'findAndCountAll'
    ? { total: data.count, results: data.rows.map(r => r.toJSON()) }
    : { total: data.length, results: data.map(r => r.toJSON()) }
}

module.exports = pagedQuery
