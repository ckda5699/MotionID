import { resolveDataUrl } from "../config/runtime.js";
import { games, modes, players, stages } from "../data/appData.js";

export async function loadMotionIdManifest() {
  try {
    const response = await fetch(resolveDataUrl("motion-id-demo-manifest.json"), { cache: "no-cache" });
    if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
    return await response.json();
  } catch {
    return {
      version: "fallback-static-data",
      stages,
      players,
      modes,
      games,
    };
  }
}
