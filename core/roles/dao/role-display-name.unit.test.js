const { getRoleDisplayName, ROLE_DISPLAY_NAMES } = require('./index')

describe('getRoleDisplayName', () => {
  test('maps Owner to Primary Admin (display only)', () => {
    expect(getRoleDisplayName('Owner')).toBe('Primary Admin')
    expect(ROLE_DISPLAY_NAMES.Owner).toBe('Primary Admin')
  })

  test('keeps non-Owner role names unchanged', () => {
    expect(getRoleDisplayName('Admin')).toBe('Admin')
    expect(getRoleDisplayName('Member')).toBe('Member')
    expect(getRoleDisplayName('Guest')).toBe('Guest')
  })

  test('falls back to the input when role is unknown / nullish', () => {
    expect(getRoleDisplayName('Custom')).toBe('Custom')
    expect(getRoleDisplayName(undefined)).toBe(undefined)
    expect(getRoleDisplayName(null)).toBe(null)
    expect(getRoleDisplayName('')).toBe('')
  })
})
