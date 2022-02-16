class ValidationError extends Error {
  constructor (message) {
    super(message)
    this.message = message
    this.name = 'ValidationError'
  }
}

class EmptyResultError extends Error {
  constructor (message) {
    super(message)
    this.message = message
    this.name = 'EmptyResultError'
  }
}

class ForbiddenError extends Error {
  constructor (message) {
    super(message)
    this.message = message
    this.name = 'ForbiddenError'
  }
}

class UnauthorizedError extends Error {
  constructor (message) {
    super(message)
    this.message = message
    this.name = 'UnauthorizedError'
  }
}

module.exports = { ValidationError, EmptyResultError, ForbiddenError, UnauthorizedError }
