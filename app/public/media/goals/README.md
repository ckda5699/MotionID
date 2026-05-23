# Goal Clips — Not in Git

These are the Motion ID skeleton goal clip videos (MP4). They are gitignored because they are large (~10–14 MB each).

## Expected files

| Filename | Player | Match |
|---|---|---|
| Bayern_Hamburg_goal_01.mp4 | Serge Gnabry | Bayern vs Hamburg |
| Bayern_Hamburg_goal_02.mp4 | Aleksandar Pavlovic | Bayern vs Hamburg |
| Frankfurt_Bayern_goal_01.mp4 | Luis Diaz | Frankfurt vs Bayern |
| Frankfurt_Bayern_goal_03.mp4 | Luis Diaz | Frankfurt vs Bayern |
| Union_Bayern_goal_04.mp4 | Harry Kane | Union vs Bayern |

## How to get them

**Option 1 — Render locally:**
Run pipeline/render/render_no_repair_goal_videos.py with local parquet match data.
Rendered clips go to outputs/no_repair_goal_videos/. Copy the selected ones here.

**Option 2 — S3/CloudFront:**
Set VITE_MEDIA_BASE_URL=https://<your-cf-url>/media in pp/.env.
Files are served from S3 directly; this folder can stay empty.
