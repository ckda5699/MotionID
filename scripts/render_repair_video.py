from __future__ import annotations

import argparse
import csv
import json
import math
import os
import sys
from pathlib import Path
from typing import Any

import imageio.v2 as imageio
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

# Constants
WIDTH = 1920
HEIGHT = 1080
APRON_MARGIN_M = 6.0
NEAR_PLANE_M = 0.18
LINE_Z = 0.03
BALL_MARKER_SIZE = 1100.0
PITCH_X_MIN = -52.5
PITCH_X_MAX = 52.5
PITCH_Y_MIN = -34.0
PITCH_Y_MAX = 34.0

FOCUS_SWITCH_MARGIN_M = 0.75
FOCUS_SWITCH_FRAMES = 5
CELEBRATION_ALPHA = 0.10
CELEBRATION_DEAD_ZONE_M = 0.12

SNAP_THRESHOLD_M = 1.5
FREEZE_THRESHOLD_M = 0.06
SHOT_PRESERVE_FROM_S = -0.5
RAW_RELIABLE_DISTANCE_TO_TAKER_M = 3.0
RAW_STALE_DISTANCE_TO_TAKER_M = 20.0
FOOT_JOINTS = ("l_toe", "r_toe", "l_ankle", "r_ankle", "l_heel", "r_heel")

SKELETON_EDGES = [
    ("l_ear", "nose"),
    ("nose", "r_ear"),
    ("nose", "neck"),
    ("neck", "l_shoulder"),
    ("neck", "r_shoulder"),
    ("l_shoulder", "r_shoulder"),
    ("l_shoulder", "l_elbow"),
    ("l_elbow", "l_wrist"),
    ("r_shoulder", "r_elbow"),
    ("r_elbow", "r_wrist"),
    ("l_shoulder", "l_hip"),
    ("r_shoulder", "r_hip"),
    ("l_hip", "pelvis"),
    ("pelvis", "r_hip"),
    ("l_hip", "l_knee"),
    ("l_knee", "l_ankle"),
    ("l_ankle", "l_heel"),
    ("l_heel", "l_toe"),
    ("r_hip", "r_knee"),
    ("r_knee", "r_ankle"),
    ("r_ankle", "r_heel"),
    ("r_heel", "r_toe"),
]

# State variables
FOCUS_PLAN: dict[int, dict[str, Any]] = {}
CELEBRATION_HEADING: np.ndarray | None = None
CAMERA_TARGET_STATE: dict[str, np.ndarray] = {}
FOLLOW_CAMERA_STATE: dict[str, np.ndarray] = {}

def reset_camera_state() -> None:
    CAMERA_TARGET_STATE.clear()
    FOLLOW_CAMERA_STATE.clear()
    FOCUS_PLAN.clear()
    global CELEBRATION_HEADING
    CELEBRATION_HEADING = None

def safe_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(float(value))
    except Exception:
        return None

def normalize(vec: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(vec))
    if norm < 1e-8:
        return vec
    return vec / norm

def active_goal_x(scorer_x: float) -> float:
    return PITCH_X_MIN if scorer_x < 0.0 else PITCH_X_MAX

def goal_direction_from_x(x: float) -> np.ndarray:
    goal_x = active_goal_x(float(x))
    return np.array([1.0 if goal_x < 0.0 else -1.0, 0.0], dtype=float)

def ball_xyz(frame_pos: pd.DataFrame, fallback_x: float, fallback_y: float) -> np.ndarray | None:
    ball = frame_pos[frame_pos["is_ball"] == True]
    if ball.empty:
        return None
    row = ball.iloc[0]
    x = float(row["x"]) if pd.notna(row["x"]) else fallback_x
    y = float(row["y"]) if pd.notna(row["y"]) else fallback_y
    z = float(row["z"]) if pd.notna(row.get("z")) else 0.25
    return np.array([x, y, max(0.18, z)], dtype=float)

def joint_xyz(row: pd.Series | None, joint: str) -> np.ndarray | None:
    if row is None:
        return None
    val_x = row.get(f"{joint}_x")
    val_y = row.get(f"{joint}_y")
    val_z = row.get(f"{joint}_z")
    if pd.isna(val_x) or pd.isna(val_y) or pd.isna(val_z):
        return None
    return np.array([float(val_x), float(val_y), float(val_z)], dtype=float)

def skeleton_ground_center(row: pd.Series | None, fallback_x: float, fallback_y: float) -> tuple[float, float]:
    pelvis = joint_xyz(row, "pelvis")
    if pelvis is not None:
        return float(pelvis[0]), float(pelvis[1])
    return fallback_x, fallback_y

def skeleton_heading(row: pd.Series | None, fallback: tuple[float, float]) -> tuple[float, float]:
    if row is None:
        return fallback
    nose = joint_xyz(row, "nose")
    neck = joint_xyz(row, "neck")
    if nose is not None and neck is not None:
        dx = float(nose[0] - neck[0])
        dy = float(nose[1] - neck[1])
        norm = float(np.hypot(dx, dy))
        if norm > 0.05:
            return dx / norm, dy / norm
    return fallback

def make_camera(origin: np.ndarray, target: np.ndarray, fov_deg: float) -> dict[str, Any]:
    forward = normalize(target - origin)
    if np.linalg.norm(forward) < 1e-8:
        forward = np.array([1.0, 0.0, 0.0])
    world_up = np.array([0.0, 0.0, 1.0])
    right = normalize(np.cross(forward, world_up))
    if np.linalg.norm(right) < 1e-8:
        right = np.array([0.0, 1.0, 0.0])
    up = normalize(np.cross(right, forward))
    return {"kind": "pinhole", "origin": origin, "forward": forward, "right": right, "up": up, "fov_deg": fov_deg}

def full_pitch_bounds() -> dict[str, float]:
    return {
        "x_min": float(PITCH_X_MIN - APRON_MARGIN_M),
        "x_max": float(PITCH_X_MAX + APRON_MARGIN_M),
        "y_min": float(PITCH_Y_MIN - APRON_MARGIN_M),
        "y_max": float(PITCH_Y_MAX + APRON_MARGIN_M),
    }

def project_points(points: np.ndarray, camera: dict[str, Any]) -> tuple[np.ndarray, np.ndarray]:
    rel = points - camera["origin"]
    cam_x = rel @ camera["right"]
    cam_y = rel @ camera["up"]
    depth = rel @ camera["forward"]
    focal = (WIDTH * 0.5) / np.tan(np.radians(float(camera["fov_deg"])) * 0.5)
    safe_depth = np.maximum(depth, NEAR_PLANE_M)
    center_x = float(camera.get("screen_center_x", WIDTH * 0.5))
    center_y = float(camera.get("screen_center_y", HEIGHT * 0.55))
    x = center_x + focal * (cam_x / safe_depth)
    y = center_y - focal * (cam_y / safe_depth)
    return np.column_stack([x, y]), depth

