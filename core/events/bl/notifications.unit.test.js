const mailService = require('../../../noncore/_services/mail/mail-service')

/**
 * Regression tests for the event-alert email body.
 *
 * History: `getEventAlertHtml()` was called with NO arguments at module load,
 * so handlebars rendered the template against `undefined` and replaced every
 * `{{ }}` placeholder with an empty string. The email then went out with a
 * blank details table, while `merge_language`/`global_merge_vars` were inert
 * because there was nothing left for Mandrill to substitute.
 *
 * NOTE ON THE ASSERTION: "no `{{` survives" is NOT sufficient — it passes
 * against the broken code too (the braces were destroyed, not filled). Every
 * test below asserts the VALUES are present.
 */

const DATA = {
  streamName: 'Cerro Blanco Site 3',
  classificationName: 'Chainsaw',
  time: '09:15 2026-08-29'
}

// Pull the value out of each labelled row of the details table.
function cellFor (html, label) {
  const row = html.split(/<\/tr>/).find((chunk) => chunk.includes(`${label}:`))
  if (!row) { return null }
  const match = row.match(/font: 400 14px Arial, sans-serif;">\s*([^<]*)</)
  return match ? match[1].trim() : null
}

describe('event alert email rendering', () => {
  test('getEventAlertSource returns the RAW template, placeholders intact', async () => {
    const source = await mailService.getEventAlertSource()
    // The whole point of the source/render split: the boot-time read must NOT
    // consume the placeholders.
    expect(source).toContain('{{ streamName }}')
    expect(source).toContain('{{ classificationName }}')
    expect(source).toContain('{{ time }}')
  })

  test('renderEventAlert substitutes the event values into the details table', async () => {
    const source = await mailService.getEventAlertSource()
    const html = mailService.renderEventAlert(source, DATA)

    expect(cellFor(html, 'Site')).toBe('Cerro Blanco Site 3')
    expect(cellFor(html, 'What detected')).toBe('Chainsaw')
    expect(cellFor(html, 'Time')).toContain('09:15 2026-08-29')

    // Belt and braces: no unsubstituted placeholder may survive either.
    expect(html).not.toContain('{{')
  })

  test('the details table is NOT blank (the regression this suite exists for)', async () => {
    const source = await mailService.getEventAlertSource()
    const html = mailService.renderEventAlert(source, DATA)

    expect(cellFor(html, 'Site')).not.toBe('')
    expect(cellFor(html, 'What detected')).not.toBe('')
  })

  test('ABLATION: rendering without data yields the blank table we shipped before', async () => {
    const source = await mailService.getEventAlertSource()
    const broken = mailService.renderEventAlert(source, undefined)

    // This is exactly the old behaviour, pinned so it cannot silently return.
    expect(cellFor(broken, 'Site')).toBe('')
    expect(cellFor(broken, 'What detected')).toBe('')

    // And this is why "no {{ survives" is a useless assertion on its own:
    // it PASSES against the broken output.
    expect(broken).not.toContain('{{')
  })

  test('values are HTML-escaped, not injected raw', async () => {
    const source = await mailService.getEventAlertSource()
    const html = mailService.renderEventAlert(source, {
      ...DATA,
      streamName: 'A & B <script>alert(1)</script>'
    })

    expect(html).not.toContain('<script>')
    expect(html).toContain('&amp;')
  })
})
