import { useEffect, useMemo, useRef, useState } from "react";
import { games, leaderboardTabs, localHighlightVideos, matchRows, modes, movementMetrics, players, stages, user } from "../data/appData.js";
import { clubNewsGoalCards, topStoryCards } from "../data/newsGoalsData.js";
import { bundesligaClubs, bundesligaPlayers, bundesligaTable } from "../data/tableStatsData.js";
import { calculateStageScore, findPlayerByName, normalizeName, scoreRound } from "../lib/scoring.js";
import matchScoresCsv from "../../source-data/table-stats/bundesliga_matches_scores.csv?raw";
import playerStatsCsv from "../../source-data/table-stats/bundesliga_players.csv?raw";
import { AnswerBar } from "./AnswerBar.jsx";
import { Icon } from "./Icon.jsx";
import { MotionIdLogo } from "./MotionIdLogo.jsx";
import { ReplayViewport } from "./ReplayViewport.jsx";
import { StageTimeline } from "./StageTimeline.jsx";

const COUNTDOWN_VALUES = ["Ready", "3", "2", "1"];

function getStageDuration(stage) {
  if (stage.sourceWindow) return Math.max(1, stage.sourceWindow.end - stage.sourceWindow.start);
  return stage.cueSeconds ?? 3;
}

function getPhaseSeconds(stage, phase) {
  if (phase === "countdown") return COUNTDOWN_VALUES.length;
  if (phase === "playing") return getStageDuration(stage);
  if (phase === "answerGrace") return stage.answerGraceSeconds ?? 5;
  return 1;
}

function getCountdownText(secondsLeft) {
  const index = Math.max(0, Math.min(COUNTDOWN_VALUES.length - 1, COUNTDOWN_VALUES.length - secondsLeft));
  return COUNTDOWN_VALUES[index];
}

function formatClock(seconds) {
  return `00:${String(Math.max(0, Math.ceil(seconds))).padStart(2, "0")}`;
}

function MediaPoster({ tone = "default", title, kicker, compact = false, imageSrc }) {
  const isHero = tone === "hero";
  const className = [
    "media-poster",
    `media-poster-${tone}`,
    compact ? "compact" : "",
    imageSrc ? "with-image" : "",
  ].filter(Boolean).join(" ");
  return (
    <div className={className}>
      {imageSrc ? <img className="poster-image" src={imageSrc} alt="" loading="lazy" /> : null}
      <span className="poster-kicker">{kicker}</span>
      {title ? <strong>{title}</strong> : null}
      {isHero && !imageSrc ? (
        <svg className="hero-skeleton-art" viewBox="0 0 150 190" aria-hidden="true">
          <defs>
            <radialGradient id="hero-floor-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(227,6,19,.42)" />
              <stop offset="100%" stopColor="rgba(227,6,19,0)" />
            </radialGradient>
          </defs>
          <ellipse cx="75" cy="163" rx="58" ry="18" fill="url(#hero-floor-glow)" />
          <path className="hero-body-shadow" d="M69 25c16 0 29 12 29 31v64c0 22-9 42-24 42-18 0-34-21-34-47V62c0-22 10-37 29-37Z" />
          <g className="hero-bones">
            <path d="M70 34 62 55 78 56 70 34Z" />
            <path d="M62 55 54 85 78 56 95 79" />
            <path d="M54 85 47 126 34 157" />
            <path d="M78 56 83 95 76 130 69 164" />
            <path d="M95 79 123 68" />
            <path d="M54 85 30 72" />
          </g>
          <g className="hero-joints">
            {[ [70,34], [62,55], [78,56], [54,85], [83,95], [47,126], [76,130], [34,157], [69,164], [95,79], [123,68], [30,72] ].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" />
            ))}
          </g>
        </svg>
      ) : null}
      <i />
    </div>
  );
}

const playerImageMap = {
  "Harry Kane": "/media/players/harry-kane.jpg",
  "Serge Gnabry": "/media/players/serge-gnabry.jpg",
  "Maximilian Beier": "/media/players/maximilian-beier.jpg",
  "Karim Adeyemi": "/media/players/karim-adeyemi.jpg",
  "Deniz Undav": "/media/players/deniz-undav.jpg",
};

function cleanText(value) {
  return String(value ?? "")
    .replaceAll("DÃƒÂ­az", "DÃ­az")
    .replaceAll("MÃƒÂ¼nchen", "MÃ¼nchen")
    .replaceAll("PavloviÃ„â€¡", "PavloviÄ‡")
    .replaceAll("pavloviÃ„â€¡", "pavloviÄ‡")
    .replaceAll("dÃƒÂ­az", "dÃ­az")
    .replaceAll("DÃ­az", "Díaz")
    .replaceAll("dÃ­az", "díaz")
    .replaceAll("MÃ¼nchen", "München")
    .replaceAll("PavloviÄ‡", "Pavlovic")
    .replaceAll("pavloviÄ‡", "pavlovic");
}

function playerLabel(player) {
  return cleanText(player?.displayName ?? player?.name ?? "Player");
}

function uniquePlayerLabels(records) {
  return Array.from(new Map(records.map((player) => [normalizeName(playerLabel(player)), playerLabel(player)])).values());
}

const modeThumbnailMap = {
  daily: "/media/poster_and_thumbnails/Daily_Challenge.png",
  goals: "/media/poster_and_thumbnails/Live%20Challenge.png",
  goalkeepers: "/media/poster_and_thumbnails/Goalie.png",
  expert: "/media/poster_and_thumbnails/Expert_Mode.png",
  matchpack: "/media/poster_and_thumbnails/Match%20Pack.png",
  team: "/media/poster_and_thumbnails/team_Mode.png",
};

function Stat({ label, value }) {
  return <div className="stat-cell"><span>{label}</span><strong>{value}</strong></div>;
}

function ModeCard({ mode, onPlay }) {
  const handlePlayClick = (event) => {
    const intent = !mode.comingSoon && event.target.closest("svg") ? "schedule" : "start";
    onPlay(mode.id, intent);
  };

  return (
    <article className={mode.comingSoon ? "mode-card mode-card-soon" : "mode-card"}>
      <div className="mode-thumb"><MediaPoster tone={mode.posterTone} imageSrc={modeThumbnailMap[mode.id]} compact /></div>
      <div className="mode-copy">
        {mode.badge ? <span className={mode.comingSoon ? "soon-tag" : "red-tag"}>{mode.badge}</span> : null}
        <h3>{mode.label}</h3>
        <p>{mode.description}</p>
        <div className="mode-meta">
          <span><Icon name="timer" />{mode.duration}</span>
          <span><Icon name="chart" />{mode.difficulty}</span>
        </div>
      </div>
      <button className={mode.comingSoon ? "round-play-button soon-button" : "round-play-button"} type="button" onClick={handlePlayClick} aria-label={mode.comingSoon ? `${mode.label} coming soon` : `Play ${mode.label}`}>
        <Icon name={mode.comingSoon ? "lock" : "play"} />
      </button>
    </article>
  );
}

function SectionTitle({ title, subtitle, action, onAction }) {
  return <div className="section-title"><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>{action ? <button type="button" onClick={onAction}>{action}</button> : null}</div>;
}

const UPCOMING_MATCH_START_DATE = "2026-05-17";

function groupFixturesByDate(rows) {
  return rows.reduce((groups, row) => {
    const existing = groups.find((group) => group.dateISO === row.dateISO);
    if (existing) existing.fixtures.push(row);
    else groups.push({ dateISO: row.dateISO, dateLabel: row.dateLabel, fixtures: [row] });
    return groups;
  }, []);
}

function sortFixtureGroupsDesc(groups) {
  return [...groups].sort((left, right) => right.dateISO.localeCompare(left.dateISO));
}

function formatFixtureCount(count) {
  return count === 1 ? "1 match" : `${count} matches`;
}

function earliestKickoff(fixtures) {
  return fixtures.find((fixture) => fixture.time && fixture.time !== "FT")?.time ?? fixtures[0]?.time ?? "TBC";
}

function fixtureRoundLabel(row) {
  return typeof row.matchday === "number" ? `MD${row.matchday}` : row.matchday;
}

