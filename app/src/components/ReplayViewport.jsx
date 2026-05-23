import { useEffect, useRef, useState } from "react";

function formatTime(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const whole = Math.floor(safeSeconds);
  return `0:${String(whole).padStart(2, "0")}`;
}

export function ReplayViewport({ game, stage, active, locked, phase, onProgress, onEnded }) {
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const videoSource = game.video ?? game.fallbackVideo;
  const windowStart = stage.sourceWindow?.start ?? 0;
  const windowEnd = stage.sourceWindow?.end ?? 15;
  const duration = Math.max(0.1, windowEnd - windowStart);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setReady(false);
    video.pause();
    video.currentTime = windowStart;
    onProgress?.(0);
  }, [game.id, stage.id, windowStart, onProgress]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !ready) return;

    if (active && phase === "playing") {
      const playPromise = video.play();
      if (playPromise) playPromise.catch(() => { });
      return;
    }

    video.pause();
  }, [active, phase, ready, stage.id]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.currentTime < windowStart) {
      video.currentTime = windowStart;
      onProgress?.(0);
      return;
    }

    if (video.currentTime >= windowEnd) {
      video.pause();
      video.currentTime = windowEnd;
      onProgress?.(1);
      onEnded?.();
      return;
    }

    onProgress?.((video.currentTime - windowStart) / duration);
  };

  return (
    <section className={stage.type === "cue" ? "replay-card cue-video-card" : "replay-card"} aria-label={`${stage.label} timed clip`}>
      <video
        key={`${game.id}-${stage.id}`}
        ref={videoRef}
        className="replay-video"
        src={videoSource}
        muted
        playsInline
        preload="auto"
        onCanPlay={() => setReady(true)}
        onLoadedMetadata={(event) => {
          event.currentTarget.currentTime = windowStart;
        }}
        onTimeUpdate={handleTimeUpdate}
      />
      <div className="replay-topline">
        <span className="replay-live-dot" />
        <span>{stage.segmentLabel}</span>
        <strong>{stage.type === "cue" ? "Full clip + cues" : `${formatTime(duration)} timed clip`}</strong>
        <em>No replay</em>
      </div>
    </section>
  );
}
