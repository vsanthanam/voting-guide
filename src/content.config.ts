import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Voting guide format
 * ----------------------------------------------------------------
 * src/content/guides/<slug>/guide.yaml     one per election
 * src/content/guides/<slug>/<area>.yaml    one per jurisdiction
 *
 * Two rules hold for every contest:
 *   1. Every option on the printed ballot is listed. Candidate contests must
 *      list all `candidates`; yes/no questions have their options implied.
 *   2. The answer field is tri-state by presence:
 *        absent  -> not decided yet
 *        empty   -> decided: no position
 *        filled  -> the recommendation
 *      That field is `picks` for candidate contests, `position` for measures
 *      and recalls, and `decisions` for judicial retention.
 *
 * See FORMAT.md for every field.
 */

const candidate = z.object({
  name: z.string(),
  party: z.string().optional(), // D, R, NPP, G, …  omit for nonpartisan races if unknown
  incumbent: z.boolean().optional(),
  note: z.string().optional(), // short aside shown next to the name
});

// A "slot" is one filled oval. `any_of` means "either of these, your call".
const slot = z.union([candidate, z.object({ any_of: z.array(candidate).min(2) })]);

const decision = z.object({ name: z.string(), retain: z.enum(['yes', 'no']) });

const CANDIDATE_KINDS = ['single', 'multi', 'ranked'] as const;

const contest = z
  .object({
    // Candidate contests and retention use `office`; measures and recalls use `measure`.
    office: z.string().optional(),
    measure: z.string().optional(),
    title: z.string().optional(), // short plain-language title for a measure
    area: z.string().optional(), // e.g. "Palo Alto", "District 7"
    kind: z.enum(['single', 'multi', 'ranked', 'measure', 'recall', 'retention']),
    seats: z.number().int().positive().optional(), // for `multi`

    // The ballot as printed. Required for single, multi, ranked, retention.
    candidates: z.array(candidate).optional(),

    // Answers. See the tri-state rule above.
    picks: z.array(slot).optional(), // single, multi, ranked
    avoid: z.array(candidate).optional(), // "do not rank under any circumstances"; independent of picks
    position: z.enum(['yes', 'no', 'none']).optional(), // measure, recall
    decisions: z.array(decision).optional(), // retention: one per justice you have a view on

    // Measure context, all optional.
    summary: z.string().optional(),
    threshold: z.string().optional(),
    placed_by: z.string().optional(),
    supporters: z.string().optional(),
    opponents: z.string().optional(),

    // The author's voice. Markdown.
    why: z.string().optional(),
    note: z.string().optional(), // a procedural aside (tabulation rules, etc.)

    verify: z.boolean().optional(), // research flag: candidate list not confirmed
  })
  .superRefine((c, ctx) => {
    const err = (message: string) => ctx.addIssue({ code: 'custom', message });
    const label = c.office ?? c.measure ?? '(unnamed contest)';
    const isCandidate = (CANDIDATE_KINDS as readonly string[]).includes(c.kind);
    const isQuestion = c.kind === 'measure' || c.kind === 'recall';
    const names = new Set((c.candidates ?? []).map((p) => p.name));
    const must = (field: string, ok: boolean) => {
      if (!ok) err(`${c.kind} "${label}": ${field}`);
    };

    if (isQuestion) {
      must('needs a `measure` name', !!c.measure);
      must('does not take `candidates`', c.candidates === undefined);
      must('does not take `picks` (use `position`)', c.picks === undefined);
      must('does not take `avoid`', c.avoid === undefined);
      must('does not take `decisions`', c.decisions === undefined);
      return;
    }

    must('needs an `office` name', !!c.office);
    must('must list every candidate on the ballot in `candidates`', !!c.candidates && c.candidates.length > 0);
    must('does not take `position` (use `picks`)', c.position === undefined);
    if (c.candidates && new Set(c.candidates.map((p) => p.name)).size !== c.candidates.length) {
      err(`${c.kind} "${label}": duplicate names in \`candidates\``);
    }

    if (c.kind === 'retention') {
      must('does not take `picks` (use `decisions`)', c.picks === undefined);
      must('does not take `avoid` (use `decisions`)', c.avoid === undefined);
      for (const d of c.decisions ?? []) {
        if (!names.has(d.name)) err(`retention "${label}": decision for "${d.name}" who is not in \`candidates\``);
      }
      return;
    }

    if (isCandidate) {
      must('does not take `decisions`', c.decisions === undefined);
      const picked = (c.picks ?? []).flatMap((s) => ('any_of' in s ? s.any_of : [s]));
      for (const p of picked) {
        if (!names.has(p.name)) err(`${c.kind} "${label}": pick "${p.name}" is not in \`candidates\``);
      }
      for (const p of c.avoid ?? []) {
        if (!names.has(p.name)) err(`${c.kind} "${label}": avoid "${p.name}" is not in \`candidates\``);
      }
      if (c.kind === 'single' && (c.picks?.length ?? 0) > 1) err(`single "${label}": more than one pick`);
      if (c.kind === 'multi' && c.seats && (c.picks?.length ?? 0) > c.seats)
        err(`multi "${label}": more picks than seats`);
      if (c.kind === 'multi' && !c.seats) err(`multi "${label}": needs \`seats\``);
    }
  });

const guides = defineCollection({
  loader: glob({
    pattern: '*/guide.yaml',
    base: './src/content/guides',
    generateId: ({ entry }) => entry.split('/')[0],
  }),
  schema: z.object({
    election: z.string(), // "November 2024 General Election" — this is the guide's title
    date: z.coerce.date(), // election day
    author: z.string().optional(),
    status: z.enum(['draft', 'published']).default('published'),
    intro: z.string().optional(), // markdown
    jurisdictions: z.array(z.string()), // file basenames, in display order
  }),
});

const jurisdictions = defineCollection({
  loader: glob({
    pattern: ['*/*.yaml', '!*/guide.yaml'],
    base: './src/content/guides',
    generateId: ({ entry }) => entry.replace(/\.ya?ml$/, ''),
  }),
  schema: z.object({
    name: z.string(),
    intro: z.string().optional(), // markdown
    sections: z.array(
      z.object({
        name: z.string(),
        intro: z.string().optional(),
        contests: z.array(contest),
      }),
    ),
  }),
});

export const collections = { guides, jurisdictions };
