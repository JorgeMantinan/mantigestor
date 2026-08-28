import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/ajustes/', '/dashboard/'],
      },
    ],
    sitemap: 'https://mantigestor.vercel.app/sitemap.xml',
  }
}
