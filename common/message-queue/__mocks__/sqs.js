module.exports = {
  isEnabled: jest.fn(() => true),
  publish: jest.fn(() => Promise.resolve())
}
