from __future__ import annotations

import argparse
import json
import math
import os
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

import pandas as pd
import pyarrow.dataset as ds

# Constants
LOCAL_FPS = 25.0
ABS_FPS = 50.0

TEAM_CODE_BY_ROLE = {
    "home": 1,
    "guest": 0,
    "away": 0,
}

PART_LABEL_TO_ID = {
    "l_ear": 1,
    "nose": 2,
    "r_ear": 3,
    "l_shoulder": 4,
    "neck": 5,
    "r_shoulder": 6,
    "l_elbow": 7,
    "r_elbow": 8,
    "l_wrist": 9,
    "r_wrist": 10,
    "l_hip": 11,
    "pelvis": 12,
    "r_hip": 13,
    "l_knee": 14,
    "r_knee": 15,
    "l_ankle": 16,
    "r_ankle": 17,
    "l_heel": 18,
    "l_toe": 19,
    "r_heel": 20,
    "r_toe": 21,
}

PART_ID_TO_LABEL = {v: k for k, v in PART_LABEL_TO_ID.items()}
PARTS_21 = [label for label, _ in sorted(PART_LABEL_TO_ID.items(), key=lambda kv: kv[1])]

def safe_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except Exception:
        return None

def safe_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(float(value))
    except Exception:
        return None

def load_match_context(match_dir: Path) -> dict[str, Any]:
    match_info_path = next(match_dir.glob("MatchInformations_*.xml"))
    metadata_path = next(match_dir.rglob("*_metadata.json"))
    root = ET.parse(match_info_path).getroot()

    team_by_id: dict[str, dict[str, Any]] = {}
    player_by_id: dict[str, dict[str, Any]] = {}
    for team in root.findall(".//Teams/Team"):
        team_id = team.attrib["TeamId"]
        role = team.attrib.get("Role", "").lower()
        team_by_id[team_id] = {
            "team_id": team_id,
            "team_name": team.attrib.get("TeamName"),
            "role": role,
            "team_code": TEAM_CODE_BY_ROLE.get(role),
        }
        for player in team.findall("./Players/Player"):
            person_id = player.attrib["PersonId"]
            player_by_id[person_id] = {
                "player_id": person_id,
                "shirt_number": safe_int(player.attrib.get("ShirtNumber")),
                "first_name": player.attrib.get("FirstName"),
                "last_name": player.attrib.get("LastName"),
                "short_name": player.attrib.get("Shortname"),
                "playing_position": player.attrib.get("PlayingPosition"),
                "starting": player.attrib.get("Starting") == "true",
                "team_id": team_id,
                "team_name": team.attrib.get("TeamName"),
                "team_role": role,
                "team_code": TEAM_CODE_BY_ROLE.get(role),
            }

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    phase_start_by_section = {
        "firstHalf": safe_int(metadata.get("Phase1StartFrame")),
        "secondHalf": safe_int(metadata.get("Phase2StartFrame")),
    }

    return {
        "match_name": match_dir.name,
        "team_by_id": team_by_id,
        "player_by_id": player_by_id,
        "phase_start_by_section": phase_start_by_section,
    }

def parse_kpi_match(kpi_path: Path) -> dict[str, Any]:
    tree = ET.parse(kpi_path)
    advanced_events = tree.getroot().find("AdvancedEvents")
    if advanced_events is None:
        raise RuntimeError(f"Could not find AdvancedEvents in {kpi_path}")

    events: list[dict[str, Any]] = []
    event_by_id: dict[str, dict[str, Any]] = {}
    for wrapper in advanced_events.findall("Event"):
        children = list(wrapper)
        if not children:
            continue
        node = children[0]
        attrs = dict(node.attrib)
        event_id = attrs.get("EventId")
        start_frame = safe_int(attrs.get("SyncedFrameId"))
        end_frame = safe_int(attrs.get("EndSyncedFrameId")) or start_frame
        item = {
            "family": node.tag,
            "attrs": attrs,
            "event_id": event_id,
            "start_frame": start_frame,
            "end_frame": end_frame,
            "sort_frame": start_frame if start_frame is not None else end_frame,
        }
        events.append(item)
        if event_id is not None:
            event_by_id[event_id] = item
    events.sort(key=lambda x: (x["sort_frame"] if x["sort_frame"] is not None else 10**9, x["family"]))
    return {
        "events": events,
        "event_by_id": event_by_id,
    }

