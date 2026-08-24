import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { EmptySurface } from "@/components/WorkspaceHeader";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const session = await getSession(getAuth());
  if (!session) return null;

  return (
    <div className="flex h-full flex-col">
      <WorkspaceHeader
        title="Analytics"
        subtitle="Operational signals with explicit baselines and uncertainty"
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <EmptySurface message="Operational analytics (stage latency, funnel change detection, capacity) populate as durable workflows run. Signals are labeled associations; the product never claims causal effects from pipeline correlations." />
      </div>
    </div>
  );
}
