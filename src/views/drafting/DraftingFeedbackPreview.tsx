import { useEffect, useRef, useState } from 'react'
import { buildDraftingPreviewSegments } from '../../api/draftingFeedback'
import type { DraftingAnnotation } from '../../types'
import styles from './DraftingPanel.module.css'

interface Props {
  sourceText: string
  annotations: DraftingAnnotation[]
}

export function DraftingFeedbackPreview({ sourceText, annotations }: Props) {
  const segments = buildDraftingPreviewSegments(sourceText, annotations)
  const [openKey, setOpenKey] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!previewRef.current?.contains(event.target as Node)) setOpenKey(null)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenKey(null)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  if (!sourceText) {
    return <div className={styles.previewEmpty}>Run feedback to see an annotated copy here.</div>
  }

  return (
    <div className={styles.previewText} ref={previewRef}>
      {segments.length === 0
        ? sourceText
        : segments.map((segment, index) => (
            segment.annotation
              ? (
                (() => {
                  const key = `${segment.annotation.startOffset}-${segment.annotation.endOffset}-${index}`
                  const open = openKey === key
                  return (
                    <span key={key} className={styles.annotationWrap}>
                      <mark
                        className={`${segment.annotation.severity === 'error' ? styles.previewError : styles.previewWarning} ${open ? styles.previewActive : ''}`}
                        role="button"
                        tabIndex={0}
                        aria-expanded={open}
                        aria-label={`${segment.annotation.severity === 'error' ? 'Error' : 'Suggestion'} for ${segment.text}`}
                        onClick={() => setOpenKey(current => current === key ? null : key)}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setOpenKey(current => current === key ? null : key)
                          }
                        }}
                      >
                        {segment.text}
                      </mark>
                      {open && (
                        <div className={styles.annotationPopover} role="dialog" aria-label="Snippet feedback">
                          <div className={styles.annotationPopoverMeta}>
                            {segment.annotation.severity === 'error' ? 'Error' : 'Could be better'} · sentence {segment.annotation.sentenceIndex + 1}
                          </div>
                          <div className={styles.annotationPopoverReason}>{segment.annotation.reason}</div>
                          {segment.annotation.suggestion && (
                            <div className={styles.annotationPopoverSuggestion}>{segment.annotation.suggestion}</div>
                          )}
                        </div>
                      )}
                    </span>
                  )
                })()
                )
              : <span key={`plain-${index}`}>{segment.text}</span>
          ))}
    </div>
  )
}
