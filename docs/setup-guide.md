# Motion ID — Setup & Local Development Guide

This document describes how to set up the **Motion ID** repository for local development, run the Vite React app, render skeleton videos from raw match data, and deploy the frontend PWA to AWS Amplify.

> [!NOTE]
> **Ecosystem Separation**: If you only want to host and run the web application on your localhost, you **do not need Python or any pipeline requirements**. You only need Node.js/npm. The setup script will handle this automatically (skipping Python configuration gracefully if it is not installed).



## 1. System Prerequisites

Before starting, ensure the following tools are installed on your machine:

| Tool | Required Version | Purpose |
|---|---|---|
| **Node.js** | `v20.x` or higher | Runs the React/Vite development server |
| **npm** | `v10.x` or higher | Installs JavaScript packages |
| **Python** | `v3.12` or higher | Runs the video rendering and processing engine |
| **PowerShell** | `v7.x` or higher | (Windows only) Runs the staging deployment and setup automation |
| **AWS CLI** | `v2.x` | Required for deploying builds to AWS Amplify |
| **FFmpeg** | `v6.x` or higher | Required by python libraries to write MP4 videos |

### Installing Prerequisites by OS:

* **Windows**:
  ```powershell
  # Node.js & Python
  winget install OpenJS.NodeJS
  winget install Python.Python.3.12
  # FFmpeg
  choco install ffmpeg-full   # Or scoop install ffmpeg
  ```
* **macOS (Homebrew)**:
  ```bash
  brew install node python@3.12 ffmpeg awscli
  ```
* **Linux (Ubuntu/Debian)**:
  ```bash
  sudo apt update
  sudo apt install -y nodejs npm python3 python3-venv ffmpeg
  ```

> [!IMPORTANT]
> Make sure `ffmpeg` is installed and added to your system's `PATH` environment variable. You can verify this by running `ffmpeg -version` in your terminal.

---

## 2. Repository Setup

### A. Windows Setup (One-Shot script)
We provide a PowerShell script to automate the installation of Node packages, create a Python virtual environment, install requirements, and configure environment templates.

Run this command from the repository root (`motion-id`):
```powershell
# From the motion-id directory in PowerShell
.\setup.ps1
```

### B. macOS & Linux Setup (Manual CLI)
Open your terminal in the repository root (`motion-id`) and run the following commands:

1. **Install Frontend Dependencies**:
   ```bash
   cd app
   npm ci
   cd ..
   ```

2. **Set up Python Virtual Environment** (Optional; only needed for offline video rendering):
   ```bash
   # Create and activate virtual environment
   python3 -m venv .venv
   source .venv/bin/activate
   
   # Install requirements
   pip install --upgrade pip
   pip install -r pipeline/requirements.txt
   ```

3. **Configure Environment Templates**:
   ```bash
   # Copy config templates (does not overwrite if files already exist)
   cp -n .env.example .env
   cp -n app/.env.example app/.env
   ```

---

## 3. Running the React PWA Locally

After running the setup script, navigate to the `app/` directory and spin up the development server.

```powershell
cd app

# Run development server on http://127.0.0.1:5177
npm run dev
```

### Mobile Testing over LAN
Since Motion ID is a mobile-first PWA, you can test it on physical mobile devices connected to the same local Wi-Fi network:

```powershell
# Exposes the server on http://<your-local-ip>:5177
npm run dev:lan
```
*Note: Service worker registration and PWA installation require a secure context (HTTPS) or localhost. For full mobile PWA install testing, deploy to the HTTPS staging environment.*

---

## 4. Rendering 3D Skeleton Videos Locally

If you have access to the raw DFL match tracking data (XML metadata + 50 Hz skeleton parquets), you can render custom goal clips with the Motion ID branding.

1. **Activate the Python Virtual Environment**:
   ```powershell
   # From repo root
   .\.venv\Scripts\Activate.ps1
   ```
2. **Render a No-Repair Video**:
   Generates a 3D skeleton clip using raw ball coordinates.
   ```powershell
   python scripts/render_no_repair_video.py --in-dir "path/to/raw/goal_parquet_folder"
   ```
