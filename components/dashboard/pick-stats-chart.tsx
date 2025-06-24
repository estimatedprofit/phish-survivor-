"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { PickStat } from "@/hooks/use-pick-stats"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const item: PickStat = payload[0].payload
  return (
    <div className="rounded-md border bg-background p-2 text-xs shadow-md max-w-xs">
      <div className="font-medium mb-1">{item.songTitle} — {item.count} pick{item.count===1?"":"s"}</div>
      <ul className="max-h-40 overflow-y-auto list-disc pl-4">
        {item.nicknames.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  )
}

export function PickStatsChart({ stats }: { stats: PickStat[] }) {
  if (!stats.length) return <p className="text-muted-foreground text-sm text-center p-4">No pick data yet.</p>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pick Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={stats}
            margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
          >
            <XAxis type="number" hide domain={[0, 'dataMax']} />
            <YAxis type="category" dataKey="songTitle" width={160} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" fill="#60a5fa" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
} 