const fixtureClubAliases = {
  "1 fc koln": "1-fc-koeln",
  "1 fc koeln": "1-fc-koeln",
  "1 fc union berlin": "1-fc-union-berlin",
  "1 fsv mainz 05": "1-fsv-mainz-05",
  "augsburg": "fc-augsburg",
  "bayer leverkusen": "bayer-04-leverkusen",
  "bayer 04 leverkusen": "bayer-04-leverkusen",
  "bayern munich": "fc-bayern-muenchen",
  "bayern munchen": "fc-bayern-muenchen",
  "borussia dortmund": "borussia-dortmund",
  "borussia monchengladbach": "borussia-moenchengladbach",
  "borussia m??nchengladbach": "borussia-moenchengladbach",
  "borussia ma¶nchengladbach": "borussia-moenchengladbach",
  "borussia mÃ¶nchengladbach": "borussia-moenchengladbach",
  "cologne": "1-fc-koeln",
  "eintracht frankfurt": "eintracht-frankfurt",
  "fc augsburg": "fc-augsburg",
  "fc bayern munchen": "fc-bayern-muenchen",
  "fc bayern münchen": "fc-bayern-muenchen",
  "fc st pauli": "fc-st-pauli",
  "freiburg": "sport-club-freiburg",
  "hamburg": "hamburger-sv",
  "hamburger sv": "hamburger-sv",
  "heidenheim": "1-fc-heidenheim-1846",
  "hoffenheim": "tsg-hoffenheim",
  "mainz": "1-fsv-mainz-05",
  "rb leipzig": "rb-leipzig",
  "sc freiburg": "sport-club-freiburg",
  "sport club freiburg": "sport-club-freiburg",
  "st pauli": "fc-st-pauli",
  "st. pauli": "fc-st-pauli",
  "union berlin": "1-fc-union-berlin",
  "vfb stuttgart": "vfb-stuttgart",
  "sv werder bremen": "sv-werder-bremen",
  "werder bremen": "sv-werder-bremen",
  "vfl wolfsburg": "vfl-wolfsburg",
  "wolfsburg": "vfl-wolfsburg",
  "sc paderborn 07": "sc-paderborn-07",
};

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === "\"") quoted = !quoted;
    else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else current += char;
  }
  values.push(current);
  return values;
}

