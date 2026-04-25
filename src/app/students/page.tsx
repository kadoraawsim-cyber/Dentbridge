import type { Metadata } from 'next'
import StudentsPageClient from './students-client'

export const metadata: Metadata = {
  title: 'For Students | DentBridge',
  description:
    'Learn how DentBridge helps dental students access supervised clinical cases and manage their clinical workflow.',
}

export default function StudentsPage() {
  return <StudentsPageClient />
}
