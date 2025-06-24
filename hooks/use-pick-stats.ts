"use client"

import useSWR from "swr"

export interface PickStat {
  songId: string
  songTitle: string
  count: number
  nicknames: string[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function usePickStats(poolId: string | undefined, showId: string | undefined) {
  const shouldFetch = poolId && showId
  const { data, error, isLoading } = useSWR(shouldFetch ? `/api/pool/${poolId}/show/${showId}/pick-stats` : null, fetcher, {
    refreshInterval: 60_000, // refresh every minute until show is scored
  })

  return {
    stats: (data?.stats as PickStat[]) || [],
    isLoading,
    isError: Boolean(error),
  }
} 