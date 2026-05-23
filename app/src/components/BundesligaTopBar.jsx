import { Icon } from "./Icon.jsx";
import { MotionIdLogo } from "./MotionIdLogo.jsx";

export function BundesligaTopBar({ variant = "feature", onNavigate, onBack }) {
  return (
    <header className="bundesliga-topbar">
      <button className="icon-button" aria-label="Back" onClick={() => onBack?.() ?? onNavigate?.("Home")}>
        <Icon name="back" />
      </button>
      <div className="league-mark" aria-label="Bundesliga">
        <span className="bundesliga-badge">
          <img src="/media/poster_and_thumbnails/Bundesliga_logo_cropped_(2017).svg.png" alt="" />
        </span>
        <div>
          {variant === "feature" ? <MotionIdLogo compact /> : null}
        </div>
      </div>
      <button className="icon-button notification" aria-label="Notifications">
        <Icon name="bell" />
      </button>
    </header>
  );
}
