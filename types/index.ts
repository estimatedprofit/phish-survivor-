export interface User {
  id: string
  email: string
  nickname: string
  status: "ALIVE" | "OUT"
  picks: Pick[]
  pickedSongIdsThisPool: string[]
  currentStreak?: number
  role?: string
  profileId?: string
}

export interface Pool {
  id: string
  name: string
  description?: string
  tourName: string
  signupDeadline: string // ISO Date string
  status: "SIGNUPS_OPEN" | "ACTIVE" | "COMPLETED"
  totalEntrants: number
  activePlayers: number
  maxPlayers?: number
  visibility: "public" | "private" | "archived"
  pickLockOffsetHours?: number
  pickLockOffsetMinutes?: number
  isTestPool?: boolean
  nextShow?: {
    show_date: string
    venue_name: string
    city_state: string
    status: string
  }
}

export interface PhishShow {
  id: string
  phishNetShowId: string
  date: string // ISO Date string
  venue: string
  cityState: string
  status: "UPCOMING" | "PICKS_LOCKED" | "PLAYED"
  setTime?: string
  pickDeadline?: string // ISO Date string
  eventDate?: string // Real concert date (ISO) used for setlist fetch
  setlist?: Song[] // Changed from string[] to Song[]
  userPick?: Pick
  resultsSummary?: ShowResultsSummary
  isActive?: boolean
  timeZone?: string
}

export interface Song {
  id: string
  phishNetSongId?: string
  title: string
  timesPlayed?: number
}

export interface Pick {
  id: string
  userId: string // This might be redundant if Pick is always accessed via User
  showId: string
  songId: string
  songTitle: string // Denormalized for easier display
  lockedAt: string // ISO Date string
  result: "WIN" | "LOSE" | "PENDING"
  showVenue?: string // Denormalized for easier display in pick lists
  showDate?: string // Denormalized for easier display in pick lists
}

export interface ShowResultsSummary {
  eliminatedCount?: number
  songPickCounts: { song: Song; count: number; played?: boolean }[]
}

export interface LeaderboardEntry {
  userId: string
  rank: number
  nickname: string
  status: "ALIVE" | "OUT"
  lastPick?: string // Title of the song for the most recent show picked
  allPicks: Pick[] // Complete pick history for this pool
}

// For Phish.net API (if used)
export interface PhishNetSong {
  songid: string
  song: string
}

export interface PhishNetShow {
  showid: string
  showdate: string // YYYY-MM-DD
  venue: string
  city: string
  state: string
}

export interface PoolParticipantWithProfile {
  participantId: string
  userId: string
  nickname: string
  email?: string
  joinedAt: string // ISO Date string
  status: "ALIVE" | "OUT"
  currentStreak: number
}
