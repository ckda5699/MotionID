import { players } from "../data/appData.js";

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

export function findPlayerByName(name) {
  const safe = normalizeName(name);
  return players.find((player) => player.aliases.some((alias) => normalizeName(alias) === safe) || normalizeName(player.name) === safe);
}

export function calculateStageScore(stage, timing = {}) {
  const stageDuration = Math.max(1, timing.stageDuration ?? stage.answerGraceSeconds ?? 1);
  const elapsed = Math.max(0, Math.min(stageDuration, timing.elapsedInStage ?? 0));
  const timeFactor = stage.id === 1 ? 1 : 1 - elapsed / stageDuration;
  const rawScore = Math.round(100 * (stage.weight ?? 0) * timeFactor);
  const floor = stage.floor ?? 0;
  return stage.id === 1 ? 100 : Math.max(floor, rawScore);
}

export function scoreRound(answer, game, stage, timing = {}) {
  const correctPlayer = findPlayerByName(game.playerName);
  const selectedPlayer = findPlayerByName(answer);
  const isCorrect = Boolean(correctPlayer && selectedPlayer && selectedPlayer.name === correctPlayer.name);
  const sameTeamBonus = !isCorrect && selectedPlayer && correctPlayer && selectedPlayer.team === correctPlayer.team && stage.id < 5;
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
