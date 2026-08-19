# Template Catalog

Twelve attorney-drafted templates from the [General Legal](https://general.legal)
library, released under CC0 1.0. Files live in `templates/<name>.md`.

The **Fields** count is what `scripts/list_fields.py` reports for that template —
a rough measure of how long the interview will be. Run
`python3 scripts/list_fields.py templates/<name>.md` for the itemized list with
line numbers and surrounding context.

---

## Agreements

### `mutual-nda` — Mutual Non-Disclosure Agreement
**Fields:** 5 · **Use when:** both parties will disclose confidential information.

Two-way confidentiality agreement for parties exchanging sensitive information
while exploring a business relationship: technical or product information,
financials and business plans, partnership and strategic-collaboration talks,
customer or employee data, prototypes, algorithms, proprietary materials.

Obligations run symmetrically — each party is both Discloser and Recipient.

**Ask for:** both party legal names and entity types, the Permitted Use (what the
parties are evaluating), and the effective date.

---

### `one-way-nda` — One-Way Non-Disclosure Agreement
**Fields:** 4 · **Use when:** only your side is disclosing.

Protects a single disclosing party. Use for product roadmaps and prototypes,
access to internal data or technology, financials and business plans shared with
prospective partners, vendors, or investors evaluating you.

Key provisions: broad Confidential Information definition; Permitted-Use-only
limits; access restricted to Representatives and Affiliates; standard exceptions;
compelled-disclosure procedure; return-or-destroy at termination; no IP license
granted, with **reverse engineering and AI/ML training expressly prohibited**;
five-year term with indefinite trade-secret survival; Delaware law.

**Ask for:** the Company's legal name, the Permitted Use, and who the Recipient is
(the Recipient is identified on the signature page, not in the preamble).

---

### `master-services-agreement` — Master Services Agreement (MSA)
**Fields:** 23 · **Use when:** you are the vendor and need the master contract.

Tech-oriented MSA for companies deploying software and providing platform or
integration services. Covers definitions (Customer Data, Input, Output, Connected
Accounts, Integration Tools); provision of services and the customer environment;
maintenance and support; third-party services; customer restrictions and
responsibilities; and personal data handling. Structured around **Exhibit A**
(order form / commercial terms) and **Exhibit B** (incorporated terms), with
optional user-tier pricing blocks.

Defaults to Delaware law, New Castle County venue.

**Ask for:** Company and Customer legal names and entity types, effective date,
the services and any user tiers with per-block pricing, fees and payment terms,
term and renewal, notice addresses and email, and whether the deal is
seat-limited. Confirm whether a DPA is being attached — pair with `dpa-us` or
`dpa-global` when the vendor processes personal data.

---

### `advisor-agreement` — Advisor Agreement
**Fields:** 7 · **Use when:** bringing on an advisor, usually for equity.

Covers advisory services and time commitment, consideration (typically an equity
grant with a vesting schedule), board or committee participation, ownership of
inventions, pre-existing IP carve-outs, proprietary information, termination, and
institution policies (for advisors with university or employer obligations).

**Ask for:** the advisor's name, a description of the services, the dates or
duration of services, the equity grant and vesting terms, and any pre-existing IP
the advisor is carving out. The pre-existing IP list matters — an advisor with a
day job or academic appointment usually has one.

**Flag:** equity as consideration has securities and tax implications (409A
valuation, 83(b) election timing). Note it and recommend counsel; do not advise on
it.

---

### `employee-offer-letter` — Employee Offer Letter (California Exempt)
**Fields:** 20 · **Use when:** hiring a salaried exempt employee **in California**.

Covers position and duties, reporting manager, work location (office or remote),
base salary and pay frequency, equity, benefits, start date, at-will employment,
exempt-status acknowledgment, confidentiality and proprietary information
assignment, and an arbitration provision with excluded claims.

**Ask for:** employee name and address, position title, manager, work location,
annual base salary, pay frequency, equity grant if any, start date, and the
signing date.

**Flag:** this is drafted specifically for **California exempt** hires. It does not
port to other states or to non-exempt (hourly/overtime-eligible) roles — the
exempt classification, arbitration, and wage-notice provisions all differ. If the
hire is outside California or non-exempt, say so and recommend counsel rather than
adapting it.

---

## Privacy & Data Protection

### `dpa-us` — Data Processing Addendum (U.S.)
**Fields:** 16 · **Use when:** you process personal data and **only U.S. data is in scope**.

Processor-friendly DPA covering definitions and duration; customer instructions;
security measures; data subject rights; customer responsibilities; restricted
data; subprocessors; audits; return and deletion; and **artificial intelligence
and automated processing**. Includes a Data Processing Details annex (provider
details, customer details, categories of data).

Aligned to U.S. state privacy laws (CCPA/CPRA and successors).

**Ask for:** provider and customer legal names, the services covered, categories
of personal data and data subjects, processing purposes, retention period,
security measures actually in place, the subprocessor list, and notice contacts.

**Choose `dpa-global` instead** if *any* EU/EEA, UK, or Swiss personal data is
involved — including employees or a single European customer.

---

### `dpa-global` — Data Processing Addendum (Global)
**Fields:** 16 · **Use when:** EU/EEA, UK, or Swiss personal data is in scope.

Everything in the U.S. DPA plus GDPR-aligned obligations: processing of personal
data under Article 28, data protection impact assessments and prior consultation,
and **restricted transfers** (Standard Contractual Clauses, the UK Addendum, and
the Swiss adaptations).

**Ask for:** everything the U.S. DPA needs, plus the transfer mechanism relied on,
the SCC module and the parties' roles (controller-to-processor vs.
processor-to-processor), the competent supervisory authority, and the EU/UK
representative if one is appointed.

