"use client"

import type { Song } from "@/types"
import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Check, Search, Ban, Flame, ArrowDownAZ, ArrowUpAZ } from "lucide-react"

interface SongSelectorProps {
  allSongs: Song[]
  pickedSongIds: string[] // IDs of songs already picked by the user in this pool
  onSelectSong: (song: Song) => void
  currentPick?: Song | null
}

export function SongSelector({ allSongs, pickedSongIds, onSelectSong, currentPick }: SongSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSong, setSelectedSong] = useState<Song | null>(currentPick || null)
  // sortMode: popular (default), az, za
  const [sortMode, setSortMode] = useState<"popular" | "az" | "za">("popular")

  const filteredSongs = useMemo(() => {
    // First filter by search term
    const base = allSongs.filter((song) => song.title.toLowerCase().includes(searchTerm.toLowerCase()))

    // Then sort according to sortMode
    const sorted = [...base]
    switch (sortMode) {
      case "az":
        sorted.sort((a, b) => a.title.localeCompare(b.title))
        break
      case "za":
        sorted.sort((a, b) => b.title.localeCompare(a.title))
        break
      case "popular":
      default:
        sorted.sort((a, b) => (b.timesPlayed || 0) - (a.timesPlayed || 0))
        break
    }
    return sorted
  }, [allSongs, searchTerm, sortMode])

  const handleSelect = (song: Song) => {
    if (pickedSongIds.includes(song.id)) return // Cannot select already picked song
    setSelectedSong(song)
    onSelectSong(song)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        {/* Sort toggle group */}
        <ToggleGroup
          type="single"
          value={sortMode}
          onValueChange={(val) => {
            if (val) {
              // If clicking the currently selected az toggle again, switch between az and za
              if (val === "az" && sortMode === "az") {
                setSortMode("za")
              } else if (val === "za" && sortMode === "za") {
                setSortMode("az")
              } else {
                setSortMode(val as any)
              }
            }
          }}
          className="self-end mb-1"
          aria-label="Sort songs"
        >
          <ToggleGroupItem value="popular" aria-label="Popular first">
            <Flame className="h-4 w-4" /> <span className="sr-only">Popular</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="az" aria-label="A to Z">
            <ArrowDownAZ className="h-4 w-4" /> <span className="sr-only">A–Z</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="za" aria-label="Z to A">
            <ArrowUpAZ className="h-4 w-4" /> <span className="sr-only">Z–A</span>
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search for a song..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            aria-label="Search songs"
          />
        </div>
      </div>

      <ScrollArea className="h-[300px] w-full rounded-md border p-2 mt-2">
        {filteredSongs.length === 0 && (
          <p className="text-center text-muted-foreground py-4">No songs match your search.</p>
        )}
        <div className="space-y-1">
          {filteredSongs.map((song) => {
            const isPickedBefore = pickedSongIds.includes(song.id)
            const isCurrentlySelected = selectedSong?.id === song.id
            return (
              <Button
                key={song.id}
                variant={isCurrentlySelected ? "default" : "ghost"}
                onClick={() => handleSelect(song)}
                disabled={isPickedBefore}
                className={`w-full justify-start text-left h-auto py-2 px-3 ${isPickedBefore ? "text-muted-foreground line-through cursor-not-allowed" : ""}`}
                aria-pressed={isCurrentlySelected}
                aria-disabled={isPickedBefore}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">{song.title}</span>
                  {isPickedBefore && <Ban className="h-4 w-4 ml-2 text-red-500" />}
                  {isCurrentlySelected && !isPickedBefore && <Check className="h-4 w-4 ml-2 text-primary-foreground" />}
                </div>
              </Button>
            )
          })}
        </div>
      </ScrollArea>
      {selectedSong && !pickedSongIds.includes(selectedSong.id) && (
        <p className="text-sm text-center">
          Selected: <span className="font-semibold">{selectedSong.title}</span>
        </p>
      )}
      {selectedSong && pickedSongIds.includes(selectedSong.id) && (
        <p className="text-sm text-center text-red-500">You've already picked {selectedSong.title}!</p>
      )}
    </div>
  )
}
