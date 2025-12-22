# Telegram TikTok Hook Bot 🤖

A powerful Telegram bot that automatically downloads, schedules, and manages TikTok video uploads. Designed for high-volume content automation with a "sexy/18+" content style database.

## 🌟 Features

### 🔄 Fully Automated Workflow

- **Auto Download**: Simply forward a video to the bot -> it automatically downloads.
- **Smart Scheduling**: Automatically schedules 9 videos per day at golden hours.
- **Duplicate Detection**: Prevents downloading/scheduling the same video twice.
- **Background Processing**:
  - **30s Timeout**: Initial download attempt.
  - **Retry Queue**: Background queue with 3 retries (60s timeout) for slow connections.
  - **Non-blocking**: Failed downloads don't block other tasks.

### 📅 Smart Schedule System (9 Videos/Day)

Optimized for high engagement with 3 golden hours (GMT+7):

- **Morning**: 9:30, 10:00, 10:30
- **Afternoon**: 14:30, 15:00, 15:30
- **Evening**: 20:30, 21:00, 21:30

_Logic: Fills the first available future slot. If all slots today are full, it moves to tomorrow._

### 📝 AI Content Generation

- **Database**: 70+ titles, 40+ descriptions, 20+ hashtag sets.
- **Style**: Provocative, "sexy/18+", engaging content.
- **ASCII Only**: All content is strictly ASCII (no emojis) to prevent Telegram API UTF-8 encoding errors.

### 🔔 Notification System

- **Time to Post**: Sends a notification when a video is due.
- **Ready-to-Post**: Sends the video file + copyable caption.
- **Manual Posting**: User manually uploads to TikTok using the provided file and caption.

## 🛠 Commands

| Command       | Description                                                       |
| :------------ | :---------------------------------------------------------------- |
| `/start`      | Show bot information and instructions.                            |
| `/queue`      | View the list of pending videos (next 10 upcoming).               |
| `/stats`      | View statistics (Downloaded, Pending, Posted).                    |
| `/videos`     | List downloaded video files.                                      |
| `/repost`     | Manually check for reposts (runs daily automatically).            |
| `/reschedule` | **New!** Re-apply the 9-video/day schedule to ALL pending videos. |

## 🚀 Tech Stack

- **Runtime**: [Bun](https://bun.sh) (Fast JavaScript runtime)
- **Framework**: [GrammY](https://grammy.dev) (Telegram Bot Framework)
- **Database**: `bun:sqlite` (Built-in high-performance SQLite)
- **HTTP**: Axios (Stream-based downloading)

## 📦 structure

```
src/
├── handlers/
│   └── videoHandler.js   # Main logic: Message & Command handling
├── services/
│   ├── ai.js             # Content generation (Titles, Tags)
│   └── scheduler.js      # Notification worker & Job queue
├── utils/
│   ├── downloader.js     # Retry queue & Stream downloader
│   ├── storage.js        # SQLite DB operations & Scheduling logic
│   ├── timeParser.js     # Time formatting helpers
│   └── timezone.js       # GMT+7 Timezone helpers
└── index.js              # Entry point
```

## 🔧 Setup & Run

1.  **Install Bun**:

    ```bash
    curl -fsSL https://bun.sh/install | bash
    ```

2.  **Install Dependencies**:

    ```bash
    bun install
    ```

3.  **Configure Environment**:
    Create `.env` file:

    ```env
    TELEGRAM_BOT_TOKEN=your_bot_token
    ```

4.  **Start Bot**:
    ```bash
    bun run start
    ```

## ⚠️ Notes

- **File Size Limit**: Videos >20MB are skipped (Telegram Bot API limit).
- **Data Persistence**: Data is stored in `data/tiktok_bot.db` and videos in `data/videos/`. Do not delete the `data` folder unless you want to reset everything.