def parse_goal_events(match_dir: Path) -> list[dict[str, Any]]:
    kpi_path = next(match_dir.glob("kpi_data_*.xml"))
    context = load_match_context(match_dir)
    events = parse_kpi_match(kpi_path)["events"]
    goals: list[dict[str, Any]] = []
    for event in events:
        if event["family"] != "ShotAtGoal":
            continue
        attrs = event["attrs"]
        if attrs.get("ShotResult") != "successfulShot":
            continue
        player = context["player_by_id"].get(attrs.get("PlayerId"), {})
        team = context["team_by_id"].get(attrs.get("TeamId"), {})
        goals.append(
            {
                "goal_key": f"{match_dir.name}::{attrs.get('EventId')}",
                "match_name": match_dir.name,
                "event_id": attrs.get("EventId"),
                "team_id": attrs.get("TeamId"),
                "team_name": team.get("team_name"),
                "team_code": team.get("team_code"),
                "player_id": attrs.get("PlayerId"),
                "player_name": player.get("short_name"),
                "player_position": player.get("playing_position"),
                "shirt_number": player.get("shirt_number"),
                "section": attrs.get("InGameSection"),
                "goal_frame": safe_int(attrs.get("SyncedFrameId")),
                "game_time": attrs.get("GameTime"),
                "x": safe_float(attrs.get("X-Position")),
                "y": safe_float(attrs.get("Y-Position")),
                "xg": safe_float(attrs.get("xG")),
                "pressure_on_player": safe_float(attrs.get("PressureOnPlayer")),
                "distance_to_goal": safe_float(attrs.get("DistanceToGoal")),
                "angle_to_goal": safe_float(attrs.get("AngleToGoal")),
                "num_defenders_in_shot_lane": safe_int(attrs.get("NumDefendersInShotLane")),
                "num_defending_players_in_box": safe_int(attrs.get("NumDefendingPlayersInBox")),
                "num_attacking_players_in_box": safe_int(attrs.get("NumAttackingPlayersInBox")),
            }
        )
    return goals

def select_goal(data_root: Path, match_name: str | None, goal_index: int) -> tuple[Path, dict[str, Any]]:
    match_dirs = sorted(path for path in data_root.iterdir() if path.is_dir())
    if match_name:
        match_dirs = [path for path in match_dirs if path.name == match_name]
    all_goals: list[tuple[Path, dict[str, Any]]] = []
    for match_dir in match_dirs:
        for goal in parse_goal_events(match_dir):
            all_goals.append((match_dir, goal))
    if not all_goals:
        raise RuntimeError("No successfulShot goal events found.")
    if goal_index < 0 or goal_index >= len(all_goals):
        raise RuntimeError(f"goal_index {goal_index} out of range; found {len(all_goals)} goals.")
    return all_goals[goal_index]

def compute_abs_frame(section: str | None, local_frame: int | None, section_min: dict[str, int], phase_start_by_section: dict[str, int | None]) -> int | None:
    if section is None or local_frame is None:
        return None
    local_start = section_min.get(section)
    phase_start = phase_start_by_section.get(section)
    if local_start is None or phase_start is None:
        return None
    return phase_start + 1 + 2 * (local_frame - local_start)

