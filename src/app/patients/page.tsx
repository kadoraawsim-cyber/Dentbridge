import type { Metadata } from 'next'
import PatientsPageClient from './patients-client'

export const metadata: Metadata = {
  title: 'DentBridge — Affordable Supervised Dental Care',
  description:
    'DentBridge helps patients access affordable dental care through a faculty-reviewed university clinical process.',
}

export default function PatientsPage() {
  return <PatientsPageClient />
}
