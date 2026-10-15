# ExcerLock free-access skill: setup on the MacBook Air

This folder lets the marketing agent give creators free ExcerLock Premium by email. It can only grant, check and revoke free access, and it touches nothing else on the ExcerLock server. Johan can switch its token off at any time.

## One-time setup (about 3 minutes, a human at the Air)

1. Put this folder where the agent loads skills:
   - Claude Code: `~/.claude/skills/excerlock-access/`
   - Codex: `~/.codex/skills/excerlock-access/`
   - Other agents: any skills folder; `SKILL.md` is the instructions.
2. Put the command on the PATH. In Terminal:
   ```sh
   mkdir -p ~/.local/bin
   ln -sf ~/.claude/skills/excerlock-access/excerlock-access ~/.local/bin/excerlock-access
   chmod +x ~/.claude/skills/excerlock-access/excerlock-access
   xattr -dr com.apple.quarantine ~/.claude/skills/excerlock-access 2>/dev/null || true
   grep -q '.local/bin' ~/.zshrc || echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```
   (Replace `~/.claude` with `~/.codex` if you used Codex.)
3. Create the token on the Air:
   ```sh
   excerlock-access setup marketing-air
   ```
   It saves a secret token in this Mac's Keychain and prints one line like `marketing-air:3f9a…`. That line is **not** the secret. Send it to Johan.
4. Wait for Johan to say it is switched on, then run:
   ```sh
   excerlock-access test
   ```
   `OK: the access token works.` means you are done.

## Using it

Ask the agent in plain words, for example: "give @sarahfit free ExcerLock, her email is sarah@gmail.com, 3-month UGC deal". The agent runs `excerlock-access grant …` and replies with the result and what to tell the creator.

## If something goes wrong

- Lost or replaced the Air: tell Johan, who removes the token line from the server. Then repeat step 3 on the new Mac.
- `access token was rejected`: Johan switched it off or it changed. Repeat step 3 and send the new line.
- Requires macOS with Terminal. It uses only built-in tools (`curl`, `security`, `osascript`, `openssl`).
