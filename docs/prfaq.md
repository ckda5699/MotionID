# MOTION ID
## Player Identification via Movement Patterns — PRFAQ Document

**Team:** 21Joints — Chandan Das Adhikari, Hadi Sotudeh, Steffen Lang  
**Competition:** AWS World Sports Innovation Cup 2026  
**Challenge:** Challenge 2: Unlock the Power of 3D Football Data  
**Date:** May 2026  
**Status:** Multi-environment live deployment on AWS Amplify (Production & Staging)

---

## 📢 Press Release

### **Bundesliga Fans Can Now Identify Star Players Purely from How They Move — New Motion ID App Launches Weekly Skeleton Quiz**

**Munich / Zurich, May 2026** — The DFL (Deutsche Fußball Liga), in collaboration with Amazon Web Services (AWS), today announced the official launch of **Motion ID**, a first-of-its-kind interactive quiz that challenges global football fans to identify Bundesliga players using nothing but anonymized 3D skeletal movement data. No names, no faces, no jersey numbers — just the pure biomechanical signature of athletes in motion.

Developed by startup team **21Joints** for the AWS World Sports Innovation Cup 2026, Motion ID converts raw 3D tracking coordinates from the Bundesliga’s Electronic Performance and Tracking System (EPTS) multi-camera rigs into compelling, fully anonymized replay clips. Fans watch a play unfold across five progressive stages — each layer adding richer context — and race to lock in their answers before the timer runs out. 

> "We asked a simple but provocative question: Can fans recognize their favorite stars purely from the way they run or plant their feet before a shot? Cognitive science says yes, and our prototype proves it. We turned that science into a high-habit fan engagement product."
> — *Steffen Lang, Co-founder of 21Joints*

#### **Core Product Features**
*   **The Weekly Matchday Cycle**: Synced with the live Bundesliga schedule, a new challenge pack drops 30 minutes before kick-off, challenging fans to identify the signature moments that happened on the pitch just days before.
*   **Widescreen Review Mode**: Fans can click on any player on the results page to enter an interactive review mode, allowing them to study skeletal movements at their own pace without timers.
*   **Scalable Multi-Environment Deployment**: Built on a fully serverless AWS architecture, the frontend is deployed to staging and production environments using AWS Amplify, optimized with PWA service worker caching (`skipWaiting` and `clientsClaim`) to guarantee instant client-side updates.

