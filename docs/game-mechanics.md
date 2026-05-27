# 📊 Bundesliga Motion ID - Game Mechanics & Scoring Specification

This document details the visual stage progression, mathematical scoring formulas, and future product vision for **Bundesliga Motion ID**. The game mechanics balances skill-based player recognition with casual fan accessibility.

---

## 1. Core Gameplay Concepts

### Matchday Quiz Model (Seasonal Rhythm)
- **Weekly Matchday Loop**: Motion ID operates as a recurring challenge synced with the official Bundesliga calendar. A new **Matchday Challenge** opens 30 minutes before the weekend's first kick-off and closes after the final whistle.
- **Dynamic Content Generation**: Every week, the DFL tracking data pipeline automatically extracts key moments (goals, key dribbles, saves) from live matches, converting them into anonymous 3D skeleton sequences.

### Future Roadmap: Beyond Munich & Beyond Goals
- **All 18 Bundesliga Clubs**: While the initial prototype highlights Bayern Munich goals for showcase stability, the production engine handles tracking datasets from all 18 clubs.
- **Diverse Play Actions**: Future matchday packs will extend beyond goals to challenge fans on:
  - **Key Dribbles & Skills**: Identifying elite dribblers from body roll and stride pattern.
  - **Defensive Tackles & Blocks**: Reading block timings and body orientations.
  - **Goalkeeper Saves**: Spotting keepers based on diving extension, recovery times, and positioning.
  - **Tactical Team Plays**: Guessing clubs based on passing shapes and defensive line movements.

---

## 2. Quiz Session Structure

- **4 Games Per Session**: A single quiz session consists of exactly 4 sequential player guessing rounds.
- **Timed Rounds**: Each player round lasts up to 60 seconds (across 5 stages).
- **Decision Commitment**: 
  - Fans can type and submit answers using the autocomplete bar.
  - The first locked answer is final. Once locked, the stage countdown continues, and fans must wait for the timed reveal.
  - Skipping to reveal once locked is supported via desktop shortcut (`Shift + Enter`).

---

## 3. The 5-Stage Information Reveal

Each player challenge is split into 5 progressive stages. Information increases monotonically to reward early recognition while keeping the game solvable for casual fans.

| Stage | Type | Window (Seconds) | Visuals & Clues Revealed | Max Points | Min Points (Floor) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Stage 1** | Motion | 5s - 11s | **Main Action**: The final 5 seconds before the event. Only the anonymized player skeleton, ball trajectory, and immediate goalpost outlines are shown. | 100 | 80 |
| **Stage 2** | Motion | 0s - 11s | **Buildup + Action**: Adds the run-up, cross, or carry leading up to the main action. | 80 | 60 |
| **Stage 3** | Motion | 0s - 15s | **Full Clip**: Adds the immediate aftermath, landing posture, and characteristic celebration shapes. | 60 | 40 |
| **Stage 4** | Info | 0s - 15s | **First Identity Cues (Soft Clues)**: Overlays physical metrics: Playing position, Height, Max Speed, Matches Played, and Shots on Target. | 40 | 20 |
| **Stage 5** | Info | 0s - 15s | **Stronger Identity Cues (Hard Clues)**: Overlays explicit details: Nationality, Club name, Jersey number, season Goals & Assists, and Age. | 20 | 0 |

---

## 4. Mathematical Scoring Model

The score is calculated dynamically using a **Time-Decay** function within each stage. Early answers are rewarded heavily.

### Formula
For a correct answer in stage $S$:
$$\text{Score} = \max\left(\text{GuaranteedFloor}_S, \; \text{RawScore}\right)$$

Where:
$$\text{RawScore} = \text{Round}\left(100 \times \text{Weight}_S \times \text{TimeFactor}\right)$$
$$\text{TimeFactor} = 1 - \frac{\text{ElapsedSeconds}}{\text{StageDuration}}$$

