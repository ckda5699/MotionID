# Match Highlight Videos

Add highlight MP4 files here using the game `sourceKey` as the filename:

- Bayern_Hamburg_goal_01.mp4
- Bayern_Hamburg_goal_02.mp4
- Frankfurt_Bayern_goal_01.mp4
- Frankfurt_Bayern_goal_03.mp4
- Union_Bayern_goal_04.mp4

The reveal screen first tries `/media/highlights/{sourceKey}.mp4` for `Match Highlight Video`.
If a highlight file is missing, it falls back to the Motion ID clip so the UI does not break.
