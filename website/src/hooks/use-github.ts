import { useQuery } from '@tanstack/react-query'

export interface GitHubStats {
  stargazers_count: number
}

export interface GitHubRelease {
  tag_name: string
  name: string
}

const REPO_API = 'https://api.github.com/repos/amnesia2k/git-aic'
const CACHE_TTL_MS = 1000 * 60 * 60 // 1 hour

// The GitHub API is called unauthenticated from the browser (60 requests/hour
// per IP), so responses are cached in localStorage for an hour. localStorage
// only exists in the browser; the page is server-rendered, so every access is
// guarded and the queries only run on the client.
const isBrowser = typeof window !== 'undefined'

function readCache<T>(key: string): T | undefined {
  if (!isBrowser) return undefined
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return undefined
    const entry = JSON.parse(raw) as { savedAt?: number; data?: T }
    if (!entry.savedAt || Date.now() - entry.savedAt > CACHE_TTL_MS) {
      return undefined
    }
    return entry.data
  } catch {
    return undefined
  }
}

function writeCache(key: string, data: unknown) {
  if (!isBrowser) return
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ savedAt: Date.now(), data }),
    )
  } catch {
    // Storage can be full or blocked; caching is best-effort.
  }
}

async function cachedFetch<T>(key: string, load: () => Promise<T>): Promise<T> {
  const cached = readCache<T>(key)
  if (cached !== undefined) return cached
  const data = await load()
  writeCache(key, data)
  return data
}

const parseVersion = (tag: string) =>
  tag
    .replace(/^v/i, '')
    .split(/[.-]/)
    .map((part) => Number.parseInt(part, 10) || 0)

const compareVersionsDesc = (a: string, b: string) => {
  const left = parseVersion(a)
  const right = parseVersion(b)
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (right[i] ?? 0) - (left[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

export function useGitHubStats() {
  return useQuery({
    queryKey: ['github-stats'],
    queryFn: () =>
      cachedFetch('github-stats-v2', async (): Promise<GitHubStats> => {
        const res = await fetch(REPO_API)
        if (!res.ok) throw new Error('Failed to fetch GitHub stats')
        const data = (await res.json()) as GitHubStats
        return { stargazers_count: data.stargazers_count }
      }),
    enabled: isBrowser,
    staleTime: CACHE_TTL_MS,
    retry: 1,
  })
}

export function useGitHubLatestRelease() {
  return useQuery({
    queryKey: ['github-latest-release'],
    queryFn: () =>
      cachedFetch(
        'github-latest-release-v2',
        async (): Promise<GitHubRelease> => {
          const res = await fetch(`${REPO_API}/tags?per_page=100`)
          if (!res.ok) throw new Error('Failed to fetch tags')
          const tags = (await res.json()) as Array<{ name: string }>
          // GitHub returns tags in name order (v2.1.9 before v2.1.12), so sort by version.
          const latest = tags
            .map((tag) => tag.name)
            .filter((name) => /^v?\d/.test(name))
            .sort(compareVersionsDesc)[0]
          if (!latest) throw new Error('No tags found')
          return { tag_name: latest, name: latest }
        },
      ),
    enabled: isBrowser,
    staleTime: CACHE_TTL_MS,
    retry: 1,
  })
}
