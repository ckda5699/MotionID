import { players } from "../data/appData.js";
import { bundesligaPlayers } from "../data/tableStatsData.js";

export function normalizeName(value) {
  return String(value ?? "")
    .replaceAll("Ã­", "í")
    .replaceAll("Ã¼", "ü")
    .replaceAll("Ã¶", "ö")
    .replaceAll("Ã¤", "ä")
    .replaceAll("Ã©", "é")
    .replaceAll("Ã¡", "á")
    .replaceAll("Ã£", "ã")
    .replaceAll("Ã§", "ç")
    .replaceAll("ÃŸ", "ß")
    .replaceAll("Ä‡", "ć")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeTeamName(value) {
  return normalizeName(value)
    .replace(/^1\s*fc\s+/, "")
    .replace(/^fc\s+/, "")
    .replace(/^vfb\s+/, "")
    .replace(/^sv\s+/, "")
    .replace(/^vfl\s+/, "")
    .replace(/^tsg\s+/, "")
    .replace(/^1\s*fsv\s+/, "")
    .replace(/\s+ag$/, "")
    .replace(/\s+gmbh$/, "")
    .replace(/\s+e\s*v$/, "")
    .replace(/bayern\s+muenchen/, "bayern")
    .replace(/bayern\s+munich/, "bayern")
    .replace(/muenchen/, "bayern")
    .replace(/munich/, "bayern")
    .replace(/union\s+berlin/, "union")
    .replace(/borussia\s+dortmund/, "dortmund")
    .replace(/borussia\s+monchengladbach/, "gladbach")
    .replace(/borussia\s+moenchengladbach/, "gladbach")
    .replace(/monchengladbach/, "gladbach")
    .replace(/moenchengladbach/, "gladbach")
    .trim();
}

export function findPlayerByName(name) {
  if (!name) return null;
  const safe = normalizeName(name);

  // 1. Search in quiz players first
  const quizPlayer = players.find((player) => 
    player.aliases?.some((alias) => normalizeName(alias) === safe) || 
    normalizeName(player.name) === safe || 
    (player.displayName && normalizeName(player.displayName) === safe)
  );
  if (quizPlayer) return quizPlayer;

  // 2. Search in all Bundesliga players
  const bPlayer = bundesligaPlayers.find((player) => {
    const keys = [player.playerName, player.playerSlug, player.playerSlug?.replace(/-/g, " ")];
    if (keys.some((key) => key && normalizeName(key) === safe)) return true;

    // Fallback: check if the normalized player name or slug contains the safe input as a full word
    const nameWords = normalizeName(player.playerName).split(/\s+/);
    const slugWords = normalizeName(player.playerSlug).split(/[-\s]+/);
    return nameWords.includes(safe) || slugWords.includes(safe);
  });

  if (bPlayer) {
    return {
      name: bPlayer.playerName,
      team: bPlayer.clubName,
      position: bPlayer.position,
      nationality: bPlayer.nationality,
      number: bPlayer.jerseyNumber,
    };
  }

  return null;
}

export function calculateStageScore(stage, timing = {}) {
  const stageDuration = Math.max(1, timing.stageDuration ?? stage.answerGraceSeconds ?? 1);
  const elapsed = Math.max(0, Math.min(stageDuration, timing.elapsedInStage ?? 0));
  const timeFactor = 1 - elapsed / stageDuration;
  const rawScore = Math.round(100 * (stage.weight ?? 0) * timeFactor);
  const floor = stage.floor ?? 0;
  return Math.max(floor, rawScore);
}

export function scoreRound(answer, game, stage, timing = {}) {
  const correctPlayer = findPlayerByName(game.playerName);
  const selectedPlayer = findPlayerByName(answer);
  const isCorrect = Boolean(correctPlayer && selectedPlayer && selectedPlayer.name === correctPlayer.name);
  const sameTeamBonus = !isCorrect && selectedPlayer && correctPlayer && normalizeTeamName(selectedPlayer.team) === normalizeTeamName(correctPlayer.team) && stage.id < 5;
  const correctScore = calculateStageScore(stage, timing);

  return {
    id: `${game.id}-${Date.now()}`,
    gameId: game.id,
    gameTitle: game.title,
    challenge: game.challenge,
    answeredStage: stage.id,
    submittedAnswer: answer,
    correctAnswer: correctPlayer?.name ?? game.playerName,
    isCorrect,
    sameTeamBonus: Boolean(sameTeamBonus),
    pointsEarned: isCorrect ? correctScore : sameTeamBonus ? 5 : 0,
    timeRemaining: Math.max(0, Math.ceil(timing.remainingSeconds ?? 0)),
    elapsedInStage: Math.max(0, timing.elapsedInStage ?? 0),
    possiblePointsAtLock: isCorrect ? correctScore : 0,
    timedOut: Boolean(timing.timedOut),
  };
}
