"use client"

import type { Song } from "@/types"
import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Search, CheckSquare, Square } from "lucide-react"

interface SongMultiSelectorProps {
  allSongs: Song[]
  initialSelectedSongIds?: string[]
  onChange: (selectedSongIds: string[]) => void
}

export function SongMultiSelector({ allSongs, initialSelectedSongIds = [], onChange }: SongMultiSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedSongIds))

  const filteredSongs = useMemo(() => {
    return allSongs.filter((song) => song.title.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [allSongs, searchTerm])

  const handleToggleSong = (songId: string) => {
    const newSelectedIds = new Set(selectedIds)
    if (newSelectedIds.has(songId)) {
      newSelectedIds.delete(songId)
    } else {
      newSelectedIds.add(songId)
    }
    setSelectedIds(newSelectedIds)
    onChange(Array.from(newSelectedIds))
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search for songs to add to setlist..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          aria-label="Search songs"
        />
      </div>

      <ScrollArea className="h-[300px] w-full rounded-md border p-2">
        {filteredSongs.length === 0 && (
          <p className="text-center text-muted-foreground py-4">No songs match your search.</p>
        )}
        <div className="space-y-1">
          {filteredSongs.map((song) => {
            const isSelected = selectedIds.has(song.id)
            return (
              <div key={song.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50">
                <Checkbox
                  id={`song-multiselect-${song.id}`} // Ensure unique ID for checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggleSong(song.id)}
                  aria-label={`Select ${song.title}`}
                />
                <Label htmlFor={`song-multiselect-${song.id}`} className="flex-grow cursor-pointer text-sm">
                  {song.title}
                </Label>
                {isSelected ? (
                  <CheckSquare className="h-5 w-5 text-primary" />
                ) : (
                  <Square className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
      <p className="text-sm text-muted-foreground">Selected songs: {selectedIds.size}</p>
    </div>
  )
}
