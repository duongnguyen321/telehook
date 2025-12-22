# Telegram TikTok Hook Bot

Bot tự động đăng video TikTok qua Telegram.

## Tính năng

- 📹 Forward video → tự động lên lịch
- ⏰ Tối đa 3 video/ngày (10:00, 15:00, 21:00)
- 📅 Video thừa → đẩy sang ngày sau
- 🔄 Hết video mới → đăng lại 3 video cũ nhất
- 🎲 Content random (50+ titles, 30+ descriptions)

## Commands

| Lệnh      | Mô tả                        |
| --------- | ---------------------------- |
| `/start`  | Hướng dẫn sử dụng            |
| `/queue`  | Xem danh sách video đang chờ |
| `/stats`  | Thống kê video đã tải/đăng   |
| `/videos` | Xem số video đã tải          |
| `/repost` | Trigger đăng lại video cũ    |
| `/clear`  | Xóa tất cả (cần confirm)     |

## Cài đặt

### Yêu cầu

- [Bun](https://bun.sh/) >= 1.0
- Redis server

### Cài đặt

```bash
bun install
```

### Cấu hình

Sửa file `.env`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token  # Lấy từ @BotFather
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Chạy Redis

```bash
# macOS
brew services start redis

# Docker
docker run -d -p 6379:6379 redis
```

### Chạy bot

```bash
bun run start
```

## Cách dùng

1. Forward video vào bot
2. Bot tự động:
   - Tải video
   - Random content (title, description, hashtags)
   - Lên lịch vào slot trống (10h/15h/21h)
3. Đến giờ → bot gửi thông báo + video để đăng thủ công

## Lịch đăng

- **3 slot/ngày**: 10:00, 15:00, 21:00
- Video thừa → chuyển sang ngày tiếp theo
- Hết video mới → tự động đăng lại 3 video cũ nhất

## License

MIT
