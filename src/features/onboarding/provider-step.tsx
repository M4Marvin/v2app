import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusDot } from "@/components/common/StatusDot";
import { useCreateAiProvider } from "@/hooks/useAiProviders";
import { useUpdateUserSettings } from "@/hooks/useUserSettings";
import { testProviderConnection } from "@/server/fns/models";

export function ProviderStep({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [defaultModel, setDefaultModel] = useState("");

  const createProvider = useCreateAiProvider();
  const updateDefaults = useUpdateUserSettings();

  const testConnection = useMutation({
    mutationFn: (providerId: string) => testProviderConnection({ data: { id: providerId } }),
  });

  const [probe, setProbe] = useState<{
    status: "idle" | "testing" | "ok" | "error";
    message?: string;
  }>({ status: "idle" });

  const handleCreate = () => {
    if (!name.trim() || !baseUrl.trim() || !apiKey.trim()) return;
    createProvider.mutate(
      {
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        ...(defaultModel.trim() ? { defaultModel: defaultModel.trim() } : {}),
      },
      {
        onSuccess: ({ id }) => {
          toast.success("Provider created");
          updateDefaults.mutate({
            defaultProviderId: id,
            defaultSelectedModel: defaultModel.trim() || null,
            defaultPresetId: null,
          });
          onCreated();
          setProbe({ status: "testing" });
          testConnection.mutate(id, {
            onSuccess: (result) => {
              setProbe(
                result.ok
                  ? {
                      status: "ok",
                      message: `Connection OK · ${result.latencyMs}ms · ${result.modelCount} models`,
                    }
                  : { status: "error", message: result.error ?? "Provider unreachable" },
              );
            },
            onError: (e) => {
              setProbe({ status: "error", message: (e as Error).message });
            },
          });
        },
        onError: (e) => toast.error(`Create failed: ${(e as Error).message}`),
      },
    );
  };

  const ready = Boolean(name.trim() && baseUrl.trim() && apiKey.trim());

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="provider-name">Name</Label>
        <Input
          id="provider-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="OpenAI"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="provider-base-url">Base URL</Label>
        <Input
          id="provider-base-url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.openai.com/v1"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="provider-api-key">API key</Label>
        <Input
          id="provider-api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="provider-default-model">Default model (optional)</Label>
        <Input
          id="provider-default-model"
          value={defaultModel}
          onChange={(e) => setDefaultModel(e.target.value)}
          placeholder="gpt-4o"
        />
      </div>

      <Button type="button" onClick={handleCreate} disabled={!ready || createProvider.isPending}>
        Use this provider
      </Button>

      {probe.status !== "idle" ? (
        <div className="flex items-center gap-2">
          <StatusDot
            tone={
              probe.status === "testing" ? "muted" : probe.status === "ok" ? "success" : "danger"
            }
            label={probe.status === "testing" ? "Testing connection..." : (probe.message ?? "")}
          />
        </div>
      ) : null}
    </div>
  );
}
