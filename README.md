# 🎛️ RetroViz Studio - Ultimate Audio Visualization Engine

An advanced real-time music visualizer and video studio featuring:
- **3D Three.js Universe**: Cyber City, Synthwave Horizon, Quantum Warp Tunnel, Ferrofluid Liquid Blob, Cosmic Particle Nebula, Monolith Arena.
- **Winamp Milkdrop 2 (Butterchurn WebGL)**: Hundreds of reactive audio presets.
- **Retro 2D & Characters**: Dancing Man (with clean transparent background mode), Disco, Spectrum Bars, Circular HUD, Vector Waveforms.
- **3D Spatial Dual-Layer Composer**: Combine two visualizers simultaneously in 3D space with independent sensitivity, rotation, and mirror effects.
- **B&W Matte Pass Exporter**: Pure white-on-black mask generation for Luma Keying & VJ software.
- **Customizable FPS & Format**: 12 FPS (Lo-Fi Stop Motion), 24, 30, 60 FPS in 720p, 1080p, 4K (16:9, 9:16, 1:1).

---

## 🚀 Quick Start on Your Computer / הפעלה במחשב

### 🪟 Windows:
1. **הפעלה ראשונה / First Run**:
   - לחץ פעמיים על `start.bat` או הרץ בטרמינל:
   ```bash
   npm install
   npm run dev
   ```
   - הדפדפן ייפתח אוטומטית בכתובת `http://localhost:3000`.

### 🍏 macOS / Linux:
1. הפעל הרשאות הרצה (פעם אחת):
   ```bash
   chmod +x start.sh update.sh
   ```
2. להפעלת היישום:
   ```bash
   ./start.sh
   ```

---

## 🔄 1-Click Update from GitHub / עדכון בלחיצת כפתור אחת

לאחר שנערוך שינויים, נוסיף סגנונות חדשים בצ'ט ונבצע דחיפה ל-GitHub:

### 🪟 Windows:
- פשוט לחץ לחיצה כפולה על הקובץ **`update.bat`** בתיקיית הפרויקט.
- הקובץ ימשוך אוטומטית את כל השינויים מ-GitHub (`git pull`), יתקין ספריות במידת הצורך (`npm install`) ויפתח את היישום המעודכן!

### 🍏 macOS / Linux:
- הרץ בטרמינל:
  ```bash
  ./update.sh
  ```

### 💻 שורת הפקודה (Terminal / Command Line):
```bash
npm run update
```

---

## 🛠️ Scripts & Commands

| Command / Script | Description (תיאור) |
|---|---|
| `update.bat` / `./update.sh` | **1-Click Auto Updater**: משיכת כל השינויים מ-GitHub והתקנה אוטומטית |
| `start.bat` / `./start.sh` | **1-Click Launcher**: הפעלת השרת ופתיחת הדפדפן |
| `npm run dev` | הפעלת שרת פיתוח מקומי |
| `npm run update` | משיכת שינויים מ-Git והתקנת חבילות (`git pull && npm install`) |
| `npm run build` | בניית גרסת ייצור (Production Build) |
| `npm run lint` | בדיקת תקינות קוד TypeScript |
