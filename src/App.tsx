import { useEffect, useMemo, useRef, useState } from 'react'
import { parse, read, rolling, RULES, type Reading, type Status } from './lib/fatigue'

const PRESETS = {
  fresh: { label: 'Fresh', freq: 1.8, ctr: [1.6, 1.7, 1.8, 1.8, 1.9, 1.85, 1.9, 1.95, 1.9, 1.92, 1.88, 1.9, 1.93, 1.9] },
  wearing: { label: 'Fading', freq: 3.2, ctr: [1.9, 2.1, 2.2, 2.25, 2.2, 2.1, 2.0, 1.9, 1.8, 1.72, 1.65, 1.58, 1.5, 1.44] },
  burnt: { label: 'Burnt out', freq: 5.4, ctr: [2.4, 2.5, 2.4, 2.2, 2.0, 1.8, 1.6, 1.45, 1.3, 1.2, 1.1, 1.0, 0.95, 0.9] },
}
type PresetKey = keyof typeof PRESETS

const INSTALL = 'Install gooseworks: https://gooseworks.ai/install.md'

const TONE: Record<Status, { chip: string; label: string; head: string }> = {
  healthy: { chip: 'bg-[#e3f3ea] text-ok', label: 'Healthy', head: 'Still going strong.' },
  wearing: { chip: 'bg-[#fcefdc] text-warn', label: 'Wearing out', head: 'It’s wearing out.' },
  burnt: { chip: 'bg-[#fde7e4] text-bad', label: 'Burnt out', head: 'It’s burnt out.' },
}

const ADVICE: Record<Status, string[]> = {
  healthy: ['Leave it running and check again next week.', 'Make one fresh variation now, so it’s ready when this one fades.'],
  wearing: [
    'Make two or three new hooks in the same style before it halves.',
    'Keep the angle that worked. Change the first three seconds.',
    'Widen the audience or cap frequency to buy time.',
  ],
  burnt: [
    'Pause it or cut its budget today.',
    'Replace it with fresh variations of the angle that worked.',
    'Retire the creative, not the idea.',
  ],
}

// Wearing out on frequency alone needs reach fixes first, not a race against the CTR.
function advice(r: Reading): string[] {
  if (r.status === 'wearing' && r.drop < RULES.wearingDrop)
    return ['Widen the audience or cap frequency.', 'Make one or two new hooks now, before the CTR starts to slide.']
  return ADVICE[r.status]
}

const pct = (n: number) => `${n.toFixed(2)}%`

export default function App() {
  const [ctr, setCtr] = useState(PRESETS.wearing.ctr)
  const [freq, setFreq] = useState(PRESETS.wearing.freq)
  const [preset, setPreset] = useState<PresetKey | null>('wearing')
  const r = useMemo(() => read(ctr, freq), [ctr, freq])

  const pick = (k: PresetKey) => {
    setPreset(k)
    setCtr(PRESETS[k].ctr)
    setFreq(PRESETS[k].freq)
  }
  const edit = (next: number[]) => {
    setPreset(null)
    setCtr(next)
  }

  return (
    <div className="min-h-svh font-sans">
      <div className="border-b border-line bg-white px-4 py-2.5 text-center text-[13px] text-body">
        A concept by Krishna Bhupathi for the Gooseworks Design Engineer role. Not a Goose product.
      </div>

      <header className="relative overflow-hidden px-4 pb-10 pt-16 text-center sm:pt-24">
        <div className="dots pointer-events-none absolute -right-24 top-40 hidden h-56 w-96 opacity-70 sm:block" />
        <div className="dots pointer-events-none absolute -left-24 top-10 hidden h-40 w-72 opacity-60 sm:block" />
        <p className="relative font-mono text-[13px] text-mute">Free tool · Meta and TikTok ads</p>
        <h1 className="relative mx-auto mt-4 max-w-4xl text-[44px] font-medium leading-[0.98] tracking-[-0.03em] [font-stretch:112%] sm:text-[84px]">
          Is your ad
          <br />
          <span className="scan tracking-[-0.04em]">wearing out?</span>
        </h1>
        <p className="relative mx-auto mt-6 max-w-xl text-[17px] text-body sm:text-lg">
          Drag in your ad’s daily click-through rate, or paste it. See how fast it’s fading and when to refresh it.
        </p>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24">
        <section className="grid gap-4 rounded-[28px] border border-line bg-white p-3 shadow-[0_30px_60px_-40px_rgba(22,22,22,.35)] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] sm:p-4">
          <Editor ctr={ctr} freq={freq} r={r} preset={preset} onPick={pick} onEdit={edit} onFreq={setFreq} />
          <Result r={r} freq={freq} />
        </section>

        <GooseHandOff r={r} freq={freq} />
        <Method />
        <About />
      </main>
    </div>
  )
}