def extract_positions(match_dir: Path, goal: dict[str, Any], before_s: float, after_s: float, context: dict[str, Any]) -> tuple[pd.DataFrame, dict[str, int], dict[str, Any]]:
    pre_frames = int(round(before_s * LOCAL_FPS))
    post_frames = int(round(after_s * LOCAL_FPS))
    goal_frame = int(goal["goal_frame"])
    window = {
        "goal_key": goal["goal_key"],
        "window_start_frame": max(0, goal_frame - pre_frames),
        "window_end_frame": goal_frame + post_frames,
        "goal_frame": goal_frame,
    }

    positions_path = next(match_dir.glob("Positions_*.xml"))
    team_lookup = context["team_by_id"]
    player_lookup = context["player_by_id"]
    section_min: dict[str, int] = {}
    rows: list[dict[str, Any]] = []
    current_frameset: dict[str, Any] | None = None

    for event, elem in ET.iterparse(str(positions_path), events=("start", "end")):
        tag = elem.tag.split("}")[-1]
        if event == "start" and tag == "FrameSet":
            current_frameset = dict(elem.attrib)
            continue
        if event == "end" and tag == "Frame":
            if current_frameset is None:
                elem.clear()
                continue
            section = current_frameset.get("GameSection")
            frame_num = safe_int(elem.attrib.get("N"))
            if current_frameset.get("TeamId") == "BALL" and frame_num is not None:
                if section not in section_min or frame_num < section_min[section]:
                    section_min[section] = frame_num
            if frame_num is not None and window["window_start_frame"] <= frame_num <= window["window_end_frame"]:
                team_id = current_frameset.get("TeamId")
                person_id = current_frameset.get("PersonId")
                player_meta = player_lookup.get(person_id, {})
                team_meta = team_lookup.get(team_id, {})
                rows.append(
                    {
                        "goal_key": goal["goal_key"],
                        "match_name": match_dir.name,
                        "section": section,
                        "team_id": team_id,
                        "person_id": person_id,
                        "player_name": player_meta.get("short_name"),
                        "player_position": player_meta.get("playing_position"),
                        "shirt_number": player_meta.get("shirt_number"),
                        "team_name": team_meta.get("team_name") if team_id != "BALL" else "BALL",
                        "team_code": team_meta.get("team_code") if team_id != "BALL" else None,
                        "local_frame": frame_num,
                        "seconds_from_goal": (frame_num - goal_frame) / LOCAL_FPS,
                        "timestamp": elem.attrib.get("T"),
                        "x": safe_float(elem.attrib.get("X")),
                        "y": safe_float(elem.attrib.get("Y")),
                        "z": safe_float(elem.attrib.get("Z")),
                        "speed_kmh": safe_float(elem.attrib.get("S")),
                        "accel_mps2": safe_float(elem.attrib.get("A")),
                        "is_ball": team_id == "BALL",
                    }
                )
            elem.clear()
            continue
        if event == "end" and tag == "FrameSet":
            current_frameset = None
            elem.clear()
            continue

    out = pd.DataFrame(rows)
    if not out.empty:
        out["absolute_frame"] = out.apply(
            lambda r: compute_abs_frame(r["section"], int(r["local_frame"]), section_min, context["phase_start_by_section"]),
            axis=1,
        )
    window["absolute_start_frame"] = compute_abs_frame(goal["section"], window["window_start_frame"], section_min, context["phase_start_by_section"])
    window["absolute_end_frame"] = compute_abs_frame(goal["section"], window["window_end_frame"], section_min, context["phase_start_by_section"])
    window["absolute_goal_frame"] = compute_abs_frame(goal["section"], goal_frame, section_min, context["phase_start_by_section"])
    return out, section_min, window

def build_team_jersey_lookup(context: dict[str, Any]) -> dict[tuple[int | None, int | None], dict[str, Any]]:
    lookup: dict[tuple[int | None, int | None], dict[str, Any]] = {}
    for player in context["player_by_id"].values():
        lookup[(player.get("team_code"), player.get("shirt_number"))] = player
    return lookup

def part_map_from_skeleton(skeleton: dict[str, Any]) -> dict[str, tuple[float, float, float]]:
    out: dict[str, tuple[float, float, float]] = {}
    for part in skeleton.get("parts", []):
        label = PART_ID_TO_LABEL.get(part.get("name"))
        if label is None:
            continue
        out[label] = (
            safe_float(part.get("position_x")) or 0.0,
            safe_float(part.get("position_y")) or 0.0,
            safe_float(part.get("position_z")) or 0.0,
        )
    return out