def line_camera_clip(p1: np.ndarray, p2: np.ndarray, camera: dict[str, Any]) -> tuple[np.ndarray, np.ndarray] | None:
    d1 = float((p1 - camera["origin"]) @ camera["forward"])
    d2 = float((p2 - camera["origin"]) @ camera["forward"])
    if d1 <= NEAR_PLANE_M and d2 <= NEAR_PLANE_M:
        return None
    if d1 <= NEAR_PLANE_M or d2 <= NEAR_PLANE_M:
        denom = d2 - d1
        if abs(denom) < 1e-8:
            return None
        t = (NEAR_PLANE_M - d1) / denom
        if not 0.0 <= t <= 1.0:
            return None
        p = p1 + t * (p2 - p1)
        if d1 <= NEAR_PLANE_M:
            p1 = p
        else:
            p2 = p
    return p1, p2

def clip_xy_to_bounds(p1: tuple[float, float, float], p2: tuple[float, float, float], bounds: dict[str, float]) -> tuple[tuple[float, float, float], tuple[float, float, float]] | None:
    x1, y1, z1 = p1
    x2, y2, z2 = p2
    dx = x2 - x1
    dy = y2 - y1
    u1 = 0.0
    u2 = 1.0
    for p, q in [
        (-dx, x1 - bounds["x_min"]),
        (dx, bounds["x_max"] - x1),
        (-dy, y1 - bounds["y_min"]),
        (dy, bounds["y_max"] - y1),
    ]:
        if abs(p) < 1e-9:
            if q < 0:
                return None
            continue
        r = q / p
        if p < 0:
            if r > u2:
                return None
            u1 = max(u1, r)
        else:
            if r < u1:
                return None
            u2 = min(u2, r)
    a = (x1 + u1 * dx, y1 + u1 * dy, z1 + u1 * (z2 - z1))
    b = (x1 + u2 * dx, y1 + u2 * dy, z1 + u2 * (z2 - z1))
    return a, b

def draw_projected_line(ax, camera: dict[str, Any], p1: tuple[float, float, float], p2: tuple[float, float, float], color: str, lw: float, alpha: float = 1.0, ls: str = "-") -> None:
    clipped = line_camera_clip(np.array(p1, dtype=float), np.array(p2, dtype=float), camera)
    if clipped is None:
        return
    pts, depth = project_points(np.vstack(clipped), camera)
    if np.any(~np.isfinite(pts)) or np.any(depth <= 0):
        return
    if np.all((pts[:, 0] < -WIDTH * 0.8) | (pts[:, 0] > WIDTH * 1.8) | (pts[:, 1] < -HEIGHT * 0.8) | (pts[:, 1] > HEIGHT * 1.8)):
        return
    ax.plot(pts[:, 0], pts[:, 1], color=color, lw=lw, alpha=alpha, ls=ls, solid_capstyle="round")

def draw_bounded_line(ax, camera: dict[str, Any], bounds: dict[str, float], p1: tuple[float, float, float], p2: tuple[float, float, float], color: str, lw: float, alpha: float = 1.0, ls: str = "-") -> None:
    clipped = clip_xy_to_bounds(p1, p2, bounds)
    if clipped is None:
        return
    draw_projected_line(ax, camera, clipped[0], clipped[1], color, lw, alpha, ls)

def draw_projected_poly(ax, camera: dict[str, Any], points: list[tuple[float, float, float]], color: str, alpha: float, edge: str | None = None, lw: float = 1.0) -> None:
    arr = np.array(points, dtype=float)
    depths = (arr - camera["origin"]) @ camera["forward"]
    clipped: list[np.ndarray] = []
    for i, current in enumerate(arr):
        prev = arr[i - 1]
        current_depth = float(depths[i])
        prev_depth = float(depths[i - 1])
        current_inside = current_depth > NEAR_PLANE_M
        prev_inside = prev_depth > NEAR_PLANE_M
        if current_inside != prev_inside:
            denom = current_depth - prev_depth
            if abs(denom) > 1e-9:
                t = ((NEAR_PLANE_M + 1e-3) - prev_depth) / denom
                clipped.append(prev + t * (current - prev))
        if current_inside:
            clipped.append(current)
    if len(clipped) < 3:
        return
    arr = np.asarray(clipped, dtype=float)
    pts, depth = project_points(arr, camera)
    if np.any(depth < NEAR_PLANE_M) or np.any(~np.isfinite(pts)):
        return
    ax.fill(pts[:, 0], pts[:, 1], color=color, alpha=alpha, ec=edge, lw=lw)

def draw_projected_point(ax, camera: dict[str, Any], p: np.ndarray, color: str, size: float, edge: str = "#111111", alpha: float = 1.0) -> None:
    pts, depth = project_points(p.reshape(1, 3), camera)
    if depth[0] <= NEAR_PLANE_M or not np.all(np.isfinite(pts)):
        return
    if not (-WIDTH * 0.5 <= pts[0, 0] <= WIDTH * 1.5 and -HEIGHT * 0.5 <= pts[0, 1] <= HEIGHT * 1.5):
        return
    scaled = float(np.clip(size / max(depth[0], 0.5), 8.0, size * 1.5))
    ax.scatter([pts[0, 0]], [pts[0, 1]], s=scaled, c=color, edgecolors=edge, linewidths=0.8, alpha=alpha, zorder=20)

def canonical_pitch_lines() -> list[tuple[tuple[float, float, float], tuple[float, float, float], float]]:
    z = LINE_Z
    lines: list[tuple[tuple[float, float, float], tuple[float, float, float], float]] = []
    corners = [
        (PITCH_X_MIN, PITCH_Y_MIN, z),
        (PITCH_X_MAX, PITCH_Y_MIN, z),
        (PITCH_X_MAX, PITCH_Y_MAX, z),
        (PITCH_X_MIN, PITCH_Y_MAX, z),
        (PITCH_X_MIN, PITCH_Y_MIN, z),
    ]
    lines.extend((a, b, 1.7) for a, b in zip(corners, corners[1:]))
    lines.append(((0.0, PITCH_Y_MIN, z), (0.0, PITCH_Y_MAX, z), 1.15))
    for goal_x, box_x, six_x in [(-52.5, -36.0, -47.0), (52.5, 36.0, 47.0)]:
        penalty = [(goal_x, -20.16, z), (box_x, -20.16, z), (box_x, 20.16, z), (goal_x, 20.16, z)]
        six = [(goal_x, -9.16, z), (six_x, -9.16, z), (six_x, 9.16, z), (goal_x, 9.16, z)]
        lines.extend((a, b, 1.35) for a, b in zip(penalty, penalty[1:]))
        lines.extend((a, b, 1.35) for a, b in zip(six, six[1:]))
    return lines

def draw_clipped_pitch_line(ax, camera: dict[str, Any], bounds: dict[str, float], p1: tuple[float, float, float], p2: tuple[float, float, float], lw: float, alpha: float = 0.9) -> None:
    clipped = clip_xy_to_bounds(p1, p2, bounds)
    if clipped is not None:
        draw_projected_line(ax, camera, clipped[0], clipped[1], "#DDE8D5", lw, alpha)

def draw_clipped_circle(ax, camera: dict[str, Any], bounds: dict[str, float], center_x: float, center_y: float, radius: float, lw: float, alpha: float) -> None:
    theta = np.linspace(0, 2 * np.pi, 160)
    pts = [(center_x + radius * np.cos(t), center_y + radius * np.sin(t), LINE_Z) for t in theta]
    for a, b in zip(pts, pts[1:]):
        draw_clipped_pitch_line(ax, camera, bounds, a, b, lw, alpha)