function csvRows(csvText) {
  const [headerLine, ...lines] = csvText.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  return lines.filter(Boolean).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

const matchScoreRows = csvRows(matchScoresCsv);
const playerStatsRows = csvRows(playerStatsCsv);

function titleCaseFromSlug(slug) {
  return cleanText(String(slug ?? "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" "));
}

function csvPlayerLabel(row) {
  return titleCaseFromSlug(row?.["Player Slug"]) || cleanText(row?.["Player Name"]);
}

function csvPlayerLookupKeys(row) {
  return [row?.["Player Name"], row?.["Player Slug"], csvPlayerLabel(row)]
    .map((value) => normalizeName(cleanText(value)))
    .filter(Boolean);
}

function uniqueCsvPlayerSuggestions() {
  const names = new Map();
  playerStatsRows
    .filter((row) => row.Season === "2025-2026")
    .forEach((row) => {
      const label = csvPlayerLabel(row);
      if (!label) return;
      names.set(normalizeName(label), label);
    });
  return Array.from(names.values()).sort((a, b) => a.localeCompare(b));
}

function numberCue(value, suffix = "") {
  if (value === undefined || value === null || value === "") return "Hidden";
  return `${value}${suffix}`;
}

function optionalCue(value, suffix = "") {
  const clean = cleanText(value).trim();
  if (!clean || clean === "-" || clean.toLowerCase() === "nan") return null;
  return `${clean}${suffix}`;
}

function calculateAge(birthDate) {
  const clean = cleanText(birthDate).trim();
  if (!clean) return null;
  const date = new Date(`${clean}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const hasBirthdayPassed = now.getMonth() > date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() >= date.getDate());
  if (!hasBirthdayPassed) age -= 1;
  return age > 0 ? String(age) : null;
}

function findCurrentSeasonPlayerStats(playerName) {
  const key = normalizeName(cleanText(playerName));
  const keyParts = key.split(/\s+/).filter(Boolean);
  const playerRows = playerStatsRows.filter((row) => {
    const candidates = csvPlayerLookupKeys(row);
    return candidates.some((candidate) => (
      candidate === key || candidate.includes(key) || key.includes(candidate) || keyParts.every((part) => candidate.includes(part))
    ));
  });
  return playerRows.find((row) => row.Season === "2025-2026") ?? playerRows[0] ?? null;
}

function buildStatCueRows(stage, game, fallbackPlayer) {
  const stats = findCurrentSeasonPlayerStats(game.playerName);
  if (stage.id === 4) {
    return [
      { label: "Position", value: cleanText(stats?.Position ?? fallbackPlayer?.position ?? "Hidden") },
      { label: "Height", value: numberCue(stats?.["Height (cm)"], " cm") },
      { label: "Max speed", value: numberCue(stats?.["Max Speed (km/h)"], " km/h") },
      { label: "Shots on target", value: numberCue(stats?.["Shots on Target"]) },
      { label: "Apps", value: numberCue(stats?.["Matches Played"]) },
    ];
  }

  if (stage.id === 5) {
    const rows = [
      { label: "Nationality", value: cleanText(stats?.Nationality ?? fallbackPlayer?.nationality ?? "Hidden") },
      { label: "Club", value: cleanText(stats?.["Club Name"] ?? fallbackPlayer?.team ?? "Hidden") },
      { label: "Jersey", value: stats?.["Jersey Number"] ? `No. ${stats["Jersey Number"]}` : `No. ${fallbackPlayer?.number ?? "?"}` },
      { label: "Goals", value: numberCue(stats?.Goals ?? 0) },
      { label: "Assists", value: numberCue(stats?.Assists ?? 0) },
      { label: "Age", value: calculateAge(stats?.["Birth Date"]) ?? "Hidden" },
    ];
    const marketValue = optionalCue(stats?.["Market Value"]);
    if (marketValue) rows.push({ label: "Market value", value: marketValue });
    return rows;
  }

  return null;
}

function revealStatTiles(playerName) {
  const stats = findCurrentSeasonPlayerStats(playerName);
  return [
    { label: "Goals", value: stats?.Goals ?? "0" },
    { label: "Assists", value: stats?.Assists ?? "0" },
    { label: "Apps", value: stats?.["Matches Played"] ?? "-" },
    { label: "Shots", value: stats?.["Shots at Goal"] ?? "-" },
    { label: "Max speed", value: stats?.["Max Speed (km/h)"] ? `${stats["Max Speed (km/h)"]}` : "-" },
    { label: "Ball actions", value: stats?.["Ball Actions"] ?? "-" },
  ];
}

function revealIdentityMeta(player) {
  const stats = findCurrentSeasonPlayerStats(player?.name);
  return [
    { label: "Team", value: cleanText(stats?.["Club Name"] ?? player?.team ?? "Hidden") },
    { label: "Position", value: cleanText(stats?.Position ?? player?.position ?? "Hidden") },
    { label: "No.", value: stats?.["Jersey Number"] ?? player?.number ?? "?" },
  ];
}

function highlightVideoUrl(game) {
  return game?.sourceKey ? localHighlightVideos[game.sourceKey] ?? `/media/highlights/${game.sourceKey}.mp4` : null;
}

const fixtureCodeSlugs = {
  B04: "bayer-04-leverkusen",
  BMG: "borussia-moenchengladbach",
  BVB: "borussia-dortmund",
  FCA: "fc-augsburg",
  FCB: "fc-bayern-muenchen",
  FCH: "1-fc-heidenheim-1846",
  FCU: "1-fc-union-berlin",
  HSV: "hamburger-sv",
  KOE: "1-fc-koeln",
  M05: "1-fsv-mainz-05",
  RBL: "rb-leipzig",
  SCF: "sport-club-freiburg",
  SGE: "eintracht-frankfurt",
  STP: "fc-st-pauli",
  SVW: "sv-werder-bremen",
  TSG: "tsg-hoffenheim",
  VFB: "vfb-stuttgart",
  WOB: "vfl-wolfsburg",
};

const relegationRows = [
  {
    dateISO: "2026-05-21",
    dateLabel: "Thu 21 May",
    time: "FT",
    matchday: "Relegation",
    home: "VfL Wolfsburg",
    away: "SC Paderborn 07",
    homeScore: 0,
    awayScore: 0,
    status: "Finished",
  },
  {
    dateISO: "2026-05-25",
    dateLabel: "Mon 25 May",
    time: "20:30",
    matchday: "Relegation",
    home: "SC Paderborn 07",
    away: "VfL Wolfsburg",
    status: "Tickets",
  },
];

function fixtureClubSlug(name) {
  const key = normalizeName(cleanText(name)).replace(/[.-]/g, " ").replace(/\s+/g, " ").trim();
  return fixtureClubAliases[key] ?? fixtureClubAliases[normalizeName(cleanText(name))] ?? null;
}

function fixtureClubLogo(name) {
  const slug = fixtureClubSlug(name);
  if (slug === "sc-paderborn-07") return "";
  return bundesligaTable.find((row) => row.clubSlug === slug)?.logoUrl ?? "";
}

function fixtureClubShort(name) {
  const slug = fixtureClubSlug(name);
  const shortNames = {
    "1-fc-koeln": "KOE",
    "1-fc-union-berlin": "FCU",
    "1-fsv-mainz-05": "M05",
    "bayer-04-leverkusen": "B04",
    "borussia-dortmund": "BVB",
    "borussia-moenchengladbach": "BMG",
    "eintracht-frankfurt": "SGE",
    "fc-augsburg": "FCA",
    "fc-bayern-muenchen": "FCB",
    "fc-st-pauli": "STP",
    "hamburger-sv": "HSV",
    "rb-leipzig": "RBL",
    "sc-freiburg": "SCF",
    "sc-paderborn-07": "SCP",
    "sv-werder-bremen": "SVW",
    "tsg-hoffenheim": "TSG",
    "vfb-stuttgart": "VFB",
    "vfl-wolfsburg": "WOB",
    "1-fc-heidenheim-1846": "FCH",
  };
  return shortNames[slug] ?? String(name).split(" ").map((part) => part[0]).join("").slice(0, 3).toUpperCase();
}

function scoreKey(row) {
  return `${row.matchday}|${fixtureClubSlug(row.home)}|${fixtureClubSlug(row.away)}`;
}

function scoreRowKey(row) {
  const homeSlug = fixtureCodeSlugs[row["Home Team Code"]] ?? fixtureClubSlug(row["Home Team"]);
  const awaySlug = fixtureCodeSlugs[row["Away Team Code"]] ?? fixtureClubSlug(row["Away Team"]);
  return `${row.Matchday}|${homeSlug}|${awaySlug}`;
}

const matchdayScoreOverrides = Object.fromEntries(
  matchScoreRows
    .filter((row) => row["Home Score Fulltime"] !== "" && row["Away Score Fulltime"] !== "")
    .map((row) => [
      scoreRowKey(row),
      {
        homeScore: Number(row["Home Score Fulltime"]),
        awayScore: Number(row["Away Score Fulltime"]),
        status: row["Match Status"] === "FINAL_WHISTLE" ? "Finished" : row["Match Status"],
      },
    ]),
);

function withFixtureScore(row) {
  if (row.homeScore !== undefined && row.awayScore !== undefined) return row;
  const score = matchdayScoreOverrides[scoreKey(row)];
  return score ? { ...row, ...score } : row;
}

function matchdaySections(rows) {
  return Array.from({ length: 34 }, (_, index) => {
    const matchday = index + 1;
    const fixtures = rows.filter((row) => row.matchday === matchday).map(withFixtureScore);
    const dates = fixtures.map((fixture) => fixture.dateISO).sort();
    return {
      id: String(matchday),
      label: `Matchday ${matchday}`,
      dateRange: dates.length > 1 ? `${dates[0].slice(5).replace("-", "/")} - ${dates[dates.length - 1].slice(5).replace("-", "/")}` : dates[0]?.slice(5).replace("-", "/") ?? "",
      fixtures,
    };
  });
}

function relegationSection() {
  return {
    id: "relegation",
    label: "Relegation",
    dateRange: "05/21 - 05/25",
    fixtures: relegationRows,
  };
}

function dateToSectionId(dateISO) {
  if (!dateISO) return "34";
  const regular = matchRows.find((row) => row.dateISO === dateISO);
  if (regular?.matchday) return String(regular.matchday);
  return relegationRows.some((row) => row.dateISO === dateISO) ? "relegation" : "34";
}

function groupedByDay(rows) {
  return rows.reduce((groups, row) => {
    const existing = groups.find((group) => group.dateISO === row.dateISO);
    if (existing) existing.fixtures.push(row);
    else groups.push({ dateISO: row.dateISO, dateLabel: row.dateLabel, fixtures: [row] });
    return groups;
  }, []);
}

export function HomeScreen({ onPlay, onNavigate, onOpenMatchesDate }) {
  const upcomingFixtureRows = matchRows.filter((row) => row.dateISO >= UPCOMING_MATCH_START_DATE);
  const homeFixtureGroups = groupFixturesByDate(upcomingFixtureRows);

  return (
    <section className="home-screen screen-stack">
      <div className="score-strip">
        <div><span>Matchday 33</span><strong>BAY <b>2-1</b> BVB</strong></div>
        <div><span>Sun 25 May</span><strong>RBL 17:30 B04</strong></div>
      </div>
      <article className="motion-hero-card">
        <div className="motion-hero-copy">
          <MotionIdLogo compact />
          <h1 className="hero-title"><span className="hero-title-red">Guess the Player</span><span className="hero-title-white"> - Read the Motion</span></h1>
          <p>Observe the movement. Identify the Bundesliga player.</p>
          <button className="primary-cta" type="button" onClick={onPlay}>Play now <Icon name="arrow" /></button>
        </div>
        <div className="hero-motion-visual" aria-hidden="true">
          <img src="/media/poster_and_thumbnails/Main_Poster.png" alt="" />
          <span>Live Challenge</span>
        </div>
      </article>
      <SectionTitle title="Top Stories" action="View all" onAction={() => onNavigate("news")} />
      <div className="story-row">
        {topStoryCards.slice(0, 10).map((story) => (
          <article className="story-card" key={story.title}>
            <div className="story-photo"><img src={story.imageSrc} alt="" loading="lazy" /></div>
            <span>{story.type}</span><strong>{story.title}</strong><small>{story.time}</small>
          </article>
        ))}
      </div>
      <SectionTitle title="Upcoming Matches" action="View all" onAction={() => onNavigate("matches")} />
      <div className="match-ribbon-list">
        {homeFixtureGroups.map((group) => (
          <button className="match-date-ribbon" type="button" key={group.dateISO} onClick={() => onOpenMatchesDate(group.dateISO)}>
            <span>{group.dateLabel}</span>
            <strong>{formatFixtureCount(group.fixtures.length)}</strong>
            <em>{earliestKickoff(group.fixtures)}</em>
            <Icon name="arrow" />
          </button>
        ))}
      </div>
    </section>
  );
}

export function LobbyScreen({ onPlay }) {
  const activeModes = modes.filter((mode) => !mode.comingSoon);
  const trainingModes = modes.filter((mode) => mode.comingSoon);
  return (
    <section className="screen-stack lobby-screen">
      <div className="motion-lobby-head"><MotionIdLogo /><Icon name="user" /></div>
      <article className="profile-card">
        <div className="avatar-badge">FCB</div>
        <div className="profile-user"><h2>{user.name}</h2><p>{user.tier}</p></div>
        <div className="profile-stats">
          <Stat label="Total score" value={user.totalScore.toLocaleString()} />
          <Stat label="Streak" value={`${user.streak}d`} />
          <Stat label="Rank" value={`#${user.rank.toLocaleString()}`} />
        </div>
      </article>
      <SectionTitle title="Choose a mode" subtitle="Earn points for ranking up" action="Timed" />
      <div className="mode-list">{activeModes.map((mode) => <ModeCard key={mode.id} mode={mode} onPlay={onPlay} />)}</div>
      <SectionTitle title="Training modes" subtitle="Coming soon" />
      <div className="mode-list">{trainingModes.map((mode) => <ModeCard key={mode.id} mode={mode} onPlay={onPlay} />)}</div>
    </section>
  );
}

export function LiveChallengeCountdownScreen({ onBack, onPlayNow }) {
  const [now, setNow] = useState(() => Date.now());
  const kickoff = useMemo(() => Date.now() + 105905000, []);
  const remaining = Math.max(0, kickoff - now);
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  return (
    <section className="screen-stack live-countdown-screen">
      <article className="live-countdown-card">
        <button className="countdown-close-button" type="button" onClick={onBack} aria-label="Close matchday challenge">
          &times;
        </button>
        <MotionIdLogo />
        <span>Next live challenge</span>
        <h1>The Matchday Challenge</h1>
        <p>The Matchday Challenge opens 30 minutes before Bundesliga weekend kick-off. Come back Saturday and test your player recognition live.</p>
        <div className="countdown-grid" aria-label="Time until live challenge">
          <Stat label="Days" value={days} />
          <Stat label="Hours" value={hours} />
          <Stat label="Min" value={minutes} />
          <Stat label="Sec" value={seconds} />
        </div>
        <div className="action-row countdown-action-row">
          <button className="primary-cta" type="button" onClick={onPlayNow}>Ready to start</button>
        </div>
      </article>
    </section>
  );
}

function AvatarBubble({ seed = 0 }) {
  return <span className={`avatar-bubble avatar-bubble-${seed % 8}`} aria-hidden="true" />;
}

export function QuizScreen({ game, onComplete, onQuit }) {
  const [activeStage, setActiveStage] = useState(1);
  const [phase, setPhase] = useState("countdown");
  const [phaseRemaining, setPhaseRemaining] = useState(COUNTDOWN_VALUES.length);
  const [answer, setAnswer] = useState("");
  const [lockedResult, setLockedResult] = useState(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [stageElapsedSeconds, setStageElapsedSeconds] = useState(0);
  const [answerSuggestions, setAnswerSuggestions] = useState(() => uniqueCsvPlayerSuggestions());
  const stage = stages.find((item) => item.id === activeStage) ?? stages[0];
  const stageStartRef = useRef(Date.now());
  const completedRef = useRef(false);
  const lockedResultRef = useRef(null);
  const phaseTokenRef = useRef(0);

  const answerRef = useRef(answer);
  const phaseRemainingRef = useRef(phaseRemaining);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  useEffect(() => {
    phaseRemainingRef.current = phaseRemaining;
  }, [phaseRemaining]);

  useEffect(() => {
    lockedResultRef.current = lockedResult;
  }, [lockedResult]);

  useEffect(() => {
    completedRef.current = false;
    setActiveStage(1);
    setPhase("countdown");
    setPhaseRemaining(COUNTDOWN_VALUES.length);
    setAnswer("");
    setLockedResult(null);
    setVideoProgress(0);
    setStageElapsedSeconds(0);
    stageStartRef.current = Date.now();
  }, [game.id]);

  useEffect(() => {
    if (phase === "complete") return;
    const token = phaseTokenRef.current + 1;
    phaseTokenRef.current = token;
    const duration = getPhaseSeconds(stage, phase);
    setPhaseRemaining(duration);
    if (phase === "playing") {
      stageStartRef.current = Date.now();
      setStageElapsedSeconds(0);
    }

    const tick = window.setInterval(() => {
      setPhaseRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    const ownsAdvance = phase === "countdown" || phase === "answerGrace" || (phase === "playing" && stage.type === "cue");
    const timeout = ownsAdvance
      ? window.setTimeout(() => {
          if (phaseTokenRef.current === token) advancePhase();
        }, duration * 1000)
      : null;

    return () => {
      window.clearInterval(tick);
      if (timeout) window.clearTimeout(timeout);
    };
  }, [phase, stage.id, stage.type]);

  useEffect(() => {
    if (phase !== "playing" && phase !== "answerGrace") return undefined;
    const tick = window.setInterval(() => {
      setStageElapsedSeconds(Math.max(0, (Date.now() - stageStartRef.current) / 1000));
    }, 250);
    return () => window.clearInterval(tick);
  }, [phase, stage.id]);

  useEffect(() => {
    const nextStage = stages.find((item) => item.id === activeStage + 1);
    if (nextStage?.type === "video") {
      const preload = document.createElement("video");
      preload.preload = "auto";
      preload.muted = true;
      preload.src = game.video ?? game.fallbackVideo;
    }
  }, [activeStage, game.video, game.fallbackVideo]);

  useEffect(() => {
    let active = true;
    fetch("/data/player-profiles.generated.json")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!active || !Array.isArray(data?.players)) return;
        const names = new Map(uniqueCsvPlayerSuggestions().map((name) => [normalizeName(name), name]));
        data.players.forEach((profile) => {
          const name = cleanText(profile.displayName ?? profile.name);
          const normalizedName = normalizeName(name);
          if (name && name !== "undefined" && names.has(normalizedName)) names.set(normalizedName, names.get(normalizedName));
          const fullName = cleanText(profile.name);
          const normalizedFullName = normalizeName(fullName);
          if (fullName && fullName !== "undefined" && names.has(normalizedFullName)) names.set(normalizedFullName, names.get(normalizedFullName));
        });
        setAnswerSuggestions(Array.from(names.values()).sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const currentPossiblePoints = useMemo(() => {
    const scoreDuration = getStageDuration(stage) + (stage.answerGraceSeconds ?? 5);
    const elapsed = phase === "playing" || phase === "answerGrace" ? stageElapsedSeconds : 0;
    return calculateStageScore(stage, {
      elapsedInStage: elapsed,
      stageDuration: scoreDuration,
    });
  }, [phase, stage, stageElapsedSeconds]);

  const currentPossiblePointsRef = useRef(currentPossiblePoints);
  useEffect(() => {
    currentPossiblePointsRef.current = currentPossiblePoints;
  }, [currentPossiblePoints]);

  const advancePhase = () => {
    if (phase === "countdown") {
      setPhase("playing");
      return;
    }
    if (phase === "playing") {
      setPhase("answerGrace");
      return;
    }
    if (phase === "answerGrace") {
      if (activeStage < 5) {
        setActiveStage((value) => value + 1);
        setVideoProgress(0);
        setStageElapsedSeconds(0);
        setPhase("countdown");
        return;
      }
      finishRound();
    }
  };

  const lockAnswer = () => {
    if (phase === "countdown" || phase === "complete") return;
    if (!answer.trim() || lockedResult) return;
    const elapsed = Math.max(0, (Date.now() - stageStartRef.current) / 1000);
    setLockedResult(scoreRound(answer, game, stage, {
      elapsedInStage: elapsed,
      stageDuration: getStageDuration(stage) + (stage.answerGraceSeconds ?? 5),
      remainingSeconds: phaseRemaining,
      possiblePointsAtLock: currentPossiblePoints,
    }));
  };

  const finishRound = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    const result = lockedResultRef.current ?? scoreRound("", game, stage, { timedOut: true });
    setPhase("complete");
    onComplete(result);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.shiftKey && event.key === "Enter") {
        event.preventDefault();
        if (lockedResultRef.current) {
          finishRound();
          return;
        }

        const elapsed = Math.max(0, (Date.now() - stageStartRef.current) / 1000);
        const scoreDuration = getStageDuration(stage) + (stage.answerGraceSeconds ?? 5);
        const result = scoreRound(answerRef.current, game, stage, {
          elapsedInStage: elapsed,
          stageDuration: scoreDuration,
          remainingSeconds: phaseRemainingRef.current,
          possiblePointsAtLock: currentPossiblePointsRef.current,
        });

        completedRef.current = true;
        setPhase("complete");
        onComplete(result);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [game.id, stage.id]);

  const countdownText = phase === "countdown" ? getCountdownText(phaseRemaining) : "";
  const phaseLabel = phase === "answerGrace" ? "Answer window" : phase === "playing" ? "Watch clip" : phase === "countdown" ? "Get ready" : "Complete";

  return (
    <section className="round-screen screen-stack" aria-labelledby="round-prompt">
      <button className="game-quit-button" type="button" onClick={onQuit} aria-label="Leave live game">
        <Icon name="back" />
        Quit
      </button>
      <header className="round-header">
        <div className="round-title-row"><MotionIdLogo compact /><div className="points-badge"><span>{lockedResult ? lockedResult.pointsEarned : currentPossiblePoints}</span><small>PTS</small></div></div>
        <StageTimeline activeStage={activeStage} lockedStage={activeStage - 1} />
        <div className="round-meta"><span className="stage-name">Stage {stage.id} of 5 - {stage.label}</span><span className="timer-chip"><Icon name="timer" />{formatClock(phaseRemaining)}</span></div>
      </header>
      <div className="timed-stage-wrap">
        <ReplayViewport game={game} stage={stage} active={phase === "playing"} locked={Boolean(lockedResult)} phase={phase} progress={videoProgress} onProgress={setVideoProgress} onEnded={() => phase === "playing" && setPhase("answerGrace")} />
        {phase === "countdown" ? <div className="countdown-overlay"><span>{phaseLabel}</span><strong>{countdownText}</strong></div> : null}
        {phase === "answerGrace" ? <div className="answer-window-chip">5 second answer window</div> : null}
      </div>
      <div className="prompt-block"><h2 id="round-prompt">Who is the red player?</h2><p>{stage.microcopy}</p></div>
      {stage.cues.length ? <CuePanel stage={stage} game={game} /> : null}
      <AnswerBar value={lockedResult?.submittedAnswer ?? answer} locked={Boolean(lockedResult)} onChange={setAnswer} onLock={lockAnswer} suggestions={answerSuggestions} />
      <p className="round-footnote">{lockedResult ? "Answer stored. Reveal happens after the shared timed round." : "Timed round. No manual stage skipping, no replay."}</p>
    </section>
  );
}

function CuePanel({ stage, game }) {
  const player = findPlayerByName(game.playerName);
  const statCueRows = buildStatCueRows(stage, game, player);
  const cueRows = statCueRows ?? stage.cues.map((cue) => {
    if (cue === "roleGroup") return { label: "Role group", value: player?.roleGroup ?? "Attacker" };
    if (cue === "seasonBand") return { label: "Profile band", value: player?.seasonBand ?? "Goal threat" };
    if (cue === "nationality") return { label: "Country", value: player?.nationality ?? "Hidden" };
    if (cue === "jersey") return { label: "Jersey hint", value: `No. ${player?.number ?? "?"}` };
    if (cue === "careerHint") return { label: "Career clue", value: player?.careerHint ?? "Bundesliga player" };
    return { label: cue, value: "Hidden" };
  });

  return (
    <section className="cue-panel" aria-label={stage.cueIntro}>
      <div className="cue-panel-heading"><span>{stage.cueIntro}</span></div>
      <div className="cue-grid">{cueRows.map((cue) => <article className="cue-card" key={cue.label}><span>{cue.label}</span><strong>{cue.value}</strong></article>)}</div>
    </section>
  );
}

export function RevealScreen({ game, result, isLast, onNext }) {
  const player = findPlayerByName(result?.correctAnswer ?? game.playerName) ?? players[0];
  const [nextSeconds, setNextSeconds] = useState(30);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    const tick = window.setInterval(() => setNextSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (nextSeconds > 0 || autoStartedRef.current) return;
    startNextQuiz();
  }, [nextSeconds, onNext]);

  const startNextQuiz = () => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    onNext();
  };

  const resultLabel = result?.isCorrect ? "Correct" : result?.sameTeamBonus ? "Team bonus" : result?.timedOut ? "Timed out" : "Miss";

  return (
    <section className="screen-stack reveal-screen">
      <RoundSummaryHeader result={result} />
      <article className={result?.isCorrect ? "result-banner correct compact-result" : "result-banner wrong compact-result"}>
        <Icon name={result?.isCorrect ? "check" : "x"} />
        <div><h1>{resultLabel}</h1><p>{result?.isCorrect ? "Answer confirmed after the full round." : "The movement reveal is now unlocked."}</p></div>
        <strong>+{result?.pointsEarned ?? 0}</strong>
      </article>
      <PlayerRevealCard player={player} />
      <div className="media-pair"><ReplayThumb label="Motion ID Clip" game={game} /><ReplayThumb label="Match Highlight Video" game={game} highlight /></div>
      <div className="round-result-grid"><Stat label="Round" value={resultLabel} /><Stat label="Points" value={`+${result?.pointsEarned ?? 0}`} /><Stat label="Locked at" value={result?.submittedAnswer ? `Stage ${result?.answeredStage ?? 1}` : "No answer"} /></div>
      <div className="action-row single-action">
        <button className="primary-cta" type="button" onClick={startNextQuiz}>
          {isLast ? "Show results" : "Next Player Quiz starts"} in <span className="next-game-timer">00:{String(nextSeconds).padStart(2, "0")}</span>
          <Icon name="arrow" />
        </button>
      </div>
    </section>
  );
}

function RoundSummaryHeader({ result }) {
  return <div className="answered-note">{result?.submittedAnswer ? `You answered at Stage ${result?.answeredStage ?? 1}` : "No answer submitted"}</div>;
}

function PlayerRevealCard({ player }) {
  const tablePlayer = findTablePlayerByName(player?.name);
  const revealName = tablePlayer ? displayPlayerName(tablePlayer) : playerLabel(player);
  const statTiles = revealStatTiles(revealName);
  const identityMeta = revealIdentityMeta({ ...player, name: revealName });
  return (
    <article className="player-card">
      <div className={`player-photo player-photo-${player.portraitTone}`}>
        {tablePlayer?.photoUrl || playerImageMap[player.name] ? <img src={tablePlayer?.photoUrl ?? playerImageMap[player.name]} alt={revealName} /> : <span>{player.number}</span>}
      </div>
      <div className="player-facts"><h2>{revealName}</h2><div className="reveal-identity-strip">{identityMeta.map((fact) => <article key={fact.label}><span>{fact.label}</span><strong>{cleanText(fact.value)}</strong></article>)}</div><div className="reveal-stat-grid">{statTiles.map((fact) => <article key={fact.label}><span>{fact.label}</span><strong>{cleanText(fact.value)}</strong></article>)}</div></div>
    </article>
  );
}

function ReplayThumb({ label, game, player, highlight = false }) {
  const [fallbackToMotionClip, setFallbackToMotionClip] = useState(false);
  const motionClip = game?.video ?? game?.fallbackVideo;
  const source = highlight && !fallbackToMotionClip ? highlightVideoUrl(game) ?? motionClip : motionClip;
  return (
    <article className="replay-thumb">
      <span>{label}</span>
      {game ? <video src={source} muted playsInline autoPlay loop preload="metadata" onError={() => setFallbackToMotionClip(true)} /> : <MediaPoster tone={player?.portraitTone ?? "default"} title={player?.displayName ?? player?.name ?? "Player"} kicker="Reveal" compact />}
    </article>
  );
}

export function InsightScreen({ onBack }) {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState(false);
  const metrics = asked ? movementMetrics : movementMetrics.slice(0, 3);
  return (
    <section className="screen-stack insight-screen">
      <h1 className="page-title"><span />Ask Motion Intel</h1>
      <article className="agent-question-card">
        <label htmlFor="agent-question">Ask a movement question</label>
        <textarea id="agent-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Example: why did this finish work under pressure?" />
        <button className="primary-cta" type="button" onClick={() => setAsked(true)} disabled={!question.trim()}>Ask demo agent</button>
        <small>Backend agent is not connected yet. Demo KPIs below show the target response shape.</small>
      </article>
      <div className="metric-grid">{metrics.map((metric) => <article className="metric-card" key={metric.label}><b>{metric.score}</b><div><strong>{metric.label}</strong><span>{metric.value}</span></div></article>)}</div>
      <p className="insight-note">Later this screen will call the 3D/KPI agent and replace these demo cards with grounded answers.</p>
      <button className="secondary-cta" type="button" onClick={onBack}>Back to reveal</button>
    </section>
  );
}

export function ResultsScreen({ results, onInsight, onPlayAgain, onLeaderboard }) {
  const rows = results;
  const total = rows.reduce((sum, item) => sum + item.pointsEarned, 0);
  return (
    <section className="screen-stack results-screen">
      <article className="session-card compact-session"><Icon name="trophy" /><div><h1>Session complete</h1><p>{rows.length} games completed</p><strong>{total} <span>PTS</span></strong></div><aside><span>Top</span><b>14%</b><small>Today</small></aside></article>
      <button className="rank-strip" type="button" onClick={onLeaderboard}>Leaderboard rank #2,184 <Icon name="arrow" /></button>
      <div className="session-list">{rows.slice(0, 4).map((result, index) => <SessionGameRow key={`${result.gameId}-${index}`} result={result} index={index + 1} />)}</div>
      <div className="action-row"><button className="secondary-cta" type="button" onClick={onInsight}>Movement insight</button><button className="secondary-cta" type="button">Share</button><button className="primary-cta" type="button" onClick={onPlayAgain}>Play again</button></div>
    </section>
  );
}

function SessionGameRow({ result, index }) {
  const player = findPlayerByName(result.correctAnswer);
  const tablePlayer = player ? findTablePlayerByName(player.name) : null;
  const photoUrl = tablePlayer?.photoUrl ?? (player ? playerImageMap[player.name] : null);
  const visibleTitle = `Game ${index}`;
  return (
    <article className="session-row">
      <small className="session-date">{result.matchDate ?? "Matchday 34 - Sat 16 May 2026"}</small>
      <b>{index}</b>
      <div className="session-thumb">
        {photoUrl ? (
          <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
        ) : (
          <MediaPoster tone={player?.portraitTone ?? "default"} title={visibleTitle} kicker="Motion ID" compact />
        )}
      </div>
      <div>
        <h3>{visibleTitle}</h3>
        <p>{result.challenge}</p>
        <span>{result.submittedAnswer ? `Answered Stage ${result.answeredStage}` : "Timed out"}</span>
        <strong>{result.isCorrect ? "Correct" : result.sameTeamBonus ? "Team bonus" : "Miss"}</strong>
      </div>
      <em>+{result.pointsEarned}<small>PTS</small></em>
    </article>
  );
}

function FragmentWithSplitter({ showSplitter, children }) {
  return (
    <>
      {showSplitter ? <div className="rank-jump-splitter">Placeholder rank jump</div> : null}
      {children}
    </>
  );
}

export function LeaderboardScreen() {
  const visibleTabs = ["All Time", "Matchday", "Friends"];
  const [activeTab, setActiveTab] = useState("Matchday");
  const tab = leaderboardTabs[activeTab] ?? leaderboardTabs.Matchday;
  return (
    <section className="screen-stack leaderboard-screen">
      <div className="leader-head simple"><MotionIdLogo compact /></div>
      <h1 className="page-title">Leaderboard</h1>
      <div className="leader-tabs">
        {visibleTabs.map((name) => (
          <button type="button" className={name === activeTab ? "active" : ""} key={name} onClick={() => setActiveTab(name)}>{name}</button>
        ))}
      </div>
      <div className="leader-stats"><Stat label="Rank" value={tab.summary.rank} /><Stat label="Score" value={tab.summary.score} /><Stat label="Streak" value={tab.summary.streak} /><Stat label="Avg" value={tab.summary.avg} /></div>
      <div className="leader-table">
        <div className="leader-row leader-header"><b>Rank</b><strong>Player</strong><span>Points</span><span>Games</span><span>Avg</span></div>
        {tab.rows.map((row, index) => (
          <FragmentWithSplitter key={`${activeTab}-${row.rank}-${row.player}`} showSplitter={index === 5}>
            <div className={row.current ? "leader-row current" : "leader-row"}><b>{row.rank}</b><strong>{row.player}</strong><span>{row.score}</span><span>{row.streak}</span><span>{Math.round(row.score / Math.max(1, row.streak))}</span></div>
          </FragmentWithSplitter>
        ))}
      </div>
      {activeTab !== "Friends" ? <div className="qualification-note"><Icon name="trophy" /><span>Top 100 advance to the Motion ID Elite Board. Leaderboard resets in 2d 6h.</span></div> : null}
    </section>
  );
}

export function NewsScreen() {
  return (
    <section className="screen-stack news-screen">
      <h1 className="page-title">News</h1>
      <div className="news-grid">
        {topStoryCards.map((story) => (
          <article className="news-card" key={story.title}>
            <div className="news-thumb"><img src={story.imageSrc} alt="" loading="lazy" /></div>
            <span>{story.type}</span>
            <h2>{story.title}</h2>
            <p>{story.summary}</p>
            <small>{story.time}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MatchesScreen({ selectedDate }) {
  const sections = useMemo(() => [...matchdaySections(matchRows), relegationSection()], []);
  const [activeSectionId, setActiveSectionId] = useState(() => dateToSectionId(selectedDate));
  const activeButtonRef = useRef(null);
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[sections.length - 1];
  const dayGroups = groupedByDay(activeSection.fixtures);

  useEffect(() => {
    setActiveSectionId(dateToSectionId(selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    activeButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeSectionId]);

  return (
    <section className="screen-stack matches-screen matches-app-screen">
      <div className="matchday-selector" aria-label="Matchday selector">
        {sections.map((section) => (
          <button
            className={section.id === activeSectionId ? "active" : ""}
            key={section.id}
            type="button"
            ref={section.id === activeSectionId ? activeButtonRef : null}
            onClick={() => setActiveSectionId(section.id)}
          >
            <strong>{section.label}</strong>
            <span>{section.dateRange}</span>
          </button>
        ))}
      </div>

      <div className="matchday-overview">
        <h1>{activeSection.label}</h1>
        <div className="matchday-club-strip">
          {activeSection.fixtures.map((row) => (
            <span className="matchday-club-pill" key={`${row.home}-${row.away}`}>
              <ClubMark name={row.home} />
              <ClubMark name={row.away} />
            </span>
          ))}
        </div>
      </div>

      <div className="matchday-fixture-list">
        {dayGroups.map((group) => (
          <section className="matchday-day-group" key={group.dateISO}>
            <header><strong>{new Date(`${group.dateISO}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" })}</strong><span>{group.dateISO.slice(5).replace("-", "/")}</span></header>
            {group.fixtures.map((row) => (
              <MatchdayFixtureRow row={row} key={`${row.dateISO}-${row.home}-${row.away}`} />
            ))}
          </section>
        ))}
      </div>
    </section>
  );
}

function ClubMark({ name }) {
  const logo = fixtureClubLogo(name);
  return logo ? <img src={logo} alt="" loading="lazy" /> : <b>{fixtureClubShort(name)}</b>;
}

function MatchdayFixtureRow({ row }) {
  const hasScore = row.homeScore !== undefined && row.awayScore !== undefined;
  const status = row.status ?? (hasScore ? "Finished" : row.time);
  return (
    <article className={`matchday-fixture-row ${hasScore ? "has-score" : "is-scheduled"}`}>
      <span className="match-status">{status}</span>
      <ClubMark name={row.home} />
      <div className="match-score-boxes">
        <strong>{hasScore ? row.homeScore : fixtureClubShort(row.home)}</strong>
        <strong>{hasScore ? row.awayScore : fixtureClubShort(row.away)}</strong>
      </div>
      <ClubMark name={row.away} />
    </article>
  );
}

const TABLE_SEASON = "2025-2026";
const squadPositions = ["Goalkeeper", "Defender", "Midfielder", "Striker"];
const clubTabs = ["News", "Profile", "Squad", "Fixtures", "Stats"];
const playerTabs = ["News", "Stats", "Videos", "Fantasy"];

function signed(value) {
  if (value === undefined || value === null || value === "") return "-";
  return Number(value) > 0 ? `+${value}` : String(value);
}

function displayValue(value, suffix = "") {
  if (value === undefined || value === null || value === "") return "-";
  return `${value}${suffix}`;
}

function titleFromSlug(slug) {
  return String(slug ?? "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function displayPlayerName(player) {
  return cleanText(titleFromSlug(player?.playerSlug) || player?.playerName || "Player");
}

function ageFromBirthDate(dateValue) {
  if (!dateValue) return "-";
  const birth = new Date(dateValue);
  if (Number.isNaN(birth.getTime())) return "-";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function clubBySlug(slug) {
  return bundesligaClubs.find((club) => club.clubSlug === slug) ?? null;
}

function tableRowBySlug(slug) {
  return bundesligaTable.find((row) => row.clubSlug === slug) ?? null;
}

function currentSeasonPlayers() {
  const seen = new Set();
  return bundesligaPlayers
    .filter((player) => player.season === TABLE_SEASON && squadPositions.includes(player.position))
    .filter((player) => {
      const key = player.playerId || `${player.clubSlug}-${player.playerName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function clubPlayers(slug) {
  const positionOrder = new Map(squadPositions.map((position, index) => [position, index]));
  return currentSeasonPlayers()
    .filter((player) => player.clubSlug === slug)
    .sort((a, b) => (positionOrder.get(a.position) - positionOrder.get(b.position)) || Number(a.jerseyNumber || 999) - Number(b.jerseyNumber || 999));
}

function groupedClubPlayers(slug) {
  return squadPositions.map((position) => ({
    position,
    players: clubPlayers(slug).filter((player) => player.position === position),
  })).filter((group) => group.players.length);
}

function findTablePlayerByName(name) {
  const safe = normalizeName(cleanText(name ?? ""));
  if (!safe) return null;
  return currentSeasonPlayers().find((player) => {
    const candidate = normalizeName(player.playerName);
    const slugName = normalizeName(titleFromSlug(player.playerSlug));
    const shortName = normalizeName(player.playerName.split(" ").filter((part, index, all) => index === 0 || index === all.length - 1).join(" "));
    return [candidate, slugName, shortName].some((lookup) => (
      lookup === safe || lookup.includes(safe) || safe.includes(lookup)
    ));
  }) ?? null;
}

function clubFixtures(slug) {
  const club = tableRowBySlug(slug) ?? clubBySlug(slug);
  const needle = normalizeName(club?.clubName ?? "");
  const shortNeedles = needle.split(" ").filter((part) => part.length > 2);
  return matchRows.filter((fixture) => {
    const haystack = normalizeName(`${fixture.home} ${fixture.away}`);
    return shortNeedles.some((part) => haystack.includes(part));
  }).slice(0, 8);
}

function TableTabs({ active, tabs, onSelect }) {
  return (
    <div className="table-local-tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab} className={tab === active ? "active" : ""} type="button" onClick={() => onSelect(tab)}>{tab}</button>
      ))}
    </div>
  );
}

export function StatsScreen() {
  const [selectedClubSlug, setSelectedClubSlug] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [clubTab, setClubTab] = useState("News");
  const [playerTab, setPlayerTab] = useState("News");
  const selectedClub = selectedClubSlug ? clubBySlug(selectedClubSlug) : null;
  const selectedTableRow = selectedClubSlug ? tableRowBySlug(selectedClubSlug) : null;
  const selectedPlayer = selectedPlayerId ? currentSeasonPlayers().find((player) => player.playerId === selectedPlayerId) : null;

  if (selectedPlayer) {
    return (
      <PlayerDetailScreen
        player={selectedPlayer}
        club={clubBySlug(selectedPlayer.clubSlug)}
        tableRow={tableRowBySlug(selectedPlayer.clubSlug)}
        activeTab={playerTab}
        onTab={setPlayerTab}
        onBack={() => { setSelectedPlayerId(null); setPlayerTab("News"); }}
      />
    );
  }

  if (selectedClub && selectedTableRow) {
    return (
      <ClubDetailScreen
        club={selectedClub}
        tableRow={selectedTableRow}
        activeTab={clubTab}
        onTab={setClubTab}
        onBack={() => { setSelectedClubSlug(null); setClubTab("News"); }}
        onPlayer={(player) => { setSelectedPlayerId(player.playerId); setPlayerTab("News"); }}
      />
    );
  }

  return <LeagueTableScreen onClub={(slug) => { setSelectedClubSlug(slug); setClubTab("News"); }} />;
}

function LeagueTableScreen({ onClub }) {
  return (
    <section className="screen-stack table-stats-screen league-table-screen">
      <div className="league-table-card">
        <div className="league-table-head"><span>Club</span><span>M</span><span>+/-</span><span>P</span></div>
        {bundesligaTable.map((row) => (
          <button className="league-table-row" type="button" key={row.clubSlug} onClick={() => onClub(row.clubSlug)}>
            <i className={`qualification-rail qualification-${row.qualification?.toLowerCase().replaceAll("_", "-")}`} />
            <b>{row.rank}</b>
            <img src={row.logoUrl} alt="" loading="lazy" />
            <strong>{cleanText(row.clubName)}</strong>
            <span>{row.played}</span>
            <span>{signed(row.goalDifference)}</span>
            <span>{row.points}</span>
          </button>
        ))}
      </div>
      <div className="table-legend">
        <div><i className="legend-cl" />UEFA Champions League</div>
        <div><i className="legend-el" />UEFA Europa League</div>
        <div><i className="legend-conf" />UEFA Conference League</div>
        <div><i className="legend-play" />Play-offs</div>
        <div><i className="legend-rel" />Relegation</div>
      </div>
      <div className="table-definitions">
        <span><b>M</b> Matches</span>
        <span><b>+/-</b> Goal difference</span>
        <span><b>P</b> Points</span>
      </div>
    </section>
  );
}

function ClubDetailScreen({ club, tableRow, activeTab, onTab, onBack, onPlayer }) {
  return (
    <section className="screen-stack table-stats-screen club-detail-screen">
      <button className="stats-back-button floating" type="button" onClick={onBack}><Icon name="back" /></button>
      <ClubHero club={club} tableRow={tableRow} />
      <TableTabs active={activeTab} tabs={clubTabs} onSelect={onTab} />
      {activeTab === "News" ? <ClubNewsTab tableRow={tableRow} onViewFullTable={onBack} /> : null}
      {activeTab === "Profile" ? <ClubProfileTab club={club} /> : null}
      {activeTab === "Squad" ? <ClubSquadTab slug={club.clubSlug} onPlayer={onPlayer} /> : null}
      {activeTab === "Fixtures" ? <ClubFixturesTab slug={club.clubSlug} /> : null}
      {activeTab === "Stats" ? <ClubStatsTab tableRow={tableRow} slug={club.clubSlug} /> : null}
    </section>
  );
}

function ClubHero({ club, tableRow }) {
  return (
    <header className="club-hero" style={{ "--club-primary": club.primaryColor || "#e30613" }}>
      <h1>{cleanText(tableRow.clubName)}</h1>
      <img src={club.logoUrl || tableRow.logoUrl} alt="" />
    </header>
  );
}

function ClubNewsTab({ tableRow, onViewFullTable }) {
  const clubContent = clubNewsGoalCards[tableRow.clubSlug] ?? { news: [], goals: [] };
  const goalCards = clubContent.goals.slice(0, 5);
  const newsCards = clubContent.news.slice(0, 5);

  return (
    <div className="club-tab-panel">
      <h2>Table</h2>
      <div className="club-mini-table">
        {bundesligaTable.slice(0, 4).map((row) => (
          <div className={row.clubSlug === tableRow.clubSlug ? "active" : ""} key={row.clubSlug}>
            <b>{row.rank}</b><img src={row.logoUrl} alt="" /><span>{row.clubName}</span><em>{row.played}</em><strong>{row.wins}-{row.draws}-{row.losses}</strong><em>{row.goalsFor}:{row.goalsAgainst}</em><strong>{row.points}</strong>
          </div>
        ))}
      </div>
      <button className="text-link-button" type="button" onClick={onViewFullTable}>View full table →</button>
      <h2>All goals of {cleanText(tableRow.clubName)}</h2>
      <div className="club-card-row">
        {goalCards.map((goal) => (
          <article className="club-media-card club-goal-card" key={goal.id}>
            <img src={goal.imageSrc} alt="" loading="lazy" />
          </article>
        ))}
      </div>
      <h2>News</h2>
      <div className="club-card-row">
        {newsCards.map((story) => (
          <article className="club-media-card club-news-card" key={story.id}>
            <img src={story.imageSrc} alt="" loading="lazy" />
            <strong>{cleanText(story.title)}</strong>
          </article>
        ))}
      </div>
    </div>
  );
}

function ClubProfileTab({ club }) {
  const rows = [
    ["Full name", club.fullName],
    ["Founded", club.founded],
    ["Club colors", `${club.primaryColor || ""} ${club.secondaryColor || ""}`],
    ["Street", club.street],
    ["City", club.city],
    ["Directions", club.directions ? "Open with maps" : ""],
    ["Phone", club.phone],
    ["Fax", club.fax],
    ["Website", club.website],
    ["Email", club.email],
  ];
  return (
    <div className="club-tab-panel">
      <article className="club-stadium-card">
        <div className="stadium-placeholder"><img src={club.logoUrl} alt="" /></div>
        <div><Icon name="focus" /><span>Stadium</span><strong>{club.stadiumName}</strong></div>
        <div><span>Capacity</span><strong>{Number(club.stadiumCapacity || 0).toLocaleString()}</strong></div>
      </article>
      <div className="club-profile-table">
        {rows.filter(([, value]) => value).map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            {label === "Club colors" ? (
              <strong className="club-colors"><i style={{ background: club.primaryColor }} /><i style={{ background: club.secondaryColor }} /></strong>
            ) : <strong>{cleanText(value)}</strong>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ClubSquadTab({ slug, onPlayer }) {
  return (
    <div className="club-tab-panel squad-panel">
      {groupedClubPlayers(slug).map((group) => (
        <section key={group.position}>
          <h2>{group.position}s</h2>
          <div className="squad-grid">
            {group.players.map((player) => (
              <button className="squad-card" type="button" key={player.playerId} onClick={() => onPlayer(player)}>
                <span>{displayPlayerName(player)}</span>
                <img src={player.photoUrl} alt="" loading="lazy" />
                <b>{player.jerseyNumber}</b>
                <em>{player.nationality}</em>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ClubFixturesTab({ slug }) {
  const rows = clubFixtures(slug);
  return (
    <div className="club-tab-panel">
      <h2>Fixtures</h2>
      <div className="club-fixtures">
        {rows.length ? rows.map((row) => (
          <article key={`${row.dateISO}-${row.home}-${row.away}`}>
            <span>{row.dateLabel}</span><strong>{row.home}</strong><b>{row.time}</b><strong>{row.away}</strong>
          </article>
        )) : <p>No upcoming fixture rows in the static fixture set.</p>}
      </div>
    </div>
  );
}

function ClubStatsTab({ tableRow, slug }) {
  const playersForClub = clubPlayers(slug);
  const totals = playersForClub.reduce((sum, player) => ({
    goals: sum.goals + Number(player.goals || 0),
    assists: sum.assists + Number(player.assists || 0),
    sprints: sum.sprints + Number(player.sprints || 0),
    distance: sum.distance + Number(player.distanceKm || 0),
  }), { goals: 0, assists: 0, sprints: 0, distance: 0 });
  return (
    <div className="club-tab-panel">
      <div className="player-stat-grid">
        <Stat label="Points" value={tableRow.points} />
        <Stat label="Goals" value={`${tableRow.goalsFor}:${tableRow.goalsAgainst}`} />
        <Stat label="Goal diff" value={signed(tableRow.goalDifference)} />
        <Stat label="W-D-L" value={`${tableRow.wins}-${tableRow.draws}-${tableRow.losses}`} />
        <Stat label="Squad goals" value={totals.goals} />
        <Stat label="Assists" value={totals.assists} />
        <Stat label="Sprints" value={totals.sprints.toLocaleString()} />
        <Stat label="Distance" value={`${Math.round(totals.distance).toLocaleString()} km`} />
      </div>
    </div>
  );
}

function PlayerDetailScreen({ player, club, tableRow, activeTab, onTab, onBack }) {
  return (
    <section className="screen-stack table-stats-screen player-detail-screen">
      <button className="stats-back-button floating" type="button" onClick={onBack}><Icon name="back" /></button>
      <PlayerHero player={player} club={club} tableRow={tableRow} />
      <TableTabs active={activeTab} tabs={playerTabs} onSelect={onTab} />
      {activeTab === "News" ? <PlayerNewsTab player={player} club={club} /> : null}
      {activeTab === "Stats" ? <PlayerStatsTab player={player} /> : null}
      {activeTab === "Videos" ? <PlayerVideosTab player={player} /> : null}
      {activeTab === "Fantasy" ? <PlayerFantasyTab /> : null}
    </section>
  );
}

function PlayerHero({ player, club, tableRow }) {
  return (
    <header className="player-hero">
      <div>
        <h1>{displayPlayerName(player).replaceAll(" ", "\n")}</h1>
        <b>{player.jerseyNumber}</b>
        <span><img src={club?.logoUrl ?? player.clubLogoUrl} alt="" />{player.position} Â· {cleanText(tableRow?.clubName ?? player.clubName)}</span>
      </div>
      <img src={player.photoUrl} alt="" />
    </header>
  );
}

function PlayerNewsTab({ player, club }) {
  const teammates = clubPlayers(player.clubSlug).filter((mate) => mate.playerId !== player.playerId).slice(0, 6);
  return (
    <div className="club-tab-panel">
      <div className="player-bio-row">
        <span>Nationality <strong>{player.nationality}</strong></span>
        <span>{player.birthDate} <strong>{ageFromBirthDate(player.birthDate)} years</strong></span>
        <span>Height <strong>{displayValue(player.heightCm, " cm")}</strong></span>
        <span>Weight <strong>{displayValue(player.weightKg, " kg")}</strong></span>
      </div>
      <div className="player-stat-grid feature">
        <Stat label="Goals" value={displayValue(player.goals)} />
        <Stat label="Assists" value={displayValue(player.assists)} />
        <Stat label="Shots on goal" value={displayValue(player.shotsAtGoal)} />
        <Stat label="Tackles won" value={displayValue(player.tacklesWon)} />
      </div>
      <h2>Most recent appearance</h2>
      <article className="recent-appearance"><span>Saturday</span><strong>{club?.clubName ?? player.clubName}</strong><b>MD 34</b></article>
      <h2>Teammates</h2>
      <div className="teammate-strip">
        {teammates.map((mate) => (
          <button type="button" key={mate.playerId}>
            <img src={mate.photoUrl} alt="" loading="lazy" />
            <span>{displayPlayerName(mate)}</span>
            <b>{mate.jerseyNumber}</b>
          </button>
        ))}
      </div>
    </div>
  );
}

function PlayerStatsTab({ player }) {
  const rows = [
    ["Appearances", player.matchesPlayed],
    ["Goals", player.goals],
    ["Assists", player.assists],
    ["Ball actions", player.ballActions],
    ["Distance (km)", player.distanceKm],
    ["Shots on target", player.shotsOnTarget],
    ["Sprints", player.sprints],
    ["Speed (km/h)", player.maxSpeedKmh],
    ["Tackles won", player.tacklesWon],
    ["Aerial duels won", player.aerialDuelsWon],
    ["Yellow cards", player.yellowCards],
    ["Crosses", player.crossesFromPlay],
  ];
  return (
    <div className="club-tab-panel">
      <div className="season-selector"><span>Current season stats</span><strong>{TABLE_SEASON}</strong><Icon name="arrow" /></div>
      <div className="player-stats-table">
        {rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{displayValue(value)}</strong></div>)}
      </div>
    </div>
  );
}

function PlayerVideosTab({ player }) {
  return (
    <div className="club-tab-panel">
      <h2>All goals of {displayPlayerName(player)}</h2>
      <div className="club-card-row">
        {[0, 1].map((index) => (
          <article className="club-media-card player-video-card" key={index}>
            <MediaPoster tone="goal" compact />
            <strong>{displayPlayerName(player)}</strong>
            <span>Motion ID video placeholder</span>
          </article>
        ))}
      </div>
    </div>
  );
}

function PlayerFantasyTab() {
  return (
    <div className="club-tab-panel">
      <article className="fantasy-placeholder">
        <h2>Fantasy integration coming soon</h2>
        <p>Player fantasy form will be connected when the backend data feed is added.</p>
      </article>
    </div>
  );
}

export function ComingSoonScreen({ mode, onBack }) {
  const label = mode?.label ?? "This mode";
  return (
    <section className="screen-stack coming-soon-screen">
      <div className="coming-soon-card">
        <MediaPoster tone={mode?.posterTone ?? "expert"} imageSrc={modeThumbnailMap[mode?.id]} compact />
        <span>Coming soon</span>
        <h1>{label}</h1>
        <p>{mode?.description ?? "This Motion ID mode is visible for product context, but not playable yet."}</p>
        <button className="primary-cta" type="button" onClick={onBack}>Back to modes</button>
      </div>
    </section>
  );
}

export function ProfileScreen({ onNavigate }) {
  return (
    <section className="screen-stack profile-screen">
      <h1 className="page-title">Profile</h1>
      <article className="profile-card profile-page-card">
        <div className="avatar-badge">FCB</div>
        <div className="profile-user">
          <h2>{user.name}</h2>
          <p>{user.tier}</p>
        </div>
        <div className="profile-stats">
          <Stat label="Total score" value={user.totalScore.toLocaleString()} />
          <Stat label="Streak" value={`${user.streak}d`} />
          <Stat label="Rank" value={`#${user.rank.toLocaleString()}`} />
        </div>
      </article>
      <SectionTitle title="More" />
      <div className="more-menu">
        <button type="button" onClick={() => onNavigate("stats")}><Icon name="chart" />Player stats</button>
        <button type="button" onClick={() => onNavigate("leaderboard")}><Icon name="trophy" />Leaderboard</button>
        <button type="button" onClick={() => onNavigate("lobby")}><Icon name="play" />Motion ID modes</button>
      </div>
    </section>
  );
}

