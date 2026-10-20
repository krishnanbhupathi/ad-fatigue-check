# Is your ad wearing out?

A small ad-fatigue check: drag in an ad's daily click-through rate, or paste it, and see how far it has fallen from its peak, when it halves at the current pace, and what to do about it.

**Live:** https://videos.bhupathi.dev/goose

This is a concept I built for a job application to Gooseworks. It is not a Goose product and is not affiliated with Gooseworks.

## How the check works

All the maths is in [`src/lib/fatigue.ts`](src/lib/fatigue.ts), with tests in [`src/lib/fatigue.test.ts`](src/lib/fatigue.test.ts).

- **Peak:** the best 3-day average CTR, so one lucky day doesn't count.
- **Pace:** a least-squares line through the last 7 days, projected to half the peak. No forecast if the ad isn't really falling or the date is more than 60 days out.
- **Status:** wearing out at 20% below peak or 3+ views per person, burnt out at 40% or 5+. These are rules of thumb, kept in one `RULES` object so they're easy to tune.

Everything runs in the browser. Nothing you enter is sent anywhere.

## Run it

```sh
npm install
npm run dev     # local dev server
npm test        # vitest
npm run build   # type-check and build to dist/
```

Built with React 19, Tailwind CSS 4, Vite and Vitest.

## Accessibility

Each bar is a keyboard slider (arrow keys, Shift for bigger steps), there's a paste box as an alternative to dragging, and the result is announced with `aria-live`.

By Krishna Bhupathi, https://design.bhupathi.dev
