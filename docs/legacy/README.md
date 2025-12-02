# Legacy files (archived)

These files are historical artifacts kept for reference only. They relate to
an older RustDesk meshserver deployment layout and manual deploy process.

Do NOT run the scripts in `scripts/legacy/` on production systems. Example
copies have been provided (`*.sh.example`) if you need to inspect the old
commands. The original scripts have been replaced with safe no-op stubs to
prevent accidental execution.

Actions performed by the automation on `2025-12-02`:
- A DigitalOcean snapshot named `pre-remove-legacy-<timestamp>` was created.
- Legacy systemd unit files (`meshserver`, `hbbs`, `hbbr`) were stopped, disabled,
  masked and removed from the droplet if present.
- `/opt/rustdesk-mesh` was removed from the droplet (if present).

If you need to restore the old files for debugging, a compressed backup was
saved on the droplet at `/root/backups/pre-remove-legacy-<timestamp>.tar.gz`.
