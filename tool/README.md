# 🛠️ Video Tools

Các công cụ hỗ trợ xử lý video.

## 📹 split-video.js

Script tự động cắt video thành các phần nhỏ hơn hoặc bằng 20MB.

### Yêu cầu

- **Node.js** >= 18
- **ffmpeg**

```bash
brew install ffmpeg  # macOS
```

### Cách sử dụng

```bash
# 1. Đặt video vào folder ./tool/data/
# 2. Chạy script
cd tool
node split-video.js
```

### Cấu trúc output

```
tool/
├── data/
│   ├── my_video.mp4           # Video gốc
│   ├── my_video/              # Folder output (tự động tạo)
│   │   ├── my_video_001.mp4   # Phần 1
│   │   ├── my_video_002.mp4   # Phần 2
│   │   └── my_video_003.mp4   # Phần 3
│   │
│   ├── another_video.mp4
│   └── another_video/
│       ├── another_video_001.mp4
│       └── another_video_002.mp4
```

### Tính năng

| Tính năng               | Mô tả                           |
| ----------------------- | ------------------------------- |
| ✅ Tự động tạo folder   | Mỗi video → 1 folder riêng      |
| ✅ Đặt tên thông minh   | `{tên_video}_{số_thứ_tự}.mp4`   |
| ✅ Kích thước tối đa    | Mỗi phần ≤ 20MB                 |
| ✅ Thời lượng tối thiểu | Mỗi phần ≥ 10 giây              |
| ✅ Phần cuối thông minh | < 5 giây → merge vào phần trước |
| ✅ Giữ chất lượng       | Stream copy (không re-encode)   |

### Ví dụ output

```
🎬 Video Splitter
────────────────────────────────────────
📂 Data folder: /path/to/tool/data
📏 Max size: 20 MB

📁 Tìm thấy 2 video trong data:
   1. sexy_girl.mp4 (45.23 MB)
   2. dance_video.mp4 (32.10 MB)

════════════════════════════════════════════════════════════
📹 Input: sexy_girl.mp4
📂 Output folder: data/sexy_girl

📦 Sẽ cắt thành 3 phần:
   Phần 1: 00:00:00 → 00:00:30 (30.0s, ~15.1MB)
   Phần 2: 00:00:30 → 00:01:00 (30.0s, ~15.1MB)
   Phần 3: 00:01:00 → 00:01:30 (30.0s, ~15.1MB)

✅ Hoàn thành! Đã tạo 3 phần trong data/sexy_girl:
   1. sexy_girl_001.mp4 (14.89 MB)
   2. sexy_girl_002.mp4 (15.12 MB)
   3. sexy_girl_003.mp4 (15.22 MB)
```

### Options

```bash
node split-video.js [data_directory] [max_size_mb]

# Ví dụ:
node split-video.js                    # Default: ./data, 20MB
node split-video.js ./videos           # Folder khác
node split-video.js ./data 15          # Max 15MB mỗi phần
```