3. **Render a Repaired Video**:
   Generates a 3D skeleton clip with ball-to-foot contact smoothing and trajectory repairs.
   ```powershell
   python scripts/render_repair_video.py --in-dir "path/to/raw/goal_parquet_folder"
   ```

### Output Directory
The rendered MP4 files are output directly to `scripts/outputs/batch/<Match_Name>/goal_<XX>/videos/` inside the scripts directory. 

To use these in the local app, copy them to [app/public/media/goals/](../app/public/media/goals/) and rename them to match the values in [localVideoManifest.json](../app/src/data/localVideoManifest.json) (e.g. `Bayern_Hamburg_goal_01.mp4`).

---

## 5. Media Hosting Configuration

The React application handles media hosting in two modes based on environment variables defined in [app/.env](../app/.env):


### A. Local Mode (Default)
Videos and thumbnails are loaded locally from the PWA's `public/` directory. Useful for offline demos or local development.
```env
VITE_DATA_BASE_URL=/data
VITE_MEDIA_BASE_URL=/media
```

### B. AWS CloudFront Mode (Production)
Videos, manifests, and club assets are retrieved from a CloudFront distribution sitting in front of S3, keeping the deployed bundle lightweight.
```env
VITE_DATA_BASE_URL=https://d2atp4d3qd2js3.cloudfront.net/data
VITE_MEDIA_BASE_URL=https://d2atp4d3qd2js3.cloudfront.net/media
```

---

## 6. Deployment to AWS Amplify

To deploy the build output to AWS Amplify Hosting:

1. Ensure you are authenticated with the correct AWS SSO profile.
2. Run the deployment script from the repository root:
   ```powershell
   aws sso login --profile 113725432743_slalom_IsbUsersPS
   .\pipeline\deploy\deploy_motion_id_staging.ps1
   ```

### What the deployment script does:
- Compiles the React production bundle (`npm run build`) with staging variables (`VITE_APP_ENV="staging"`).
- Compresses the build folder into a deployment zip using Python's `zipfile` module (which preserves nested file hierarchies better than PowerShell utilities).
- Uploads the zip directly to the AWS Amplify backend.
- Starts the deployment job and polls the AWS API until the staging branch status is `SUCCEED`.
- Validates the deployed URL and queries nested JS/CSS assets to verify there are no `404` loading issues.

---

## 7. Troubleshooting & FAQs

