# Eluder — Electron (Mac + Windows)

## Run from source
```bash
npm install
npm start
```

## Build for Mac (.dmg)
> Must be run **on a Mac**
```bash
npm install
npm run build:mac
# Output: dist/Eluder-1.0.0.dmg  (works on Intel + Apple Silicon)
```

## Build for Windows (.exe)
```bash
npm install
npm run build:win
# Output: dist/Eluder 1.0.0.exe  (portable, no install needed)
```

## Keyboard Shortcuts
| Shortcut | Action |
|---|---|
| `Alt+H` | Hide / Show window |
| `Alt+Q` | Quit |
| `Alt+S` | Take screenshot |
| `Alt+T` | Auto-type |
| `Alt+B` | Toggle screenshot sidebar |
| `Alt+R` | Reload AI page |
| `Escape` | Cancel auto-type countdown |

## License Tokens
Generate tokens with:
```bash
cd ../eluder-backend
python admin.py
```
Or open the admin panel:
```bash
python server.py
# → http://localhost:5555/admin.html
```

## Add app icon (optional)
- **Mac:** place `assets/icon.icns` (512×512 recommended)
- **Windows:** place `assets/icon.ico` (256×256 recommended)

## Features
- ✅ 4 AI providers: ChatGPT, Claude, Gemini, DeepSeek
- ✅ Frameless always-on-top overlay
- ✅ Opacity control
- ✅ Screen capture exclusion (hidden from OBS/screenshots)
- ✅ Screenshot sidebar
- ✅ Auto-type with countdown
- ✅ License system (Supabase, same tokens as Windows app)
- ✅ Works on Mac (Intel + Apple Silicon) and Windows
