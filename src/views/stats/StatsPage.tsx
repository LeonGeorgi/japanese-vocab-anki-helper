import { Fragment, useMemo, useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { clearLlmUsageEntriesAtom, llmUsageEntriesAtom, type LlmUsageEntry } from '../../state/llmUsageAtoms'
import { llmProviders, type LlmProviderId } from '../../llm'
import styles from './StatsPage.module.css'

const featureLabels: Record<LlmUsageEntry['feature'], string> = {
  extract_words: 'Extract words',
  transcribe_image: 'Transcribe image',
  annotate_sentence: 'Annotate sentence',
  add_furigana: 'Add furigana',
  define_word: 'Define word',
  translate_sentence: 'Translate sentence',
  split_word: 'Split word',
  convert_word_to_kanji: 'Convert to kanji',
  generate_example: 'Generate example',
  resolve_manual_vocab: 'Resolve manual vocab',
  generate_manual_example: 'Generate manual example',
}

const integerFormatter = new Intl.NumberFormat()
const decimalFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 })

interface AggregateRow {
  key: string
  feature: string
  provider: string
  model: string
  calls: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  avgTokens: number
}

interface FeatureEstimatorRow {
  key: string
  feature: string
  calls: number
  avgTokens: number
  p50Tokens: number
  p90Tokens: number
  tokenValues: number[]
  ioPairs: Array<{ input: number; output: number }>
}

function toAggregateRows(entries: LlmUsageEntry[]): AggregateRow[] {
  const byKey = new Map<string, AggregateRow>()
  for (const entry of entries) {
    const key = `${entry.feature}::${entry.provider}::${entry.model}`
    const current = byKey.get(key)
    if (current) {
      current.calls += 1
      current.inputTokens += entry.inputTokens
      current.outputTokens += entry.outputTokens
      current.totalTokens += entry.totalTokens
      current.avgTokens = current.totalTokens / current.calls
      continue
    }
    byKey.set(key, {
      key,
      feature: featureLabels[entry.feature] ?? entry.feature,
      provider: entry.provider,
      model: entry.model,
      calls: 1,
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      totalTokens: entry.totalTokens,
      avgTokens: entry.totalTokens,
    })
  }
  return [...byKey.values()].sort((a, b) => b.totalTokens - a.totalTokens)
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))
  return sorted[index]
}

interface HistogramBin {
  x0: number
  x1: number
  count: number
}

function buildHistogram(values: number[], binCount = 12): HistogramBin[] {
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) {
    return [{ x0: min, x1: max, count: values.length }]
  }
  const range = max - min + 1
  const step = Math.max(1, Math.ceil(range / binCount))
  const bins: HistogramBin[] = []
  for (let start = min; start <= max; start += step) {
    bins.push({
      x0: start,
      x1: Math.min(max, start + step - 1),
      count: 0,
    })
  }
  for (const value of values) {
    const idx = Math.min(bins.length - 1, Math.floor((value - min) / step))
    bins[idx].count += 1
  }
  return bins
}

