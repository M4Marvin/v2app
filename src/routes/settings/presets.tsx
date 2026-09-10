import { createFileRoute } from "@tanstack/react-router";
import { PresetManager } from "@/components/preset/PresetManager";

export const Route = createFileRoute("/settings/presets")({
  component: PresetsPage,
});

function PresetsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-title">Presets</h2>
      <p className="text-2 text-sm">
        Save generation parameters (temperature, tokens, etc.) as reusable presets.
      </p>
      <PresetManager />
    </div>
  );
}
