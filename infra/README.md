# Motion ID — AWS Infrastructure

This folder is a placeholder for future AWS infrastructure-as-code.

## Planned Components

| Service | Purpose |
|---|---|
| **S3 (raw bucket)** | Original XML / parquet / metadata from the Bundesliga dataset |
| **S3 (processed bucket)** | App-ready MP4 clips, thumbnails, JSON manifests |
| **AWS Glue / Batch / Fargate** | Offline skeleton parsing and video rendering jobs |
| **Step Functions** | Orchestrates: ingest → candidate selection → render → QA → publish |
| **CloudFront** | CDN in front of processed S3 bucket (media + data delivery) |
| **Lambda** | Lightweight transforms, manifest generation, signed URL generation |
| **DynamoDB** | Users, sessions, answers, scores, leaderboard entries |
| **Cognito** | Auth (if/when user accounts are added) |
| **API Gateway + Lambda / AppSync** | Runtime APIs for challenges, sessions, leaderboard |
| **Amplify Hosting** | Frontend PWA hosting and staging/preview branches |
| **CloudWatch** | Logs, metrics, alarms |
| **AWS Budgets** | Cost guardrails (current alert: $5 → alert@yourdomain.com) |


## Current State

Currently, the app is deployed as a static zip to AWS Amplify Hosting:

```
Developer machine
  → npm run build (staging env vars)
  → Python zipfile → curl upload
  → AWS Amplify Hosting (staging branch)
  → https://staging.d2atp4d3qd2js3.amplifyapp.com
```

No backend is currently required.

## Future Data Pipeline Flow

```
Raw match package (XML + parquet)
  → S3 raw bucket
  → Glue/Batch: parse metadata, events, KPI, positions, skeleton
  → Candidate selection (goal moments)
  → Stage window generation
  → Skeleton video rendering (MP4)
  → Poster frame / thumbnail generation
  → Player/team/stat metadata attachment
  → Quiz manifest JSON
  → Human review / approval
  → Publish to S3 processed bucket
  → CloudFront delivery
  → App fetches published challenge manifest
```

**Rule:** Never load raw parquet/XML in the browser. The runtime app only fetches precomputed JSON and MP4/image assets.

## Tooling

IaC tooling TBD — candidates: AWS CDK (TypeScript) or CloudFormation YAML.
