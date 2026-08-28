import type { MetadataRoute } from 'next'

const BASE_URL = 'https://mantigestor.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/precios`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  const fiscalPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/fiscal`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/gestoria/facturas`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/gestoria/expediente`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/gestoria/agenda`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/alquiler`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ]

  return [...publicPages, ...fiscalPages]
}