function Editor(props: {
  ctr: number[]
  freq: number
  r: Reading
  preset: PresetKey | null
  onPick: (k: PresetKey) => void
  onEdit: (v: number[]) => void
  onFreq: (n: number) => void
}) {
  const { ctr, freq, r, preset, onPick, onEdit, onFreq } = props
  const [paste, setPaste] = useState('')
  const [err, setErr] = useState('')

  const apply = () => {
    const v = parse(paste)
    if (v.length < RULES.trendDays) return setErr(`Paste at least ${RULES.trendDays} days, oldest first.`)
    if (v.length > 30) return setErr('Paste up to 30 days.')
    setErr('')
    onEdit(v)
  }

  return (
    <div className="rounded-[20px] bg-paper p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold">Daily CTR, last {ctr.length} days</h2>
        <div className="flex gap-1.5" role="group" aria-label="Examples">
          {(Object.keys(PRESETS) as PresetKey[]).map(k => (
            <button
              key={k}
              onClick={() => onPick(k)}
              aria-pressed={preset === k}
              className={`rounded-full border px-3 py-1.5 text-[13px] transition ${preset === k ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink/40'}`}
            >
              {PRESETS[k].label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-[13px] text-mute">Drag a bar, or focus it and use the arrow keys.</p>

      <Chart ctr={ctr} r={r} onEdit={onEdit} />

      <label className="mt-5 block">
        <span className="flex justify-between text-[14px]">
          <span className="font-medium">Frequency</span>
          <span className="font-mono text-body">{freq.toFixed(1)} views per person</span>
        </span>
        <input
          type="range"
          min={1}
          max={8}
          step={0.1}
          value={freq}
          onChange={e => onFreq(+e.target.value)}
          className="mt-2 w-full accent-ink"
        />
      </label>

      <details className="mt-4 text-[14px]">
        <summary className="cursor-pointer font-medium">Paste your own numbers</summary>
        <textarea
          value={paste}
          onChange={e => setPaste(e.target.value)}
          rows={3}
          placeholder="1.9, 2.1, 2.2, 2.25, 2.2, 2.1, 2.0, 1.9 …"
          className="mt-2 w-full rounded-xl border border-line bg-white p-3 font-mono text-[13px]"
          aria-describedby="paste-help"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span id="paste-help" className={err ? 'text-bad' : 'text-mute'}>
            {err || 'Daily CTR in %, oldest first, 7 to 30 days. In Ads Manager: Breakdown › By time › Day.'}
          </span>
          <button onClick={apply} className="shrink-0 rounded-full bg-ink px-4 py-2 text-white">
            Use these
          </button>
        </div>
      </details>
    </div>
  )
}

const PAD = { l: 34, r: 12, t: 16, b: 26 }
const AHEAD = 7

function Chart({ ctr, r, onEdit }: { ctr: number[]; r: Reading; onEdit: (v: number[]) => void }) {
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<number | null>(null)
  // Draw at the real width so labels stay readable on a phone.
  const [W, setW] = useState(560)
  useEffect(() => {
    const el = svg.current!
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const H = W < 480 ? 220 : 250
  const n = ctr.length
  // Freeze the scale while dragging so the bar doesn't jump under the pointer.
  const frozen = useRef<number | null>(null)
  const max = frozen.current ?? Math.max(3, Math.ceil(Math.max(...ctr) * 1.25 * 2) / 2)
  const slot = (W - PAD.l - PAD.r) / (n + AHEAD)
  const x = (i: number) => PAD.l + slot * (i + 0.5)
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b)
  const avg = rolling(ctr)
  const half = r.peak / 2

  const setFrom = (clientY: number, i: number) => {
    const box = svg.current!.getBoundingClientRect()
    const py = ((clientY - box.top) / box.height) * H
    const v = Math.max(0, Math.min(max, (1 - (py - PAD.t) / (H - PAD.t - PAD.b)) * max))
    const next = ctr.slice()
    next[i] = Math.round(v * 100) / 100
    onEdit(next)
  }
  const indexAt = (clientX: number) => {
    const box = svg.current!.getBoundingClientRect()
    const px = ((clientX - box.left) / box.width) * W
    return Math.max(0, Math.min(n - 1, Math.floor((px - PAD.l) / slot)))
  }
  const key = (i: number, e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.25 : 0.05
    const d = e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0
    if (!d) return
    e.preventDefault()
    const next = ctr.slice()
    next[i] = Math.max(0, Math.round((next[i] + d) * 100) / 100)
    onEdit(next)
  }

  const proj =
    r.daysToHalf && r.daysToHalf > 0
      ? { x1: x(n - 1), y1: y(r.now), x2: x(n - 1 + Math.min(r.daysToHalf, AHEAD)), y2: y(r.now + r.slope * Math.min(r.daysToHalf, AHEAD)) }
      : null
  const ticks = Array.from({ length: Math.floor(max) + 1 }, (_, i) => i)

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${W} ${H}`}
      className="mt-4 w-full touch-none select-none"
      role="group"
      aria-label="Daily click-through rate chart"
      onPointerDown={e => {
        const i = indexAt(e.clientX)
        if (i >= n) return
        drag.current = i
        frozen.current = max
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
        setFrom(e.clientY, i)
      }}
      onPointerMove={e => drag.current !== null && setFrom(e.clientY, drag.current)}
      onPointerUp={() => {
        drag.current = null
        frozen.current = null
        onEdit(ctr.slice())
      }}
      onPointerCancel={() => {
        drag.current = null
        frozen.current = null
      }}
    >
      {ticks.map(t => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#ece9e4" />
          <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="fill-mute font-mono text-[10px]">
            {t}%
          </text>
        </g>
      ))}
      <rect x={x(n) - slot / 2} y={PAD.t} width={slot * AHEAD} height={H - PAD.t - PAD.b} fill="#f3f1ee" rx={6} />
      <text x={x(n) - slot / 2 + 8} y={PAD.t + 14} className="fill-mute font-mono text-[10px]">
        next 7 days
      </text>
      <line x1={PAD.l} x2={W - PAD.r} y1={y(half)} y2={y(half)} stroke="#a35a00" strokeDasharray="3 4" opacity={0.7} />
      <text x={W - PAD.r - 4} y={y(half) + 14} textAnchor="end" className="fill-warn font-mono text-[10px]">
        half of peak
      </text>
      {ctr.map((v, i) => (
        <rect
          key={i}
          x={x(i) - slot * 0.32}
          y={y(v)}
          width={slot * 0.64}
          height={Math.max(2, y(0) - y(v))}
          rx={4}
          fill={i === r.peakDay ? '#f8c3dc' : '#e6e2dc'}
          className="cursor-ns-resize outline-none focus-visible:stroke-ink focus-visible:stroke-2"
          tabIndex={0}
          role="slider"
          aria-label={`Day ${i + 1}`}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={v}
          aria-valuetext={pct(v)}
          onKeyDown={e => key(i, e)}
        />
      ))}
      <polyline points={avg.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke="#161616" strokeWidth={2} strokeLinejoin="round" pointerEvents="none" />
      {proj && <line {...proj} stroke="#161616" strokeWidth={2} strokeDasharray="5 5" pointerEvents="none" />}
      <circle cx={x(r.peakDay)} cy={y(r.peak)} r={4.5} fill="#8a1f55" pointerEvents="none" />
      <text x={x(r.peakDay)} y={y(r.peak) - 10} textAnchor="middle" className="fill-pink-ink font-mono text-[10px]" pointerEvents="none">
        peak
      </text>
      {ctr.map((_, i) =>
        i % (W < 480 ? 3 : 2) === 0 ? (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="fill-mute font-mono text-[10px]">
            {i + 1}
          </text>
        ) : null,
      )}
    </svg>
  )
}

function Result({ r, freq }: { r: Reading; freq: number }) {
  const t = TONE[r.status]
  const pace =
    r.daysToHalf === 0
      ? 'Already at half its peak.'
      : r.daysToHalf
        ? `At this pace it halves in about ${Math.max(1, Math.round(r.daysToHalf))} day${Math.round(r.daysToHalf) === 1 ? '' : 's'}.`
        : 'Not falling right now.'
  const why =
    r.reasons.length === 0
      ? `CTR is within ${Math.round(r.drop * 100)}% of its peak and people see it ${freq.toFixed(1)} times on average.`
      : `${r.reasons.join(', and ').replace(/^./, c => c.toUpperCase())}.`

  return (
    <div className="flex flex-col p-3 sm:p-5" aria-live="polite">
      <span className={`self-start rounded-full px-3 py-1 text-[13px] font-semibold ${t.chip}`}>{t.label}</span>
      <h2 className="mt-4 text-[34px] font-medium leading-[1.02] tracking-[-0.025em] [font-stretch:110%]">{t.head}</h2>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Stat label="Below its peak" value={`${Math.round(r.drop * 100)}%`} />
        <Stat label="CTR now, 3-day avg" value={pct(r.now)} />
      </div>
      <p className="mt-5 text-[16px] font-medium">{pace}</p>
      <p className="mt-1 text-[15px] text-body">{why}</p>
      <h3 className="mt-6 text-[14px] font-semibold">What to do</h3>
      <ul className="mt-2 space-y-2 text-[15px] text-body">
        {advice(r).map(a => (
          <li key={a} className="flex gap-2.5">
            <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
            {a}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="font-mono text-[28px] leading-none tracking-tight">{value}</div>
      <div className="mt-2 text-[13px] text-mute">{label}</div>
    </div>
  )
}

function GooseHandOff({ r, freq }: { r: Reading; freq: number }) {
  const [copied, setCopied] = useState(false)
  const ask =
    r.status === 'healthy'
      ? 'Watch my top Meta ad for fatigue and tell me before it starts wearing out.'
      : 'My top Meta ad is wearing out. Make three fresh variations of it from our brand kit.'
  const prompt = `${INSTALL}\n${ask}`
  const msg =
    r.status === 'healthy'
      ? 'Your top ad is holding up. I’ll keep an eye on it and tell you when it starts to fade.'
      : r.status === 'wearing'
        ? 'Your top ad is wearing out. Want me to make fresh variations from your brand kit?'
        : 'Your top ad is burnt out. Want me to pause it and make replacements from your brand kit?'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="mt-20 grid items-center gap-10 rounded-[28px] bg-plum px-5 py-12 text-white sm:px-12 lg:grid-cols-2">
      <div>
        <h2 className="text-[36px] font-medium leading-[1.02] tracking-[-0.025em] [font-stretch:110%] sm:text-[48px]">
          Or let your agent watch it for you.
        </h2>
        <p className="mt-4 max-w-md text-[17px] text-white/75">
          Goose checks your ads every day and comes to you with the fix already started. One line sets it up in the agent you already use.
        </p>
        <div className="mt-7 rounded-2xl bg-white/10 p-4 font-mono text-[13px] leading-relaxed text-white/90">
          <div>{INSTALL}</div>
          <div className="text-white/70">{ask}</div>
        </div>
        <button onClick={copy} className="mt-4 rounded-full bg-white px-5 py-3 text-[15px] font-medium text-ink">
          {copied ? 'Copied' : 'Copy prompt'}
        </button>
      </div>

      <figure>
        <div className="rounded-[20px] bg-white p-4 text-ink shadow-2xl sm:p-5">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="grid h-5 w-5 place-items-center rounded-md bg-[#cfe1b8] text-[11px]">G</span>
            <b className="font-semibold">Goose</b>
            <span className="text-mute">now</span>
          </div>
          <p className="mt-2 text-[15px] leading-snug">{msg}</p>
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-line p-2.5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[#efe6d2] text-center text-[9px] font-bold leading-tight">
              YOUR
              <br />
              AD
            </div>
            <div className="text-[13px]">
              <div className="font-medium">Top ad, last {RULES.trendDays} days</div>
              <div className="text-mute">
                CTR {Math.round(r.drop * 100)}% below peak · seen {freq.toFixed(1)}× per person
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2 text-[13px]">
            <span className="rounded-full border border-line px-3 py-1.5">See what changed</span>
            <span className="rounded-full bg-pink px-3 py-1.5 font-medium">{r.status === 'burnt' ? 'Pause and replace' : 'Make variations'}</span>
          </div>
        </div>
        <figcaption className="mt-3 text-center text-[13px] text-white/60">How Goose could bring this to you. Mock-up.</figcaption>
      </figure>
    </section>
  )
}

function Method() {
  return (
    <section className="mt-20">
      <h2 className="text-[28px] font-medium tracking-[-0.02em] [font-stretch:110%]">How the check works</h2>
      <div className="mt-6 grid gap-8 text-[15px] text-body sm:grid-cols-3">
        <p>
          <b className="block text-ink">Peak</b>
          The best {RULES.window}-day average CTR in the window. One lucky day doesn’t count as the peak.
        </p>
        <p>
          <b className="block text-ink">Pace</b>
          A straight line through the last {RULES.trendDays} days. If it keeps falling, that’s when CTR reaches half its peak.
        </p>
        <p>
          <b className="block text-ink">Status</b>
          Wearing out at {RULES.wearingDrop * 100}% below peak or {RULES.wearingFreq}+ views per person. Burnt out at {RULES.burntDrop * 100}% or {RULES.burntFreq}+. Rules of thumb,
          not Meta’s numbers.
        </p>
      </div>
      <p className="mt-6 text-[13px] text-mute">Runs in your browser. Nothing you enter is sent anywhere.</p>
    </section>
  )
}

function About() {
  return (
    <section className="mt-20 border-t border-line pt-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <h2 className="text-[28px] font-medium leading-tight tracking-[-0.02em] [font-stretch:110%]">Why this exists</h2>
        <div className="space-y-4 text-[16px] text-body">
          <p>
            Your post asks for small, fast mini-apps and lead magnets. This is one, built in a day with React, Tailwind and Claude Code, with tests for the fatigue
            maths. It ends where your Proactive section begins: “Your top ad is wearing out.”
          </p>
          <p>I’m Krishna, a design engineer in India. I design the moments where people review and approve what an AI did, and I ship them in code.</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a href="https://design.bhupathi.dev" className="rounded-full bg-ink px-5 py-3 text-[15px] font-medium text-white">
              See my work
            </a>
            <a href="https://cal.com/bhupathi-murali-krishna-ed0ola/intro-call" className="rounded-full border border-line bg-white px-5 py-3 text-[15px] font-medium">
              Book 15 minutes
            </a>
            <a href="https://github.com/krishnanbhupathi/ad-fatigue-check" className="rounded-full border border-line bg-white px-5 py-3 text-[15px] font-medium">
              Read the code
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