Motion ID is live today and can be accessed at **[prod.d2atp4d3qd2js3.amplifyapp.com](https://prod.d2atp4d3qd2js3.amplifyapp.com)**.

---

## 🙋 Frequently Asked Questions — External (Fan-Facing)

#### **Q: What is Motion ID?**
Motion ID is a weekly gamified feature inside the Bundesliga digital ecosystem. Each week, fans are presented with anonymized 3D skeletal clips from real match events. The goal is to identify the player behind the movement signature. The faster you guess, the higher your score.

#### **Q: How does the progressive reveal work?**
The challenge is divided into five stages:
1.  **Stage 1 (Main Action)**: The final 5 seconds of the skeletal action and ball trajectory. (Max 100 points, Floor 80).
2.  **Stage 2 (Run-up)**: The approach and build-up phase leading to the action.
3.  **Stage 3 (Celebration)**: The landing and signature celebration movement.
4.  **Stage 4 (Biometric Stats)**: General player attributes (position, age band, season statistics).
5.  **Stage 5 (Identity Hints)**: Jersey number, nationality, and club badge.

#### **Q: What is a 3D skeleton and where does it come from?**
Every Bundesliga stadium is equipped with multi-camera tracking systems recording 21 skeletal joint coordinates per player at 25Hz. Motion ID normalizes this raw tracking data and strips away all visual branding, textures, and video frames, isolating pure kinetic motion.

#### **Q: Can fans really identify players from motion alone?**
Yes. Cognitive science research on **Point-Light Displays (PLDs)** demonstrates that humans can recognize complex biological motion from as few as 10–12 coordinates. Professional players develop unique biomechanical profiles — such as Harry Kane's torso tilt or Serge Gnabry's stride asymmetry — that become instantly recognizable to passionate fans.

#### **Q: How is scoring calculated?**
Points decay dynamically over time. Locking in a correct answer during Stage 1 yields maximum points (100). If you wait until later stages, the point ceiling decays. Correct streaks are rewarded with multipliers.

---

## 💻 Frequently Asked Questions — Internal (Product & Engineering)

#### **Q: Why build this instead of traditional video highlights?**
Traditional video highlights are subject to restrictive international broadcast rights and require high production costs. Motion ID has a massive competitive advantage: **skeletal data is rights-lightweight**, requires no video licensing, is fully automated via data pipeline, and cannot be searched or "Googled" by fans.

#### **Q: How does the end-to-end AWS pipeline operate?**
1.  **Ingestion**: Raw DFL match XML packages and player tracking parquets land in an **Amazon S3 Raw Bucket**.
2.  **ETL & Parsing**: **AWS Glue** and **AWS Lambda** parse events to locate candidate goals and shots.
3.  **3D Normalization**: **AWS Fargate** processes joint coordinates, normalizes heights, and translates coordinate systems relative to the ball.
4.  **Skeletal Generation**: The normalized coordinates are written to JSON manifests and rendered into lightweight MP4/GIF assets.
5.  **Distribution**: Assets are stored in an **Amazon S3 Processed Bucket** and distributed globally via **Amazon CloudFront** CDN.

```
[Raw XML/Parquet] ➔ [S3 Raw] ➔ [Glue & Lambda ETL] ➔ [Fargate 3D Engine] ➔ [S3 Processed] ➔ [CloudFront] ➔ [PWA Client]
```

#### **Q: How are dev/QA tools handled in the production app?**
In the live environment, all development QA switchers and testing toolbars are strictly compiled out behind a gated constant (`SHOW_DEV_TOOLS = false`) in [App.jsx](file:///d:/OneDrive/AWS_Sports_Hackathon/motion-id/app/src/App.jsx). This prevents end-users from bypassing the game loops or accessing administrative QA screens.

#### **Q: What was fixed in the latest release cycle?**
*   **Interactive Review**: The results screen rows are now fully clickable, allowing players to revisit the Reveal Screen in a special timer-free review mode to study player motion.
*   **Dynamic Leaderboard Splitter**: The leaderboard rank jump separator (`⋮`) now dynamically calculates and displays only when there is an actual gap between adjacent ranks.
*   **Biomechanical Calibration**: All-time scores and stats have been mathematically calibrated (e.g., correcting top scores and adjusting user ranks to reflect a realistic distribution).
*   **Display Logic**: Cleaned up team prefixes (e.g., stripping "1." from "FC Union Berlin").

#### **Q: How does this benefit the DFL long-term?**
Motion ID converts passive tracking data into direct consumer entertainment. Furthermore, by tracking fan accuracy, the DFL gains a novel dataset: **quantified biomechanical distinctiveness**. This can serve as a scouting signal, measuring player motor uniqueness and footprint recognition.

---

## 📊 Opportunity Summary

| Dimension | Detail |
| :--- | :--- |
| **Customer** | Global Bundesliga fans (500M+ mobile-first audience) |
| **Problem** | Low fan engagement on non-matchdays; traditional highlights restricted by media rights |
| **Solution** | Gamified 3D skeleton trivia utilizing existing EPTS camera infrastructure |
| **Differentiator** | First product to transform raw kinetic data into a consumer game |
| **Revenue Levers** | Sponsored challenge rounds, premium ad-free tiers, gaming engine licensing (EA Sports FC integration) |
| **TRL Status** | Production-ready (TRL 7) — live multi-environment AWS Amplify hosting with active edge caching |
| **Next Roadmap** | Automated candidate selection based on Distinctiveness, Repeatability, and Kinetic Energy scores |
