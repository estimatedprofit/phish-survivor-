import type { PhishShow, Pick as UserPickType } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle } from "lucide-react"
import { format, parseISO } from "date-fns" // Added parseISO
import { ScrollArea } from "@/components/ui/scroll-area"

interface PastShowsSectionProps {
  shows: PhishShow[]
}

const PickResultBadge = ({ result }: { result: UserPickType["result"] }) => {
  if (result === "WIN")
    return (
      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
        WIN
      </Badge>
    )
  if (result === "LOSE") return <Badge variant="destructive">LOSE</Badge>
  return <Badge variant="secondary">PENDING</Badge>
}

const SongPickAnalysisChart = ({ summary }: { summary: PhishShow["resultsSummary"] }) => {
  if (!summary || summary.songPickCounts.length === 0)
    return <p className="text-sm text-muted-foreground">No pick data available for this show.</p>

  const totalPicksForShow = summary.songPickCounts.reduce((sum, current) => sum + current.count, 0)
  const maxPicks = Math.max(...summary.songPickCounts.map((s) => s.count), 0)

  return (
    <div className="space-y-2 mt-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase">Song Picks Breakdown:</h4>
      {summary.songPickCounts.map(({ song, count, played }) => {
        const percentage = totalPicksForShow > 0 ? ((count / totalPicksForShow) * 100).toFixed(0) : 0
        return (
          <div key={song.id} className="flex items-center gap-2 text-sm">
            <span
              className={`w-6 h-6 flex items-center justify-center rounded-sm ${
                played ? "bg-green-500" : "bg-red-500"
              }`}
            >
              {played ? <CheckCircle className="h-4 w-4 text-white" /> : <XCircle className="h-4 w-4 text-white" />}
            </span>
            <span className="flex-1 truncate" title={song.title}>
              {song.title}
            </span>
            <div className="w-24 h-4 bg-muted rounded overflow-hidden">
              <div
                className={`${played ? "bg-green-400" : "bg-red-400"}`}
                style={{ width: maxPicks > 0 ? `${(count / maxPicks) * 100}%` : "0%" }}
              >
                &nbsp;
              </div>
            </div>
            <span className="w-16 text-right text-xs font-mono">
              {count} ({percentage}%)
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function PastShowsSection({ shows }: PastShowsSectionProps) {
  const past = shows.filter((s) => s.status === "PLAYED")
  if (past.length === 0) {
    return <p className="text-muted-foreground">No past shows to display yet.</p>
  }

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">Past Shows</h2>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {past.map((show) => (
          <Card key={show.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{show.venue}</CardTitle>
                  <CardDescription>
                    {format(parseISO(show.date), "MMMM d, yyyy")} - {show.cityState}
                  </CardDescription>
                </div>
                {show.userPick && <PickResultBadge result={show.userPick.result} />}
              </div>
            </CardHeader>
            <CardContent>
              {show.userPick ? (
                <p className="text-sm">
                  Your pick: <span className="font-semibold">{show.userPick.songTitle}</span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">You didn't make a pick for this show.</p>
              )}

              {show.setlist && show.setlist.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">Full Setlist:</h4>
                  <ScrollArea className="h-[100px] text-sm text-muted-foreground pr-3">
                    <ul className="list-disc list-inside">
                      {show.setlist.map((song) => (
                        <li key={song.id}>{song.title}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}
              {show.resultsSummary && (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground">
                    {show.resultsSummary.eliminatedCount} players eliminated this round.
                  </p>
                  <SongPickAnalysisChart summary={show.resultsSummary} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
