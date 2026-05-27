export type WireProtocol = "openai" | "anthropic";
export type ProviderName = "openai" | "anthropic";

export interface ResolvedModel {
  displayModel: string;
  realModel: string;
  provider: ProviderName;
}

const OPENAI_AUTO = "gpt-4o-mini";
const ANTHROPIC_AUTO = "claude-3-5-haiku-latest";

export function normalizeRequestedModel(model: string): string {
  return model.replace(/^duel\//, "").trim();
}

export function isAutoModel(model: string): boolean {
  const n = normalizeRequestedModel(model);
  return n === "duel-auto" || n === "auto";
}

export function resolveModel(
  requested: string,
  wireProtocol: WireProtocol,
): ResolvedModel {
  const normalized = normalizeRequestedModel(requested);

  if (isAutoModel(normalized)) {
    if (wireProtocol === "anthropic") {
      return {
        displayModel: "duel-auto",
        realModel: ANTHROPIC_AUTO,
        provider: "anthropic",
      };
    }
    return {
      displayModel: "duel-auto",
      realModel: OPENAI_AUTO,
      provider: "openai",
    };
  }

  if (normalized.startsWith("claude")) {
    return {
      displayModel: normalized,
      realModel: normalized,
      provider: "anthropic",
    };
  }

  return {
    displayModel: normalized,
    realModel: normalized,
    provider: wireProtocol === "anthropic" ? "anthropic" : "openai",
  };
}

export function listOpenAiModels() {
  return {
    object: "list",
    data: [
      {
        id: "duel-auto",
        object: "model",
        created: 1710000000,
        owned_by: "duel-agents",
      },
    ],
  };
}
