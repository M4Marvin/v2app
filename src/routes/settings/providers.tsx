import { createFileRoute } from "@tanstack/react-router";
import { ProviderManager } from "@/components/ai/ProviderManager";

export const Route = createFileRoute("/settings/providers")({
  component: ProvidersPage,
});

function ProvidersPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-title">AI Providers</h2>
      <p className="text-2 text-sm">
        Manage your OpenAI-compatible API endpoints. These are shared across all chats.
      </p>
      <ProviderManager />
    </div>
  );
}
