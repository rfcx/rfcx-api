module.exports = {
  /**
  * Prepare a sort clause for Sequelize
  *
  * @param {string} sort request
  * @return {string[]} Sequelize sort clause
  */
  getSortFields: function (sort) {
    const sortList = []
    const sortItems = sort.split(',')
    sortItems.forEach( item => {
      if(item.startsWith('-')) {
        sortList.push([item.substring(1), 'DESC'])
      } else {
        sortList.push([item, 'ASC'])
      }
    })
    return sortList
  }
}
