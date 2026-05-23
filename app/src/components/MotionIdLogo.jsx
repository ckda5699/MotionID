export function MotionIdLogo({ compact = false }) {
  return (
    <div className={compact ? "motion-logo motion-logo-compact" : "motion-logo"} aria-label="Motion ID">
      <span>Motion</span>
      <strong>ID</strong>
    </div>
  );
}