def flatten_all_parts(parts: dict[str, tuple[float, float, float]]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for label in PARTS_21:
        value = parts.get(label)
        out[f"{label}_x"] = value[0] if value is not None else None
        out[f"{label}_y"] = value[1] if value is not None else None
        out[f"{label}_z"] = value[2] if value is not None else None
    return out

def extract_skeletons(match_dir: Path, goal: dict[str, Any], window: dict[str, Any], context: dict[str, Any]) -> pd.DataFrame:
    if window.get("absolute_start_frame") is None or window.get("absolute_end_frame") is None:
        return pd.DataFrame()
    lookup_by_team_jersey = build_team_jersey_lookup(context)
    parquet_path = next(match_dir.glob("*.parquet"))
    dataset = ds.dataset(parquet_path, format="parquet")
    filt = (ds.field("frame_number") >= int(window["absolute_start_frame"])) & (ds.field("frame_number") <= int(window["absolute_end_frame"]))
    table = dataset.to_table(columns=["frame_number", "skeletons"], filter=filt)
    rows: list[dict[str, Any]] = []
    for item in table.to_pylist():
        abs_frame = int(item["frame_number"])
        for idx, skeleton in enumerate(item.get("skeletons") or []):
            parts = part_map_from_skeleton(skeleton)
            sk_team = safe_int(skeleton.get("team"))
            sk_jersey = safe_int(skeleton.get("jersey_number"))
            player_meta = lookup_by_team_jersey.get((sk_team, sk_jersey), {})
            rows.append(
                {
                    "goal_key": goal["goal_key"],
                    "match_name": match_dir.name,
                    "absolute_frame": abs_frame,
                    "seconds_from_goal": (abs_frame - int(window["absolute_goal_frame"])) / ABS_FPS if window.get("absolute_goal_frame") is not None else None,
                    "skeleton_index": idx,
                    "team_code": sk_team,
                    "jersey_number": sk_jersey,
                    "matched_player_id": player_meta.get("player_id"),
                    "matched_player_name": player_meta.get("short_name"),
                    "matched_player_position": player_meta.get("playing_position"),
                    **flatten_all_parts(parts),
                }
            )
    return pd.DataFrame(rows)

def compute_shooter_frames(goal: dict[str, Any], positions: pd.DataFrame) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    player_id = goal["player_id"]
    for local_frame, frame_group in positions.groupby("local_frame", sort=False):
        shooter = frame_group[(frame_group["person_id"] == player_id) & (~frame_group["is_ball"])]
        if shooter.empty:
            continue
        shooter_row = shooter.iloc[0]
        opponents = frame_group[(~frame_group["is_ball"]) & (frame_group["team_id"] != goal["team_id"]) & (frame_group["team_id"] != "BALL")].copy()
        nearest = None
        if not opponents.empty:
            dx = opponents["x"] - shooter_row["x"]
            dy = opponents["y"] - shooter_row["y"]
            distances = (dx * dx + dy * dy).pow(0.5)
            nearest = opponents.loc[distances.idxmin()].to_dict()
            nearest["distance_m"] = float(distances.min())
        ball = frame_group[frame_group["is_ball"] == True]
        ball_dist = None
        if not ball.empty:
            ball_row = ball.iloc[0]
            ball_dist = float(math.hypot(ball_row["x"] - shooter_row["x"], ball_row["y"] - shooter_row["y"]))
        rows.append(
            {
                "goal_key": goal["goal_key"],
                "local_frame": int(local_frame),
                "absolute_frame": safe_int(shooter_row["absolute_frame"]),
                "seconds_from_goal": float(shooter_row["seconds_from_goal"]),
                "x": shooter_row["x"],
                "y": shooter_row["y"],
                "speed_kmh": shooter_row["speed_kmh"],
                "nearest_defender_id": nearest.get("person_id") if nearest else None,
                "nearest_defender_name": nearest.get("player_name") if nearest else None,
                "nearest_defender_x": nearest.get("x") if nearest else None,
                "nearest_defender_y": nearest.get("y") if nearest else None,
                "nearest_defender_distance_m": nearest.get("distance_m") if nearest else None,
                "ball_distance_m": ball_dist,
            }
        )
    return pd.DataFrame(rows)

def write_parquet(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(path, index=False)

def write_json(obj: Any, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=True, default=str), encoding="utf-8")

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract goal event data and save to Parquets.")
    parser.add_argument("--match", default="Bayern_Hamburg")
    parser.add_argument("--goal-index", type=int, default=0)
    parser.add_argument("--before-s", type=float, default=10.0)
    parser.add_argument("--after-s", type=float, default=5.0)
    parser.add_argument(
        "--data-root",
        default=os.environ.get("MOTION_ID_DATA_ROOT", ""),
        help="Path to the Match_Data directory.",
    )
    parser.add_argument("--out-dir", required=True, help="Directory to save parquets.")
    return parser.parse_args()

def main() -> None:
    args = parse_args()
    
    # Resolve data root
    data_root_str = args.data_root
    if not data_root_str:
        # Fallback default path logic
        ROOT = Path(__file__).resolve().parents[2]
        data_root = ROOT / "data" / "challenge-2" / "Match_Data"
    else:
        data_root = Path(data_root_str)

    if not data_root.exists():
        raise FileNotFoundError(f"Data root directory does not exist: {data_root}")

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    match_dir, goal = select_goal(data_root, args.match, args.goal_index)
    context = load_match_context(match_dir)
    positions, section_min, window = extract_positions(match_dir, goal, args.before_s, args.after_s, context)
    skeletons = extract_skeletons(match_dir, goal, window, context)
    shooter_frames = compute_shooter_frames(goal, positions)

    write_parquet(pd.DataFrame([goal]), out_dir / "goal_event.parquet")
    write_parquet(pd.DataFrame([window]), out_dir / "goal_window_manifest.parquet")
    write_parquet(positions, out_dir / "goal_window_positions.parquet")
    write_parquet(shooter_frames, out_dir / "goal_window_shooter_frames.parquet")
    write_parquet(skeletons, out_dir / "goal_window_skeletons.parquet")
    
    write_json(
        {
            "goal": goal,
            "window": window,
            "positions_rows": int(len(positions)),
            "shooter_frame_rows": int(len(shooter_frames)),
            "skeleton_rows": int(len(skeletons)),
        },
        out_dir / "goal_window_summary.json",
    )
    print(f"Extraction successful. Parquet files saved to {out_dir}")

if __name__ == "__main__":
    main()