def draw_goal_frame(ax, camera: dict[str, Any], goal_x: float, bounds: dict[str, float]) -> None:
    if not (bounds["x_min"] - 0.2 <= goal_x <= bounds["x_max"] + 0.2):
        return
    if bounds["y_max"] < -3.66 or bounds["y_min"] > 3.66:
        return
    for y in (-3.66, 3.66):
        draw_projected_line(ax, camera, (goal_x, y, 0.0), (goal_x, y, 2.44), "#FFFFFF", 2.3, 1.0)
    draw_projected_line(ax, camera, (goal_x, -3.66, 2.44), (goal_x, 3.66, 2.44), "#FFFFFF", 2.3, 1.0)

def draw_pitch(ax, camera: dict[str, Any], scene_bounds: dict[str, float]) -> None:
    ax.set_facecolor("#050505")
    ax.fill([0, WIDTH, WIDTH, 0], [0, 0, HEIGHT, HEIGHT], color="#050505", zorder=0)
    pitch_bounds = {
        "x_min": max(PITCH_X_MIN, scene_bounds["x_min"]),
        "x_max": min(PITCH_X_MAX, scene_bounds["x_max"]),
        "y_min": max(PITCH_Y_MIN, scene_bounds["y_min"]),
        "y_max": min(PITCH_Y_MAX, scene_bounds["y_max"]),
    }
    apron = [
        (scene_bounds["x_min"], scene_bounds["y_min"], 0.0),
        (scene_bounds["x_max"], scene_bounds["y_min"], 0.0),
        (scene_bounds["x_max"], scene_bounds["y_max"], 0.0),
        (scene_bounds["x_min"], scene_bounds["y_max"], 0.0),
    ]
    draw_projected_poly(ax, camera, apron, "#04110D", 1.0, "#0D2D22", 1.1)
    if pitch_bounds["x_min"] < pitch_bounds["x_max"] and pitch_bounds["y_min"] < pitch_bounds["y_max"]:
        pitch = [
            (pitch_bounds["x_min"], pitch_bounds["y_min"], 0.002),
            (pitch_bounds["x_max"], pitch_bounds["y_min"], 0.002),
            (pitch_bounds["x_max"], pitch_bounds["y_max"], 0.002),
            (pitch_bounds["x_min"], pitch_bounds["y_max"], 0.002),
        ]
        draw_projected_poly(ax, camera, pitch, "#063E2B", 1.0, "#DDE8D5", 1.3)

    for p1, p2, lw in canonical_pitch_lines():
        draw_clipped_pitch_line(ax, camera, scene_bounds, p1, p2, lw, 0.9)
    draw_clipped_circle(ax, camera, scene_bounds, 0.0, 0.0, 9.15, 1.1, 0.7)
    for goal_x in (PITCH_X_MIN, PITCH_X_MAX):
        draw_goal_frame(ax, camera, goal_x, scene_bounds)

def compute_normal_heading(shooter_frames: pd.DataFrame) -> tuple[float, float]:
    before = shooter_frames[shooter_frames["seconds_from_goal"] <= -2.0]
    after = shooter_frames[shooter_frames["seconds_from_goal"] <= 0.0]
    if not before.empty and not after.empty:
        a = before.iloc[-1]
        b = after.iloc[-1]
        vec = np.array([float(b["x"] - a["x"]), float(b["y"] - a["y"])])
        norm = float(np.linalg.norm(vec))
        if norm > 0.25:
            return float(vec[0] / norm), float(vec[1] / norm)
    return -1.0, 0.0

def team_colors(team_names: list[str]) -> dict[str, str]:
    palette = ["#4FC3F7", "#FFB74D", "#C5E1A5", "#EF9A9A"]
    unique = [team for team in team_names if team and team != "BALL"]
    return {team: palette[idx % len(palette)] for idx, team in enumerate(unique)}

def ball_focus_player(frame_pos: pd.DataFrame, sk_frame: pd.DataFrame, fallback_player_id: Any) -> tuple[pd.Series | None, pd.Series | None]:
    players = frame_pos[~frame_pos["is_ball"]].copy()
    ball = frame_pos[frame_pos["is_ball"] == True]
    if players.empty:
        return None, None
    if not ball.empty and pd.notna(ball.iloc[0].get("x")) and pd.notna(ball.iloc[0].get("y")):
        bx = float(ball.iloc[0]["x"])
        by = float(ball.iloc[0]["y"])
        players["dist_to_ball"] = ((players["x"] - bx) ** 2 + (players["y"] - by) ** 2).pow(0.5)
        meta = players.sort_values("dist_to_ball").iloc[0]
    else:
        match = players[players["person_id"] == fallback_player_id]
        meta = match.iloc[0] if not match.empty else players.iloc[0]
    if sk_frame.empty:
        return meta, None
    sk = sk_frame[sk_frame["matched_player_id"] == meta["person_id"]]
    return meta, sk.iloc[0] if not sk.empty else None

def continuous_repaired_ball_camera(
    frame_pos: pd.DataFrame,
    sk_frame: pd.DataFrame,
    shooter_meta: pd.Series,
    render_ball: np.ndarray,
    goal_player_id: Any,
) -> dict[str, Any]:
    focus_meta, focus_row = nearest_focus_to_render_ball(frame_pos, sk_frame, render_ball, goal_player_id)
    if focus_meta is not None and pd.notna(focus_meta.get("x")) and pd.notna(focus_meta.get("y")):
        focus_xy = np.array([float(focus_meta["x"]), float(focus_meta["y"])], dtype=float)
    elif focus_row is not None:
        fx, fy = skeleton_ground_center(focus_row, float(shooter_meta["x"]), float(shooter_meta["y"]))
        focus_xy = np.array([fx, fy], dtype=float)
    else:
        focus_xy = np.array([float(shooter_meta["x"]), float(shooter_meta["y"])], dtype=float)

    ball_xy = render_ball[:2]
    goal_x = active_goal_x(float(ball_xy[0]))
    to_goal = np.array([goal_x, 0.0], dtype=float) - ball_xy
    if np.linalg.norm(to_goal) < 1e-6:
        to_goal = np.array([-1.0 if goal_x < 0.0 else 1.0, 0.0], dtype=float)
    to_goal = normalize(to_goal)

    center_xy = focus_xy * 0.30 + ball_xy * 0.70
    raw_origin = np.array([center_xy[0] - to_goal[0] * 5.8, center_xy[1] - to_goal[1] * 5.8, 2.05], dtype=float)
    raw_target = np.array([render_ball[0], render_ball[1], float(np.clip(render_ball[2], 0.35, 1.25))], dtype=float) * 0.68 + np.array([focus_xy[0], focus_xy[1], 1.05], dtype=float) * 0.20 + np.array([goal_x, 0.0, 1.05], dtype=float) * 0.12

    origin = smooth_vec("follow_origin", raw_origin)
    target = smooth_vec("follow_target", raw_target)

    camera = make_camera(origin, target, 67.0)
    camera["bounds"] = full_pitch_bounds()
    camera["goalpost_action"] = True
    camera["screen_center_y"] = HEIGHT * 0.60
    return camera