### Stage Scoring Parameters
The active parameters configured in [appData.js](file:///d:/OneDrive/AWS_Sports_Hackathon/motion-id/app/src/data/appData.js) and calculated in [scoring.js](file:///d:/OneDrive/AWS_Sports_Hackathon/motion-id/app/src/lib/scoring.js) are:

| Stage ($S$) | Weight ($\text{Weight}_S$) | Stage Duration ($\text{StageDuration}$) | Max Points | Floor ($\text{GuaranteedFloor}_S$) |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 1** | `1.0` | 11 seconds (6s clip + 5s grace) | 100 | **80** |
| **Stage 2** | `0.8` | 16 seconds (11s clip + 5s grace) | 80 | **60** |
| **Stage 3** | `0.6` | 20 seconds (15s clip + 5s grace) | 60 | **40** |
| **Stage 4** | `0.4` | 8 seconds (3s cue + 5s grace) | 40 | **20** |
| **Stage 5** | `0.2` | 8 seconds (3s cue + 5s grace) | 20 | **0** |

*Note: Stage Duration includes the segment playback time plus the 5-second answer grace window.*

---

## 5. Team Bonus (Accessibility Layer)

To engage casual fans and reward partial football knowledge, Motion ID features a **Team Bonus**:
- **Rule**: If a user submits a guess during Stages 1–4 that is incorrect, but the guessed player plays for the **same Bundesliga club** as the target player, the user is awarded **+5 points**.
- **Constraints**:
  - No bonus is awarded in Stage 5, as the club name is explicitly revealed.
  - The user does not make a separate team guess; the system infers the team from their player selection.
  - The team names are normalized and matched automatically using custom rules (e.g. matching "Bayern" with "FC Bayern München").

---

## 6. Player Experience & User Archetypes

Motion ID's progressive reveal design accommodates a wide spectrum of fan expertise:

| User Type | Targeted Gameplay Stage | Behavior & Mechanics |
| :--- | :--- | :--- |
| **Expert Fan** | **Stages 1–2** (Motion-only) | Relies entirely on biological motion cues (e.g. Harry Kane's backswing posture or Serge Gnabry's curved acceleration path). Takes high-risk, high-reward guesses for maximum points. |
| **Intermediate Fan** | **Stages 3–4** (Motion + Soft Clues) | Uses the full clip with landing posture and celebration clues, augmented by position and seasonal statistics to narrow down the target player. |
| **Casual Fan** | **Stage 5** (Hard Clues) | Solves the quiz by combining the visual motion sequence with nationality, jersey number, and club information. Decays to minimum floor points but avoids zero-point frustration. |

---

## 7. Key Design Principles

- **Motion is the Primary Signal**: The anonymized 3D skeleton remains the focal point. Information layers are secondary aids to guide the fan's focus, never completely replacing the visual puzzle.
- **Monotonic Clue Progression**: Clues reveal progressively weaker filters first, leading up to stronger specific indicators. Explicit attributes are never combined in a single stage to prevent trivial guessing (e.g., combining team + position in Stage 4 is avoided).
- **Early Commitment Reward**: Submitting early yields exponential point benefits. First lock is final, adding decision pressure.
- **Anti-Exploitation Autocomplete**: Player search utilizes autocomplete list filtering against the entire Bundesliga player database, preventing trivial guessing from small multiple-choice arrays.

---

## 8. Feedback & Post-Round Interaction

### Immediate Stage Reveal
- After the guessing stage concludes, the **correct player identity is revealed**, alongside a **synced real-world broadcast clip** (if available) showing the actual match event.
- Plain-language **biomechanical explanations** describe the specific movement signature of the player (e.g., "opened body toward goal before release" or "high-elastic backswing").

### Post-Quiz Overview
- At the end of the 4-game session, users receive a detailed results card summarizing:
  - Total score and time remaining.
  - Interactive replay cards for all 4 games.
  - Access to advanced player profile pages containing detailed seasonal statistics, club ranking tables, and interactive movement Q&A options.

