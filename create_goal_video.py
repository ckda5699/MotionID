import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import cv2
import os
from tqdm import tqdm
from multiprocessing import Pool
import functools
import re

# Load data
base_path = 'Challenge/Match Data/Bayern_Hamburg/goal_01'
pos = pd.read_parquet(f'{base_path}/goal_window_positions.parquet')
skel = pd.read_parquet(f'{base_path}/goal_window_skeletons.parquet')
shooter = pd.read_parquet(f'{base_path}/goal_window_shooter_frames.parquet')
manifest = pd.read_parquet(f'{base_path}/goal_window_manifest.parquet')
event = pd.read_parquet(f'{base_path}/goal_event.parquet')

abs_goal_frame = manifest['absolute_goal_frame'].iloc[0]
abs_start = manifest['absolute_start_frame'].iloc[0]
abs_end = manifest['absolute_end_frame'].iloc[0]
frames = sorted(skel['absolute_frame'].unique())

clip1_start = max(abs_start, abs_goal_frame - 50)
clip1_end = min(abs_end, abs_goal_frame + 25)
clip2_start = max(abs_start, clip1_start - 125)
clip2_end = clip1_start
clip3_start = clip1_end
clip3_end = abs_end

# Decrease frame rate further to speed up processing for testing
skip_frames = 2

f_clip1 = [f for f in frames if clip1_start <= f <= clip1_end][::skip_frames]
f_clip2 = [f for f in frames if clip2_start < f < clip2_end][::skip_frames]
f_clip3 = [f for f in frames if clip3_start < f <= clip3_end][::skip_frames]

bones = [
    ('l_ear', 'nose'), ('r_ear', 'nose'), ('nose', 'neck'),
    ('neck', 'l_shoulder'), ('neck', 'r_shoulder'),
    ('l_shoulder', 'l_elbow'), ('r_shoulder', 'r_elbow'),
    ('l_elbow', 'l_wrist'), ('r_elbow', 'r_wrist'),
    ('neck', 'pelvis'),
    ('pelvis', 'l_hip'), ('pelvis', 'r_hip'),
    ('l_hip', 'l_knee'), ('r_hip', 'r_knee'),
    ('l_knee', 'l_ankle'), ('r_knee', 'r_ankle'),
    ('l_ankle', 'l_heel'), ('r_ankle', 'r_heel'),
    ('l_heel', 'l_toe'), ('r_heel', 'r_toe'),
    ('l_ankle', 'l_toe'), ('r_ankle', 'r_toe')
]

def render_frame(f, output_dir):
    skel_f = skel[skel['absolute_frame'] == f]
    pos_f = pos[pos['absolute_frame'] == f]

    fig = plt.figure(figsize=(10, 8), facecolor='black')
    ax = fig.add_subplot(111, projection='3d', facecolor='black')

    # Pitch
    ax.plot([-52.5, 52.5], [-34, -34], [0, 0], color='gray', alpha=0.5)
    ax.plot([-52.5, 52.5], [34, 34], [0, 0], color='gray', alpha=0.5)
    ax.plot([-52.5, -52.5], [-34, 34], [0, 0], color='gray', alpha=0.5)
    ax.plot([52.5, 52.5], [-34, 34], [0, 0], color='gray', alpha=0.5)
    ax.plot([0, 0], [-34, 34], [0, 0], color='gray', alpha=0.5)
    ax.plot([36, 52.5], [-20.16, -20.16], [0, 0], color='gray', alpha=0.5)
    ax.plot([36, 52.5], [20.16, 20.16], [0, 0], color='gray', alpha=0.5)
    ax.plot([36, 36], [-20.16, 20.16], [0, 0], color='gray', alpha=0.5)

    # Goal box
    ax.plot([52.5, 52.5], [-7.32/2, 7.32/2], [2.44, 2.44], color='white')
    ax.plot([52.5, 52.5], [-7.32/2, -7.32/2], [0, 2.44], color='white')
    ax.plot([52.5, 52.5], [7.32/2, 7.32/2], [0, 2.44], color='white')

    center_x, center_y = 40, 0
    ball = pos_f[pos_f['is_ball'] == True]
    if not ball.empty:
        center_x, center_y = ball.iloc[0]['x'], ball.iloc[0]['y']
        bx, by, bz = center_x, center_y, ball.iloc[0]['z']
        ax.scatter(bx, by, bz, color='white', s=50)

    for idx, row in skel_f.iterrows():
        color = '#1f77b4'
        for bone in bones:
            p1, p2 = bone
            x1, y1, z1 = row[f'{p1}_x'], row[f'{p1}_y'], row[f'{p1}_z']
            x2, y2, z2 = row[f'{p2}_x'], row[f'{p2}_y'], row[f'{p2}_z']
            ax.plot([x1, x2], [y1, y2], [z1, z2], color=color, linewidth=1.5, marker='o', markersize=2)

    ax.view_init(elev=20, azim=-60)
    ax.set_xlim([15, 55])
    ax.set_ylim([-30, 30])
    ax.set_zlim([0, 8])
    ax.axis('off')

    out_path = f'{output_dir}/f_{f}.png'
    plt.savefig(out_path, bbox_inches='tight', facecolor='black', dpi=80)
    plt.close(fig)
    return out_path

def create_video(frames_list, output_name, temp_dir):
    os.makedirs(temp_dir, exist_ok=True)

    render_func = functools.partial(render_frame, output_dir=temp_dir)
    with Pool(os.cpu_count()) as p:
        images_paths = list(tqdm(p.imap(render_func, frames_list), total=len(frames_list)))

    images_paths.sort(key=lambda f: int(re.sub(r'\D', '', f)))

    if images_paths:
        frame = cv2.imread(images_paths[0])
        height, width, layers = frame.shape
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        video = cv2.VideoWriter(output_name, fourcc, 12.5, (width, height))

        for image in images_paths:
            video.write(cv2.imread(image))

        cv2.destroyAllWindows()
        video.release()
        print(f"Video saved as {output_name}")

if __name__ == '__main__':
    print("Generating clip1.mp4...")
    create_video(f_clip1, 'clip1.mp4', 'temp_clip1')
    print("Generating clip2.mp4...")
    create_video(f_clip2, 'clip2.mp4', 'temp_clip2')
    print("Generating clip3.mp4...")
    create_video(f_clip3, 'clip3.mp4', 'temp_clip3')
