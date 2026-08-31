---
name: Anti-DMA SKILL
description: |
  Deploy this skill whenever a user presents a debate scenario, argument exchange, dialogue transcript, or conversational conflict and wants to: (1) identify B-Type rhetorical patterns -- ad hominem, tu quoque, anti-intellectual framing, identity polarization, outcome epistemology, or affect-driven persuasion moves, (2) construct a counter-argument that holds under epistemic pressure, (3) analyze a speaker or public figure's discourse for manipulation tactics, or (4) build epistemic self-defense capacity. Trigger when user asks "what's wrong with this argument", "how do I counter this", "what fallacy is this", "B-type people", or pastes any dialogue where one party attacks the person instead of the claim. Also trigger for discourse analysis of political speech, social media rhetoric, or populist anti-elitist framing.
Creator: Adam Rosman
---

# Anti-DMA Rhetorical Integrity Skill (DISSER)

## Purpose

A skill for detecting, naming, and neutralizing manipulative argumentation -- specifically the class of rhetorical moves that displace argument evaluation from **propositional content** to **attributes of the speaker or targeted group**.

Designed for Forage DeepMind's Applied Intelligence curriculum: teaching epistemic self-defense as a transferable cognitive asset.

---

## Operational Definition: B-Type Argumentation Pattern

**B-Type** refers to a recurrent rhetorical pattern characterized by displacement of argument evaluation from propositional content to attributes of the speaker or targeted group. The B-Type signature: **they never touch the original claim**. They attack the messenger, the messenger's history, or the messenger's right to speak.

This pattern aligns with recognized discourse phenomena in political communication literature -- particularly **populist anti-elitist framing** and **affect-driven persuasion models**.

---

## Full B-Type Taxonomy

### Tier 1 -- Direct Attack Moves
Moves that target the speaker rather than the substance.

| Pattern                     | Definition                                                                        | Surface Signal                                | Underlying Function                             |
| --------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------- |
| **Ad Hominem Substitution** | Critique redirected from claim to personal qualities, competence, or social worth | "Who are you to say that?"                    | Discredit speaker; avoid engaging claim         |
| **Tu Quoque**               | Implies hypocrisy -- you can't critique X if your own outcomes are unimpressive   | "Look at your own life first"                 | False equivalence; deflects from original claim |
| **Status Inversion**        | Converts truth dispute into dominance contest                                     | Achievement comparisons, credential dismissal | Shifts terrain from logic to social hierarchy   |

### Tier 2 -- Epistemic Distortion Moves
Moves that corrupt the rules of evidence and knowledge.

| Pattern                                                   | Definition                                                                                               | Surface Signal                                  | Underlying Function                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Outcome Epistemology**                                  | Knowledge is only valid if it produces visible, economic achievement                                     | "What have you achieved with all that reading?" | Reduces epistemology to utility; dismisses non-monetized expertise                  |
| **Anti-Intellectual Rhetoric**                            | Expertise and formal education framed as low-value or illegitimate without systematic critique           | "Book knowledge doesn't work in the real world" | Delegitimizes the entire knowledge class; closes the argument before it starts      |
| **High-Confidence Assertion Without Evidentiary Support** | Claims delivered with certainty while lacking citation, data, or structured inferential chains           | Confident declaratives with no sourcing         | Manufactures perceived authority without accountability                             |
| **Hasty Generalization**                                  | Broad negative conclusions drawn about entire disciplines or communities without representative evidence | "Academics are all out of touch"                | Eliminates nuance; makes refutation feel like defending an institution, not a claim |

### Tier 3 -- Discourse Manipulation Moves
Moves that control the frame, audience, and emotional temperature.

| Pattern | Definition | Surface Signal | Underlying Function |
|---|---|---|---|
| **Moralization of Disagreement** | Empirical or policy questions reframed as indicators of moral failure | "Only corrupt people would argue that" | Converts analytical dispute into moral judgment |
| **Identity-Based Polarization** | Audience segmented into in-group vs out-group along perceived moral or cultural lines | "People like us vs elites/academics/globalists" | Activates tribal cognition; bypasses individual evaluation |
| **Provocative Framing** | Inflammatory language increases affective arousal; prioritizes attention capture over deliberative reasoning | Insults, hyperbole, contempt markers | Emotional hijack; degrades reasoning quality in audience |
| **Instrumental Devaluation of Non-Utilitarian Fields** | Disciplines evaluated narrowly through immediate economic productivity | "When will philosophy pay your bills?" | Pre-emptively disqualifies entire areas of knowledge |
| **Scope Creep** | Exaggerates the original claim to strawman it | "So you think you know everything?" | Makes claim easier to attack by replacing it with an extreme version |
---