### A. PowerShell Script Blocked / Execution Policy Issue
* **Symptom**: `File .\setup.ps1 cannot be loaded because running scripts is disabled on this system.`
* **Cause**: Windows Client Operating Systems restrict script execution by default (`Restricted` policy).
* **Resolution**: You can bypass this restriction for the current PowerShell process session only without permanently relaxing system security:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
  .\setup.ps1
  ```
  If you downloaded the repository as a ZIP from a browser, Windows may have flagged the file as "blocked". Run:
  ```powershell
  Unblock-File .\setup.ps1
  ```

### B. Missing Python or PIP Warnings / Optional Setup
* **Symptom**: `WARN: Python not found — pipeline scripts will not work.`
* **Cause**: Python is not installed or not in your system environment PATH variables.
* **Resolution**: 
  * **If you ONLY want to run the React PWA locally**: **You can safely ignore this warning**. The setup script finishes the Node dependency installations, which is all you need to host and play the game.
  * **If you need to render 3D videos locally**: You must install Python (v3.12+ recommended). During the Python installation setup wizard, **make sure to check the box "Add Python.exe to PATH"**. After installing, open a *new* PowerShell window so the changes take effect and run `.\setup.ps1` again.

### C. Manual Python Virtual Environment Setup Fallback
* **Symptom**: Pip fails to install pipeline dependencies, or the virtual environment is broken / not created.
* **Cause**: Network proxies, security tools, or permissions blocking pip from creating files or downloading packages.
* **Resolution**: You can manually create the virtual environment and install the requirements:
  ```powershell
  # 1. Navigate to the repository root
  # 2. Force create the virtual environment using Python directly
  python -m venv .venv
  
  # 3. Manually activate and upgrade pip
  .\.venv\Scripts\Activate.ps1
  python -m pip install --upgrade pip
  
  # 4. Install pipeline requirements
  pip install -r pipeline/requirements.txt
  ```

### D. FFmpeg Missing / Video Generation Script Fails
* **Symptom**: `FileNotFoundError: [WinError 2] The system cannot find the file specified` or warnings about `ffmpeg` when running `render_repair_video.py`.
* **Cause**: The Python `imageio` and `matplotlib` rendering engine relies on the system `ffmpeg` binary to compile image frames into an MP4 video container.
* **Resolution**: 
  1. **Install via Package Manager (Recommended)**:
     ```powershell
     # Using Chocolatey
     choco install ffmpeg-full
     
     # Using Scoop
     scoop install ffmpeg
     ```
  2. **Manual Installation**:
     - Download the latest Windows release build from a trusted source (e.g., [gyan.dev](https://www.gyan.dev/ffmpeg/builds/)).
     - Extract the zip folder (e.g., to `C:\ffmpeg\`).
     - Add the `bin` subdirectory path (`C:\ffmpeg\bin\`) to your User or System `PATH` environment variables.
     - Restart your PowerShell window and run `ffmpeg -version` to verify.

### E. Port 5177 Already in Use
* **Symptom**: `Port 5177 is in use, using 5178 instead.` or Vite dev server fails to launch.
* **Cause**: Another dev server is running in the background, or an orphaned node process is holding the port.
* **Resolution**: 
  * You can let Vite automatically use the next port (e.g., `http://127.0.0.1:5178`) — the app is fully functional on any port.
  * To force release port 5177 on Windows, run:
    ```powershell
    # Find the process ID holding port 5177 and terminate it
    Stop-Process -Id (Get-NetTCPConnection -LocalPort 5177).OwningProcess -Force
    ```

### F. Dependency Errors on npm install / Dev Server Failures
* **Symptom**: `npm ERR!` or dependency conflicts when running the setup script or launching `npm run dev`.
* **Cause**: Stale `node_modules` cache, locked version mismatches, or network hiccups during fetching.
* **Resolution**: Clear package caches and perform a clean install:
  ```powershell
  cd app
  # Remove the existing installation and lockfile
  Remove-Item -Recurse -Force node_modules, package-lock.json
  # Re-install clean packages
  npm install
  ```

### G. Stale UI or Outdated Static Assets / PWA Service Worker Issues
* **Symptom**: Deployed staging site shows old code, does not reflect latest UI updates, or throws unexpected file loading `404` errors.
* **Cause**: The React app is a progressive web app (PWA) with a local service worker (`sw.js`) that caches static files aggressively to support offline sports-hackathon scenarios.
* **Resolution**:
  1. **Hard Reload**: Press `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac).
  2. **Force Update via Chrome DevTools**:
     - Open DevTools (`F12`).
     - Go to the **Application** tab.
     - Click **Service Workers** in the left menu.
     - Check the **Update on reload** box, and click **Unregister** next to the active worker.
     - Reload the page.
  3. **Mobile Device**: If testing on a mobile device or as an installed app, completely force-close the app from your task switcher, clear the browser/app cache from settings, and restart.

### H. Python Video Script Fails to Find Raw Data
* **Symptom**: Python script crashes with `FileNotFoundError: No such file or directory` or cannot find DFL Parquet/XML files.
* **Cause**: The data root environment variable is unconfigured or the path is incorrect.
* **Resolution**: 
  * Create a `.env` file in the root directory (based on `.env.example`).
  * Set `MOTION_ID_DATA_ROOT` to your local path containing match directories (e.g., `MOTION_ID_DATA_ROOT="D:/DFL_Data/"`).
  * Alternatively, pass the path directly using the CLI argument:
    ```powershell
    python scripts/render_repair_video.py --in-dir "D:/DFL_Data/Match_Data/Match_01"
    ```


