# Optional Windows icon

Place the final Windows icon at:

```text
offline-windows/build/icon.ico
```

Electron Builder automatically uses `build/icon.ico` when it exists. The ICO should contain multiple Windows sizes, ideally including 16, 32, 48, 128, and 256 pixels.

The icon is optional. When it is absent, Electron Builder uses its default application icon and the portable build still succeeds.
