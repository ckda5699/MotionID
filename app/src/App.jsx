import { useEffect, useState } from "react";
import { games, localDemoSourceKeys, modes, sampleResults, stages } from "./data/appData.js";
import { clearProgress, saveProgress } from "./lib/progressStore.js";
import { AgentationDevTool } from "./components/AgentationDevTool.jsx";
import { PhoneFrame } from "./components/PhoneFrame.jsx";
import { ComingSoonScreen, HomeScreen, InsightScreen, LeaderboardScreen, LiveChallengeCountdownScreen, LobbyScreen, MatchesScreen, NewsScreen, ProfileScreen, QuizScreen, ResultsScreen, RevealScreen, StatsScreen } from "./components/Screens.jsx";

const screenMap = {
  home: "home",
  lobby: "lobby",
  quiz: "quiz",
  reveal: "reveal",
  insight: "insight",
  results: "results",
  leaderboard: "leaderboard",
  news: "news",
  matches: "matches",
  stats: "stats",
  comingSoon: "comingSoon",
  liveCountdown: "liveCountdown",
  profile: "profile",
};

// Set to true to re-enable the dev QA sidebar and Agentation toolbar during development
const SHOW_DEV_TOOLS = false;

const qaScreens = [
  ["home", "Home"],
  ["lobby", "Lobby"],
  ["liveCountdown", "Live countdown"],
  ["quiz", "Quiz"],
  ["reveal", "Reveal"],
  ["insight", "Insight"],
  ["results", "Results"],
  ["leaderboard", "Leaderboard"],
  ["matches", "Matches"],
  ["news", "News"],
  ["stats", "Stats"],
  ["profile", "Profile"],
];

function initialScreen() {
  const value = new URLSearchParams(window.location.search).get("screen");
  if (screenMap[value]) return screenMap[value];
  return "home";
}

function initialStage() {
  const value = Number(new URLSearchParams(window.location.search).get("stage"));
  if (stages.some((stage) => stage.id === value)) return value;
  return 1;
}

const bayernKeys = ["Union_Bayern_goal_04", "Bayern_Hamburg_goal_01", "Frankfurt_Bayern_goal_03"];
const otherKeys = ["Dortmund_Stuttgart_goal_01", "Frankfurt_Union_goal_01"];

function generateSessionQueue() {
  const bayernIndexes = [];
  const otherIndexes = [];

  games.forEach((game, index) => {
    if (bayernKeys.includes(game.sourceKey)) {
      bayernIndexes.push(index);
    } else if (otherKeys.includes(game.sourceKey)) {
      otherIndexes.push(index);
    }
  });

  const shuffledBayern = [...bayernIndexes].sort(() => Math.random() - 0.5);
  const chosenBayern = shuffledBayern.slice(0, 2);
  const combined = [...chosenBayern, ...otherIndexes];
  return combined.sort(() => Math.random() - 0.5);
}

