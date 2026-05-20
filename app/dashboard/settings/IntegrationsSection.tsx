"use client";

/**
 * Integrations panel — one row per supported client with the exact
 * install command. These are stubs for Phase 1; Phase 5 ships the real
 * `@duel-agents/install` CLI and replaces these snippets with one-shot
 * configuration helpers per client.
 *
 * The proxy base URL is rendered from `NEXT_PUBLIC_PROXY_URL` (set in
 * `.env.*`) so localhost dev and production share this file.
 */

import { useState } from "react";

const PROXY_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_PROXY_URL) ||
  "https://api.duel-agents.com/v1";

interface Integration {
  id: string;
  name: string;
  tagline: string;
  /** Phase 5 ships these as `npx @duel-agents/install <id>` one-liners.
   *  Until then we show the manual env-var override so curious users can
   *  start poking. */
  command: string;
  manualNote?: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    tagline: "Anthropic's CLI",
    command: `export ANTHROPIC_BASE_URL=${PROXY_URL}
export ANTHROPIC_API_KEY=<your-duel-key>`,
    manualNote: "Paste into your shell rc, restart Claude Code.",
  },
  {
    id: "cursor",
    name: "Cursor",
    tagline: "Editor",
    command: `Cursor → Settings → Models → Override OpenAI Base URL
${PROXY_URL}
API key: <your-duel-key>`,
    manualNote: "Custom Models section in Cursor settings.",
  },
  {
    id: "codex",
    name: "Codex CLI",
    tagline: "OpenAI's CLI",
    command: `export OPENAI_BASE_URL=${PROXY_URL}
export OPENAI_API_KEY=<your-duel-key>`,
    manualNote: "Paste into your shell rc, restart Codex.",
  },
  {
    id: "hermes-agent",
    name: "Hermes Agent",
    tagline: "Nous Research agent framework",
    command: `# in your Hermes Agent config:
OPENAI_BASE_URL=${PROXY_URL}
OPENAI_API_KEY=<your-duel-key>
# (or ANTHROPIC_BASE_URL if you prefer the Anthropic protocol)`,
    manualNote: "Set in your Hermes Agent .env, restart the agent.",
  },
  {
    id: "venice",
    name: "Venice",
    tagline: "OpenAI-compat provider",
    command: `# replace Venice's base URL with Duel's:
OPENAI_BASE_URL=${PROXY_URL}
OPENAI_API_KEY=<your-duel-key>`,
    manualNote: "Anywhere you were using api.venice.ai/api/v1, swap in Duel.",
  },
];

export function IntegrationsSection() {
  return (
    <section>
      <div className="mb-6">
        <p
          className="font-mono text-ink-faint mb-2"
          style={{ fontSize: "10.5px", letterSpacing: "0.28em" }}
        >
          / INTEGRATIONS
        </p>
        <h2
          className="font-display font-medium text-ink mb-3"
          style={{
            fontSize: "clamp(1.4rem, 2.2vw, 1.85rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.022em",
          }}
        >
          Plug Duel into your tools.
        </h2>
        <p
          className="text-ink-soft max-w-[58ch]"
          style={{ fontSize: "0.975rem", lineHeight: 1.55 }}
        >
          Drop your Duel API key in and point the tool at our base URL.
          Every prompt from that tool will route through Duel from then
          on. Replace <code className="font-mono text-ink">&lt;your-duel-key&gt;</code> with
          a key you generated above.
        </p>
      </div>

      <div className="border border-ink/10 divide-y divide-ink/10">
        {INTEGRATIONS.map((i) => (
          <IntegrationRow key={i.id} integration={i} />
        ))}
      </div>
    </section>
  );
}

function IntegrationRow({ integration }: { integration: Integration }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(integration.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-6 py-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p
            className="font-display font-medium text-ink"
            style={{ fontSize: "1.05rem", letterSpacing: "-0.015em" }}
          >
            {integration.name}
          </p>
          <p
            className="font-mono text-ink-faint mt-1"
            style={{ fontSize: "10px", letterSpacing: "0.22em" }}
          >
            / {integration.tagline.toUpperCase()}
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="font-mono text-ink hover:text-rust transition-colors flex-none"
          style={{ fontSize: "10.5px", letterSpacing: "0.22em" }}
        >
          {copied ? "COPIED ✓" : "COPY"}
        </button>
      </div>
      <pre
        className="font-mono text-ink whitespace-pre-wrap break-all"
        style={{
          fontSize: "0.825rem",
          background: "rgba(10,10,10,0.04)",
          padding: "0.85rem 1rem",
          lineHeight: 1.55,
          letterSpacing: "-0.005em",
        }}
      >
        {integration.command}
      </pre>
      {integration.manualNote && (
        <p
          className="font-mono text-ink-faint"
          style={{ fontSize: "10px", letterSpacing: "0.22em" }}
        >
          / {integration.manualNote.toUpperCase()}
        </p>
      )}
    </div>
  );
}
