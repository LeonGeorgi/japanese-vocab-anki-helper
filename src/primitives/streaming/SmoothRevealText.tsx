import { useEffect, useRef, useState } from 'react'
import styles from './SmoothRevealText.module.css'

interface SmoothRevealTextProps {
  text: string
  active: boolean
  showCursor?: boolean
  className?: string
}

export function SmoothRevealText({
  text,
  active,
  showCursor = true,
  className,
}: SmoothRevealTextProps) {
  const visibleText = useSmoothRevealText(text, active)

  return (
    <span className={className}>
      {visibleText}
      {showCursor && active && <span className={styles.cursor} aria-hidden="true" />}
    </span>
  )
}

function useSmoothRevealText(sourceText: string, active: boolean) {
  const [visibleText, setVisibleText] = useState(sourceText)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const schedule = (callback: () => void, delayMs: number) => {
      frameRef.current = window.setTimeout(callback, delayMs)
    }

    if (!active) {
      if (frameRef.current !== null) {
        window.clearTimeout(frameRef.current)
        frameRef.current = null
      }
      if (visibleText !== sourceText) {
        schedule(() => {
          setVisibleText(sourceText)
        }, 0)
      }
      return
    }

    if (visibleText.length > sourceText.length) {
      schedule(() => {
        setVisibleText(sourceText)
      }, 0)
      return
    }

    if (visibleText === sourceText) return

    const backlog = sourceText.length - visibleText.length
    const charsPerTick = backlog > 48 ? 4 : backlog > 24 ? 3 : backlog > 10 ? 2 : 1
    const delayMs = backlog > 40 ? 10 : backlog > 18 ? 14 : 18

    schedule(() => {
      setVisibleText(sourceText.slice(0, visibleText.length + charsPerTick))
    }, delayMs)

    return () => {
      if (frameRef.current !== null) {
        window.clearTimeout(frameRef.current)
        frameRef.current = null
      }
    }
  }, [active, sourceText, visibleText])

  return visibleText
}
