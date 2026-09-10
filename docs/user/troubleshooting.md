# Troubleshooting

Stuck on something? Here are the answers to the most common questions, in plain language. If your problem is not on this page, the [getting started](getting-started.md) guide covers setup, and the [README](../../README.md) has the install details.

## Questions and answers

**Q: The app won't start.**

A: Check that Docker (or the dev server) is running, and that nothing else is using port 3000. The README at ../../README.md has the install commands. Restarting the container or server usually fixes it.

**Q: Test connection fails when I add a provider.**

A: Check that the **Base URL** and **API key** are entered exactly as your provider gave them, and that your computer can reach the provider. Is it online? Is a proxy or firewall blocking it? See [getting-started.md](getting-started.md) for provider setup.

**Q: The model list is empty.**

A: Run **Test connection** first. Charon fetches the model list from the provider when you test. If the list stays empty, set a **Default model** manually on the provider's settings.

**Q: I forgot my password.**

A: There is no self-service reset. Your data lives in a local SQLite file on your machine. You, or someone with access to the machine, can reset the password through the terminal. Keep a copy of your password somewhere safe.

**Q: Import and provider options are missing.**

A: Your account hasn't claimed admin yet. Open the onboarding wizard from **Settings** → **Onboarding** and use the "Make me the admin" step (available when no admin exists yet). As a fallback, open a terminal in the Charon folder and run `pnpm create-admin --username <your-username>` to promote your account, then sign out and back in. See [getting-started.md](getting-started.md).

**Q: A character card won't import.**

A: Make sure the file is a PNG, is under 50 MB, and is a valid V2 or V3 character card. The import page shows a list of what is wrong if validation fails.

**Q: I imported a lorebook but it doesn't affect my chats.**

A: Imported lorebooks start **disabled**. Enable it with the switch on the **Lorebooks** page. Remember: an enabled lorebook applies to **all** chats. See [lorebooks.md](lorebooks.md).

**Q: The AI's replies look oddly formatted.**

A: Try the display toggles. **Auto-fix Markdown** repairs common formatting slips, and **Highlight dialogue** colors quoted speech. Both live under **Settings** → **Preferences**. Messages support markdown like bold, italic, and code blocks. See [chatting.md](chatting.md).

**Q: Where is my data? How do I back up?**

A: Everything is stored in a local SQLite file, plus an uploads folder for images, inside the Charon data directory on your machine. Backing up that folder backs up everything. See the [README](../../README.md) for the exact path.

**Q: Will accounts be removed?**

A: Run `pnpm migrate:single-user` first. It backs the database. Restore: `cp dev.db.bak-single-user-<timestamp> dev.db` (`-wal`/`-shm` if present).

Back to the [overview](./index.md).
