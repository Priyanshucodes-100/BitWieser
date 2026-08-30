import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function mockLatency(): Promise<void> {
  return delay(200 + Math.floor(Math.random() * 300))
}

export function toError(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error(String(error))
}
