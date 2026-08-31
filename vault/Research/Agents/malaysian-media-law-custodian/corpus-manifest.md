# Corpus manifest — COMMANDER / DATASETS / Malaysian Acts

The agent reads this first, every run. It is the inventory of what the corpus
contains, how far to trust each file, and what has most likely changed since the
corpus was frozen.

**Corpus location:** `C:\Users\Adam\OneDrive\Documents\COMMANDER\DATASETS\Malaysian Acts\`
**Corpus vintage:** official reprints "incorporating all amendments up to 1 January 2006". Roughly **20 years stale.** Every file predates every amendment listed in the "changed since" column below.
**Format:** OCR-to-markdown, single document per Act, no internal structure metadata.
**Regulations folder:** `DATASETS/Malaysian Regulations/` contains only a link to commonlii — treat as empty.

> **On the "changed since" column below.** These notes are the *recollection of a
> non-lawyer LLM* about post-2006 Malaysian legislation, compiled when this agent
> was built. They are pointers for where to look, **not verified facts**, and
> some are probably imprecise on dates, Act numbers, or scope. The agent must
> apply the same "verify before relying" discipline to this column that it
> applies to the corpus itself — every year, penalty, and amendment description
> here needs an `lom.agc.gov.my` check before it goes into a deliverable as
> current law. Nothing in this manifest has been reviewed by a Malaysian
> advocate & solicitor.

## OCR quality grades

| Grade | Meaning | Citation rule |
|---|---|---|
| **A** | clean; section and subsection numbers intact | quote and cite normally, still flag vintage |
| **C** | mostly clean; occasional artefacts | quote; spot-check any number before citing |
| **D** | **materially degraded** — digits stripped (`(1)`→`()`, `1968`→`968`), whitespace collapsed | quote *substance* only; **never cite a subsection number or penalty figure without a web check against `lom.agc.gov.my`**; label every citation "reconstructed, unverified" |

## The 18 Acts

| # | File | Media-law tier | OCR | Key provisions for media work | Most significant changes since 1 Jan 2006 (verify) |
|---|---|---|---|---|---|
| 1 | **Communications and Multimedia Act 1998** | **1 — core** | **D** | s.233 improper use / offensive communication with intent to annoy, abuse, threaten, harass · s.211 offensive content by a content applications service provider · s.263 licensee duty to assist / block · Part V content regulation · s.246 investigation powers · Content Code | Amended more than once since 2006; a substantial amendment package around **2024–2025** (verify Act number and commencement) is understood to have widened online-content offences, raised penalties, and added service-provider duties and investigative powers. Treat the corpus s.233 penalty ("fifty thousand ringgit / one year") as **superseded — figure unverified**. |
| 2 | Companies Commission of Malaysia Act 2001 | 3 — situational | **D** | SSM powers, filing offences, false statements to the registrar | amended; SSM's remit and penalties have moved |
| 3 | **Companies Act 1965** | 3 — situational | A | incorporation of a media company, directors' duties and personal liability, s.364 false/misleading statements | **repealed and replaced by the Companies Act 2016** — this entire file is superseded law. Use only for pre-2016 history; for anything live, the corpus cannot answer. |
| 4 | **Computer Crimes Act 1997** | 2 — frequent | A | s.3 unauthorised access · s.4 access with intent to commit an offence · s.5 unauthorised modification · s.6 wrongful communication of a password/access code · s.8 presumption of possession/control · s.9 extra-territorial reach | amended; relevant where account takeover, hacking, or leaked-credential facts are alleged for or against the client |
| 5 | **Consumer Protection Act 1999** | 2 — frequent | A | s.9 misleading conduct · s.10 false or misleading representations · s.11 gratuitous claims · Part on unfair practices | amended repeatedly; e-commerce and online-marketplace provisions added post-2006. Core for sponsored posts, influencer marketing, health/earnings claims. |
| 6 | Contracts Act 1950 (Revised 1974) | 3 — situational | A | formation, agency, misrepresentation, void agreements — for creator / talent / sponsorship / NDA contracts | minor |
| 7 | **Copyright Act 1987** | 2 — frequent | A | s.13 acts constituting infringement · s.13(2) permitted acts / fair dealing · s.25 moral rights · s.36 infringement actionable · s.41 offences · s.41A compounding | **substantially amended 2012** (ISP safe harbour / notice-and-takedown, technological protection measures, further offences) and later. The corpus predates the whole online-liability framework. |
| 8 | Criminal Procedure Code (Revised 1999) | 2 — frequent | **D** | arrest with/without warrant, bail, remand, search and seizure, framing of a charge, statements to police | amended many times; bail and remand provisions in particular have shifted. Do not state a time limit or procedure from this file without verification. |
| 9 | Digital Signature Act 1997 | 4 — rare | A | licensed CA e-signatures, presumptions | largely overtaken by practice and by later e-commerce / digital law; low media relevance |
| 10 | Education Act 1996 | 4 — rare | A | — | only if the client is an education provider or the content is regulated educational material |
| 11 | Employment Act 1955 (Revised 1981) | 3 — situational | A | employer duties, termination, if the client employs writers / editors / production staff | **major 2022 amendments** (coverage threshold, hours, notice, paternity leave) — corpus is well behind |
| 12 | **Evidence Act 1950 (Revised 1971)** | 2 — frequent | A | s.90A admissibility of computer-produced documents · relevancy and burden of proof for the offences above | **s.114A (2012) — presumption that a person who is named as, or whose picture/pseudonym identifies them as, the owner/host/editor/administrator of a publication is presumed to have published it — is NOT in the corpus.** This presumption is decisive in almost every online-content prosecution. Flag it every time. |
| 13 | Income Tax Act 1967 | 4 — rare | C | *file appears partial/stub (~270 lines)* | not a reliable copy; do not rely on it |
| 14 | **Penal Code (Revised 1997)** | **1 — core** | A | s.499 defamation + the exceptions · s.500 punishment · s.298 wounding religious feelings · s.298A causing disharmony on religious grounds · s.504 insult to provoke a breach of the peace · s.505 statements conducing to public mischief (fear/alarm, incitement between classes) | amended repeatedly; new speech/harm provisions added over the years. Verify the current text and penalty of any section before citing. |
| 15 | Prevention of Corruption Act 1961 | 4 — none | — | *441-byte stub* | **repealed** (by Act 575, itself replaced by the MACC Act 2009). Pointer only. |
| 16 | Private Higher Educational Institutions Act 1996 | 4 — rare | A | — | only for an education-provider client |
| 17 | **Sedition Act 1948 (Revised 1969)** | **1 — core** | A | s.3 seditious tendency (incl. bringing into hatred/contempt a Ruler or the Government, exciting disaffection, promoting ill-will between classes) · s.4 offences · s.6 evidence · s.9 suspension of a newspaper · s.10 court power to prohibit circulation | A **Sedition (Amendment) Act 2015** is understood to have raised penalties, reduced sentencing flexibility, addressed electronic/online publication expressly, and added court powers over online material and bail (verify the current text and each of these points). The corpus is the pre-2015 version. Never cite a Sedition Act penalty or the offence scope from the corpus. |
| 18 | Universities and University Colleges Act 1971 | 4 — rare | A | s.15 student expression / political activity | only for a student or campus-media client |

## How to use this

- **Tier 1 + Tier 2** are the working set for almost every media matter. Read the
  relevant file(s) in full for the provision in question, not just the grep hit.
- For any **Grade D** file, or any provision in the "changed since" column, a web
  check of `lom.agc.gov.my` (and `mcmc.gov.my` for CMA subsidiary instruments) is
  mandatory before the citation leaves a deliverable.
- If the matter needs a law in **`corpus-gaps.md`**, the corpus cannot answer it —
  say so at the top of the deliverable and route it to counsel.
