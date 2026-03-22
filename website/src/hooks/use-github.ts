import { useQuery } from '@tanstack/react-query'

export interface GitHubStats {
  stargazers_count: number
}

export interface GitHubRelease {
  tag_name: string
  name: string
}

export function useGitHubStats() {
  return useQuery({
    queryKey: ['github-stats'],
    queryFn: async (): Promise<GitHubStats> => {
      const res = await fetch('https://api.github.com/repos/amnesia2k/git-aic')
      if (!res.ok) throw new Error('Failed to fetch GitHub stats')
      return res.json()
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

export function useGitHubLatestRelease() {
  return useQuery({
    queryKey: ['github-latest-release'],
    queryFn: async (): Promise<GitHubRelease> => {
      const res = await fetch(
        'https://api.github.com/repos/amnesia2k/git-aic/tags'
      )
      if (!res.ok) throw new Error('Failed to fetch tags')
      const tags = await res.json()
      if (tags && tags.length > 0) {
        return {
          tag_name: tags[0].name,
          name: tags[0].name,
        }
      }
      throw new Error('No tags found')
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}
