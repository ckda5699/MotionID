# Challenge 2 Data Guide

This guide explains the Bundesliga 3D football dataset structure (containing match events, tracking data, rosters, and 3D skeleton tracking).


## Quick Summary

- `5` match folders
- `7` documentation PDFs
- about `20.63 GB` total
- `5` parquet skeleton files: about `18.60 GB`
- `20` XML files: about `2.03 GB`
- `5` JSON metadata files

Each match folder contains the same `6` file types:

- `Events_<match>.xml`
- `kpi_data_<match>.xml`
- `MatchInformations_<match>.xml`
- `Positions_<match>.xml`
- `<match-code>.parquet`
- `<date>_<match-code>_metadata.json`

## Match Inventory

| Match | Files | Size |
|---|---:|---:|
| Bayern_Hamburg | 6 | 4.492 GB |
| Dortmund_Stuttgart | 6 | 4.208 GB |
| Frankfurt_Bayern | 6 | 3.837 GB |
| Frankfurt_Union | 6 | 4.294 GB |
| Union_Bayern | 6 | 3.798 GB |

## Documentation: What Matters

### `Challenge 2 - Unlock the Power of 3D Football Data.pdf`

The challenge brief says:

- about `141 million` data points per match
- about `705 million` across all `5` matches
- current use is still mostly automated event detection
- the opportunity zones are:
  - agility
  - peripheral scanning
  - tactical awareness
  - immersive visualization
  - cross-sport adaptation

### `Documentation_MatchInformation.pdf`

This is the best general reference after the challenge brief. It covers:

- match metadata
- roster/team data
- positional-data definitions
- pitch dimensions
- frame semantics

Important details:

- positional raw data is described at `25 Hz`
- positional coordinates are centered at the pitch center
- positional `X` and `Y` are in meters
- positional `D` is distance since previous frame in centimeters
- positional `S` is speed in km/h
- positional `A` is acceleration in m/s^2

### `Documentation_SkeletonData.pdf`

This confirms the skeleton feed tracks `21` body key points:

- `l_ear`, `nose`, `r_ear`
- `l_shoulder`, `neck`, `r_shoulder`
- `l_elbow`, `r_elbow`
- `l_wrist`, `r_wrist`
- `l_hip`, `pelvis`, `r_hip`
- `l_knee`, `r_knee`
- `l_ankle`, `r_ankle`
- `l_heel`, `l_toe`, `r_heel`, `r_toe`

### `TF15 - Parquet Skeleton External Format 1.1.pdf`

This is the most important technical doc for the parquet files.

Important details:

- parquet skeleton feed supports `25/30/50/60 Hz`
- the local shared files here are actually `50.00 fps`
- `team` coding:
  - `1 = home`
  - `0 = away`
  - `3 = referee`
- `jersey_number = -1` can mean unassigned

### `Documentation_EvenData.pdf`

This is the raw event feed documentation. Use it to interpret event labels and subtypes in `Events_*.xml`.

### `Documentation_KPI_Data.pdf` and `Documentation_PositinalData.pdf`

These two PDFs had weak local text extraction, but the actual XML files still make the important structures clear.

## What Each Match File Does

### 1. `MatchInformations_*.xml`

This is the roster and match-context file.

It contains:

- competition and season info
- stadium and environment info
- result
- pitch size
- home and away teams
- lineups and formations
- player rosters and shirt numbers
- starting flags and playing positions
- coaches, officials, referees

Use this for:

- jersey-to-player lookup
- lineups and roles
- pitch dimensions

### 2. `Events_*.xml`

This is the raw event feed.

It is best for:

- official event taxonomy
- rare football labels
- descriptive event storytelling

Most common raw event types across all 5 matches:

| Event type | Count |
|---|---:|
| Play | 5020 |
| OtherBallAction | 1091 |
| TacklingGame | 881 |
| Delete | 419 |
| ThrowIn | 184 |
| BallClaiming | 148 |
| FreeKick | 129 |
| ShotAtGoal | 122 |
| Foul | 107 |

Rare but interesting labels present in the dataset include:

- `Nutmeg`
- `SpectacularPlay`
- `Run`
- `VideoAssistantAction`
- `PenaltyNotAwarded`

### 3. `kpi_data_*.xml`

This is the most analysis-friendly event file.

It is a synced and enriched event feed with frame links and advanced context.

Observed event families are identical across all 5 matches:

- `Play`
- `Reception`
- `Carry`
- `TeamPossession`
- `OtherBallAction`
- `TacklingGame`
- `ShotAtGoal`
- `Foul`

Representative useful fields:

- `SyncedFrameId`
- `SyncedEventTime`
- `X-Position`, `Y-Position`
- `X-PositionReceiver`, `Y-PositionReceiver`
- `X-PlayerSpeed`, `Y-PlayerSpeed`
- `X-ReceiverSpeed`, `Y-ReceiverSpeed`
- `PressureOnPlayer`
- `PressureOnReceiver`
- `DistanceClosestDefenderToPlayer`
- `NumDefendersGoalSide`
- `NumDefendersPassingLane`
- `ByPassedDefenders`
- `NumAttackingPlayersAhead`
- `NumAttackingPlayersInBox`
- `NumDefendingPlayersInBox`
- `xP`
- `xG`
- `AngleToGoal`
- `DistanceToGoal`
- `DistanceGoalkeeperToGoal`
- `ShotResult`
- `VerticalGainOverall`
- `VerticalGainPlays`
- `VerticalGainCarries`

Use this file first when you need:

- synced event-to-frame alignment
- enriched football context
- fast candidate moments for 3D analysis

### 4. `Positions_*.xml`

This is the dense center-of-mass positional tracking feed.

Structure:

