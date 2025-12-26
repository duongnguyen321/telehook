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

### 📅 Smart Schedule System ("Private Wave" Protocol)

Optimized for the Vietnamese demographic (GMT+7), focusing on lunch breaks and late-night "Private" hours.

**Weekday (Mon-Fri) - 9 Videos:**

- **Lunch**: 11:30, 12:15
- **Commute**: 17:30
- **Private Wave**: 19:45, 20:30, 21:15, 22:00, 22:45, 23:45

**Saturday - 8 Videos:**

- **Lunch**: 11:30, 12:15
- **Get Ready**: 16:00
- **Commute**: 17:30
- **Night**: 21:15, 22:00, 22:45, 23:45 _(Skipped 19:45/20:30 for social hours)_

**Sunday - 11 Videos:**

- **Post-Party**: 01:00 _(Sat night spillover)_
- **Sleep In**: 09:00, 10:00
- **Lunch**: 11:30, 12:15
- **Commute**: 17:30
- **Private Wave**: 19:45, 20:30, 21:15, 22:00, 22:45 _(Ends early for Work Monday)_

_Logic: Automatically detects the day of the week and fills the slots accordingly._

### 📝 AI Content Generation

- **Database**: 70+ titles, 40+ descriptions, 20+ hashtag sets.
- **Style**: Provocative, "sexy/18+", engaging content.
- **Vietnamese**: Full Vietnamese with proper diacritics. Use `/updatecontent` to update old scheduled videos with new Vietnamese content.

### 🔔 Notification System

- **Time to Post**: Sends a notification when a video is due.
- **Ready-to-Post**: Sends the video file + copyable caption.
- **Manual Posting**: User manually uploads to TikTok using the provided file and caption.

## 🛠 Commands

### Public Commands (Tất cả người dùng)

| Command   | Description                              |
| :-------- | :--------------------------------------- |
| `/start`  | Hiển thị lời chào và hướng dẫn theo role |
| `/queue`  | Xem lịch đăng video                      |
| `/videos` | Xem chi tiết video với phân trang        |
| `/info`   | Xem hoạt động và thống kê của bạn        |
| `/clear`  | Xoá tin nhắn, hiển thị lại lời chào      |

### Mod Commands (📤 Mod + Admin)

| Command       | Description           |
| :------------ | :-------------------- |
| Forward video | Tự động lên lịch đăng |

### Reviewer Commands (📝 Kiểm duyệt viên + Admin)

| Command       | Description                         |
| :------------ | :---------------------------------- |
| `/reschedule` | Sắp xếp lại lịch đăng (chỉ đổi giờ) |
| `/retitle`    | Tạo nội dung mới (chỉ đổi title)    |
| Trong /videos | Sửa nội dung từng video             |

### Admin Commands (👑 Admin only)

| Command       | Description                       |
| :------------ | :-------------------------------- |
| `/fix`        | Dọn dẹp database, xoá records lỗi |
| `/check`      | Kiểm tra & duyệt video sắp đăng   |
| Trong /videos | Xoá video                         |

### 📋 BotFather Command List

Copy và paste vào BotFather để đăng ký commands:

```
start - Hiển thị lời chào và hướng dẫn
queue - Xem lịch đăng video
videos - Xem chi tiết video
info - Xem hoạt động của bạn
clear - Xoá tin nhắn, hiển thị lại lời chào
check - Kiểm tra video sắp đăng
reschedule - Sắp xếp lại lịch đăng
retitle - Tạo nội dung mới cho video
fix - Dọn dẹp database
```

### ⚙️ BotFather Settings

Các thông tin cần thiết để setup bot profile:

**About Text (Hiện ở trang profile):**

```text
Kho nội dung video TikTok tự động: cung cấp sẵn video, title, tags hot trend và tự động lên lịch đăng vào khung giờ vàng.
```

**Description Text (Hiện khi mới mở chat):**

```text
🔥 Chào mừng bạn đến với Kho Content TikTok Tự Động!

Bot giúp bạn xây dựng kênh TikTok triệu view dễ dàng hơn bao giờ hết:

📺 Nguồn Video Vô Tận: Cung cấp video chất lượng cao, sẵn sàng để đăng.
✍️ Content Viral: Tự động tạo Title giật gân & Hashtags chuẩn SEO cho từng video.
📅 Lên Lịch Thông Minh: Tự động tính toán và xếp lịch đăng vào các khung giờ vàng (Golden Hours) để tối đa hoá lượt xem.
🚀 Công Việc Của Bạn: Chỉ cần duyệt và đăng. Bot lo phần còn lại!

Gõ /start để khám phá kho nội dung ngay!
```

## 🔒 Privacy Policy

Bot này thu thập các thông tin sau từ người dùng để phục vụ việc phân quyền và ghi nhật ký hoạt động (Audit Log):

1. Telegram User ID
2. Username
3. Tên hiển thị (First Name, Last Name)

**Cam kết:**

- Chúng tôi **không** chia sẻ dữ liệu cá nhân này với bất kỳ bên thứ ba nào.
- Dữ liệu video và lịch đăng được lưu trữ an toàn trên máy chủ của chúng tôi.
- Chỉ Admin mới có quyền truy cập vào dữ liệu log hoạt động.

## 🚀 Tech Stack

- **Runtime**: [Bun](https://bun.sh) (Fast JavaScript runtime)
- **Framework**: [GrammY](https://grammy.dev) (Telegram Bot Framework)
- **Database**: `bun:sqlite` (Built-in high-performance SQLite)
- **HTTP**: Axios (Stream-based downloading)

## 📦 structure

```

src/
├── handlers/
│ └── videoHandler.js # Main logic: Message & Command handling
├── services/
│ ├── ai.js # Content generation (Titles, Tags)
│ └── scheduler.js # Notification worker & Job queue
├── utils/
│ ├── downloader.js # Retry queue & Stream downloader
│ ├── storage.js # SQLite DB operations & Scheduling logic
│ ├── timeParser.js # Time formatting helpers
│ └── timezone.js # GMT+7 Timezone helpers
└── index.js # Entry point

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

```

```
