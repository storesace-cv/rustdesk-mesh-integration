# GitHub-bound logs

The `local-logs/` folder is the **only place where logs should be published to GitHub**. Keep the working copy clean:

- Do not store or process runtime logs here directly on your workstation.
- Use the `logs/` directory for any local or downloaded logs.
- When you need to share logs via GitHub, run `scripts/get-error-log.sh --publish` to copy selected files from `logs/` into `local-logs/`, force-stage them, commit, and push.
- Avoid pulling log artefacts back to the workstation; clean `local-logs/` locally after publishing if you don't need the copies.
