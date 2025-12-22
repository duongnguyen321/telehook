/**
 * Random content generator for TikTok videos
 * Target: 20-30 age, sexy/18+ content
 * Note: Vietnamese with proper diacritics
 */

// 70+ titles - tiếng Việt có dấu đầy đủ
const TITLES = [
	// Super hot
	'Nóng quá ai chịu nổi',
	'Body chuẩn không cần chỉnh',
	'Hot girl đã về nhà',
	'Ai dám nhìn lâu hơn 5 giây?',
	'Sexy không cần cố gắng',

	// Teasing 18+
	'Chỉ dành cho người lớn',
	'Warning: Gây nghiện',
	'Đêm khuya thả thính',
	'Ai thức đêm xem đi',
	'Content 18+ incoming',

	// Bold & confident
	'Vòng một chuẩn real',
	'Vòng ba gây thương nhớ',
	'Body goals nhà các chị',
	'Nhìn kỹ đi đừng bỏ lỡ',
	'Quá đẹp nên phải khoe',

	// Flirty seductive
	'Anh có thấy nóng không?',
	'DM đi đừng ngại',
	'Single sẵn sàng',
	'Muốn biết thêm thì follow',
	'Bí mật trong DM nhá',

	// Night vibes
	'Midnight content cực cháy',
	'Đêm nay ai cô đơn?',
	'Late night vibes',
	'Ai không ngủ được?',
	'Đêm khuya content',

	// Very provocative
	'Nóng bỏng tay đây',
	'Càng xem càng muốn xem',
	'Không follow hối hận đó',
	'Part 2 nếu đủ like',
	'Anh muốn gì nữa?',

	// Confident sexy
	'Em không ngoan đâu',
	'Bad girl vibes',
	'Sexy và biết điều đó',
	'Xinh đẹp là vô đối',
	'Queen energy',

	// Interactive hot
	'Rate body 1-10 đi',
	'Thích phần nào nhất?',
	'Comment emoji nóng nhất',
	'Like nếu thấy sexy',
	'Share cho crush đi',

	// Super bold
	'Hàng real 100%',
	'Natural body goals',
	'Không photoshop nhá',
	'Original content only',
	'Anti fake beauty',

	// More 18+
	'Chỉ người lớn mới hiểu',
	'Content nóng 40 độ',
	'Warning: Gây cháy',
	'Đêm nay em đẹp lắm',
	'Ai sẵn sàng?',

	// Extra spicy
	'Quá hot nên phải đăng',
	'Body này ai chịu nổi',
	'Vòng nào cũng chuẩn',
	'Real beauty no filter',
	'Hot không cần cố gắng',

	// Additional provocative
	'Đừng có mà thả tim',
	'Xem xong nhớ follow',
	'Anh có dám không?',
	'Em xinh lắm đúng không?',
	'Thích thì bấm like',

	// More teasing
	'Đang chờ anh đó',
	'Đêm nay không ngủ',
	'Follow để xem nhiều hơn',
	'Bí mật của em đây',
	'Anh thích em chưa?',
];

// 40+ descriptions - tiếng Việt có dấu đầy đủ
const DESCRIPTIONS = [
	// Flirty bold
	'Nhìn gì mà nhìn dữ vậy?',
	'Thích thì like, yêu thì DM',
	'Single và đang tìm kiếm',
	'Cô đơn thì liên hệ',
	'Sẵn sàng cho mọi thứ',

	// Very provocative
	'Warning: Gây nghiện',
	'Chỉ dành cho người lớn',
	'Content 18+ real 100%',
	'Đêm khuya mới hiểu',
	'Nóng quá nên phải chia sẻ',

	// Confident sexy
	'Body chuẩn từng centimet',
	'Vòng một size M nhé',
	'Natural beauty goals',
	'Không chỉnh sửa vẫn đẹp',
	'Real và proud of it',

	// Interactive
	'Rate em 1-10 đi',
	'Comment phần thích nhất',
	'Like nếu em sexy',
	'Follow để xem nhiều hơn',
	'Share cho ai cần',

	// Night content
	'Late night post',
	'Ai thức đêm like đi',
	'Midnight vibes cực cháy',
	'Đêm nay có ai?',
	'Content cho người mất ngủ',

	// Bold statements
	'Em là real 100%',
	'Anti photoshop gang',
	'Natural is sexy',
	'Confident và proud',
	'Body positive vibes',

	// More engaging
	'Muốn xem thêm? Follow',
	'Part 2 if 1k likes',
	'Bí mật trong DM',
	'Waiting for you',
	'Ready for more?',

	// Additional descriptions
	'Đang đợi anh đó',
	'Em xinh lắm phải không?',
	'Thích em không?',
	'Follow em nhé',
	'Anh nghĩ sao?',
];

// 20+ hashtag sets - giữ nguyên tiếng Anh vì là hashtag
const HASHTAG_SETS = [
	'#fyp #sexy #hotgirl #18plus #body #vietnam #viral',
	'#fyp #gaixinh #sexy #hot #model #tiktokvn #trend',
	'#fyp #hotgirl #sexy #beautiful #goddess #vietnam',
	'#fyp #sexy #body #goals #hotgirl #asian #viral',
	'#fyp #gaixinh #18plus #hot #sexy #tiktokvietnam',
	'#fyp #nightlife #sexy #hot #vibes #mood #viral',
	'#fyp #baddie #sexy #hot #slay #queen #goddess',
	'#fyp #sexy #body #aesthetic #hot #style #model',
	'#fyp #hotgirl #sexy #asian #beauty #viral #trend',
	'#fyp #18plus #sexy #hot #content #tiktokvn #viral',
	'#fyp #gaixinh #sexy #single #available #dm #hot',
	'#fyp #sexy #late #night #content #hot #viral',
	'#fyp #body #goals #sexy #hot #model #vietnam',
	'#fyp #hotgirl #sexy #queen #goddess #trending',
	'#fyp #sexy #real #natural #body #hot #viral',
	'#fyp #midnight #sexy #content #hot #vibes #trend',
	'#fyp #gaixinh #sexy #confident #hot #beautiful',
	'#fyp #18plus #hot #sexy #viral #trend #vietnam',
	'#fyp #sexy #badgirl #hot #fire #trending #fyp',
	'#fyp #hotgirl #sexy #natural #real #body #viral',
];

/**
 * Get random item from array
 */
function random(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate 3 random content options
 */
export function generateContentOptions() {
	const options = [];
	const usedTitles = new Set();

	for (let i = 0; i < 3; i++) {
		let title;
		do {
			title = random(TITLES);
		} while (usedTitles.has(title) && usedTitles.size < TITLES.length);
		usedTitles.add(title);

		options.push({
			title,
			description: random(DESCRIPTIONS),
			hashtags: random(HASHTAG_SETS),
		});
	}

	return options;
}

/**
 * Suggest best posting time - late night content performs better
 */
export function suggestPostingTime() {
	const now = new Date();
	const hour = now.getHours();
	const day = now.getDay();

	// Evening/night times work best for 18+ content
	if (day === 0 || day === 6) {
		if (hour < 14) return { hour: 21, reason: 'Weekend night peak' };
		return { hour: 23, reason: 'Late weekend peak' };
	}

	if (hour < 18) return { hour: 21, reason: 'Night peak time' };
	if (hour < 22) return { hour: 23, reason: 'Late night content' };
	return { hour: 0, reason: 'Midnight vibes' };
}