function activeTabFor(screen) {
  if (screen === "home") return "Home";
  if (screen === "matches") return "Matches";
  if (screen === "news") return "News";
  if (screen === "stats") return "Table & Stats";
  if (["lobby", "quiz", "reveal", "insight", "results", "liveCountdown"].includes(screen)) return "MotionID";
  if (screen === "leaderboard") return "Profile";
  return "Profile";
}

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentScreen, setCurrentScreen] = useState(initialScreen);
  const [sessionQueue, setSessionQueue] = useState(() => generateSessionQueue());
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const currentGameIndex = sessionQueue[currentQueueIndex] ?? 0;
  const [activeStage, setActiveStage] = useState(initialStage);
  const [lockedResult, setLockedResult] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("locked") !== "1") return null;
    const stage = stages.find((item) => item.id === initialStage()) ?? stages[0];
    return { ...sampleResults[0], id: "query-locked", answeredStage: stage.id, submittedAnswer: params.get("answer") ?? "Luis Diaz", pointsEarned: stage.id === 1 ? 100 : stage.floor };
  });
  const [lastResult, setLastResult] = useState(sampleResults[0]);
  const [sessionResults, setSessionResults] = useState([]);
  const [comingSoonMode, setComingSoonMode] = useState(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [selectedFixtureDate, setSelectedFixtureDate] = useState(null);
  const [userMatchdayScore, setUserMatchdayScore] = useState(0);
  const [userMatchdayGames, setUserMatchdayGames] = useState(0);

  const currentGame = games[currentGameIndex] ?? games[0];
  const selectedMode = modes.find((mode) => mode.id === currentGame.modeId) ?? modes[0];

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowSplash(false), 3000);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!currentGame?.video) return;
    const preload = document.createElement("video");
    preload.preload = "auto";
    preload.muted = true;
    preload.src = currentGame.video;
  }, [currentGame]);

  useEffect(() => {
    saveProgress({ currentScreen, currentGameIndex, activeStage, lockedResult, lastResult, sessionResults, userMatchdayScore, userMatchdayGames });
  }, [currentScreen, currentGameIndex, activeStage, lockedResult, lastResult, sessionResults, userMatchdayScore, userMatchdayGames]);

  const navigate = (target) => {
    if (target === "Home") setCurrentScreen("home");
    else if (target === "MotionID") setCurrentScreen("lobby");
    else if (target === "News") setCurrentScreen("news");
    else if (target === "Matches") {
      setSelectedFixtureDate(null);
      setCurrentScreen("matches");
    }
    else if (target === "Table & Stats") setCurrentScreen("stats");
    else setCurrentScreen("profile");
  };

  const startMode = (modeId = "goals", intent = "start") => {
    const mode = modes.find((item) => item.id === modeId);
    if (modeId === "goals" && intent === "schedule") {
      setCurrentScreen("liveCountdown");
      return;
    }
    if (mode?.comingSoon) {
      setComingSoonMode(mode);
      setCurrentScreen("comingSoon");
      return;
    }
    if (modeId === "goals") {
      const newQueue = generateSessionQueue();
      setSessionQueue(newQueue);
      setCurrentQueueIndex(0);
    } else {
      const targetIndex = Math.max(0, games.findIndex((game) => game.modeId === modeId));
      setSessionQueue([targetIndex]);
      setCurrentQueueIndex(0);
    }
    setActiveStage(1);
    setLockedResult(null);
    setCurrentScreen("quiz");
  };

  const requestQuitGame = () => {
    if (currentScreen === "quiz") {
      setShowQuitConfirm(true);
      return;
    }
    setCurrentScreen("home");
  };

  const confirmQuitGame = () => {
    setShowQuitConfirm(false);
    setActiveStage(1);
    setLockedResult(null);
    setCurrentScreen("lobby");
  };

  const persistResult = (result) => {
    setSessionResults((current) => current.some((item) => item.id === result.id) ? current : [...current, result]);
  };

  const completeRound = (result) => {
    const datedResult = { ...result, matchDate: result.matchDate ?? "Matchday 34 - Sat 16 May 2026" };
    setLockedResult(datedResult);
    setLastResult(datedResult);
    persistResult(datedResult);
    setUserMatchdayScore((prev) => prev + (result.pointsEarned ?? 0));
    setUserMatchdayGames((prev) => prev + 1);
    setReviewMode(false);
    setCurrentScreen("reveal");
  };

  const nextGame = () => {
    if (lastResult) persistResult(lastResult);
    if (sessionResults.length >= 4) {
      setCurrentScreen("results");
      return;
    }
    setCurrentQueueIndex((prev) => prev + 1);
    setActiveStage(1);
    setLockedResult(null);
    setCurrentScreen("quiz");
  };

  const playAgain = () => {
    clearProgress();
    const newQueue = generateSessionQueue();
    setSessionQueue(newQueue);
    setCurrentQueueIndex(0);
    setActiveStage(1);
    setLockedResult(null);
    setLastResult(sampleResults[0]);
    setSessionResults([]);
    setUserMatchdayScore(0);
    setUserMatchdayGames(0);
    setCurrentScreen("lobby");
  };

  const openMatchesForDate = (dateISO) => {
    setSelectedFixtureDate(dateISO);
    setCurrentScreen("matches");
  };

  const navigateFromHome = (target) => {
    if (target === "matches") setSelectedFixtureDate(null);
    setCurrentScreen(target);
  };

  const renderScreen = () => {
    if (currentScreen === "home") return <HomeScreen onPlay={() => setCurrentScreen("lobby")} onNavigate={navigateFromHome} onOpenMatchesDate={openMatchesForDate} />;
    if (currentScreen === "lobby") return <LobbyScreen selectedMode={selectedMode} onPlay={startMode} />;
    if (currentScreen === "liveCountdown") return <LiveChallengeCountdownScreen onBack={() => setCurrentScreen("lobby")} onPlayNow={() => startMode("goals")} />;
    if (currentScreen === "quiz") return <QuizScreen game={currentGame} onQuit={requestQuitGame} onComplete={(result) => { setActiveStage(1); completeRound(result); }} />;
    if (currentScreen === "reveal") return <RevealScreen game={currentGame} result={lastResult} isLast={sessionResults.length >= 4} onNext={nextGame} reviewMode={reviewMode} onBackToResults={() => { setReviewMode(false); setCurrentScreen("results"); }} />;
    if (currentScreen === "insight") return <InsightScreen onBack={() => setCurrentScreen("reveal")} />;
    if (currentScreen === "results") return (
      <ResultsScreen
        results={sessionResults}
        userScore={userMatchdayScore}
        onInsight={() => setCurrentScreen("insight")}
        onPlayAgain={playAgain}
        onLeaderboard={() => setCurrentScreen("leaderboard")}
        onViewReveal={(gameId, result) => {
          const gameIndex = games.findIndex((game) => game.id === gameId);
          if (gameIndex >= 0) {
            const queuePos = sessionQueue.indexOf(gameIndex);
            if (queuePos >= 0) {
              setCurrentQueueIndex(queuePos);
            }
            setLastResult(result);
            setReviewMode(true);
            setCurrentScreen("reveal");
          }
        }}
      />
    );
    if (currentScreen === "leaderboard") return <LeaderboardScreen userScore={userMatchdayScore} userGames={userMatchdayGames} />;
    if (currentScreen === "news") return <NewsScreen />;
    if (currentScreen === "matches") return <MatchesScreen selectedDate={selectedFixtureDate} onSelectDate={setSelectedFixtureDate} onClearDate={() => setSelectedFixtureDate(null)} />;
    if (currentScreen === "stats") return <StatsScreen />;
    if (currentScreen === "comingSoon") return <ComingSoonScreen mode={comingSoonMode} onBack={() => setCurrentScreen("lobby")} />;
    return <ProfileScreen onNavigate={setCurrentScreen} />;
  };

  return (
    <>
      {showSplash ? <StartupSplash /> : null}
      <main className={SHOW_DEV_TOOLS && import.meta.env.DEV ? "app-lab-shell app-lab-shell-dev" : "app-lab-shell"} aria-label="Bundesliga Motion ID prototype">
        {SHOW_DEV_TOOLS && import.meta.env.DEV ? (
          <aside className="dev-switcher" aria-label="Motion ID QA screen switcher">
            <h2>Motion ID QA</h2>
            {qaScreens.map(([screen, label]) => (
              <button
                key={screen}
                className={currentScreen === screen ? "active" : ""}
                type="button"
                onClick={() => {
                  if (screen === "matches") setSelectedFixtureDate(null);
                  setCurrentScreen(screen);
                }}
              >
                {label}
              </button>
            ))}
          </aside>
        ) : null}
        <PhoneFrame immersive={currentScreen === "quiz"} activeTab={activeTabFor(currentScreen)} onNavigate={navigate} onBack={requestQuitGame} topVariant={currentScreen === "home" || currentScreen === "leaderboard" ? "league" : "feature"}>
          {renderScreen()}
        </PhoneFrame>
      </main>
      {showQuitConfirm ? (
        <div className="quit-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="quit-title">
          <article className="quit-modal">
            <h2 id="quit-title">Leave live game?</h2>
            <p>Your current timed round will be abandoned.</p>
            <div className="action-row">
              <button className="secondary-cta" type="button" onClick={() => setShowQuitConfirm(false)}>Stay</button>
              <button className="primary-cta" type="button" onClick={confirmQuitGame}>Leave</button>
            </div>
          </article>
        </div>
      ) : null}
      {SHOW_DEV_TOOLS ? <AgentationDevTool /> : null}
    </>
  );
}

function StartupSplash() {
  return (
    <div className="startup-splash" aria-label="Bundesliga startup animation">
      <div className="startup-logo">
        <img src="/media/poster_and_thumbnails/Bundesliga_logo_(2017).svg.png" alt="Bundesliga" />
      </div>
    </div>
  );
}
