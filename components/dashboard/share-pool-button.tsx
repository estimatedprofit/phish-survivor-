"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Share2, Copy, Check } from "lucide-react"

interface SharePoolButtonProps {
  poolId?: string
}

export function SharePoolButton({ poolId }: SharePoolButtonProps) {
  const [hasCopied, setHasCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const baseUrl = `${window.location.origin}/join`
      setShareUrl(poolId ? `${baseUrl}/${poolId}` : baseUrl)
    }
  }, [poolId])

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setHasCopied(true)
      setTimeout(() => {
        setHasCopied(false)
      }, 2500)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 className="mr-2 h-4 w-4" />
          Share Pool
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share the Fun!</DialogTitle>
          <DialogDescription>
            Anyone with this link can join the survivor pool. Share it with your friends!
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="link" className="sr-only">
              Link
            </Label>
            <Input id="link" value={shareUrl} readOnly />
          </div>
          <Button type="button" size="sm" className="px-3" onClick={handleCopy} disabled={!shareUrl}>
            <span className="sr-only">{hasCopied ? "Copied" : "Copy"}</span>
            {hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <DialogFooter className="sm:justify-start">
          <p className="text-xs text-muted-foreground">
            {hasCopied ? "Link copied to clipboard!" : "Click the button to copy the link."}
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
