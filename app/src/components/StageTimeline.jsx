export function StageTimeline({ activeStage = 1, lockedStage, onStageSelect }) {
  return (
    <ol className="stage-timeline" aria-label={`Stage ${activeStage} of 5`}>
      {[1, 2, 3, 4, 5].map((stage) => (
        <li key={stage} className={stage === activeStage ? "stage active" : stage <= (lockedStage ?? activeStage - 1) ? "stage complete" : "stage"}>
          <button type="button" disabled={!onStageSelect} onClick={() => onStageSelect?.(stage)} aria-label={`Stage ${stage}`}>
            {stage}
          </button>
        </li>
      ))}
    </ol>
  );
}
