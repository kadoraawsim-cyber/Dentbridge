import { describe, expect, it } from 'vitest'

import { en } from '@/lib/i18n/translations/en'
import { tr } from '@/lib/i18n/translations/tr'

describe('patient request form: Persian language labels', () => {
  it('renders Persian in English', () => {
    expect(en.request.langPersian).toBe('Persian')
  })

  it('renders Farsça in Turkish', () => {
    expect(tr.request.langPersian).toBe('Farsça')
  })

  it('leaves the existing language labels unchanged', () => {
    expect(en.request.langTurkish).toBe('Turkish')
    expect(en.request.langEnglish).toBe('English')
    expect(en.request.langArabic).toBe('Arabic')
    expect(tr.request.langTurkish).toBe('Türkçe')
    expect(tr.request.langEnglish).toBe('İngilizce')
    expect(tr.request.langArabic).toBe('Arapça')
  })
})

describe('patient request form: Main Complaint field-level error copy', () => {
  it('states the precise 5-character minimum rule in English', () => {
    expect(en.request.mainComplaintError).toBe(
      'Please enter at least 5 characters in the Main Complaint field.'
    )
  })

  it('states the precise 5-character minimum rule in Turkish', () => {
    expect(tr.request.mainComplaintError).toBe('Ana Şikayet alanına en az 5 karakter girin.')
  })

  it('keeps the top-level summary distinct from the field-level explanation', () => {
    expect(en.request.errorMainComplaintSummary).not.toBe(en.request.mainComplaintError)
    expect(tr.request.errorMainComplaintSummary).not.toBe(tr.request.mainComplaintError)
    expect(en.request.errorMainComplaintSummary.length).toBeGreaterThan(0)
    expect(tr.request.errorMainComplaintSummary.length).toBeGreaterThan(0)
  })
})
