'use client'

/**
 * App-wide client providers.
 * Imported by the server-component RootLayout so that client state
 * (language preference, etc.) is available to every page without
 * turning the layout itself into a client component.
 *
 * Add any future global client providers (theme, toast, etc.) here.
 */

import { LanguageProvider } from '@/lib/i18n'
import PublicPatientChatWidget from '@/components/PublicPatientChatWidget'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      {children}
      <PublicPatientChatWidget />
    </LanguageProvider>
  )
}