def penalty_camera(frame_pos: pd.DataFrame, shooter_meta: pd.Series, render_ball: np.ndarray) -> dict[str, Any]:
    taker_xy = np.array([float(shooter_meta["x"]), float(shooter_meta["y"])], dtype=float)
    goal_x = active_goal_x(float(render_ball[0]))
    to_goal = np.array([goal_x, 0.0], dtype=float) - render_ball[:2]
    if np.linalg.norm(to_goal) < 1e-6:
        to_goal = np.array([-1.0 if goal_x < 0.0 else 1.0, 0.0], dtype=float)
    to_goal = normalize(to_goal)
    focus_xy = render_ball[:2] * 0.58 + taker_xy * 0.42
    origin_xy = focus_xy - to_goal * 8.5
    target = np.array([render_ball[0], render_ball[1], 0.55], dtype=float) * 0.42 + np.array([taker_xy[0], taker_xy[1], 1.05], dtype=float) * 0.22 + np.array([goal_x, 0.0, 1.25], dtype=float) * 0.36
    camera = make_camera(np.array([origin_xy[0], origin_xy[1], 2.25], dtype=float), target, 64.0)
    camera["bounds"] = full_pitch_bounds()
    camera["goalpost_action"] = True
    camera["screen_center_y"] = HEIGHT * 0.60
    return camera

def nearest_focus_to_render_ball(frame_pos: pd.DataFrame, sk_frame: pd.DataFrame, render_ball: np.ndarray, fallback_player_id: Any) -> tuple[pd.Series | None, pd.Series | None]:
    players = frame_pos[frame_pos["is_ball"] != True].copy()
    if not players.empty:
        players["_dist"] = np.hypot(players["x"].astype(float) - render_ball[0], players["y"].astype(float) - render_ball[1])
        best = players.sort_values("_dist").iloc[0]
        player_id = best.get("person_id")
        row = None
        if pd.notna(player_id) and not sk_frame.empty:
            matched = sk_frame[sk_frame["matched_player_id"] == player_id]
            row = matched.iloc[0] if not matched.empty else None
        return best, row
    fallback = frame_pos[frame_pos["person_id"] == fallback_player_id]
    meta = fallback.iloc[0] if not fallback.empty else None
    row = skeleton_row_at(sk_frame, None, fallback_player_id)
    return meta, row

def _frame_rows(
    positions: pd.DataFrame,
    skeletons: pd.DataFrame,
    shooter_frames: pd.DataFrame,
    local_frame: int,
    goal_player_id: Any,
) -> tuple[pd.DataFrame, pd.Series | None, pd.DataFrame, pd.Series | None]:
    frame_pos = positions[positions["local_frame"] == local_frame]
    shooter_frame = shooter_frames[shooter_frames["local_frame"] == local_frame]
    if frame_pos.empty or shooter_frame.empty:
        return frame_pos, None, pd.DataFrame(), None
    shooter_meta = shooter_frame.iloc[0]
    abs_frame = safe_int(shooter_meta["absolute_frame"])
    sk_frame = skeletons[skeletons["absolute_frame"] == abs_frame] if abs_frame is not None else pd.DataFrame()
    shooter_sk = sk_frame[sk_frame["matched_player_id"] == goal_player_id] if goal_player_id is not None else pd.DataFrame()
    shooter_row = shooter_sk.iloc[0] if not shooter_sk.empty else None
    return frame_pos, shooter_meta, sk_frame, shooter_row

def _ball_xy(frame_pos: pd.DataFrame) -> np.ndarray | None:
    ball = frame_pos[frame_pos["is_ball"] == True]
    if ball.empty or pd.isna(ball.iloc[0].get("x")) or pd.isna(ball.iloc[0].get("y")):
        return None
    return np.array([float(ball.iloc[0]["x"]), float(ball.iloc[0]["y"])], dtype=float)

def _player_distance_to_ball(player_row: pd.Series | None, ball_xy: np.ndarray | None) -> float | None:
    if player_row is None or ball_xy is None or pd.isna(player_row.get("x")) or pd.isna(player_row.get("y")):
        return None
    return float(np.linalg.norm(np.array([float(player_row["x"]), float(player_row["y"])], dtype=float) - ball_xy))

def _player_meta(frame_pos: pd.DataFrame, person_id: Any) -> pd.Series | None:
    if person_id is None:
        return None
    rows = frame_pos[frame_pos["person_id"] == person_id]
    return rows.iloc[0] if not rows.empty else None

def _raw_pre_target(frame_pos: pd.DataFrame, selected_meta: pd.Series | None, shooter_meta: pd.Series) -> np.ndarray:
    sx = float(shooter_meta["x"])
    sy = float(shooter_meta["y"])
    if selected_meta is not None and pd.notna(selected_meta.get("x")) and pd.notna(selected_meta.get("y")):
        focus_x = float(selected_meta["x"])
        focus_y = float(selected_meta["y"])
    else:
        focus_x = sx
        focus_y = sy

    target_xy = np.array([focus_x, focus_y], dtype=float)
    ball = ball_xyz(frame_pos, focus_x, focus_y)
    if ball is not None:
        target_xy = target_xy * 0.35 + ball[:2] * 0.65
    return np.array([target_xy[0], target_xy[1], 0.95], dtype=float)

def stage_frames(positions: pd.DataFrame, start_s: float, end_s: float) -> list[int]:
    window = positions[(positions["seconds_from_goal"] >= start_s) & (positions["seconds_from_goal"] <= end_s)]
    return sorted(window["local_frame"].dropna().astype(int).unique().tolist())

def build_focus_plan(
    positions: pd.DataFrame,
    skeletons: pd.DataFrame,
    shooter_frames: pd.DataFrame,
    start_s: float,
    end_s: float,
    goal_player_id: Any,
    normal_heading: tuple[float, float],
    celebration_switch: float,
) -> None:
    FOCUS_PLAN.clear()
    frame_values = stage_frames(positions, start_s, end_s)
    current_focus_id: Any = None
    candidate_focus_id: Any = None
    candidate_count = 0

    for local_frame in frame_values:
        frame_pos, shooter_meta, sk_frame, shooter_row = _frame_rows(positions, skeletons, shooter_frames, local_frame, None)
        if shooter_meta is None:
            continue
        seconds = float(shooter_meta["seconds_from_goal"])
        nearest_meta, _nearest_sk = ball_focus_player(frame_pos, sk_frame, goal_player_id)
        nearest_id = nearest_meta.get("person_id") if nearest_meta is not None else goal_player_id

        if seconds < -2.0:
            ball_xy = _ball_xy(frame_pos)
            current_meta = _player_meta(frame_pos, current_focus_id)
            nearest_dist = _player_distance_to_ball(nearest_meta, ball_xy)
            current_dist = _player_distance_to_ball(current_meta, ball_xy)

            if current_focus_id is None or current_meta is None:
                current_focus_id = nearest_id
                candidate_focus_id = None
                candidate_count = 0
            elif nearest_id != current_focus_id and nearest_dist is not None and current_dist is not None and nearest_dist + FOCUS_SWITCH_MARGIN_M < current_dist:
                if candidate_focus_id == nearest_id:
                    candidate_count += 1
                else:
                    candidate_focus_id = nearest_id
                    candidate_count = 1
                if candidate_count >= FOCUS_SWITCH_FRAMES:
                    current_focus_id = nearest_id
                    candidate_focus_id = None
                    candidate_count = 0
            else:
                candidate_focus_id = None
                candidate_count = 0

            selected_meta = _player_meta(frame_pos, current_focus_id)
            raw_target = _raw_pre_target(frame_pos, selected_meta, shooter_meta)
            FOCUS_PLAN[int(local_frame)] = {"phase": "pre", "focus_id": current_focus_id, "raw_target": raw_target}
        elif seconds > celebration_switch:
            sx = float(shooter_meta["x"])
            sy = float(shooter_meta["y"])
            target_xy = np.array(skeleton_ground_center(shooter_row, sx, sy), dtype=float)
            FOCUS_PLAN[int(local_frame)] = {"phase": "celebration", "focus_id": goal_player_id, "raw_target": np.array([target_xy[0], target_xy[1], 1.08], dtype=float)}

    final_candidates = shooter_frames[shooter_frames["seconds_from_goal"] <= end_s]
    final_row = final_candidates.iloc[(final_candidates["seconds_from_goal"] - end_s).abs().argmin()] if not final_candidates.empty else shooter_frames.iloc[-1]
    final_frame = int(final_row["local_frame"])
    _frame_pos, final_meta, final_sk_frame, final_shooter_row = _frame_rows(positions, skeletons, shooter_frames, final_frame, None)
    global CELEBRATION_HEADING
    if final_meta is not None:
        heading = np.array(skeleton_heading(final_shooter_row, normal_heading), dtype=float)
        if np.linalg.norm(heading) < 1e-6:
            heading = -goal_direction_from_x(float(final_meta["x"]))
        CELEBRATION_HEADING = -normalize(heading)

