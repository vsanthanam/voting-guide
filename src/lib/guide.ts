import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { marked } from 'marked';

export type Guide = CollectionEntry<'guides'>;
export type Jurisdiction = CollectionEntry<'jurisdictions'>;
export type Section = Jurisdiction['data']['sections'][number];
export type Contest = Section['contests'][number];
export type Candidate = Contest['candidates'][number];
export type Slot = Contest['picks'][number];

marked.use({ gfm: true, breaks: false });

export function md(src?: string): string {
  if (!src) return '';
  return marked.parse(src) as string;
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function contestTitle(c: Contest): string {
  return (c.office ?? c.measure ?? '').trim();
}

/** Anchor id. Prefixed with the jurisdiction so "Measure J" in two cities stays unique. */
export function contestId(c: Contest, jurisdiction?: string): string {
  return slug([jurisdiction, contestTitle(c), c.area].filter(Boolean).join(' '));
}

export function isMeasure(c: Contest): boolean {
  return c.kind === 'measure' || c.kind === 'recall';
}

/** The answer field for this contest, whatever its kind. `undefined` means not decided yet. */
export function answer(c: Contest): unknown[] | string | undefined {
  if (isMeasure(c)) return c.position;
  if (c.kind === 'retention') return c.decisions;
  return c.picks;
}

/** Not decided yet: the answer field is absent. */
export function isOpen(c: Contest): boolean {
  return answer(c) === undefined;
}

/** Decided, and the decision is to take no position. */
export function isNoPosition(c: Contest): boolean {
  const a = answer(c);
  if (a === undefined) return false;
  return Array.isArray(a) ? a.length === 0 : a === 'none';
}

export function slotCandidates(s: Slot): Candidate[] {
  return 'any_of' in s ? s.any_of : [s];
}

/** The printed ballot, with any party or note that a pick or avoid entry adds. */
export function rows(c: Contest): Candidate[] {
  const seen = new Map<string, Candidate>();
  const merge = (p: Candidate) => {
    const prev = seen.get(p.name);
    if (!prev) return;
    seen.set(p.name, { ...prev, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) });
  };
  (c.candidates ?? []).forEach((p) => seen.set(p.name, p));
  (c.picks ?? []).forEach((s) => slotCandidates(s).forEach(merge));
  (c.avoid ?? []).forEach(merge);
  return [...seen.values()];
}

/** For each candidate name, which slot indexes they occupy and whether the slot is shared. */
export function marks(c: Contest): Map<string, { index: number; shared: boolean }[]> {
  const m = new Map<string, { index: number; shared: boolean }[]>();
  (c.picks ?? []).forEach((s, index) => {
    const people = slotCandidates(s);
    for (const p of people) {
      const list = m.get(p.name) ?? [];
      list.push({ index, shared: people.length > 1 });
      m.set(p.name, list);
    }
  });
  return m;
}

export function avoided(c: Contest): Set<string> {
  return new Set((c.avoid ?? []).map((a) => a.name));
}

/** Retention: name -> yes | no */
export function retention(c: Contest): Map<string, 'yes' | 'no'> {
  return new Map((c.decisions ?? []).map((d) => [d.name, d.retain]));
}

/** Number of rank columns to draw for a ranked contest. */
export function rankColumns(c: Contest): number {
  return Math.max(c.picks?.length ?? 0, Math.min(rows(c).length, 3), 1);
}

/** The status pill for a contest, or undefined when the picks speak for themselves. */
export function status(c: Contest): { kind: 'yes' | 'no' | 'none' | 'undecided'; text: string } | undefined {
  if (isOpen(c)) return { kind: 'undecided', text: 'Not decided yet' };
  if (isNoPosition(c)) return { kind: 'none', text: 'No position' };
  if (isMeasure(c)) return c.position === 'yes' ? { kind: 'yes', text: 'Yes' } : { kind: 'no', text: 'No' };
  return undefined;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export interface LoadedGuide {
  guide: Guide;
  jurisdictions: Jurisdiction[];
}

export async function loadGuide(id: string): Promise<LoadedGuide | undefined> {
  const guide = await getEntry('guides', id);
  if (!guide) return undefined;
  const all = await getCollection('jurisdictions', (j) => j.id.startsWith(`${id}/`));
  const byName = new Map(all.map((j) => [j.id.slice(id.length + 1), j]));
  const jurisdictions: Jurisdiction[] = [];
  for (const name of guide.data.jurisdictions) {
    const j = byName.get(name);
    if (!j) throw new Error(`Guide "${id}" lists jurisdiction "${name}" but ${id}/${name}.yaml does not exist`);
    jurisdictions.push(j);
  }
  return { guide, jurisdictions };
}

export async function loadAllGuides(): Promise<LoadedGuide[]> {
  const guides = await getCollection('guides');
  const loaded = await Promise.all(guides.map((g) => loadGuide(g.id)));
  return (loaded.filter(Boolean) as LoadedGuide[]).sort(
    (a, b) => b.guide.data.date.getTime() - a.guide.data.date.getTime(),
  );
}

export function stats(lg: LoadedGuide) {
  let contests = 0;
  let open = 0;
  let measures = 0;
  for (const j of lg.jurisdictions)
    for (const s of j.data.sections)
      for (const c of s.contests) {
        contests++;
        if (isMeasure(c)) measures++;
        if (isOpen(c)) open++;
      }
  return { contests, open, measures, races: contests - measures };
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export function shortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
