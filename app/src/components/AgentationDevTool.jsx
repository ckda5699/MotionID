import { lazy, Suspense } from "react";

const shouldEnableAgentation = import.meta.env.DEV || import.meta.env.VITE_ENABLE_AGENTATION === "true";

const AgentationPanel = shouldEnableAgentation
  ? lazy(() => import("agentation").then((module) => ({ default: module.Agentation })))
  : null;

export function AgentationDevTool() {
  if (!shouldEnableAgentation || !AgentationPanel) return null;

  return (
    <Suspense fallback={null}>
      <AgentationPanel className="motion-agentation-toolbar" />
    </Suspense>
  );
}