def smooth_target(phase: str, raw_target: np.ndarray) -> np.ndarray:
    raw = np.array(raw_target, dtype=float)
    previous = CAMERA_TARGET_STATE.get(phase)
    if previous is None:
        CAMERA_TARGET_STATE[phase] = raw
        return raw.copy()

    xy_delta_m = float(np.linalg.norm(raw[:2] - previous[:2]))
    if xy_delta_m < 0.22: # DEAD_ZONE_M
        return previous.copy()

    updated = previous + (raw - previous) * 0.18 # SMOOTH_ALPHA
    CAMERA_TARGET_STATE[phase] = updated
    return updated.copy()

def smooth_target_for_phase(phase: str, raw_target: np.ndarray) -> np.ndarray:
    if phase != "celebration":
        return smooth_target(phase, raw_target)

    raw = np.array(raw_target, dtype=float)
    previous = CAMERA_TARGET_STATE.get(phase)
    if previous is None:
        CAMERA_TARGET_STATE[phase] = raw
        return raw.copy()

    xy_delta_m = float(np.linalg.norm(raw[:2] - previous[:2]))
    if xy_delta_m < CELEBRATION_DEAD_ZONE_M:
        return previous.copy()

    updated = previous + (raw - previous) * CELEBRATION_ALPHA
    CAMERA_TARGET_STATE[phase] = updated
    return updated.copy()

def smooth_vec(key: str, raw: np.ndarray) -> np.ndarray:
    previous = FOLLOW_CAMERA_STATE.get(key)
    raw = np.array(raw, dtype=float)
    if previous is None:
        FOLLOW_CAMERA_STATE[key] = raw
        return raw.copy()

    xy_delta = float(np.linalg.norm(raw[:2] - previous[:2]))
    if xy_delta < 0.18: # FOLLOW_DEAD_ZONE_M
        return previous.copy()

    updated = previous + (raw - previous) * 0.16 # FOLLOW_ALPHA
    FOLLOW_CAMERA_STATE[key] = updated
    return updated.copy()

def locked_front_focus_camera(
    shooter_meta: pd.Series,
    shooter_row: pd.Series | None,
    normal_heading: tuple[float, float],
    goal_player_id: Any,
) -> dict[str, Any]:
    local_frame = int(shooter_meta["local_frame"])
    planned = FOCUS_PLAN.get(local_frame)

    sx = float(shooter_meta["x"])
    sy = float(shooter_meta["y"])
    raw_target = planned["raw_target"] if planned is not None else np.array([*skeleton_ground_center(shooter_row, sx, sy), 1.08], dtype=float)
    target = smooth_target_for_phase("celebration", raw_target)
    
    heading = CELEBRATION_HEADING
    if heading is None or np.linalg.norm(heading) < 1e-6:
        heading = np.array(skeleton_heading(shooter_row, normal_heading), dtype=float)
        if np.linalg.norm(heading) < 1e-6:
            heading = -goal_direction_from_x(float(target[0]))
        heading = -normalize(heading)

    origin = np.array([target[0] + heading[0] * 5.8, target[1] + heading[1] * 5.8, 2.1], dtype=float)
    camera = make_camera(origin, target, 68.0)
    camera["bounds"] = full_pitch_bounds()
    camera["screen_center_y"] = HEIGHT * 0.58
    camera["celebration_front"] = True
    camera["center_xy"] = target[:2]
    camera["focus_player_id"] = goal_player_id
    camera["locked_celebration_camera"] = True
    return camera

def role_color(row: pd.Series, goal: dict[str, Any]) -> tuple[str, str, float, float]:
    player_id = row.get("matched_player_id")
    team_code = row.get("team_code")
    if pd.isna(player_id) and (pd.isna(team_code) or team_code not in {0, 1}):
        return "#F7F7F7", "#C9CED3", 2.15, 0.9 # referee/official
    if player_id == goal["player_id"]:
        return "#FF2D2D", "#FFD6D6", 2.5, 1.0 # scorer
    if pd.notna(team_code) and team_code == goal.get("team_code"):
        return "#F9D84A", "#FFF2A8", 2.25, 0.86 # teammate
    if pd.notna(team_code):
        return "#39A9FF", "#BDEAFF", 2.25, 0.86 # opponent
    return "#8E949A", "#D0D3D6", 1.7, 0.42

def referee_label_point(row: pd.Series) -> np.ndarray | None:
    neck = joint_xyz(row, "neck")
    pelvis = joint_xyz(row, "pelvis")
    if neck is not None and pelvis is not None:
        return (neck + pelvis) * 0.5
    return pelvis

def draw_referee_label(ax, camera: dict[str, Any], row: pd.Series) -> None:
    point = referee_label_point(row)
    if point is None:
        return
    pts, depth = project_points(point.reshape(1, 3), camera)
    if depth[0] <= NEAR_PLANE_M or not np.all(np.isfinite(pts)):
        return
    x, y = float(pts[0, 0]), float(pts[0, 1])
    if not (-120 <= x <= WIDTH + 120 and -120 <= y <= HEIGHT + 120):
        return
    ax.text(
        x,
        y,
        "referee",
        color="#FFFFFF",
        fontsize=8,
        ha="center",
        va="center",
        bbox=dict(boxstyle="round,pad=0.16", facecolor="#050505", edgecolor="#FFFFFF", alpha=0.64, linewidth=0.45),
        zorder=45,
    )

def is_referee_row(row: pd.Series) -> bool:
    team_code = row.get("team_code")
    return pd.isna(row.get("matched_player_id")) and (pd.isna(team_code) or team_code not in {0, 1})

