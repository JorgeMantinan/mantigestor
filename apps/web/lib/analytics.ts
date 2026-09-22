'use client'

interface PageView {
  path: string
  timestamp: number
}

interface FeatureUsage {
  feature: string
  count: number
  lastUsed: number
}

interface ErrorLog {
  message: string
  path: string
  timestamp: number
  count: number
}

const PAGE_VIEWS_KEY = 'mg-analytics-pageviews'
const FEATURE_KEY = 'mg-analytics-features'
const ERROR_KEY = 'mg-analytics-errors'
const MAX_ENTRIES = 1000

function safeGet<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function safeSet<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data.slice(-MAX_ENTRIES)))
  } catch {
    // quota exceeded
  }
}

export function trackPageView(path: string): void {
  const views = safeGet<PageView>(PAGE_VIEWS_KEY)
  views.push({ path, timestamp: Date.now() })
  safeSet(PAGE_VIEWS_KEY, views)
}

export function trackFeature(feature: string): void {
  const features = safeGet<FeatureUsage>(FEATURE_KEY)
  const existing = features.find(f => f.feature === feature)
  if (existing) {
    existing.count++
    existing.lastUsed = Date.now()
  } else {
    features.push({ feature, count: 1, lastUsed: Date.now() })
  }
  safeSet(FEATURE_KEY, features)
}

export function trackError(message: string, path: string): void {
  const errors = safeGet<ErrorLog>(ERROR_KEY)
  const existing = errors.find(e => e.message === message && e.path === path)
  if (existing) {
    existing.count++
    existing.timestamp = Date.now()
  } else {
    errors.push({ message, path, timestamp: Date.now(), count: 1 })
  }
  safeSet(ERROR_KEY, errors)
}

export function getPageViews(): PageView[] {
  return safeGet<PageView>(PAGE_VIEWS_KEY)
}

export function getFeatureUsage(): FeatureUsage[] {
  return safeGet<FeatureUsage>(FEATURE_KEY)
}

export function getErrorLogs(): ErrorLog[] {
  return safeGet<ErrorLog>(ERROR_KEY)
}

export function getTopPages(limit = 10): Array<{ path: string; views: number }> {
  const views = getPageViews()
  const counts = new Map<string, number>()
  views.forEach(v => counts.set(v.path, (counts.get(v.path) ?? 0) + 1))
  return Array.from(counts.entries())
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
}

export function getTopFeatures(limit = 10): FeatureUsage[] {
  return getFeatureUsage()
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export function clearAnalytics(): void {
  try {
    localStorage.removeItem(PAGE_VIEWS_KEY)
    localStorage.removeItem(FEATURE_KEY)
    localStorage.removeItem(ERROR_KEY)
  } catch {
    // ignore
  }
}
