import { resolveMediaUrl } from "../config/runtime.js";
import { bundesligaFixtures } from "./bundesligaFixtures.generated.js";
import localVideoManifest from "./localVideoManifest.json";

export const stageWeights = {
  1: 1,
  2: 0.8,
  3: 0.6,
  4: 0.35,
  5: 0.15,
};

export const stageFloors = {
  1: 100,
  2: 50,
  3: 30,
  4: 20,
  5: 10,
};

export const stages = [
  {
    id: 1,
    label: "Main Action",
    shortLabel: "Action",
    segmentLabel: "Main goal action",
    type: "video",
    sourceWindow: { start: 5, end: 11 },
    countdownSeconds: 3,
    answerGraceSeconds: 5,
    weight: stageWeights[1],
    floor: stageFloors[1],
    microcopy: "Watch the decisive movement. Answer any time, reveal comes after all stages.",
    cues: [],
  },
  {
    id: 2,
    label: "Buildup + Action",
    shortLabel: "Buildup",
    segmentLabel: "Buildup and finish",
    type: "video",
    sourceWindow: { start: 0, end: 11 },
    countdownSeconds: 3,
    answerGraceSeconds: 5,
    weight: stageWeights[2],
    floor: stageFloors[2],
    microcopy: "More context is visible. Faster correct answers still score more.",
    cues: [],
  },
  {
    id: 3,
    label: "Full Clip",
    shortLabel: "Full",
    segmentLabel: "Buildup, goal, reaction",
    type: "video",
    sourceWindow: { start: 0, end: 15 },
    countdownSeconds: 3,
    answerGraceSeconds: 5,
    weight: stageWeights[3],
    floor: stageFloors[3],
    microcopy: "The whole movement sequence is visible. Identity is still hidden.",
    cues: [],
  },
  {
    id: 4,
    label: "First Identity Cues",
    shortLabel: "Cue 1",
    segmentLabel: "Soft identity cues",
    type: "cue",
    sourceWindow: { start: 0, end: 15 },
    cueSeconds: 3,
    countdownSeconds: 3,
    answerGraceSeconds: 5,
    weight: stageWeights[4],
    floor: stageFloors[4],
    microcopy: "Soft player context appears. Correct answers still count.",
    cueIntro: "First identity cues",
    cues: ["roleGroup", "seasonBand"],
  },
  {
    id: 5,
    label: "Stronger Identity Cues",
    shortLabel: "Cue 2",
    segmentLabel: "Stronger identity cues",
    type: "cue",
    sourceWindow: { start: 0, end: 15 },
    cueSeconds: 3,
    countdownSeconds: 3,
    answerGraceSeconds: 5,
    weight: stageWeights[5],
    floor: stageFloors[5],
    microcopy: "Final cue layer before the answer is revealed.",
    cueIntro: "Stronger identity cues",
    cues: ["nationality", "jersey", "careerHint"],
  },
];

export const user = {
  name: "BayernFan23",
  tier: "Motion ID Pro",
  level: 24,
  totalScore: 12450,
  streak: 7,
  rank: 1284,
  percentile: 8,
};