- top-level `Positions`
- one `MetaData` element
- many `FrameSet` elements
- each `FrameSet` belongs to one person and one game section
- each `FrameSet` contains many `Frame` elements

Frame attributes seen directly in the XML:

- `N` = frame number
- `T` = timestamp
- `X` = x position
- `Y` = y position
- `D` = distance
- `S` = speed
- `A` = acceleration
- `M` = state flag

Observed from one sample match:

- `61` frame sets
- `36` unique person IDs

Use this for:

- baseline movement and spacing
- speeds and accelerations without skeleton parsing

### 5. metadata JSON

This file bridges frame windows and identity.

It contains:

- `FrameRate`
- pitch dimensions
- phase frame ranges
- keeper direction by phase
- home and away team objects
- player start/end frame windows

Representative keys:

- `GameID`
- `FrameRate`
- `PitchShortSide`
- `PitchLongSide`
- `Phase1StartFrame`
- `Phase1EndFrame`
- `Phase1HomeGKLeft`
- `HomeTeam`
- `AwayTeam`
- `Referees`
- `Kickoff`

Representative player fields:

- `PlayerID`
- `FirstName`
- `LastName`
- `JerseyNo`
- `StartFrameCount`
- `EndFrameCount`
- `StartingPosition`
- `CurrentPosition`

Use this for:

- substitution-aware frame filtering
- phase normalization
- goalkeeper direction

### 6. parquet skeleton

This is the core 3D body stream.

Shared properties across all 5 parquet files:

- actual `framerate = 50.00`
- `data_quality = 0`
- fields:
  - `ball`
  - `ball_exists`
  - `frame_number`
  - `skeleton_count`
  - `skeletons`
  - `type`
  - `version`

Representative row structure:

- `ball`:
  - `position_x`
  - `position_y`
  - `position_z`
  - `velocity_x`
  - `velocity_y`
  - `velocity_z`
- `skeletons`: list of targets
- each skeleton target:
  - `jersey_number`
  - `team`
  - `parts_count`
  - `parts`
- each part:
  - `name`
  - `position_x`
  - `position_y`
  - `position_z`

Observed sample:

- `ball_exists = True`
- `skeleton_count = 22`
- `parts_count = 21`
- some frames can include `team = -1` and `jersey_number = -1`

Use this for:

- body posture and shape
- head, torso, hip, and foot geometry
- 3D ball height / velocity
- scanning and orientation proxies
- agility, braking, turning, and deception ideas

## Coordinate Systems: Important Gotcha

This dataset does not use a single coordinate style everywhere.

### Raw events XML

- observed ranges:
  - `X: 0..105`
  - `Y: 0..68`

This looks like full-pitch coordinates.

### KPI XML

- observed ranges:
  - `X: about -53..+53`
  - `Y: about -36..+35`

This looks like centered pitch coordinates.

### Positions XML

- centered pitch coordinates
- docs say meters

### Skeleton parquet

- TF15 says positions are in centimeters from pitch center
- sampled live values can look closer to meter-scaled tracking values
- treat exact unit interpretation carefully during implementation

### Metadata JSON

- `PitchLongSide = 10500`
- `PitchShortSide = 6800`

This strongly suggests centi-units.

## Best Analysis Order

If you are new to the dataset, start in this order:

1. `MatchInformations_*.xml`
2. `kpi_data_*.xml`
3. `Events_*.xml`
4. `metadata.json`
5. `Positions_*.xml`
6. `*.parquet`

That workflow lets you use the big 3D body stream only when you already know which moments matter.

## What Each Stream Is Best For

| File type | Best use |
|---|---|
| Match info XML | roster lookup, lineups, pitch dimensions, context |
| Raw events XML | football event taxonomy, rare labels, descriptive event logic |
| KPI XML | synced analysis moments, enriched context, advanced event metrics |
| Positions XML | center-of-mass movement, speed, acceleration, spatial baselines |
| Metadata JSON | frame windows, phase boundaries, player appearance windows |
| Parquet skeleton | body shape, posture, head/hip/foot geometry, 3D ball/body analysis |

## Cautions

- You only have `5` matches, so avoid long-term player claims.
- Raw events and KPI/positional feeds use different coordinate conventions.
- Skeleton identity can show `team = -1` or `jersey_number = -1` in some frames.
- The local docs are helpful, but the files themselves are the best ground truth for the final schema you actually have.

## Minimal Python Examples

### Read metadata JSON

```python
import json
from pathlib import Path

# Path to the metadata file inside your match folder
p = Path("challenge-2/Match_Data/Frankfurt_Bayern/2025_10_04_SGE_FCB/2025-10-04_SGE-FCB_metadata.json")
data = json.loads(p.read_text())
print(data["FrameRate"])
print(data["HomeTeam"]["Players"][0])
```

### Stream KPI XML

```python
import xml.etree.ElementTree as ET

path = "challenge-2/Match_Data/Frankfurt_Bayern/kpi_data_Frankfurt_Bayern.xml"

for _, elem in ET.iterparse(path, events=("end",)):
    if elem.tag.endswith("Event"):
        children = list(elem)
        if children:
            event = children[0]
            family = event.tag.split("}")[-1]
            if family == "Reception":
                print(event.attrib.get("SyncedFrameId"), event.attrib.get("PressureOnReceiver"))
        elem.clear()
```

### Read parquet skeleton

```python
import pyarrow.parquet as pq

table = pq.read_table(
    "challenge-2/Match_Data/Frankfurt_Bayern/SGE-FCB.parquet",
    columns=["frame_number", "ball", "ball_exists", "skeleton_count", "skeletons"],
    use_threads=False,
)

row = table.slice(0, 1).to_pylist()[0]
print(row["frame_number"], row["ball_exists"], row["skeleton_count"])
print(row["ball"])
print(row["skeletons"][0]["parts"][:3])
```