def row_inside_bounds(row: pd.Series | None, bounds: dict[str, float], margin: float = 1.0) -> bool:
    if row is None:
        return False
    pelvis = joint_xyz(row, "pelvis")
    if pelvis is None:
        return True
    return (
        bounds["x_min"] - margin <= float(pelvis[0]) <= bounds["x_max"] + margin
        and bounds["y_min"] - margin <= float(pelvis[1]) <= bounds["y_max"] + margin
    )

def draw_skeletons(ax, camera: dict[str, Any], sk_frame: pd.DataFrame, shooter_row: pd.Series | None, goal: dict[str, Any]) -> None:
    if sk_frame.empty:
        return
    non_scorers = sk_frame[sk_frame["matched_player_id"] != goal["player_id"]].copy()
    if not non_scorers.empty:
        non_scorers["_is_teammate"] = non_scorers["team_code"] == goal.get("team_code")
        non_scorers = non_scorers.sort_values(["_is_teammate", "matched_player_id"], ascending=[True, True])
    for _, row in non_scorers.iterrows():
        line_color, joint_color, linewidth, alpha = role_color(row, goal)
        render_skeleton(ax, camera, row, line_color, joint_color, linewidth, alpha)
        if is_referee_row(row):
            draw_referee_label(ax, camera, row)
    if shooter_row is not None:
        line_color, joint_color, linewidth, alpha = role_color(shooter_row, goal)
        render_skeleton(ax, camera, shooter_row, line_color, joint_color, linewidth, alpha)

def render_skeleton(ax, camera: dict[str, Any], row: pd.Series | None, line_color: str, joint_color: str, linewidth: float, alpha: float = 1.0) -> None:
    if row is None:
        return
    for a, b in SKELETON_EDGES:
        av = joint_xyz(row, a)
        bv = joint_xyz(row, b)
        if av is None or bv is None:
            continue
        draw_projected_line(ax, camera, tuple(av), tuple(bv), line_color, linewidth, alpha)
    for joint in {j for edge in SKELETON_EDGES for j in edge}:
        p = joint_xyz(row, joint)
        if p is not None:
            draw_projected_point(ax, camera, p, joint_color, 70.0, alpha=alpha)

# Ball repair logic functions
def raw_ball_xyz(frame_pos: pd.DataFrame, shooter_meta: pd.Series) -> np.ndarray | None:
    return ball_xyz(frame_pos, float(shooter_meta["x"]), float(shooter_meta["y"]))

def skeleton_row_at(skeletons: pd.DataFrame, absolute_frame: int | None, player_id: Any) -> pd.Series | None:
    if absolute_frame is None or skeletons.empty:
        return None
    frame = skeletons[skeletons["absolute_frame"] == absolute_frame]
    matched = frame[frame["matched_player_id"] == player_id]
    return matched.iloc[0] if not matched.empty else None

def closest_foot_joint(row: pd.Series | None, ball: np.ndarray) -> tuple[str | None, np.ndarray | None]:
    best_joint = None
    best_point = None
    best_dist = float("inf")
    for joint in FOOT_JOINTS:
        point = joint_xyz(row, joint)
        if point is None:
            continue
        dist = float(np.linalg.norm(point[:2] - ball[:2]))
        if dist < best_dist:
            best_joint = joint
            best_point = point
            best_dist = dist
    return best_joint, best_point

def nearest_player_to_ball(frame_pos: pd.DataFrame, ball: np.ndarray) -> tuple[Any | None, float | None]:
    players = frame_pos[frame_pos["is_ball"] != True].copy()
    if players.empty:
        return None, None
    players["_dist"] = np.hypot(players["x"].astype(float) - ball[0], players["y"].astype(float) - ball[1])
    best = players.sort_values("_dist").iloc[0]
    return best.get("person_id"), float(best["_dist"])

def player_position_at(frame_pos: pd.DataFrame, player_id: Any) -> np.ndarray | None:
    match = frame_pos[frame_pos["person_id"] == player_id]
    if match.empty:
        return None
    row = match.iloc[0]
    if pd.isna(row.get("x")) or pd.isna(row.get("y")):
        return None
    return np.array([float(row["x"]), float(row["y"]), 0.18], dtype=float)

def carrier_anchor(frame_pos: pd.DataFrame, skeletons: pd.DataFrame, absolute_frame: int | None, carrier_id: Any, preferred_joint: str | None) -> np.ndarray | None:
    row = skeleton_row_at(skeletons, absolute_frame, carrier_id)
    if preferred_joint is not None:
        point = joint_xyz(row, preferred_joint)
        if point is not None:
            return point
    _joint, point = closest_foot_joint(row, np.array([0.0, 0.0, 0.18], dtype=float))
    if point is not None:
        return point
    return player_position_at(frame_pos, carrier_id)

def collect_track_rows(positions: pd.DataFrame, shooter_frames: pd.DataFrame) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for local_frame in stage_frames(positions, -10.0, 5.0):
        frame_pos = positions[positions["local_frame"] == local_frame]
        shooter_frame = shooter_frames[shooter_frames["local_frame"] == local_frame]
        if frame_pos.empty or shooter_frame.empty:
            continue
        shooter_meta = shooter_frame.iloc[0]
        rows.append(
            {
                "local_frame": int(local_frame),
                "absolute_frame": safe_int(shooter_meta["absolute_frame"]),
                "seconds": float(shooter_meta["seconds_from_goal"]),
                "raw": raw_ball_xyz(frame_pos, shooter_meta),
                "frame_pos": frame_pos,
                "taker_xy": np.array([float(shooter_meta["x"]), float(shooter_meta["y"])], dtype=float),
            }
        )
    return rows

def initialize_track(rows: list[dict[str, Any]]) -> tuple[list[np.ndarray], list[str]]:
    corrected: list[np.ndarray] = []
    modes: list[str] = []
    for row in rows:
        raw = row["raw"]
        if raw is None:
            corrected.append(np.array([row["taker_xy"][0], row["taker_xy"][1], 0.18], dtype=float))
            modes.append("fallback_missing_ball")
        else:
            corrected.append(raw.copy())
            modes.append("raw_ball_used")
    return corrected, modes

