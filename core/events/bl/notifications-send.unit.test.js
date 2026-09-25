/**
 * End-to-end check of the event-alert SEND PAYLOAD.
 *
 * Mocks the data layer (models/subscriptions/firebase) so `notify()` can run
 * without a database, and intercepts the mail wrapper so nothing is sent.
 * The assertion is on what the provider would actually receive.
 */

jest.mock('../../subscriptions/dao', () => ({
  query: jest.fn(async () => ([
    { subscription_type: { name: 'Email' }, user: { email: 'alice@example.org' } },
    { subscription_type: { name: 'Email' }, user: { email: 'bob@example.org' } }
  ]))
}))

jest.mock('../../_utils/datetime/timezone', () => ({
  getTzByLatLng: jest.fn(async () => 'America/Guayaquil')
}))

jest.mock('../../../noncore/_services/firebase/firebase-service', () => ({
  sendToTopic: jest.fn(async () => ({ ok: true }))
}))

const sent = []
jest.mock('../../../noncore/_services/mail/mailchimp-wrapper', () => ({
  sendEmail: jest.fn(async (opts) => { sent.push(opts); return { success: true } }),
  sendMessage: jest.fn(async () => ({ success: true })),
  subsribeToList: jest.fn(async () => ({})),
  sendMail: jest.fn(async () => ({ success: true }))
}))

const { notify } = require('./notifications')

function cellFor (html, label) {
  const row = String(html).split(/<\/tr>/).find((chunk) => chunk.includes(`${label}:`))
  if (!row) {
    return null
  }
  const match = row.match(/font: 400 14px Arial, sans-serif;">\s*([^<]*)</)
  return match ? match[1].trim() : null
}

const EVENT = {
  id: 'evt1',
  start: '2026-08-29T13:15:00.000Z',
  stream: { id: 'str1', name: 'Cerro Blanco Site 3', latitude: -2.1, longitude: -80.0, project: { id: 'prj1' } },
  classification: { title: 'Chainsaw' }
}

describe('event alert send payload', () => {
  beforeEach(() => { sent.length = 0 })

  test('the html actually delivered carries the event data', async () => {
    // let the boot-time template read resolve
    await new Promise((resolve) => setTimeout(resolve, 50))
    await notify(EVENT)

    expect(sent).toHaveLength(1)
    const opts = sent[0]

    expect(cellFor(opts.html, 'Site')).toBe('Cerro Blanco Site 3')
    expect(cellFor(opts.html, 'What detected')).toBe('Chainsaw')
    expect(opts.html).not.toContain('{{')

    // subject was already correct (template literals), assert it stays correct
    expect(opts.subject).toContain('Chainsaw')
    expect(opts.subject).toContain('Cerro Blanco Site 3')

    // both subscribers addressed
    expect(opts.to.map((t) => t.email).sort()).toEqual(['alice@example.org', 'bob@example.org'])
  })

  test('the caller no longer supplies merge variables', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
    await notify(EVENT)
    const opts = sent[0]

    // The caller's merge vars are gone: the html is now rendered server-side.
    expect(opts.global_merge_vars).toBeUndefined()
  })

  test('DOCUMENTS A MIGRATION TRAP: mail-service re-injects the Mandrill merge contract', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
    await notify(EVENT)
    const opts = sent[0]

    // Even though `sendEmails` no longer passes these, `mail-service.sendEmail`
    // re-adds them via Converter `.default()` — `merge_language` defaults to
    // 'handlebars' and `merge_vars` is not even optional.
    //
    // Harmless while the provider is Mandrill (there is nothing left to merge),
    // but it means the Mandrill merge contract lives in mail-service, NOT in the
    // caller. Retiring Mandrill must remove these fields from `sendEmail` itself.
    // Pinned here so the migration cannot overlook it.
    expect(opts.merge_language).toBe('handlebars')
    expect(opts.merge_vars).toEqual([])
  })
})
