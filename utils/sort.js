module.exports = {
  /**
  * return a list of fields to sort
  *
  * @param {String} sort
  * @return {List} fields to sort
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