export const players = [
  {
    name: "Luis Diaz",
    displayName: "Luis Díaz",
    aliases: ["luis diaz", "luis díaz", "diaz", "díaz"],
    team: "FC Bayern München",
    position: "Left winger",
    nationality: "Colombia",
    number: 14,
    height: "1.80 m",
    birth: "13 Jan 1997",
    foot: "Right",
    roleGroup: "Wide attacker",
    seasonBand: "Direct goal threat",
    careerHint: "Elite dribbler from Colombia",
    portraitTone: "diaz",
    stats: [
      { label: "Primary role", value: "Left-sided attacker" },
      { label: "Movement cue", value: "Explosive carry into finish" },
      { label: "Country", value: "Colombia" },
    ],
  },
  {
    name: "Harry Kane",
    aliases: ["harry kane", "kane"],
    team: "FC Bayern München",
    position: "Striker",
    nationality: "England",
    number: 9,
    height: "1.88 m",
    birth: "28 Jul 1993",
    foot: "Right",
    roleGroup: "Central striker",
    seasonBand: "High-volume scorer",
    careerHint: "England captain profile",
    portraitTone: "kane",
    stats: [
      { label: "Primary role", value: "Penalty-box finisher" },
      { label: "Movement cue", value: "Early body shape before strike" },
      { label: "Country", value: "England" },
    ],
  },
  {
    name: "Serge Gnabry",
    aliases: ["serge gnabry", "gnabry"],
    team: "FC Bayern München",
    position: "Forward",
    nationality: "Germany",
    number: 7,
    height: "1.76 m",
    birth: "14 Jul 1995",
    foot: "Right",
    roleGroup: "Forward",
    seasonBand: "Shot-first wide threat",
    careerHint: "German international attacker",
    portraitTone: "gnabry",
  },
  {
    name: "Aleksandar Pavlovic",
    displayName: "Aleksandar Pavlović",
    aliases: ["a. pavlovic", "a. pavlović", "aleksandar pavlovic", "aleksandar pavlović", "pavlovic", "pavlović"],
    team: "FC Bayern München",
    position: "Midfielder",
    nationality: "Germany",
    number: 45,
    height: "1.88 m",
    birth: "3 May 2004",
    foot: "Right",
    roleGroup: "Central midfielder",
    seasonBand: "Late box arrival",
    careerHint: "Bayern academy midfielder",
    portraitTone: "pavlovic",
  },
  {
    name: "Maximilian Beier",
    displayName: "M. Beier",
    aliases: ["m. beier", "maximilian beier", "beier"],
    team: "Borussia Dortmund",
    position: "Forward",
    nationality: "Germany",
    number: 14,
    height: "1.83 m",
    birth: "17 Oct 2002",
    foot: "Right",
    roleGroup: "Forward",
    seasonBand: "Direct runner",
    careerHint: "German forward profile",
    portraitTone: "beier",
  },
  {
    name: "Karim Adeyemi",
    aliases: ["karim adeyemi", "adeyemi"],
    team: "Borussia Dortmund",
    position: "Forward",
    nationality: "Germany",
    number: 27,
    height: "1.80 m",
    birth: "18 Jan 2002",
    foot: "Left",
    roleGroup: "Wide forward",
    seasonBand: "Pace-led attacker",
    careerHint: "Explosive German winger",
    portraitTone: "adeyemi",
  },
  {
    name: "Deniz Undav",
    displayName: "D. Undav",
    aliases: ["d. undav", "deniz undav", "undav"],
    team: "VfB Stuttgart",
    position: "Striker",
    nationality: "Germany",
    number: 26,
    height: "1.79 m",
    birth: "19 Jul 1996",
    foot: "Right",
    roleGroup: "Central striker",
    seasonBand: "Box finisher",
    careerHint: "Germany international forward",
    portraitTone: "undav",
  },
  {
    name: "Ilyas Ansah",
    displayName: "I. Ansah",
    aliases: ["i. ansah", "ilyas ansah", "ansah"],
    team: "1. FC Union Berlin",
    position: "Forward",
    nationality: "Germany",
    number: 29,
    height: "1.94 m",
    birth: "8 Nov 2004",
    foot: "Right",
    roleGroup: "Forward",
    seasonBand: "Transition runner",
    careerHint: "Young German forward",
    portraitTone: "ansah",
  },
  {
    name: "Oliver Burke",
    aliases: ["oliver burke", "burke"],
    team: "1. FC Union Berlin",
    position: "Forward",
    nationality: "Scotland",
    number: 15,
    height: "1.88 m",
    birth: "7 Apr 1997",
    foot: "Right",
    roleGroup: "Forward",
    seasonBand: "Power runner",
    careerHint: "Scotland international forward",
    portraitTone: "burke",
  },
];

export const localVideoPackages = localVideoManifest.map((item) => ({
  ...item,
  goalUrl: resolveMediaUrl(item.goalVideo),
  highlightUrl: resolveMediaUrl(item.highlightVideo),
}));

const localGoalVideos = Object.fromEntries(localVideoPackages.map((item) => [item.sourceKey, item.goalUrl]));

export const localDemoSourceKeys = localVideoPackages.map((item) => item.sourceKey);

export const localHighlightVideos = Object.fromEntries(localVideoPackages.map((item) => [item.sourceKey, item.highlightUrl]));