---

### `business-associate-agreement` — Business Associate Agreement (BAA)
**Fields:** 10 · **Use when:** you handle protected health information for a covered entity.

HIPAA-required contract between a covered entity and a business associate.
Required whenever your company functions as a business associate: cloud hosting or
SaaS for healthcare clients, analytics on patient information, billing or claims
processing, health-tech application development, IT support for healthcare
organizations.

The template allocates responsibility explicitly: the customer must comply with
its own Covered Entity obligations, obtain necessary consents, transmit PHI only
through enabled HIPAA-Eligible Services, and correctly configure those services.

**Ask for:** the company's legal name and state of incorporation, the description
of the services, and which services are HIPAA-Eligible.

**Flag:** operating without a BAA in place carries substantial statutory
penalties. If the user is already handling PHI without one, say so directly.

---

### `privacy-policy-us` — Privacy Policy (U.S. Only)
**Fields:** 83 · **Use when:** U.S. operations, no meaningful European exposure.

Covers U.S. federal and state privacy law: CCPA/CPRA, Virginia CDPA, Colorado CPA,
and similar statutes. Appropriate for companies that collect personal information
from U.S. users and do **not** target EEA or UK individuals in ways that trigger
GDPR.

**This is a factual document.** The categories of personal information collected,
sources, business purposes, third-party recipients, retention periods, and whether
the company sells or shares personal information must reflect what the business
actually does. Interview for these; do not default them.

---

### `privacy-policy-gdpr` — Privacy Policy (GDPR Enhanced)
**Fields:** 145 · **Use when:** any European users, visitors, or tracking.

Multi-jurisdictional policy covering U.S. state laws **and** GDPR/UK GDPR. Needed
when a site or app is accessible to European visitors, products are offered to
EEA or UK residents, European user behavior is tracked, global marketing runs, or
service providers process data in or from Europe.

Adds over the U.S. version: lawful bases for each processing purpose, data subject
rights under Articles 15–22, international transfer mechanisms, retention
schedules, the controller's identity and contact details, DPO details if one is
appointed, and supervisory authority complaint rights.

The longest template in the library. Propose defaults for the routine structural
fields and ask the user to correct, rather than walking all 145 fields one by one
— but never default the factual ones.

---

### `cookie-notice` — Cookie Notice
**Fields:** 24 · **Use when:** the site or app uses cookies or similar tracking.

Discloses cookie and tracking-technology practices: essential site functionality,
analytics, advertising, social media integrations, email-tracking pixels, mobile
SDKs, and session-replay tools (the template calls out FullStory by name as an
example — replace or remove it to match reality).

Includes optional blocks for a Cookie Banner and Cookie Preference Dashboard, and
language distinguishing strictly-necessary cookies (no consent required) from
everything else (accept all / reject all / manage settings).

**Ask for:** company name, whether a mobile app is in scope, the actual list of
cookies and tracking tools in use, whether a consent banner and preference
dashboard exist and where they link, the privacy contact email, and the last-
updated date.

---

## Website Terms

### `terms-of-use` — Terms of Use
**Fields:** 30 · **Use when:** operating a website, web app, or online service.

Covers access rights and acceptable use, intellectual property protections,
user-generated content, third-party services and links, disclaimers, limitation of
liability, indemnification, termination, and dispute resolution. Especially
important where the site allows account creation or user interaction, displays
content, integrates third-party tools, or collects personal data.

**Ask for:** company legal name and entity type, the site and app URLs, the
governing law and venue, the dispute-resolution mechanism (arbitration vs. courts,
and whether a class-action waiver applies), the contact email, and the effective
date.

---

## Bundles that go together

- **Public website with U.S. users:** `privacy-policy-us` + `cookie-notice` + `terms-of-use`
- **Public website with European users:** `privacy-policy-gdpr` + `cookie-notice` + `terms-of-use`
- **Signing a SaaS customer:** `master-services-agreement` + `dpa-us` or `dpa-global`
- **Signing a healthcare customer:** `master-services-agreement` + `dpa-us`/`dpa-global` + `business-associate-agreement`
- **Early business development:** `mutual-nda` or `one-way-nda`, then the MSA

When a user asks for one member of a bundle, offer the rest.
