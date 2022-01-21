function condAdd (sql, condition, add) {
  if (condition != null && condition !== false) {
    sql += add
  }
  return sql
}

module.exports = { condAdd }
