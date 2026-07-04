import type { MetadataRoute } from 'next'

const fallbackUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || fallbackUrl).replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
