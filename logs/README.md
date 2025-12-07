# Local logs (not versioned)

All logs generated on the local workstation or downloaded from the droplet **must live under `logs/`**:

- `logs/local/` – outputs from Step-1 to Step-3.
- `logs/deploy/` – deploy logs from Step-5.
- `logs/droplet/` – copies of logs pulled from remote hosts.

This directory is ignored from Git by default. Use scripts to publish selected files into `local-logs/` when you need to share them via GitHub. Do **not** commit files directly from `logs/`.
