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

class ConflictError extends Error {
  constructor (message) {
    super(message)
    this.message = message
    this.name = 'ConflictError'
  }
}

module.exports = { ValidationError, EmptyResultError, ForbiddenError, UnauthorizedError, ConflictError }
