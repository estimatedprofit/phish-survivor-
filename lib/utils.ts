import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/\[\d+\]/g, "")
    .replace(/[’'"`]/g, "")
    .replace(/[^a-z0-9 &]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}