function Histogram({ values }: { values: number[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const width = 560
  const height = 160
  const padLeft = 32
  const padRight = 12
  const padTop = 14
  const padBottom = 30
  const chartWidth = width - padLeft - padRight
  const chartHeight = height - padTop - padBottom
  const bins = buildHistogram(values, 14)
  const maxCount = Math.max(1, ...bins.map(bin => bin.count))
  const barGap = 2
  const barWidth = bins.length > 0 ? Math.max(1, chartWidth / bins.length - barGap) : 0
  const hovered = hoveredIndex !== null ? bins[hoveredIndex] : null
  const hoveredPct = hovered ? (hovered.count / values.length) * 100 : 0
  const tooltipLines = hovered
    ? [
        `${integerFormatter.format(hovered.x0)} - ${integerFormatter.format(hovered.x1)} tokens`,
        `${integerFormatter.format(hovered.count)} calls (${decimalFormatter.format(hoveredPct)}%)`,
      ]
    : []
  const tooltipWidth = Math.max(...tooltipLines.map(line => line.length), 0) * 6.4 + 14
  const tooltipHeight = tooltipLines.length * 14 + 10
  const hoveredX = hoveredIndex !== null ? padLeft + hoveredIndex * (barWidth + barGap) + barWidth / 2 : 0
  const tooltipX = hovered
    ? Math.min(padLeft + chartWidth - tooltipWidth - 4, Math.max(padLeft + 4, hoveredX - tooltipWidth / 2))
    : 0
  const tooltipY = padTop + 6

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartTitle}>Token Histogram</div>
      <svg className={styles.histogram} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Token usage histogram">
        <line
          x1={padLeft}
          y1={padTop + chartHeight}
          x2={padLeft + chartWidth}
          y2={padTop + chartHeight}
          className={styles.axisLine}
        />
        {[0.25, 0.5, 0.75, 1].map(step => {
          const y = padTop + chartHeight - chartHeight * step
          return (
            <line
              key={step}
              x1={padLeft}
              y1={y}
              x2={padLeft + chartWidth}
              y2={y}
              className={styles.gridLine}
            />
          )
        })}
        {bins.map((bin, index) => {
          const x = padLeft + index * (barWidth + barGap)
          const barHeight = (bin.count / maxCount) * chartHeight
          const y = padTop + (chartHeight - barHeight)
          return (
            <g key={`${bin.x0}-${bin.x1}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={2}
                className={`${styles.histogramBar} ${hoveredIndex === index ? styles.histogramBarActive : ''}`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </g>
          )
        })}
        <text x={padLeft} y={height - 6} className={styles.axisLabel}>
          {`min ${integerFormatter.format(Math.min(...values))}`}
        </text>
        <text x={padLeft + chartWidth - 4} y={height - 6} textAnchor="end" className={styles.axisLabel}>
          {`max ${integerFormatter.format(Math.max(...values))}`}
        </text>
        <text x={2} y={padTop + 10} className={styles.axisLabel}>
          count
        </text>
        {hovered && (
          <g>
            <rect
              x={tooltipX}
              y={tooltipY}
              width={tooltipWidth}
              height={tooltipHeight}
              rx={6}
              className={styles.chartTooltipBg}
            />
            {tooltipLines.map((line, index) => (
              <text
                key={`${line}-${index}`}
                x={tooltipX + 7}
                y={tooltipY + 17 + index * 14}
                className={styles.chartTooltipText}
              >
                {line}
              </text>
            ))}
          </g>
        )}
      </svg>
    </div>
  )
}

function ScatterPlot({ pairs }: { pairs: Array<{ input: number; output: number }> }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const width = 360
  const height = 160
  const padLeft = 36
  const padRight = 12
  const padTop = 14
  const padBottom = 30
  const chartWidth = width - padLeft - padRight
  const chartHeight = height - padTop - padBottom

  const maxInput = Math.max(1, ...pairs.map(pair => pair.input))
  const maxOutput = Math.max(1, ...pairs.map(pair => pair.output))
  const toX = (value: number) => padLeft + (value / maxInput) * chartWidth
  const toY = (value: number) => padTop + chartHeight - (value / maxOutput) * chartHeight
  const hovered = hoveredIndex !== null ? pairs[hoveredIndex] : null
  const tooltipLines = hovered
    ? [
        `Input: ${integerFormatter.format(hovered.input)}`,
        `Output: ${integerFormatter.format(hovered.output)}`,
        `Total: ${integerFormatter.format(hovered.input + hovered.output)}`,
      ]
    : []
  const tooltipWidth = Math.max(...tooltipLines.map(line => line.length), 0) * 6.4 + 14
  const tooltipHeight = tooltipLines.length * 14 + 10
  const hoveredX = hovered ? toX(hovered.input) : 0
  const hoveredY = hovered ? toY(hovered.output) : 0
  const tooltipX = hovered
    ? Math.min(padLeft + chartWidth - tooltipWidth - 4, Math.max(padLeft + 4, hoveredX - tooltipWidth / 2))
    : 0
  const tooltipY = hovered ? Math.max(padTop + 4, hoveredY - tooltipHeight - 8) : 0

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartTitle}>Input vs Output Tokens</div>
      <svg className={styles.scatter} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Input/output token scatter plot">
        <line x1={padLeft} y1={padTop + chartHeight} x2={padLeft + chartWidth} y2={padTop + chartHeight} className={styles.axisLine} />
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + chartHeight} className={styles.axisLine} />
        {[0.25, 0.5, 0.75, 1].map(step => {
          const y = padTop + chartHeight - chartHeight * step
          const x = padLeft + chartWidth * step
          return (
            <g key={step}>
              <line x1={padLeft} y1={y} x2={padLeft + chartWidth} y2={y} className={styles.gridLine} />
              <line x1={x} y1={padTop} x2={x} y2={padTop + chartHeight} className={styles.gridLine} />
            </g>
          )
        })}
        {pairs.map((pair, index) => (
          <circle
            key={`${pair.input}-${pair.output}-${index}`}
            cx={toX(pair.input)}
            cy={toY(pair.output)}
            r={hoveredIndex === index ? 4.5 : 3.1}
            className={`${styles.scatterDot} ${hoveredIndex === index ? styles.scatterDotActive : ''}`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}
        <text x={padLeft} y={height - 6} className={styles.axisLabel}>
          input
        </text>
        <text x={2} y={padTop + 10} className={styles.axisLabel}>
          output
        </text>
        <text x={padLeft + chartWidth - 4} y={height - 6} textAnchor="end" className={styles.axisLabel}>
          {`max ${integerFormatter.format(maxInput)}`}
        </text>
        <text x={padLeft + 2} y={padTop + 12} className={styles.axisLabel}>
          {`max ${integerFormatter.format(maxOutput)}`}
        </text>
        {hovered && (
          <g>
            <rect
              x={tooltipX}
              y={tooltipY}
              width={tooltipWidth}
              height={tooltipHeight}
              rx={6}
              className={styles.chartTooltipBg}
            />
            {tooltipLines.map((line, index) => (
              <text
                key={`${line}-${index}`}
                x={tooltipX + 7}
                y={tooltipY + 17 + index * 14}
                className={styles.chartTooltipText}
              >
                {line}
              </text>
            ))}
          </g>
        )}
      </svg>
    </div>
  )
}

function toFeatureEstimatorRows(
  entries: LlmUsageEntry[],
  provider: 'all' | LlmProviderId,
): FeatureEstimatorRow[] {
  const filtered = provider === 'all' ? entries : entries.filter(entry => entry.provider === provider)
  const byFeature = new Map<LlmUsageEntry['feature'], LlmUsageEntry[]>()
  for (const entry of filtered) {
    const list = byFeature.get(entry.feature) ?? []
    list.push(entry)
    byFeature.set(entry.feature, list)
  }

  const rows: FeatureEstimatorRow[] = []
  for (const [feature, featureEntries] of byFeature.entries()) {
    const tokenValues = featureEntries.map(entry => entry.totalTokens)
    const totalTokens = tokenValues.reduce((sum, value) => sum + value, 0)
    const ioPairs = featureEntries.map(entry => ({ input: entry.inputTokens, output: entry.outputTokens }))

    rows.push({
      key: `${provider}:${feature}`,
      feature: featureLabels[feature] ?? feature,
      calls: featureEntries.length,
      avgTokens: totalTokens / featureEntries.length,
      p50Tokens: percentile(tokenValues, 0.5),
      p90Tokens: percentile(tokenValues, 0.9),
      tokenValues,
      ioPairs,
    })
  }

  return rows.sort((a, b) => b.avgTokens - a.avgTokens)
}

export function StatsPage() {
  const entries = useAtomValue(llmUsageEntriesAtom)
  const clearEntries = useSetAtom(clearLlmUsageEntriesAtom)
  const [estimatorProvider, setEstimatorProvider] = useState<'all' | LlmProviderId>('all')
  const [expandedEstimatorKey, setExpandedEstimatorKey] = useState<string | null>(null)

  const aggregates = useMemo(() => toAggregateRows(entries), [entries])
  const featureEstimators = useMemo(
    () => toFeatureEstimatorRows(entries, estimatorProvider),
    [entries, estimatorProvider],
  )
  const summary = useMemo(() => ({
    calls: entries.length,
    inputTokens: entries.reduce((sum, entry) => sum + entry.inputTokens, 0),
    outputTokens: entries.reduce((sum, entry) => sum + entry.outputTokens, 0),
    totalTokens: entries.reduce((sum, entry) => sum + entry.totalTokens, 0),
  }), [entries])

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Usage stats</h1>
        <button
          className={styles.clearButton}
          type="button"
          onClick={() => clearEntries()}
          disabled={entries.length === 0}
        >
          Clear history
        </button>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Calls</span>
          <span className={styles.summaryValue}>{integerFormatter.format(summary.calls)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Input tokens</span>
          <span className={styles.summaryValue}>{integerFormatter.format(summary.inputTokens)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Output tokens</span>
          <span className={styles.summaryValue}>{integerFormatter.format(summary.outputTokens)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total tokens</span>
          <span className={styles.summaryValue}>{integerFormatter.format(summary.totalTokens)}</span>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Feature estimators</h2>
          <label className={styles.providerSelectWrap}>
            <span>Provider</span>
            <select
              className={styles.providerSelect}
              value={estimatorProvider}
              onChange={e => setEstimatorProvider(e.target.value as 'all' | LlmProviderId)}
            >
              <option value="all">All providers</option>
              {llmProviders.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {featureEstimators.length === 0 ? (
          <div className={styles.empty}>No estimator data for this provider yet.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={`${styles.table} ${styles.estimatorTable}`}>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Calls</th>
                  <th>Avg tokens</th>
                  <th>P50</th>
                  <th>P90</th>
                </tr>
              </thead>
              <tbody>
                {featureEstimators.map(row => {
                  const expanded = expandedEstimatorKey === row.key
                  return (
                    <Fragment key={row.key}>
                      <tr
                        className={`${styles.expandableRow} ${expanded ? styles.expandedRow : ''}`}
                        onClick={() => setExpandedEstimatorKey(expanded ? null : row.key)}
                      >
                        <td>{row.feature}</td>
                        <td>{integerFormatter.format(row.calls)}</td>
                        <td>{decimalFormatter.format(row.avgTokens)}</td>
                        <td>{decimalFormatter.format(row.p50Tokens)}</td>
                        <td>{decimalFormatter.format(row.p90Tokens)}</td>
                      </tr>
                      {expanded && (
                        <tr className={styles.expandedPanelRow}>
                          <td colSpan={5}>
                            <div className={styles.detailGrid}>
                              <div className={styles.histogramWrap}>
                                <Histogram values={row.tokenValues} />
                              </div>
                              <div className={styles.scatterWrap}>
                                <ScatterPlot pairs={row.ioPairs} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>By feature, provider, and model</h2>
        {aggregates.length === 0 ? (
          <div className={styles.empty}>No usage logged yet.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Provider</th>
                  <th>Model</th>
                  <th>Calls</th>
                  <th>Input</th>
                  <th>Output</th>
                  <th>Total</th>
                  <th>Avg / call</th>
                </tr>
              </thead>
              <tbody>
                {aggregates.map(row => (
                  <tr key={row.key}>
                    <td>{row.feature}</td>
                    <td>{row.provider}</td>
                    <td className={styles.model}>{row.model}</td>
                    <td>{integerFormatter.format(row.calls)}</td>
                    <td>{integerFormatter.format(row.inputTokens)}</td>
                    <td>{integerFormatter.format(row.outputTokens)}</td>
                    <td>{integerFormatter.format(row.totalTokens)}</td>
                    <td>{decimalFormatter.format(row.avgTokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}
