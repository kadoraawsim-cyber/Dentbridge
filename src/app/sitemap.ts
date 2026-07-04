import type { MetadataRoute } from 'next'

const fallbackUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || fallbackUrl).replace(/\/$/, '')

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/about',
    '/patients',
    '/patient/request',
    '/patient/status',
    '/privacy',
    '/terms',
    '/personal-data-protection-law',
    '/faq',
    '/students',
  ]

  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.8,
  }))
}