def apply_goal3_carrier_repair(rows: list[dict[str, Any]], corrected: list[np.ndarray], modes: list[str], skeletons: pd.DataFrame) -> dict[str, Any]:
    repairs: list[dict[str, Any]] = []
    for idx in range(1, len(rows)):
        raw = rows[idx]["raw"]
        prev = rows[idx - 1]["raw"]
        if raw is None or prev is None or rows[idx]["seconds"] >= SHOT_PRESERVE_FROM_S:
            continue
        step = float(np.linalg.norm(raw[:2] - prev[:2]))
        if step <= SNAP_THRESHOLD_M:
            continue
        start = idx - 1
        while start > 0 and idx - start < 250:
            before = rows[start - 1]["raw"]
            current = rows[start]["raw"]
            if before is None or current is None:
                break
            if float(np.linalg.norm(current[:2] - before[:2])) > FREEZE_THRESHOLD_M:
                break
            start -= 1
        carrier_id, carrier_dist = nearest_player_to_ball(rows[idx]["frame_pos"], raw)
        start_carrier_id, start_carrier_dist = nearest_player_to_ball(rows[start]["frame_pos"], rows[start]["raw"])
        if (
            rows[start]["seconds"] < 0.0
            and start_carrier_dist is not None
            and start_carrier_dist <= 1.0
            and idx - start >= 30
        ):
            set_piece_ball = raw.copy()
            for row_idx in range(start, idx):
                corrected[row_idx] = set_piece_ball.copy()
                modes[row_idx] = "set_piece_stationary_ball_repair"
            repairs.append(
                {
                    "strategy": "set_piece_stationary_ball_repair",
                    "from_seconds": rows[start]["seconds"],
                    "to_seconds": rows[idx - 1]["seconds"],
                    "from_local_frame": rows[start]["local_frame"],
                    "to_local_frame": rows[idx - 1]["local_frame"],
                    "raw_jump_m": step,
                    "stale_frozen_ball": rows[start]["raw"].tolist(),
                    "set_piece_ball": set_piece_ball.tolist(),
                    "nearest_player_at_start_id": str(start_carrier_id) if start_carrier_id is not None else None,
                    "nearest_player_at_start_distance_m": start_carrier_dist,
                    "reacquire_player_id": str(carrier_id) if carrier_id is not None else None,
                    "reacquire_player_distance_m": carrier_dist,
                    "guard_reason": "Use first reliable reacquired ball as fixed set-piece spot; avoid stale freeze and moving-foot anchor.",
                }
            )
            continue
        carrier_row = skeleton_row_at(skeletons, rows[idx]["absolute_frame"], carrier_id) if carrier_id is not None else None
        preferred_joint, reacquire_anchor = closest_foot_joint(carrier_row, raw)
        if carrier_id is None or carrier_dist is None or carrier_dist > 1.5 or reacquire_anchor is None:
            continue
        carrier_offset = raw - reacquire_anchor
        for row_idx in range(start, idx + 1):
            anchor = carrier_anchor(rows[row_idx]["frame_pos"], skeletons, rows[row_idx]["absolute_frame"], carrier_id, preferred_joint)
            if anchor is None:
                continue
            rebuilt = anchor + carrier_offset
            rebuilt[2] = 0.18
            corrected[row_idx] = rebuilt
            modes[row_idx] = "carrier_anchor_frozen_run_repair"
        repairs.append(
            {
                "strategy": "carrier_anchor_frozen_run_repair",
                "from_seconds": rows[start]["seconds"],
                "to_seconds": rows[idx]["seconds"],
                "from_local_frame": rows[start]["local_frame"],
                "to_local_frame": rows[idx]["local_frame"],
                "raw_jump_m": step,
                "carrier_id": str(carrier_id),
                "carrier_distance_at_reacquire_m": carrier_dist,
                "carrier_anchor_joint": preferred_joint,
            }
        )
    return {"repairs": repairs}

def apply_goal5_penalty_repair(rows: list[dict[str, Any]], corrected: list[np.ndarray], modes: list[str]) -> dict[str, Any]:
    reliable_idx = None
    reliable_ball = None
    for idx, row in enumerate(rows):
        raw = row["raw"]
        if raw is None:
            continue
        if float(np.linalg.norm(raw[:2] - row["taker_xy"])) <= RAW_RELIABLE_DISTANCE_TO_TAKER_M:
            reliable_idx = idx
            reliable_ball = raw.copy()
            break
    if reliable_ball is None:
        reliable_idx = len(rows)
        reliable_ball = np.array([-41.5, 0.0, 0.18], dtype=float)
    adjusted: list[int] = []
    for idx, row in enumerate(rows):
        raw = row["raw"]
        if idx < reliable_idx and raw is not None and float(np.linalg.norm(raw[:2] - row["taker_xy"])) >= RAW_STALE_DISTANCE_TO_TAKER_M:
            corrected[idx] = reliable_ball.copy()
            modes[idx] = "penalty_set_piece_repair"
            adjusted.append(row["local_frame"])
    return {
        "repairs": [
            {
                "strategy": "penalty_set_piece_repair",
                "from_seconds": rows[0]["seconds"] if adjusted else None,
                "to_seconds": rows[reliable_idx - 1]["seconds"] if adjusted and reliable_idx and reliable_idx > 0 else None,
                "first_reliable_seconds": rows[reliable_idx]["seconds"] if reliable_idx is not None and reliable_idx < len(rows) else None,
                "first_reliable_local_frame": rows[reliable_idx]["local_frame"] if reliable_idx is not None and reliable_idx < len(rows) else None,
                "first_reliable_ball": reliable_ball.tolist(),
                "adjusted_frame_count": len(adjusted),
                "adjusted_local_frames": adjusted,
            }
        ]
    }

def build_ball_track(strategy: str, positions: pd.DataFrame, shooter_frames: pd.DataFrame, skeletons: pd.DataFrame) -> tuple[dict[int, dict[str, Any]], dict[str, Any]]:
    rows = collect_track_rows(positions, shooter_frames)
    corrected, modes = initialize_track(rows)
    if strategy in {"carrier_anchor_frozen_run_repair", "set_piece_stationary_ball_repair"}:
        repair_info = apply_goal3_carrier_repair(rows, corrected, modes, skeletons)
    elif strategy == "penalty_set_piece_repair":
        repair_info = apply_goal5_penalty_repair(rows, corrected, modes)
    else:
        raise ValueError(f"Unsupported repair strategy: {strategy}")

    track: dict[int, dict[str, Any]] = {}
    for row, repaired, mode in zip(rows, corrected, modes):
        raw = row["raw"]
        delta = None if raw is None else float(np.linalg.norm(raw[:2] - repaired[:2]))
        track[row["local_frame"]] = {"seconds": row["seconds"], "raw": raw, "render_ball": repaired, "mode": mode, "raw_to_render_m": delta}
    return track, repair_info

def render_frame_image(
    goal: dict[str, Any],
    goal_number: int,
    positions: pd.DataFrame,
    shooter_frames: pd.DataFrame,
    skeletons: pd.DataFrame,
    local_frame: int,
    normal_heading: tuple[float, float],
    ball_track: dict[int, dict[str, Any]],
    debug_raw_ball: bool,
    celebration_switch: float,
    is_penalty: bool,
) -> np.ndarray | None:
    frame_pos, shooter_meta, sk_frame, shooter_row = _frame_rows(positions, skeletons, shooter_frames, local_frame, goal["player_id"])
    if shooter_meta is None or local_frame not in ball_track:
        return None

    track = ball_track[local_frame]
    render_ball = track["render_ball"]
    seconds = float(shooter_meta["seconds_from_goal"])

    if seconds > celebration_switch:
        camera = locked_front_focus_camera(shooter_meta, shooter_row, normal_heading, goal["player_id"])
    elif is_penalty:
        camera = penalty_camera(frame_pos, shooter_meta, render_ball)
    else:
        camera = continuous_repaired_ball_camera(frame_pos, sk_frame, shooter_meta, render_ball, goal["player_id"])

    camera_bounds = camera["bounds"]

    fig = plt.figure(figsize=(16, 9), dpi=120)
    fig.patch.set_facecolor("#050505")
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, WIDTH)
    ax.set_ylim(HEIGHT, 0)
    ax.set_axis_off()

    draw_pitch(ax, camera, camera_bounds)
    draw_skeletons(ax, camera, sk_frame, shooter_row, goal)

    if debug_raw_ball and track["raw"] is not None and (track["raw_to_render_m"] or 0.0) > 0.08:
        draw_projected_line(ax, camera, tuple(track["raw"]), tuple(render_ball), "#FF4FD8", 1.3, 0.55, "--")
        draw_projected_point(ax, camera, track["raw"], "#FF4FD8", BALL_MARKER_SIZE * 0.45, "#050505", 0.72)
    draw_projected_point(ax, camera, render_ball, "#FFFFFF", BALL_MARKER_SIZE, "#111111", 1.0)

    phase = "pre-goal" if seconds < 0 else "post-goal" if seconds > 0 else "goal"
    ax.text(42, 48, f"Goal | t={seconds:+.2f}s | {phase}", color="#F5F7FA", fontsize=19, fontweight="bold", ha="left", va="top")

    fig.canvas.draw()
    image = np.asarray(fig.canvas.buffer_rgba())[..., :3].copy()
    plt.close(fig)
    return image

