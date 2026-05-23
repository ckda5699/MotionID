import { BundesligaTopBar } from "./BundesligaTopBar.jsx";
import { BottomNav } from "./BottomNav.jsx";

export function PhoneFrame({ children, activeTab, onNavigate, onBack, topVariant = "feature", immersive = false }) {
  return (
    <section className="phone-frame" aria-label="Mobile app preview">
      <span className="side-key side-key-left-top" />
      <span className="side-key side-key-left-bottom" />
      <span className="side-key side-key-right" />
      <div className={immersive ? "phone-screen phone-screen-immersive" : "phone-screen"}>
        {immersive ? null : <BundesligaTopBar variant={topVariant} onNavigate={onNavigate} onBack={onBack} />}
        <div className="phone-content">{children}</div>
        {immersive ? null : <BottomNav activeTab={activeTab} onNavigate={onNavigate} />}
      </div>
    </section>
  );
}
