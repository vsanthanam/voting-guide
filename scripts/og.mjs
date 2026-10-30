// Renders Open Graph preview images (1200x630) for the home page and every guide.
// Uses headless Chrome, so run it locally and commit the PNGs: `npm run og`.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CHROME =
  process.env.CHROME ??
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(
    existsSync,
  );
if (!CHROME) throw new Error('Chrome not found; set CHROME=/path/to/chrome');

const site = "Varun's Voting Guide";
const guidesDir = 'src/content/guides';
const pages = [{ slug: 'default', title: site, sub: 'Picks and reasoning for every race and measure in the Bay Area' }];
for (const dir of readdirSync(guidesDir)) {
  const y = readFileSync(join(guidesDir, dir, 'guide.yaml'), 'utf8');
  const election = /^election:\s*(.+)$/m.exec(y)?.[1]?.trim();
  const date = /^date:\s*(\d{4}-\d{2}-\d{2})/m.exec(y)?.[1];
  const when = date
    ? new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      })
    : '';
  pages.push({ slug: dir, title: election, sub: `${site}  ·  ${when}` });
}

const html = ({ title, sub }) => `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;width:1200px;height:630px;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
  .card{position:absolute;inset:48px;background:#fff;border-radius:40px;box-shadow:0 2px 4px rgba(0,0,0,.04),0 24px 64px rgba(0,0,0,.08);padding:72px 80px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between}
  .mark{width:84px;height:84px;border-radius:50%;background:#0071e3;display:flex;align-items:center;justify-content:center}
  .mark svg{width:56px;height:56px;fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
  h1{margin:0;font-size:${title.length > 22 ? 84 : 104}px;font-weight:700;letter-spacing:-0.04em;line-height:1;color:#1d1d1f}
  p{margin:18px 0 0;font-size:34px;font-weight:500;letter-spacing:-0.02em;color:#6e6e73}
</style>
<div class="card">
  <div class="mark"><svg viewBox="0 0 20 20"><path d="m5.5 10.5 3 3 6-7"/></svg></div>
  <div><h1>${title}</h1><p>${sub}</p></div>
</div>`;

mkdirSync('public/og', { recursive: true });
for (const p of pages) {
  const file = join(tmpdir(), `og-${p.slug}.html`);
  writeFileSync(file, html(p));
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--window-size=1200,630',
      `--screenshot=public/og/${p.slug}.png`,
      `file://${file}`,
    ],
    { stdio: 'ignore' },
  );
  console.log(`public/og/${p.slug}.png  ${p.title}`);
}