def writer_kwargs(codec: str) -> dict[str, Any]:
    if codec == "h264_nvenc":
        return {
            "fps": 25.0,
            "codec": "h264_nvenc",
            "macro_block_size": 1,
            "ffmpeg_params": [
                "-preset", "p7",
                "-tune", "hq",
                "-rc", "vbr",
                "-cq", "16",
                "-b:v", "0",
                "-maxrate", "40M",
                "-bufsize", "80M",
                "-profile:v", "high",
                "-pix_fmt", "yuv420p",
                "-spatial_aq", "1",
                "-aq-strength", "10",
            ],
        }
    return {
        "fps": 25.0,
        "codec": "libx264",
        "macro_block_size": 1,
        "ffmpeg_params": ["-crf", "18", "-preset", "slow", "-profile:v", "high", "-pix_fmt", "yuv420p"],
    }

def render_video(
    goal: dict[str, Any],
    goal_number: int,
    positions: pd.DataFrame,
    shooter_frames: pd.DataFrame,
    skeletons: pd.DataFrame,
    normal_heading: tuple[float, float],
    ball_track: dict[int, dict[str, Any]],
    out_path: Path,
    codec: str,
    debug_raw_ball: bool,
    celebration_switch: float,
    is_penalty: bool,
) -> dict[str, Any]:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    reset_camera_state()
    build_focus_plan(positions, skeletons, shooter_frames, -10.0, 5.0, goal["player_id"], normal_heading, celebration_switch)

    frame_values = stage_frames(positions, -10.0, 5.0)
    writer = imageio.get_writer(str(out_path), format="FFMPEG", **writer_kwargs(codec))
    rendered_frames = 0
    try:
        for local_frame in frame_values:
            image = render_frame_image(
                goal=goal,
                goal_number=goal_number,
                positions=positions,
                shooter_frames=shooter_frames,
                skeletons=skeletons,
                local_frame=int(local_frame),
                normal_heading=normal_heading,
                ball_track=ball_track,
                debug_raw_ball=debug_raw_ball,
                celebration_switch=celebration_switch,
                is_penalty=is_penalty,
            )
            if image is None:
                continue
            writer.append_data(image)
            rendered_frames += 1
    finally:
        writer.close()
    return {"video_path": str(out_path), "status": "ok", "codec": codec, "frames": rendered_frames}

def render_video_with_fallback(*args: Any, **kwargs: Any) -> dict[str, Any]:
    out_path = kwargs["out_path"]
    try:
        return render_video(*args, **kwargs, codec="h264_nvenc")
    except Exception as exc:
        if out_path.exists():
            out_path.unlink()
        print(f"NVENC render failed for {out_path.name}; falling back to libx264. Reason: {exc}")
        return render_video(*args, **kwargs, codec="libx264")

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render repaired video from goal Parquets.")
    parser.add_argument("--in-dir", required=True, help="Directory containing the input parquets.")
    parser.add_argument("--out-path", help="Output MP4 path. Defaults to [in-dir]/videos/[match]_goal_[goal_number]_repaired.mp4")
    parser.add_argument("--strategy", choices=["carrier_anchor_frozen_run_repair", "set_piece_stationary_ball_repair", "penalty_set_piece_repair"], help="Ball repair strategy.")
    parser.add_argument("--audit-csv", help="Optional audit CSV path to auto-detect strategy.")
    parser.add_argument("--debug-raw-ball", action="store_true", help="Visualize raw ball and repair offsets.")
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()

def main() -> None:
    args = parse_args()
    in_dir = Path(args.in_dir)

    if not in_dir.exists():
        raise FileNotFoundError(f"Input directory does not exist: {in_dir}")

    goal = pd.read_parquet(in_dir / "goal_event.parquet").iloc[0].to_dict()
    goal_number = int(goal["event_id"]) if "event_id" in goal else 1
    try:
        goal_number = int(goal_number)
    except Exception:
        goal_number = 1

    if args.out_path:
        out_path = Path(args.out_path)
    else:
        match_name = goal.get("match_name", in_dir.parent.name)
        try:
            folder_goal_num = int(in_dir.name.split("_")[-1])
        except Exception:
            folder_goal_num = goal_number
        out_path = in_dir / "videos" / f"{match_name}_goal_{folder_goal_num:02d}_repaired.mp4"

    if out_path.exists() and not args.force:
        print(f"Output file already exists, skipping: {out_path}")
        return

    positions = pd.read_parquet(in_dir / "goal_window_positions.parquet")
    shooter_frames = pd.read_parquet(in_dir / "goal_window_shooter_frames.parquet")
    skeletons = pd.read_parquet(in_dir / "goal_window_skeletons.parquet")

    # Resolve strategy
    strategy = args.strategy
    if not strategy and args.audit_csv:
        audit_path = Path(args.audit_csv)
        if audit_path.exists():
            try:
                with audit_path.open("r", encoding="utf-8-sig", newline="") as handle:
                    rows = list(csv.DictReader(handle))
                audit = {(row["match_name"], int(row["goal_number"])): row["proposed_strategy"] for row in rows}
                match_name = goal["match_name"]
                key = (match_name, goal_number)
                if key in audit:
                    strategy = audit[key]
                    print(f"Auto-detected strategy '{strategy}' for {match_name} Goal {goal_number} from audit CSV.")
            except Exception as e:
                print(f"Error reading audit CSV: {e}")

    if not strategy:
        # Default fallback
        strategy = "carrier_anchor_frozen_run_repair"
        print(f"No strategy specified or detected, defaulting to '{strategy}'")

    is_penalty = (strategy == "penalty_set_piece_repair")
    celebration_switch = 2.0 if is_penalty else 1.0

    normal_heading = compute_normal_heading(shooter_frames)
    ball_track, repair_info = build_ball_track(strategy, positions, shooter_frames, skeletons)

    print(f"Rendering repaired video for goal using strategy '{strategy}' to {out_path}...")
    render_video_with_fallback(
        goal=goal,
        goal_number=goal_number,
        positions=positions,
        shooter_frames=shooter_frames,
        skeletons=skeletons,
        normal_heading=normal_heading,
        ball_track=ball_track,
        out_path=out_path,
        debug_raw_ball=args.debug_raw_ball,
        celebration_switch=celebration_switch,
        is_penalty=is_penalty,
    )
    print(f"Video rendering complete: {out_path}")

if __name__ == "__main__":
    main()
