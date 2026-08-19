---
name: legal-templates
description: >-
  Drafts a ready-to-review business legal document from the attorney-drafted
  General Legal template library (CC0): mutual and one-way NDAs, Master Services
  Agreement, advisor agreement, California exempt offer letter, U.S. and global
  Data Processing Addendums, HIPAA Business Associate Agreement, U.S. and GDPR
  privacy policies, cookie notice, and website terms of use. Use whenever the user
  wants to draft, generate, fill in, or "paper" one of these — including "I need an
  NDA," "write me a privacy policy," "draft an MSA for this client," "offer letter
  for our new hire," "we need a DPA for this vendor," "terms of use for our site,"
  or "send me a BAA." Trigger even when the user only names the counterparty or the
  situation ("we're sharing our roadmap with an investor," "onboarding a healthcare
  customer") and asks for the agreement. Also use to compare which template fits a
  situation. Do NOT use for Chartis game acquisition, game investment, or
  zero-dollar partnership deals — those have their own skills.
license: Templates are CC0 1.0 Universal. See LICENSE.
---

# Legal Templates

This skill turns the [General Legal](https://general.legal) template library into
finished first drafts. Twelve attorney-drafted templates ship in `templates/`,
released under CC0 1.0 — free to use, modify, and distribute without attribution.

Your job is to pick the right template, interview the user for the values it
needs, fill it in completely, and hand back a clean document. You are **not**
rewriting the templates' legal substance — you fill the blanks and resolve the
optional clauses.

## Always say this

Every document you produce from this skill is a **draft template, not legal
advice**. Say so when you deliver it, and recommend counsel review before
signature. Say it once, plainly, at the end — do not repeat it in every message.

## How to run this skill

1. **Pick the template.** Read `references/catalog.md` for what each one covers,
   when it applies, and how to choose between the near-neighbors (mutual vs.
   one-way NDA, U.S. vs. global DPA, U.S. vs. GDPR privacy policy). If the user's
   situation is ambiguous, ask with `AskUserQuestion` rather than guessing — the
   wrong template wastes the whole draft.
2. **Read the template file** at `templates/<name>.md`. Read it in full before
   asking anything; the blanks only make sense in context.
3. **Find what needs filling.** Run the bundled extractor:
   ```bash
   python3 scripts/list_fields.py templates/<name>.md
   ```
   It prints every `<mark>`-tagged span and bracketed placeholder with its line
   number and surrounding context, split into blanks and optional clauses.
4. **Interview the user** with `AskUserQuestion`, in small logical groups (parties
   → commercial terms → notices → optional clauses), not one giant form. Use
   multiple choice for the structural decisions and free text for legal names,
   addresses, and dollar amounts. See "Interviewing well" below.
5. **Fill the template.** Copy `templates/<name>.md` to a working file and
   substitute. Rules:
   - Strip every `<mark>` and `</mark>` tag — they are editing markers, not
     content. **No `<mark>` may survive into the final document.**
   - Replace each blank with the real value. Never leave `___`, `[Company Name]`,
     or `[INSERT DATE]` in the output.
   - Resolve each optional clause explicitly: keep it (unwrapped), delete it, or
     adapt it. Never leave a bracketed either/or like
     `[once per month / semimonthly / every two weeks]` unresolved.
   - Leave the substantive clause text alone unless the user asks for a change.
     If they ask for something that materially shifts risk (uncapping liability,
     dropping an indemnity, changing governing law), make the change and flag what
     it does in one sentence.
6. **Verify** before delivering:
   ```bash
   python3 scripts/list_fields.py <filled-file.md> --check
   ```
   Exits non-zero and lists anything unfilled. Fix and re-run until clean.
7. **Deliver.** Default to a `.docx` (see below) since these are documents people
   sign. Share the file, then give the one-line "draft, not legal advice, have
   counsel review" note plus a short list of anything you assumed or left for the
   user to decide.

## Producing the .docx

```bash
python3 scripts/build_docx.py <filled-file.md> "<Document Title>.docx"
```

The script renders headings, numbered clause hierarchy, bold/italic runs, tables,
and signature blocks, and opens cleanly in both Microsoft Word and Google Docs. It
needs `python-docx`; if the import fails, `pip install python-docx` and retry. If
that is not possible, fall back to the `docx` skill, or deliver the filled
markdown and say why.

Name output files `<Document Type> - <Counterparty> - <Date>.docx`.

## Interviewing well

**Ask for what the document actually needs, and nothing more.** A one-way NDA
needs three answers; a GDPR privacy policy needs dozens. Scale the interview to
the template — `list_fields.py` tells you which you are in.

**Infer what you safely can, then confirm in bulk.** If the user has already said
"our company is Acme Inc., a Delaware corporation," do not ask again. For the long
templates (privacy policies, DPAs, MSA), propose sensible defaults for the routine
fields and ask the user to correct the list, rather than walking all 101 blanks.

**Never invent these** — always ask, and never guess:
- Legal entity names, entity types, and states of incorporation
- Effective dates and term lengths
- Dollar amounts, equity grants, vesting schedules, and payment terms
- Governing law and venue, where the template leaves it open
- Notice addresses and email addresses
- Which party is which (who discloses, who processes, who indemnifies)
- Any factual representation about the business — what data it collects, where it
  is stored, which subprocessors it uses, whether it sells personal information

For a privacy policy or cookie notice, the factual sections (categories of data
collected, purposes, retention, third-party recipients, tracking technologies in
use) **describe the user's real practices**. Getting these wrong creates legal
exposure rather than reducing it. Ask; do not fill them with plausible-sounding
defaults. If the user does not know, leave a clearly marked `[TO CONFIRM: ...]`
placeholder and list it in your delivery note rather than fabricating an answer.

## Choosing between near-neighbors

Quick disambiguation — `references/catalog.md` has the full detail:

| If the user says… | Use |
|---|---|
| "both sides are sharing information" | `mutual-nda` |
| "they're only receiving our information" | `one-way-nda` |
| "we're the vendor, this is the master contract" | `master-services-agreement` |
| "we're bringing on an advisor for equity" | `advisor-agreement` |
| "offer letter" (California, salaried/exempt) | `employee-offer-letter` |
| "DPA" + only U.S. data | `dpa-us` |
| "DPA" + any EU/EEA/UK/Swiss data | `dpa-global` |
| "we handle patient/health data for a client" | `business-associate-agreement` |
| "privacy policy" + U.S. only | `privacy-policy-us` |
| "privacy policy" + any European users | `privacy-policy-gdpr` |
| "cookie banner / tracking disclosure" | `cookie-notice` |
| "terms of service / terms of use for our site" | `terms-of-use` |

Privacy work usually needs **more than one**: a site with European users typically
wants `privacy-policy-gdpr` + `cookie-notice` + `terms-of-use` together. Offer the
set rather than delivering one and stopping.

## Scope limits

These templates are U.S.-oriented starting points. Flag it and recommend counsel
rather than improvising when the user needs:
- A jurisdiction the template does not contemplate (non-U.S. employment, non-U.S.
  corporate law)
- Securities-implicating terms (equity as consideration, SAFEs, notes, cap-table
  mechanics beyond the advisor agreement's standard grant)
- A non-California or non-exempt offer letter — the offer letter is specifically
  drafted for **California exempt** hires, and the exempt-status, arbitration, and
  wage-notice provisions do not port cleanly elsewhere
- Regulated-industry terms beyond HIPAA (financial services, insurance, defense)
- Anything the user describes as a live dispute, breach, or litigation

Do the parts you can, say clearly which parts you left, and why.

## Files

- `templates/*.md` — the twelve templates, verbatim from the source library
- `references/catalog.md` — what each template covers and when to use it
- `scripts/list_fields.py` — extract fill-in fields; `--check` verifies a filled draft
- `scripts/build_docx.py` — render a filled markdown document to `.docx`
- `LICENSE` — CC0 1.0 Universal