const fallbackGoalVideo = localGoalVideos.Bayern_Hamburg_goal_01 ?? resolveMediaUrl("goal_window_striker_pov_001.mp4");

function goalGame({ id, modeId = "goals", match, title, playerName, sourceKey, remoteVideo, difficulty = "Medium", repaired = false }) {
  const localVideo = localGoalVideos[sourceKey];
  return {
    id,
    modeId,
    title,
    match,
    challenge: repaired ? "Repaired ball-tracking goal" : "Goal recognition",
    playerName,
    video: localVideo ?? remoteVideo ?? fallbackGoalVideo,
    fallbackVideo: localVideo ? null : fallbackGoalVideo,
    sourceKey,
    difficulty,
    repaired,
  };
}

export const games = [
  goalGame({ id: "Bayern_Hamburg_goal_01", match: "Bayern vs Hamburg", title: "Goal 1", playerName: "Serge Gnabry", sourceKey: "Bayern_Hamburg_goal_01" }),
  goalGame({ id: "Bayern_Hamburg_goal_02", match: "Bayern vs Hamburg", title: "Goal 2", playerName: "Aleksandar Pavlovic", sourceKey: "Bayern_Hamburg_goal_02" }),
  goalGame({ id: "Frankfurt_Bayern_goal_01", match: "Frankfurt vs Bayern", title: "Goal 1", playerName: "Luis Diaz", sourceKey: "Frankfurt_Bayern_goal_01" }),
  goalGame({ id: "Bayern_Hamburg_goal_04", match: "Bayern vs Hamburg", title: "Goal 4", playerName: "Harry Kane", sourceKey: "Bayern_Hamburg_goal_04" }),
  goalGame({ id: "Dortmund_Stuttgart_goal_01", match: "Dortmund vs Stuttgart", title: "Goal 1", playerName: "Maximilian Beier", sourceKey: "Dortmund_Stuttgart_goal_01" }),
  goalGame({ id: "Dortmund_Stuttgart_goal_04", match: "Dortmund vs Stuttgart", title: "Goal 4", playerName: "Karim Adeyemi", sourceKey: "Dortmund_Stuttgart_goal_04" }),
  goalGame({ id: "Dortmund_Stuttgart_goal_05", match: "Dortmund vs Stuttgart", title: "Goal 5", playerName: "Deniz Undav", sourceKey: "Dortmund_Stuttgart_goal_05" }),
  goalGame({ id: "Frankfurt_Bayern_goal_02", match: "Frankfurt vs Bayern", title: "Goal 2", playerName: "Harry Kane", sourceKey: "Frankfurt_Bayern_goal_02" }),
  goalGame({ id: "Frankfurt_Bayern_goal_03", match: "Frankfurt vs Bayern", title: "Goal 3", playerName: "Luis Diaz", sourceKey: "Frankfurt_Bayern_goal_03" }),
  goalGame({ id: "Frankfurt_Union_goal_01", match: "Frankfurt vs Union", title: "Goal 1", playerName: "Ilyas Ansah", sourceKey: "Frankfurt_Union_goal_01" }),
  goalGame({ id: "Frankfurt_Union_goal_05", match: "Frankfurt vs Union", title: "Goal 5", playerName: "Oliver Burke", sourceKey: "Frankfurt_Union_goal_05" }),
  goalGame({ id: "Union_Bayern_goal_02", match: "Union vs Bayern", title: "Goal 2", playerName: "Luis Diaz", sourceKey: "Union_Bayern_goal_02" }),
  goalGame({ id: "Union_Bayern_goal_04", match: "Union vs Bayern", title: "Goal 4", playerName: "Harry Kane", sourceKey: "Union_Bayern_goal_04" }),
];

