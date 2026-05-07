# 📊 3D Skeleton Quiz – Stage Design & Scoring System Specification

## 1. Overview

This document summarizes the current design decisions for the **3D skeleton-based football quiz**.  
It serves as a foundation for further product, UX, and technical discussions.

The system is based on:
- **progressive information reveal**
- **motion-first player identification**
- **stage-based scoring with risk–reward mechanics**

---

# 2. Quiz Structure

## 2.1 General Flow

- Each quiz consists of **multiple players (e.g., 3–4)**
- Each player = one **60-second round**
- After all players:
  - results are shown
  - users can review content

---

## 2.2 Per-Player Timeline

| Phase | Duration |
|------|----------|
| Quiz (Stages 1–5) | 60 seconds |
| Reveal + Feedback | ~30 seconds |
| Total per player | ~90 seconds |

Example:
- 4 players → ~6 minutes total session

---

# 3. Stage System

## 3.1 Stage Overview

Each player consists of **5 stages**:

| Stage | Type | Description |
|------|------|-------------|
| 1 | Motion | Clip 1 |
| 2 | Motion | Clip 1 + Clip 2 |
| 3 | Motion | Clip 1 + Clip 2 + Clip 3 |
| 4 | Info | Full clip + additional information |
| 5 | Info | Full clip + strong identifying information |

---

## 3.2 Timing Model (Cumulative Playback)

Each stage replays **all previous clips**:

| Stage | Content | Stage Duration | Total Time |
|------|--------|---------------|------------|
| 1 | Clip 1 | 5s | 5s |
| 2 | Clip 1 + 2 | 10s | 15s |
| 3 | Clip 1 + 2 + 3 | 15s | 30s |
| 4 | Full clip + Info 1 | 15s | 45s |
| 5 | Full clip + Info 2 | 15s | 60s |

---

## 3.3 Event-Based Motion Logic

Different events define how Clips 1–3 are constructed:

### Example: Goal
- Stage 1: shot → goal
- Stage 2: build-up
- Stage 3: celebration

### Example: Dribbling
- Stage 1: dribble action
- Stage 2: spatial context (position + players)
- Stage 3: outcome

### Example: Goalkeeper
- Stage 1: save + ball trajectory
- Stage 2: add shooter + context
- Stage 3: full scene

### Example: Pattern-Based (ML)
- Stage 1–3: repeated instances of characteristic motion

---

# 4. Information Design (Stages 4–5)

## 4.1 Core Principle

Each stage adds **one dimension of information only**.

Avoid combining multiple strong identifiers in one stage.

---

## 4.2 Recommended Structure

### Stage 4 (Soft Filter)
- weak attributes:
  - physical profile (e.g., speed category)
  - general role (attacking / defensive)

### Stage 5 (Strong Filter)
- ONE strong attribute:
  - team (preferred)
  - OR position

---

## 4.3 Critical Constraint

Do NOT combine:
- team + position  
- team + strong stat  

→ prevents trivial guessing

---

# 5. Answer System

## 5.1 Input Method

- text input with **autocomplete**
- suggestions based on all available players
- selection via click/tap

---

## 5.2 Answer Rules

- user can answer at any time
- **first submitted answer is final (locked)**
- no changes allowed
- no multiple guesses

---

## 5.3 Design Rationale

- enforces decision pressure  
- prevents brute-force guessing  
- preserves skill-based gameplay  

---

# 6. Scoring System

## 6.1 Core Principle

Score depends on:
- **stage (information level)**
- **time within stage**

---

## 6.2 Stage Weights (Example)

| Stage | Weight |
|------|--------|
| 1 | 1.0 |
| 2 | 0.8 |
| 3 | 0.6 |
| 4 | 0.35 |
| 5 | 0.15 |

---

## 6.3 Time Factor

Within each stage:
TimeFactor = 1 - (time_in_stage / stage_duration)

- early answer → higher score  
- late answer → lower score  

---

## 6.4 Final Score Formula
PlayerScore = 100 × StageWeight × TimeFactor

---

## 6.5 Stage 1 Exception

- no decay applied  
- correct answer → always **100 points**

---

## 6.6 Progressive Minimum Score (Floor)

If player is correct, minimum guaranteed score per stage:

| Stage | Minimum Score |
|------|---------------|
| 1 | 100 |
| 2 | ~50 |
| 3 | ~30 |
| 4 | ~20 |
| 5 | ~10 |

Purpose:
- reduce frustration  
- reward correctness even if late  

---

# 7. Team Bonus (Accessibility Layer)

## 7.1 Motivation

- engage casual users  
- reward partial football knowledge  
- avoid zero-point frustration  

---

## 7.2 Rule
TeamBonus = +5 points

Only if:
- answer submitted in Stage 1–4
- AND selected player belongs to correct team
- AND player guess is wrong

---

## 7.3 Important Constraints

- no bonus after Stage 5 (team already revealed)
- no separate team input
- team inferred from chosen player

---

## 7.4 Final Score
TotalScore = PlayerScore + TeamBonus

---

# 8. Player Experience

## 8.1 Decision Dynamics

- early answer → high risk, high reward  
- late answer → low risk, low reward  
- wrong answer → 0 (except optional team bonus)  

---

## 8.2 User Types

| User Type | Behavior |
|----------|----------|
| Expert | answers early (Stages 1–2) |
| Intermediate | answers mid (Stages 3–4) |
| Casual | answers late (Stage 5) |

---

# 9. Feedback Layer

## 9.1 After Each Player

- reveal:
  - correct player
  - real match video (broadcast clip)
- show feedback text:
  - “Correct – early identification”
  - “Close – correct team”
  - “Late but correct”

---

## 9.2 After Full Quiz

### Overview Screen

- 4 player cards (one per round)
- each includes:
  - skeleton replay
  - real video replay
  - additional info

---

## 9.3 Deep Interaction

- user can open a player card
- access:
  - extended data
  - explanation of movement
  - chat-based Q&A interface

---

# 10. Key Design Principles

- motion is primary signal  
- information increases monotonically  
- early commitment is rewarded  
- late participation remains viable  
- system resists guessing exploitation  

---

# 11. Open Points (Next Steps)

- exact parameter tuning (weights, decay)
- data pipeline for clip extraction
- ML model for characteristic motion
- UI prototyping (timeline + locking)
- evaluation of difficulty per event type

---

# 12. Summary

This system creates a balance between:

- **skill-based recognition (experts)**
- **accessible participation (casual fans)**
- **structured progression (stages)**
- **competitive scoring (leaderboard)**

It is designed to be:
- fair  
- engaging  
- scalable  
- and data-driven