# Bundesliga Motion ID - AWS Sports Hackathon

> **Can fans recognize their favorite Bundesliga stars from 3D movement alone?**

**Bundesliga Motion ID** is an interactive, mobile-first PWA quiz game built for the **AWS World Sports Innovation Cup 2026** under the challenge track **"Unlock the Power of 3D Football Data in the Bundesliga"** ([Challenge Track Details](https://builder.aws.com/content/3BR0ILlG1SlZv07fXdwgPF1pxZ0/join-the-aws-world-sports-innovation-cup-transform-sports-with-your-innovation)).

By stripping away player names, jersey numbers, faces, team shirts, and broadcast video, the platform isolates **3D body skeletal mechanics** (sprint posture, body angles, deceleration, scanning rhythm, and shooting shapes) to challenge and gamify the fan experience.

### Project Team
* 👤 **Chandan Das Adhikari** — [LinkedIn](https://www.linkedin.com/in/chandan5699/)
* 👤 **Hadi Sotudeh** — [LinkedIn](https://www.linkedin.com/in/hadisotudeh/)
* 👤 **Steffen Lang** — [LinkedIn](https://www.linkedin.com/in/steffenlang2/)

* **Staging URL**: [https://staging.d2atp4d3qd2js3.amplifyapp.com](https://staging.d2atp4d3qd2js3.amplifyapp.com)
* **Detailed Local Setup**: See the [Local Setup Guide](docs/setup-guide.md)
* **AWS Serverless Pipeline**: See the [Future AWS Production Spec](docs/future-aws-pipeline.md)
* **Bundesliga Data Guide**: See the [Challenge 2 Data Guide](docs/data-guide.md)

---

## 1. Project Concept & Pitch

### The Challenge
DFL / Bundesliga Challenge 2 requests teams to unlock the value of 3D skeletal tracking data (21 keypoints tracked at 50 Hz) beyond ordinary automated event logging.

### The Solution
Instead of keeping 3D tracking data locked inside coaching dashboards, **Motion ID** translates raw skeletal tracking parquets into dynamic, anonymized 3D replay challenges. Fans watch a goal sequence build up across 5 progressive stages:
1. **Stage 1 (Main Action)**: The final 5 seconds before the goal. Only the anonymized shooter skeleton, the ball, and immediate surroundings are shown.
2. **Stage 2 (Buildup)**: Adds the run-up, cross, or carry leading to the shot.
3. **Stage 3 (Aftermath)**: Adds the landing, shot outcome, and celebration signature.
4. **Stage 4 (Soft Clues)**: Introduces soft player stats (e.g. playing position, age band, season stats).
5. **Stage 5 (Hard Clues)**: Adds jersey number, nationality, and club hints.



Scoring rewards early recognition (Stage 1 yields 100 points, Stage 5 yields only 15), encouraging fans to read the biomechanical "signature" of the player.

### Scientific Backing: The Cognitive Science of Biological Motion
Motion ID is grounded in established cognitive psychology. In 1973, psychologist **Gunnar Johansson** introduced **Point-Light Displays (PLD)**, proving that humans possess an extraordinary ability to recognize biological motion from just 10-12 moving joint coordinates. Even without faces, shirts, or colors:
* **Biomechanical Action Recognition**: Observers can identify complex actions (running, jumping, kicking) within less than 200 milliseconds. See [Johansson, G. (1973). "Visual perception of biological motion and a model for its analysis." *Perception & Psychophysics*](https://doi.org/10.3758/BF03212730).
* **Gait-Based Identity**: Observers can recognize familiar individuals based entirely on walking gait, stride frequency, torso angles, and pelvic rotation. See [Cutting, J. E., & Kozlowski, L. T. (1977). "Recognizing friends by their walk: Gait perception without familiarity cues." *Bulletin of the Psychonomic Society*](https://doi.org/10.3758/BF03337021).
* **Fan Muscle Memory**: Passionate football fans watch hundreds of matches, developing a deep, subconscious sensitivity to their favorite players' movement signatures—such as the low-center-of-gravity carry and torso tilt of Serge Gnabry, the lunging, long-strided acceleration of Erling Haaland, or the distinctive high-elastic backswing of Harry Kane. Motion ID gamifies this cognitive phenomenon for the first time.

#### Modern Applications in Sports & Computer Vision
Current research extends these principles to automated athlete tracking and identification using deep neural networks and skeletal joints:
* **Skeletal Action Recognition**: Deep learning architectures are used for multi-person action recognition and individual player profiling in high-tempo sports videos. See [Kozuka, Y., et al. (2021). "Skeletal-Based Action Recognition and Player Identification in Sports Videos." *IEEE Access*](https://doi.org/10.1109/ACCESS.2021.3101122).
* **Biomechanical Profiling**: Individual player movement signatures can be classified using sequential gait modeling. See [Sneath, R., et al. (2023). "Biological Motion in Sports: Biomechanical Profiling and Gait-based Athlete Identification using Neural Networks." *Journal of Sports Sciences*](https://doi.org/10.1080/02640414.2023.2189993).
* **In-The-Wild Gait Recognition**: Analyzing skeletal tracking data to perform identification under challenging real-world occlusion and lighting conditions. See [Wang, Y., et al. (2022). "Gait Recognition in the Wild with Skeleton tracking data: A Deep Learning Survey." *IEEE TPAMI*](https://doi.org/10.1109/TPAMI.2022.3168239).



---

## 2. Current Architecture & Deployment

The prototype is built as a responsive Single Page Application (React + Vite) designed to run as a mobile PWA.

> [!NOTE]
> **Architecture Justification (Cost-Effective Local-First Strategy)**:
> Due to the strict **$50 limit on the AWS hackathon account**, the entire solution was designed with a **local-first data engineering strategy** to avoid cost and performance overhead:
> - **Reducing Processing Costs**: Slicing and rendering 3D video clips from massive DFL tracking parquets is computationally expensive (requiring GPU cycles or high CPU times). Running this rendering pipeline offline on developer machines saved substantial AWS credits.
> - **Lightweight Serverless Hosting**: The pre-rendered MP4 clips, posters, and JSON manifests are served statically via an **AWS Amplify PWA** and **Amazon CloudFront** distribution. This keeps the live AWS staging environment extremely cost-effective (virtually free within free tiers) and highly responsive for the public.
> - **Scale Pathway**: If selected for production scaling, the entire rendering pipeline can be automated in the cloud using the target serverless AWS architecture detailed in Section 4. 

```mermaid
graph LR
    subgraph "Local Environment"
        RawData[Raw Match Data<br>Parquet + XML] -->|scripts/render_*.py| PreVideos[Rendered MP4s<br>& Posters]
    end

    subgraph "Media & Metadata Storage (AWS S3)"
        PreVideos -->|Manual Upload| S3Bucket[S3 processed bucket<br>media/goals/ & media/highlights/]
    end

    subgraph "Static Hosting & CDN (AWS)"
        Amplify[AWS Amplify Hosting] -->|Serves App Shell| Browser[User Device<br>React Vite PWA]
        CloudFront[Amazon CloudFront CDN] -->|Delivers Media & JSON| Browser
        S3Bucket --> CloudFront
    end

    style RawData fill:#f9f,stroke:#333,stroke-width:1px,color:#000
    style S3Bucket fill:#ff9,stroke:#333,stroke-width:1px,color:#000
    style Amplify fill:#dfd,stroke:#333,stroke-width:1px,color:#000
    style CloudFront fill:#dfd,stroke:#333,stroke-width:1px,color:#000
```

* **Frontend**: React 19 + Vite 8, featuring responsive styling, high-contrast sports broadcast aesthetic, and custom SVG animation fallbacks.
* **Hosting**: AWS Amplify Hosting (staging branch).
* **Media & JSON Delivery**: Serves static manifests and MP4 videos either locally or via a high-performance **Amazon CloudFront** distribution pointing to Amazon S3.

---

## 3. Technical Features of the Video Generation Pipeline

To convert raw 3D tracking parquets into lightweight, mobile-friendly MP4s, the Motion ID engine implements several key post-processing steps:

* **Dynamic Camera Tracking**: Smoothly transitions between a ball-following build-up phase and a front-facing celebration camera using player joint vectors (such as nose and neck vectors) to capture unique player postures.
* **Physics-Informed Ball Repair**: Detects sensor occlusions and anchors ball coordinates to the carrier's foot joints during dribbles, or overlays standard physics-based flight paths for set-pieces.
* **Official Filtering**: Identifies and desaturates referees and officials in low-contrast palettes to ensure visual focus remains on the competing athlete skeletons.
* **Explainable Biomechanical Insights**: Joins skeleton coordinates with match events to generate plain-language explanations of a player's distinct movement signatures (e.g., torso tilt or leg extension).

---

## 4. Future Production AWS Pipeline

For production scale, rendering is moved fully to a serverless AWS ingestion pipeline. Parquet files are never loaded in the browser; instead, they are converted asynchronously to lightweight MP4 and JSON quiz assets.

```mermaid
graph TB
    subgraph "Ingestion & Rendering Pipeline (Offline)"
        DFLRaw[Raw DFL Match Package<br>Parquet + XML] -->|Upload| S3Raw[S3 Raw Bucket]
        S3Raw -->|S3 Event| EventBridge[Amazon EventBridge]
        EventBridge -->|Trigger| StepFunc[AWS Step Functions]
        StepFunc -->|Job 1: Slice parquets| BatchFargate[AWS Batch Fargate<br>Event & Frame Slicer]
        StepFunc -->|Job 2: Render MP4s| BatchGPU[AWS Batch GPU / FFmpeg<br>3D Skeleton Video Renderer]
        StepFunc -->|Job 3: JSON manifests| Lambda[AWS Lambda<br>Manifest Builder]
        BatchGPU -->|Upload clips| S3Processed[S3 Processed Bucket]
        Lambda -->|Upload manifest| S3Processed
    end

    subgraph "Runtime Game Engine (Online)"
        S3Processed --> CloudFront[Amazon CloudFront CDN]
        CloudFront -->|Fetch Static & Media| Client[React Client PWA]
        Client -->|Requests| APIGW[Amazon API Gateway]
        APIGW -->|Route| LambdaAPI[AWS Lambda APIs]
        LambdaAPI <--> DynamoDB[(Amazon DynamoDB<br>Scores & Standings)]
        Cognito[Amazon Cognito Auth] <--> Client
        APIGW -->|Authorize| Cognito
    end

    style DFLRaw fill:#f9f,stroke:#333,stroke-width:1px,color:#000
    style S3Raw fill:#ff9,stroke:#333,stroke-width:1px,color:#000
    style S3Processed fill:#ff9,stroke:#333,stroke-width:1px,color:#000
    style CloudFront fill:#dfd,stroke:#333,stroke-width:1px,color:#000
    style DynamoDB fill:#ddf,stroke:#333,stroke-width:1px,color:#000
```

See the [Future AWS Production Spec](docs/future-aws-pipeline.md) for detailed configuration, Single-Table DynamoDB schema designs, and AWS Step Functions definitions.

---

## 5. Repository Structure

```
motion-id/
├── app/                    ← Vite/React PWA (the game client)
│   ├── src/                ← Game logic, scoring, manifests, views
│   ├── public/             ← Static data assets, logos, and news thumbnails
│   └── source-data/        ← Match profiles, rosters, fixtures CSVs
│
├── docs/                   ← Cleaned documentation for the jury
│   ├── setup-guide.md      ← Detailed setup and local development guide
│   ├── future-aws-pipeline.md ← Future AWS production spec and schema
│   └── data-guide.md       ← Guide to the DFL 3D tracking dataset
│
├── pipeline/               ← Deployment configurations
│   ├── deploy/             ← AWS Amplify staging deployment script
│   └── requirements.txt    ← Python virtual environment requirements
│
├── infra/                  ← Infrastructure specifications (future AWS spec outlines)
│   └── README.md
│
├── scripts/                ← Standalone rendering & packaging engine
│   ├── build_goal_data.py  ← Slices raw match Parquets into compact JSON/parquet goals
│   ├── render_no_repair_video.py  ← Renders 3D skeleton videos (raw ball)
│   └── render_repair_video.py     ← Renders 3D skeleton videos (repaired ball)
│
├── setup.ps1               ← One-shot PowerShell installer (Windows)
│   └── .env.example        ← Root environment template
└── .gitignore
```

---

## 6. Environment Separation & Data Configurations

The repository operates on a clear dual-environment structure to keep the user-facing runtime app lightweight and performant:

### Dual Environment Separation
1. **Frontend Web App (Node.js)**: The quiz application inside [app/](app/) is a pure React PWA. Its dependencies (`react`, `vite`, `vite-plugin-pwa`) are managed entirely by npm through [app/package.json](app/package.json) and run directly in the browser. It does not require Python or raw tracking parquets to run.
2. **Offline Data Pipeline (Python)**: The video rendering and data slicing engine inside [scripts/](scripts/) parses raw 3D tracking parquets and generates the final MP4 skeleton videos. It runs offline in a Python 3.12+ virtual environment (`.venv` created by `setup.ps1` using [pipeline/requirements.txt](pipeline/requirements.txt)) and is not shipped to client browsers.

### Match Data Configurations (Local vs S3)
To run the offline video rendering scripts (`scripts/render_no_repair_video.py` or `render_repair_video.py`), the raw 50 Hz skeleton tracking parquets and match XML feeds (which are over 20 GB and gitignored) must be configured:
* **Local Processing (Default)**: Place your raw DFL match data folder under a local path (e.g. `challenge-2/Match_Data/`) and specify its path using the `--data-root` CLI argument or by setting the `MOTION_ID_DATA_ROOT` environment variable in your `.env`.
* **Automated Cloud Processing (AWS)**: In a production environment, the raw match data package is uploaded directly to Amazon S3 (`s3://motion-id-raw/`). The rendering scripts run within containerized AWS Batch tasks that pull raw tracking files, render the MP4s, upload them to `s3://motion-id-processed/`, and update the JSON manifests dynamically.

---

## 7. Quick Local Start (Windows)

Get the app running locally on your Windows developer machine in two steps.

> [!NOTE]
> **Windows Only Quick Start**: The steps below utilize the one-shot PowerShell installer. If you are on **macOS** or **Linux**, please follow the step-by-step terminal instructions in the [Setup & Local Development Guide](docs/setup-guide.md#2-repository-setup).

### Step 1: Install Dependencies (Windows PowerShell)
Open PowerShell in the repository root and run the one-shot installer:
```powershell
.\setup.ps1
```
*Note: This script automatically configures your Node app. If Python is missing, it skips the pipeline virtual environment setup gracefully, allowing you to run the web app immediately.*

### Step 2: Launch Dev Server
```powershell
cd app
npm run dev
# Open http://127.0.0.1:5177 in your browser
```

### 💡 Quick Troubleshooting Tips
* **PowerShell Execution Policy Error**: If script execution is disabled on your system, run `Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process` before launching `.\setup.ps1`.
* **Port Conflict**: If port `5177` is occupied, Vite will automatically boot on another port (e.g., `5178`). Check the terminal output for the active local URL.
* **Stale UI / Cache Issues**: Since the app is an offline-capable PWA, it aggressively caches assets. Perform a hard refresh (`Ctrl + F5` or `Cmd + Shift + R`) to pull new changes.

For detailed instructions on rendering videos locally from tracking parquets, configuring media buckets, or deploying builds to AWS, check the [Setup & Local Development Guide](docs/setup-guide.md).

