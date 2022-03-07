const NodeCache = require('node-cache')

/**
 * Cache service
 */
class Cache {
  /**
   * @param {number} ttlSeconds Number of seconds to keep items in the cache
   */
  constructor (ttlSeconds) {
    this.cache = new NodeCache({ stdTTL: ttlSeconds })
  }

  /**
   * Retrieve an item from the cache or get it from the miss function
   * @param {string} key Identify the cache item
   * @param {*} missFunction Function to get the item on a cache miss
   * @returns * Cache item
   */
  get (key, missFunction) {
    const value = this.cache.get(key)
    if (value) {
      return Promise.resolve(value)
    }

    return missFunction().then((result) => {
      this.cache.set(key, result)
      return result
    })
  }

  /**
   * Invalidate a cache item or items
   * @param {string|string[]} keys Identify the cache item(s)
   */
  flush (keys) {
    this.cache.del(keys)
  }

  /**
   * Invalidate cache items with identifiers beginning with the string
   * @param {string} startStr Starting string
   */
  flushStartsWith (startStr) {
    if (!startStr) {
      return
    }

    const keys = this.cache.keys()
    for (const key of keys) {
      if (key.indexOf(startStr) === 0) {
        this.flush(key)
      }
    }
  }

  /**
   * Invalidate the entire cache (remove all items)
   */
  flushAll () {
    this.cache.flushAll()
  }
}

module.exports = Cache