## Cognitive Processing Stack

When analyzing any exchange, apply this sequence:

```
1. PARSE    -- What is the original propositional claim being disputed?
2. DETECT   -- Did the response address the claim, or address the person/group?
3. CLASSIFY -- Which B-Type pattern(s) from the taxonomy apply? Which tier?
4. HOLD     -- Restate the original claim cleanly, unmodified
5. COUNTER  -- Construct a substance-only response that does not engage the trap
6. REDIRECT -- One sentence that returns the conversation to the original claim
7. EXPOSE   -- (Optional) Make the manipulation visible to third-party audience
```

**Critical rule:** Never defend personal achievements, credentials, or identity in response to a B-Type attack. That is the trap. Entering it concedes that those attributes are relevant to the argument's validity -- they are not.

---

## Case Study: A vs B

**Original exchange:**
- A: "He never read a book about geopolitics"
- B: "You've been reading your whole life... what have you achieved?"

**B-Type classification:**

| Move | Tier | What it did |
|---|---|---|
| Ad Hominem Substitution | 1 | Attacked A's outcomes, not A's claim about Person X's knowledge gap |
| Tu Quoque | 1 | Implied A is hypocritical for critiquing reading while A's own reading "hasn't paid off" |
| Outcome Epistemology | 2 | Assumed knowledge only valid if monetized or visibly achieved |
| Status Inversion | 1 | Converted "does Person X understand geopolitics?" into "who are YOU to talk?" |

**Notice what B never did:** address whether Person X has actually read about geopolitics.

**Correct counter:**

> "Whether I've achieved anything is irrelevant to whether he's read about geopolitics. Those are two separate propositions. You've changed the subject. The original question was about his knowledge gap -- do you want to address that, or are we done?"

Why this holds: does not defend personal achievements (refuses the trap), does not counter-attack B (avoids escalation into status game), names the displacement without sounding defensive, closes with a forced choice.

---

## Escalation Protocol

**Level 1 -- Name the pattern:**
> "This is the [nth] time you've responded to the argument by redirecting to my credibility. I'll note that. What is your actual position on [original claim]?"

**Level 2 -- Disengage with record:**
> "I've restated the argument [n] times. You haven't engaged with it. I'm treating this as a non-answer."

**Level 3 -- Reframe for audience (public discourse context):**
> "For anyone following: the original argument was [X]. Every response has been about my personal track record, not about X. Draw your own conclusions."

---

## Output Format

When analyzing a submitted exchange, structure output as:

```
[ORIGINAL CLAIM]: What was actually being argued -- stripped of all framing
[B-TYPE PATTERNS DETECTED]: List each move, tier, and what it functioned to do
[COUNTER]: Clean substance-only response; no personal defense, no counter-attack
[REDIRECT]: One sentence returning to the original claim
[EXPOSE]: (Optional) Third-party-legible statement of what just happened
```

---

## Pedagogical Use (Forage DeepMind)

**Module:** Applied Intelligence -- Epistemic Self-Defense
**Level:** Post-graduate practitioner
**Outcome:** Learner can identify, classify, and neutralize B-Type discourse moves in real-time

**Assessment design:**
Present 5-8 dialogue snippets containing B-Type moves across different tiers. Learner must:
1. Identify which pattern(s) are present and name the tier
2. Write the counter-response that does not engage the trap
3. Explain why their counter avoids conceding the B-Type's implicit premise

---

## Scope Boundaries

This skill covers: discourse analysis, argument reconstruction, B-Type pattern detection, counter-argument construction, escalation response, public rhetoric analysis.

This skill does NOT cover:
- Situations where the original claim itself is factually wrong (that requires Claim Auditor)
- Emotional conflict resolution or de-escalation therapy
- Formal debate scoring (Oxford format, Socratic method)

---

*Forage DeepMind | Faculty of Applied Intelligence | Cyberjaya, Malaysia*
*Creator: Adam Rosman | Filed under: vault root*