import { useMemo } from "react";
import { Icon } from "./Icon.jsx";
import { normalizeName } from "../lib/scoring.js";

export function AnswerBar({ value, locked, onChange, onLock, suggestions = [] }) {
  const visibleSuggestions = useMemo(() => {
    const query = normalizeName(value);
    if (!query || query.length < 2 || locked) return [];
    const seen = new Set();
    return suggestions
      .filter((name) => {
        const normalized = normalizeName(name);
        if (!normalized.includes(query) || seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      })
      .slice(0, 6);
  }, [locked, suggestions, value]);

  return (
    <section className={locked ? "answer-panel answer-panel-locked" : "answer-panel"} aria-label="Answer player">
      <label className="answer-label" htmlFor="player-answer">Your answer</label>
      <div className="answer-row">
        <div className="input-wrap">
          <Icon name="search" />
          <input
            id="player-answer"
            name="player-answer"
            type="text"
            placeholder="Type player name"
            autoComplete="off"
            aria-describedby="answer-help"
            value={value}
            disabled={locked}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
        {visibleSuggestions.length ? (
          <div className="answer-suggestion-list" role="listbox" aria-label="Player suggestions">
            {visibleSuggestions.map((name) => (
              <button
                key={name}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChange(name)}
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}
        <button className="lock-button" type="button" onClick={onLock} disabled={!value.trim() || locked}>
          <Icon name="lock" />
          <span>{locked ? "Locked" : "Lock answer"}</span>
        </button>
      </div>
      <p id="answer-help" className="answer-help">
        {locked ? "Submitted. The reveal waits until all stages finish." : "Search only. Your first locked answer is final."}
      </p>
    </section>
  );
}
