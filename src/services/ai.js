/**
 * Random content generator for TikTok videos
 * Target: 20-30 tuổi, nội dung gợi cảm
 */

// 50+ title templates - provocative style
const TITLES = [
	// Cute flirty
	'✨ Nhìn gì nhìn, thích hả? 😏',
	'💕 Em biết anh đang nhìn đó 👀',
	'🔥 Nóng quá thì like đi 🥵',
	'Có dám làm quen không? 😘',
	'🌸 Crush một cái được không? 💘',

	// Confident
	'⭐ Em xinh, em biết',
	'Body này ai chịu nổi 🔥',
	'✨ Không filter vẫn gây thương nhớ 😍',
	'🔥 Góc nào cũng slay',
	'💕 Đẹp là phải khoe chứ 📸',

	// Teasing
	'🌟 Anh có thấy nóng không? 🌡️',
	'💫 Nhìn thôi đừng chạm',
	'✨ Một ánh mắt, triệu trái tim tan 💔',
	'🔥 Cháy hết nấc rồi nè 🥵',
	'💕 Thèm không? Like đi 👍',

	// Playful
	'⭐ Em đây, anh đâu? 👀',
	'Ai đang simp em không? 💕',
	'💎 Single và xinh, ai dám cưa? 😏',
	'✨ Đang chờ ai comment kia',
	'🔥 Hôm nay phải cháy 🌶️',

	// Seductive
	'💫 Đêm nay ai cô đơn? 🌙',
	'🌟 Muốn biết thêm thì follow 👆',
	'✨ Bí mật trong DM nha',
	'💕 Anh thức không? 🌃',
	'🔥 Nóng hơn cả mùa hè ☀️',

	// Confident sexy
	'⭐ Vòng eo này chuẩn thật 📏',
	'🌸 Ai nói em không quyến rũ? 💋',
	'💎 Outfit hôm nay có gợi cảm không? 👗',
	'✨ Chân dài miên man 🦵',
	'💫 Không cần filter cũng thần thái 🔥',

	// Interactive
	'🔥 Rate em 1-10 đi',
	'💕 Comment emoji thích nhất',
	'⭐ Ai thức thì like đi 🌙',
	'Share cho crush xem',
	'✨ Follow để xem nhiều hơn 👆',

	// Bold
	'💎 Hàng real không lo pha ke 💯',
	'🔥 Chỉ dành cho người lớn',
	'💫 Nhìn kỹ đi, đừng bỏ lỡ️',
	'⭐ Em không ngoan đâu 😈',
	'💕 Bad girl vibes 🖤',

	// Night vibes
	'🌙 Đêm khuya thả thính 💋',
	'✨ Late night content',
	'🔥 Midnight vibes cực cháy️',
	'💫 Ai không ngủ được?',
	'Đêm nay em xinh lắm 🌟',

	// More teasing
	'⭐ Muốn xem thêm không? 👀',
	'🌸 Part 2 nếu đủ like 💕',
	'💕 Càng xem càng nghiện 🤤',
	'🔥 Warning: Gây nghiện',
	'✨ Không follow hối hận đó',
];

// 30+ descriptions - engaging
const DESCRIPTIONS = [
	// Flirty
	'Nhìn gì mà nhìn dữ vậy? 👀',
	'Thích thì like, yêu thì follow 💕',
	'DM đi đừng ngại 📩',
	'Single và sẵn sàng',
	'Ai cô đơn giơ tay 🙋‍♀️',

	// Engaging
	'Comment crush đi nào',
	'Rate em 1-10? 🔢',
	'Emoji nào thể hiện tâm trạng?',
	'Share cho người đang nhớ',
	'Tag bạn thân xem‍♀️',

	// Confident
	'Xinh thì phải khoe chứ',
	'Không filter vẫn đẹp 💎',
	'Real 100% nhé 💯',
	'Natural beauty vibes ✨',
	'Đẹp tự nhiên ko cần chỉnh',

	// Teasing
	'Muốn xem thêm không? 👀',
	'Follow sẽ có bất ngờ 🎁',
	'Đêm khuya content 🌙',
	'Chỉ dành cho người lớn 🔞',
	'Warning: Addictive 💉',

	// Call to action
	'Like nếu em xinh',
	'Follow để xem thêm 👆',
	'Save lại đi đừng quên',
	'Chia sẻ cho bạn bè 📤',
	'Comment ý kiến đi 💬',

	// Night
	'Late night vibes',
	'Ai thức thì like 🌙',
	'Đêm nay có ai không? 💫',
	'Midnight content drop',
	'Chill cuối đêm',
];

// 15+ hashtag sets - trending
const HASHTAG_SETS = [
	'#fyp #xuhuong #gaixinh #sexy #hotgirl #vietnam',
	'#fyp #xuhuong #gaixinh #body #goddess #viral',
	'#fyp #xuhuong #gaixinh #beautiful #model #tiktokvietnam',
	'#fyp #xuhuong #gaixinh #hot #fire #trending',
	'#fyp #xuhuong #gaixinh #cute #sexy #girl',
	'#fyp #xuhuong #gaixinh #nightlife #vibes #mood',
	'#fyp #xuhuong #gaixinh #baddie #slay #queen',
	'#fyp #xuhuong #gaixinh #aesthetic #vibe #style',
	'#fyp #xuhuong #gaixinh #beauty #asia #love',
	'#fyp #xuhuong #gaixinh #follow #like #share',
	'#fyp #xuhuong #gaixinh #foryou #viral #trend',
	'#fyp #xuhuong #gaixinh #tiktokvn #vietnam #hot',
	'#fyp #xuhuong #gaixinh #idol #goddess #pretty',
	'#fyp #xuhuong #gaixinh #late #night #content',
	'#fyp #xuhuong #gaixinh #single #available #dm',
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

	// Evening/night times work best for this content
	if (day === 0 || day === 6) {
		if (hour < 14) return { hour: 21, reason: 'Tối cuối tuần viral' };
		return { hour: 22, reason: 'Đêm cuối tuần peak' };
	}

	if (hour < 18) return { hour: 21, reason: 'Tối peak time' };
	if (hour < 22) return { hour: 22, reason: 'Late night content' };
	return { hour: 23, reason: 'Midnight vibes' };
}
