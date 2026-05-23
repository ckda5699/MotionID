import { Icon } from "./Icon.jsx";

const tabs = [
  { label: "Home", imageSrc: "/media/poster_and_thumbnails/Home.png" },
  { label: "Matches", imageSrc: "/media/poster_and_thumbnails/Matches.png" },
  { label: "Table & Stats", imageSrc: "/media/poster_and_thumbnails/Tables%20and%20Stats.png" },
  { label: "MotionID", icon: "focus" },
  { label: "Profile", imageSrc: "/media/poster_and_thumbnails/Profile.png" },
];

export function BottomNav({ activeTab = "Motion ID", onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="Bundesliga app navigation">
      {tabs.map(({ label, imageSrc, icon }) => (
        <button
          key={label}
          className={label === activeTab ? "bottom-tab active" : "bottom-tab"}
          aria-current={label === activeTab ? "page" : undefined}
          onClick={() => onNavigate(label)}
        >
          <span className={icon ? "bottom-tab-icon bottom-tab-icon-svg" : "bottom-tab-icon"}>
            {icon ? <Icon name={icon} /> : <img src={imageSrc} alt="" />}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
