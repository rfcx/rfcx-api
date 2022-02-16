module.exports = {
  /**
  * Prepare an order clause for Sequelize
  *
  * @param {string} sort Comma-separated list of columns, prefixed with minus (-) for descending
  * @return {string[]} Sequelize `order` clause
  */
  getSortFields: function (sort) {
    const sortList = []
    const sortItems = sort.split(',')
    sortItems.forEach(item => {
      if (item.startsWith('-')) {
        sortList.push([item.substring(1), 'DESC'])
      } else if (item.startsWith('+')) {
        sortList.push([item.substring(1), 'ASC'])
      } else {
        sortList.push([item, 'ASC'])
      }
    })
    return sortList
  }
}
