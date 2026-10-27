# Voting guide format

A guide is a folder under `src/content/guides/`. The folder name is the URL slug.

```
src/content/guides/2026-general/
  guide.yaml          election metadata, and the order of the files below
  federal.yaml        one file per jurisdiction
  california.yaml
  san-francisco.yaml
  oakland.yaml
  palo-alto.yaml
```

Every file is validated against the schema in `src/content.config.ts` at build time.
A typo in a field name, a pick who isn't on the ballot, or a candidate contest with
no candidate list fails the build and names the contest.

## Two rules

1. **Every option on the printed ballot is listed.** Candidate contests must list
   all `candidates`. Yes/no questions (measures, recalls) have their two options
   implied. Retention lists each justice.

2. **The answer field is tri-state by presence.**

   | state            | candidate contest | measure / recall | retention        |
   |------------------|-------------------|------------------|------------------|
   | not decided yet  | no `picks` key    | no `position` key| no `decisions` key |
   | no position      | `picks: []`       | `position: none` | `decisions: []`  |
   | decided          | `picks: [...]`    | `position: yes` / `no` | `decisions: [...]` |

   "Not decided yet" is for a draft you're still writing. "No position" is a
   deliberate choice and renders as such.

## guide.yaml

```yaml
election: November 2026 General Election   # this is the guide's title
date: 2026-11-03            # election day
author: Varun Santhanam     # optional
status: draft               # draft | published  (draft shows an "in progress" banner)
intro: |                    # optional, markdown
  A paragraph or two for the top of the page.
jurisdictions:              # file basenames, in the order they should appear
  - federal
  - california
  - san-francisco
```

## A jurisdiction file

```yaml
name: City of San Francisco
intro: Optional markdown shown under the heading.
sections:
  - name: Board of Supervisors
    intro: Optional markdown shown under the section heading.
    contests:
      - ...
```

## Contests

Each contest is one block on the ballot. The `kind` decides how it renders and
which answer field it takes.

| kind        | what it is                          | answer field                    |
|-------------|-------------------------------------|---------------------------------|
| `single`    | one seat, vote for one              | `picks` (at most one slot)      |
| `multi`     | several seats, vote for up to N     | `picks` (up to `seats`)         |
| `ranked`    | ranked choice                       | `picks` in rank order           |
| `measure`   | yes / no question                   | `position`                      |
| `recall`    | shall X be recalled, yes / no       | `position`                      |
| `retention` | retain each justice, yes / no each  | `decisions`                     |

### Candidate contest

```yaml
- office: San Francisco Board of Supervisors, District 8
  area: Castro, Noe Valley          # optional, shown under the title
  kind: ranked
  note: Open seat. Rafael Mandelman is term-limited.   # optional markdown aside
  candidates:                       # everyone on the ballot, required
    - { name: Gary McCoy, note: healthcare policy advocate }
    - { name: Darshini Patel, incumbent: true }
    - { name: Michael T. Nguyen, party: D }
    - { name: Somebody Else }
  picks:                            # one entry per filled oval, in rank order for ranked contests
    - { name: Gary McCoy }
    - any_of:                       # "either of these, your call" -> dash mark
        - { name: Darshini Patel }
        - { name: Michael T. Nguyen }
  avoid:                            # "do not rank under any circumstances"; independent of picks
    - { name: Somebody Else }
  why: |                            # markdown, the author's reasoning
    A paragraph or two.
```

People are matched by `name`. A pick or avoid entry may add a `note` (like
"if you must") that the printed list lacks, but every name must appear in
`candidates`. `picks: []` with an `avoid` list means "no preference, but never them."

### Measure or recall

```yaml
- measure: Proposition 33
  title: Repeal Costa-Hawkins       # short plain-language title
  kind: measure
  summary: One neutral sentence on what a YES vote does.
  threshold: "50%+1"                # or "2/3"
  placed_by: Board of Supervisors
  supporters: Who is for it
  opponents: Who is against it
  note: A procedural aside, e.g. tabulation rules when two measures conflict.
  position: no                      # yes | no | none; omit while undecided
  why: |
    Why.
```

### Retention

```yaml
- office: Supreme Court of California
  kind: retention
  candidates:
    - { name: Kelli M. Evans, note: Associate Justice }
    - { name: Joshua Groban, note: Associate Justice }
  decisions:                        # omit while undecided; [] for no position
    - { name: Kelli M. Evans, retain: yes }
    - { name: Joshua Groban, retain: no }
```

### Flags

- `verify: true` on a contest shows "Candidate list not yet verified". Use it while
  researching; remove it once you've checked the official sample ballot.
