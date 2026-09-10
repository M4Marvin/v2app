# Charon

Your private AI roleplay app. This guide collection shows you how to use it.

## What is Charon?

Charon is a self-hosted web app for roleplaying with AI characters. It runs at http://localhost:3000 and opens in your browser.

Everything stays on your machine: a local SQLite file, no cloud, no telemetry, no accounts except yours. You are the only user.

You need an AI provider (a service that powers the AI, like OpenAI or Ollama) and character cards to import.

The app has a character library, branching chats, lorebooks, personas, presets, and background scenes.

## Core concepts

- **Character** — an AI persona you chat with: a name, portrait, personality, and first message. Characters come from character cards.
- **Character card** — a PNG file containing a full character. Charon reads V2 and V3 cards; import to add characters.
- **Chat** — one conversation with one character.
- **Branch** — an alternate path in a conversation. Swiping or continuing creates branches; nothing is lost.
- **Swipe** — choose an alternate reply with the ← / → buttons under a message.
- **Regenerate** — ask the AI for a brand-new reply when no alternatives remain, via the circular-arrow button.
- **Lorebook** — background lore: a world's rules, places, factions. It feeds the AI when a keyword appears.
- **Lore entry** — one lore piece inside a lorebook, with trigger keywords.
- **Persona** — who you are in a conversation: name, description, icon. Applies to every chat.
- **Provider** — a service that powers the AI, like OpenAI, OpenRouter, or Ollama. Connect one with a base URL and an API key.
- **API key** — a secret string that lets Charon call your provider. Keep it private.
- **Model** — the specific AI brain on your provider, like GPT-4o or Llama 3.
- **Base URL** — the web address Charon uses to reach your provider.
- **Preset** — a saved bundle of generation settings (temperature, max tokens) to reuse.
- **Scene** — a picture behind a chat for atmosphere, also called a background scene.
- **Greeting** — a character's opening message; some cards have several, swipeable.
- **Impersonate** — the AI drafts your next message in your persona's voice; review and send.
- **Continue** — press Enter with an empty input; the AI keeps the scene going.
- **Markdown** — simple formatting (bold, italic, code blocks, tables, images).
- **Account** — the single account that runs the app. On your install, that's you.

## How Charon thinks

Conversations branch like a tree. Every swipe creates a new branch, and you move between alternate replies freely. Editing rewrites just that message. Deleting removes a message and everything after it. Lorebooks feed background lore when keywords appear. Personas and presets are your style knobs.

## The guides

- [Getting started](getting-started.md) — setup to your first chat.
- [Chatting](chatting.md) — swipe, regenerate, impersonate, continue.
- [Characters](characters.md) — import cards, manage your library.
- [Lorebooks](lorebooks.md) — build lorebooks and entries.
- [Personas, scenes, and presets](personas-scenes-presets.md) — your persona and scene, plus presets.
- [Troubleshooting](troubleshooting.md) — when something misbehaves.
