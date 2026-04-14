# SnapRatio

Minimal Mac overlay tool for capturing perfectly cropped screenshots for social media. Vibe-coded in ~30 minutes as a personal utility.

## What it does

Full-screen overlay with a resizable selection rectangle that maintains social media aspect ratios. Saves screenshots to Desktop.

- **Ratios**: 16:9 (Twitter/X, YouTube), 1:1 (Instagram), 4:5 (Instagram portrait), 1.91:1 (Facebook/LinkedIn)
- **Safe-zone guides**: 5% padding overlay so you keep key content away from edges
- **Multi-display**: Tab to cycle the overlay between screens
- **Keyboard-driven**: +/- resize, arrows to nudge, Enter to capture, Esc to quit

Requires macOS Screen Recording permission (prompted on first launch).

## Install & run

```bash
bun install
bun run start        # dev mode
bun run package      # builds .app bundle into out/
```

To install locally, symlink the packaged app:

```bash
ln -sf "$(pwd)/out/SnapRatio-darwin-arm64/SnapRatio.app" /Applications/SnapRatio.app
```

## License

MIT