export const modes = [
  { id: "goals", label: "Live Challenge", badge: "Active", description: "Identify finishers from movement in the live points challenge.", duration: "6 min", difficulty: "Medium", icon: "goal", posterTone: "goal" },
  { id: "daily", label: "Daily Challenge", badge: "Training", description: "Coming soon: one clip to train everyday.", duration: "1-2 min", difficulty: "Medium", icon: "calendar", posterTone: "daily", comingSoon: true },
  { id: "team", label: "Favourite Team Training", badge: "Training", description: "Coming soon: train with clips from your selected Bundesliga club.", duration: "3 min", difficulty: "Medium", icon: "cards", posterTone: "matchpack", comingSoon: true },
  { id: "goalkeepers", label: "Keeper Training", badge: "Training", description: "Coming soon: improve your goal keeper Motion ID.", duration: "5 min", difficulty: "Medium", icon: "keeper", posterTone: "keeper", comingSoon: true },
  { id: "expert", label: "Expert Training", badge: "Training", description: "Coming soon: harder clips with less identity help.", duration: "4 min", difficulty: "Hard", icon: "expert", posterTone: "expert", comingSoon: true },
  { id: "matchpack", label: "Match Training", badge: "Training", description: "Coming soon: curated packs from match data.", duration: "8 min", difficulty: "Medium", icon: "cards", posterTone: "matchpack", comingSoon: true },
];

export const stories = [
  { type: "News", title: "Bayern's movement patterns decide the box", time: "2h ago", imageTone: "bayern" },
  { type: "Highlights", title: "Five finishes from the weekend data pack", time: "5h ago", imageTone: "finish" },
  { type: "Analysis", title: "Why body shape beats shirt numbers", time: "1d ago", imageTone: "analysis" },
];

export const newsStories = [
  { type: "Motion ID", title: "Can you spot the finisher before the shirt appears?", time: "Live challenge", imageTone: "finish", summary: "A movement-only quiz round built from Bundesliga 3D tracking clips." },
  { type: "Analysis", title: "Why body shape gives the player away", time: "Today", imageTone: "analysis", summary: "Torso angle, run shape, and first touch patterns become fan-readable clues." },
  { type: "Highlights", title: "Five goals rebuilt as 3D camera challenges", time: "2h ago", imageTone: "bayern", summary: "Goal clips become timed stages: action, buildup, full sequence, then identity cues." },
  { type: "Matchday", title: "Final day fixtures arrive together", time: "Tomorrow", imageTone: "headline", summary: "All Bundesliga Matchday 34 games kick off at the same time." },
  { type: "Stats", title: "Player clues from goals, assists, caps and role data", time: "Data room", imageTone: "classic", summary: "Static generated profile data powers late-stage identity cues." },
  { type: "Product", title: "Agent-backed explanations are next", time: "Prototype", imageTone: "expert", summary: "The future insight screen will answer natural-language movement questions." },
];

const postRegularSeasonFixtures = [
  { dateISO: "2026-05-21", dateLabel: "Thu 21 May", time: "20:30", matchday: "REL 1", home: "VfL Wolfsburg", away: "SC Paderborn 07" },
  { dateISO: "2026-05-25", dateLabel: "Mon 25 May", time: "20:30", matchday: "REL 2", home: "SC Paderborn 07", away: "VfL Wolfsburg" },
];

export const matchRows = [...bundesligaFixtures, ...postRegularSeasonFixtures];

export const movementMetrics = [
  { label: "Body orientation", value: "Opened toward goal before release", score: 1 },
  { label: "Pressure window", value: "Closest defender inside 2m", score: 2 },
  { label: "Ball contact timing", value: "Fast setup after carry", score: 3 },
  { label: "Run shape", value: "Curved approach into strike lane", score: 4 },
];

export const leaderboardRows = [
  { rank: 1, player: "Lukas_09", score: 512, streak: 12, stageAvg: "+102" },
  { rank: 2, player: "FlorianBVB", score: 498, streak: 10, stageAvg: "+98" },
  { rank: 3, player: "Niklas_7", score: 463, streak: 9, stageAvg: "+84" },
  { rank: 4, player: "FCKoln_1948", score: 432, streak: 8, stageAvg: "+79" },
  { rank: 5, player: "Sven_M05", score: 411, streak: 8, stageAvg: "+74" },
  { rank: 128, player: "Tom_B04", score: 286, streak: 7, stageAvg: "+57", current: true },
  { rank: 129, player: "Alina_RBL", score: 285, streak: 7, stageAvg: "+56" },
  { rank: 130, player: "Marcel_SGE", score: 283, streak: 7, stageAvg: "+55" },
  { rank: 131, player: "Basti_FCA", score: 281, streak: 6, stageAvg: "+54" },
];

