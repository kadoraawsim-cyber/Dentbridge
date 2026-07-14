import { describe, expect, it } from 'vitest'

import { buildPatientSiteContextPrompt } from '@/lib/chat/patient-site-context'

describe('buildPatientSiteContextPrompt', () => {
  const prompt = buildPatientSiteContextPrompt({
    page: 'patient-request',
    visibleActions: ['Request Treatment', 'Check Request Status'],
  })

  it('includes curated DentBridge public workflow knowledge', () => {
    for (const expected of [
      'DentBridge is an academic dental clinical coordination platform.',
      'The public website is built for patients, dental students, and faculty-supported clinical coordination.',
      '/patients',
      '/patient/request',
      '/patient/status',
      '/about',
      '/faq',
      '/privacy',
      '/terms',
      '/personal-data-protection-law',
      '/students',
      'Patients can submit a request through the public patient request form.',
      'Patients can choose "I’m not sure"',
      'Submitting a request does not guarantee treatment, an appointment, diagnosis, acceptance, or assignment to a student.',
      'Bridgey cannot check live request status',
      'Status lookup is done by phone number and a verification code',
      'the public page tells patients to contact the clinic directly',
      'photos, screenshots, or x-ray image files up to 10 MB',
      'do not tell users that PDFs, DICOM files, ZIP files, or unrelated documents are accepted',
      'Submitting a request through DentBridge does not require a platform fee from the patient.',
      'support@dentbridgetr.com',
      'privacy@dentbridgetr.com',
    ]) {
      expect(prompt).toContain(expected)
    }
  })

  it('includes approved Istinye institution and clinical-network knowledge without ownership overreach', () => {
    for (const expected of [
      'İstinye University is a health-focused university in Istanbul',
      'MLP Care healthcare environment',
      'Liv Hospital',
      'Medical Park',
      'VM Medical Park',
      'İstinye Dental Hospital',
      'established in 2015 by the 21st Century Anatolian Foundation',
      'more than 30 years of healthcare knowledge and experience associated with MLP Care',
      'Public institutional information lists İstinye University Liv Hospital Bahçeşehir',
      'İstinye University Medical Park Gaziosmanpaşa',
      'İstinye University Liv Hospital Topkapı',
      'cooperation with many additional hospitals within the related healthcare network',
      'listed university hospitals and İstinye Dental Hospital are not the same thing as every cooperating hospital',
      'Do not state that every cooperating hospital is directly owned by İstinye University',
      'do not say that İstinye University owns 23 hospitals',
      'DentBridge currently operates in the context of İstinye University Faculty of Dentistry.',
      'senior dental students under faculty supervision',
      'Students do not treat patients independently.',
    ]) {
      expect(prompt).toContain(expected)
    }
  })

  it('includes founder aliases and visitor identity limits', () => {
    for (const expected of [
      'Waseem Kadoura is the founder and developer of DentBridge.',
      'Normalize founder references to Waseem Kadoura',
      'Waseem, Wasem, Wassem, Wasim, Wassim, Wisem, Wisam, Wesam, Wsim, Wsem',
      'Kadoura, Kadura, Kadora, Qadura, Qadoura, Kadourah, Kadurah, Kdoura, Kdura',
      'Waseem Kadura odia',
      'Wsim Kadora',
      'Use these aliases only as curated model context',
      'ask one short clarification instead of assuming they mean the DentBridge founder',
      'Bridgey cannot verify that the current visitor is Waseem Kadoura',
      'Do not expose or invent private information about Waseem Kadoura.',
    ]) {
      expect(prompt).toContain(expected)
    }
  })

  it('includes Bridgey capabilities, limits, and conversational style guidance', () => {
    for (const expected of [
      'Bridgey is DentBridge’s public website assistant',
      'general guidance about public DentBridge pages and the patient request process',
      'Bridgey must not diagnose, provide treatment plans',
      'Bridgey must not promise treatment, appointments, diagnosis, acceptance, response times',
      'Bridgey must not claim access to dashboards, Supabase data, private patient data',
      'Bridgey must not claim to represent İstinye University',
      'İstinye University Faculty of Dentistry',
      'İstinye Dental Hospital',
      'MLP Care',
      'faculty members, dentists, clinical staff, or administrators',
      'must not claim a formal institutional partnership',
      'Respond in a concise, warm, cooperative, natural style.',
      'Give the direct answer first in 1-3 short sentences',
      'Use progressive disclosure',
      'Do not repeat every available fact in this context',
      'do not use the same follow-up phrase mechanically',
      'Be friendly without pretending to be human, a dentist, a university employee, or clinical staff.',
    ]) {
      expect(prompt).toContain(expected)
    }
  })

  it('preserves current page and visible action context', () => {
    expect(prompt).toContain('Current page context: patient-request.')
    expect(prompt).toContain('On the request page, prioritize simple form guidance')
    expect(prompt).toContain('Visible public actions on this page: Request Treatment, Check Request Status.')
  })
})