const dailyRows = leaderboardRows;

const weeklyRows = [
  { rank: 1, player: "MotionKing", score: 1786, streak: 19, stageAvg: "+116" },
  { rank: 2, player: "BundesIQ", score: 1714, streak: 16, stageAvg: "+109" },
  { rank: 3, player: "GoalSpotter", score: 1689, streak: 15, stageAvg: "+103" },
  { rank: 4, player: "MiaSanMia", score: 1642, streak: 14, stageAvg: "+97" },
  { rank: 5, player: "SchwarzRotGold", score: 1588, streak: 13, stageAvg: "+94" },
  { rank: 128, player: "BayernFan23", score: 286, streak: 7, stageAvg: "+57", current: true },
  { rank: 129, player: "Alina_RBL", score: 285, streak: 7, stageAvg: "+56" },
  { rank: 130, player: "Marcel_SGE", score: 283, streak: 7, stageAvg: "+55" },
  { rank: 131, player: "Basti_FCA", score: 281, streak: 6, stageAvg: "+54" },
];

const friendsRows = [
  { rank: 1, player: "Nico_089", score: 706, streak: 8, stageAvg: "+89" },
  { rank: 2, player: "Tom_B04", score: 612, streak: 7, stageAvg: "+76" },
  { rank: 3, player: "BayernFan23", score: 286, streak: 7, stageAvg: "+57", current: true },
  { rank: 4, player: "Amina_BVB", score: 244, streak: 4, stageAvg: "+49" },
  { rank: 5, player: "Jan_SGE", score: 218, streak: 3, stageAvg: "+44" },
];

const allTimeRows = [
  { rank: 1, player: "DerAnalyst", score: 9824, streak: 41, stageAvg: "+121" },
  { rank: 2, player: "PressingTrap", score: 9468, streak: 39, stageAvg: "+117" },
  { rank: 3, player: "GoalHunter27", score: 9112, streak: 36, stageAvg: "+112" },
  { rank: 4, player: "TaktikFuchs", score: 8740, streak: 34, stageAvg: "+108" },
  { rank: 5, player: "BL_MotionLab", score: 8526, streak: 31, stageAvg: "+104" },
  { rank: 1284, player: "BayernFan23", score: 12450, streak: 7, stageAvg: "+57", current: true },
];

export const leaderboardTabs = {
  "All Time": { label: "All-time rankings", summary: { rank: "#1,284", score: "12,450", streak: 7, avg: "57" }, rows: allTimeRows },
  Matchday: { label: "Matchday rankings", summary: { rank: "#128", score: "286", streak: 7, avg: "57" }, rows: weeklyRows },
  Friends: { label: "Friends rankings", summary: { rank: "#3", score: "286", streak: 7, avg: "57" }, rows: friendsRows },
};

export const sampleResults = [
  { gameId: "Bayern_Hamburg_goal_01", gameTitle: "Goal 1", challenge: "Goal recognition", answeredStage: 2, submittedAnswer: "Serge Gnabry", correctAnswer: "Serge Gnabry", isCorrect: true, pointsEarned: 78, matchDate: "Matchday 34 - Sat 16 May 2026" },
  { gameId: "Bayern_Hamburg_goal_02", gameTitle: "Goal 2", challenge: "Goal recognition", answeredStage: 4, submittedAnswer: "Aleksandar Pavlovic", correctAnswer: "Aleksandar Pavlovic", isCorrect: true, pointsEarned: 34, matchDate: "Matchday 34 - Sat 16 May 2026" },
  { gameId: "Frankfurt_Bayern_goal_01", gameTitle: "Goal 1", challenge: "Goal recognition", answeredStage: 1, submittedAnswer: "Luis Diaz", correctAnswer: "Luis Diaz", isCorrect: true, pointsEarned: 100, matchDate: "Matchday 34 - Sat 16 May 2026" },
  { gameId: "Union_Bayern_goal_04", gameTitle: "Goal 4", challenge: "Goal recognition", answeredStage: 5, submittedAnswer: "Harry Kane", correctAnswer: "Harry Kane", isCorrect: true, pointsEarned: 14, matchDate: "Matchday 34 - Sat 16 May 2026" },
];
