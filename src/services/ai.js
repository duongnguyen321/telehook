/**
 * Random content generator for TikTok videos
 * Target: 20-30 age, sexy/18+ content
 * Note: No emojis to avoid UTF-8 issues
 */

// 70+ titles - very provocative & hot (no emojis)
const TITLES = [
	// Super hot
	'Nong qua ai chiu noi',
	'Body chuan khong can chinh',
	'Hot girl da ve nha',
	'Ai dam nhin lau hon 5 giay?',
	'Sexy khong can co gang',

	// Teasing 18+
	'Chi danh cho nguoi lon',
	'Warning: Gay nghien',
	'Dem khuya tha thinh',
	'Ai thuc dem xem di',
	'Content 18+ incoming',

	// Bold & confident
	'Vong mot chuan real',
	'Vong ba gay thuong nho',
	'Body goals nha cac chi',
	'Nhin ky di dung bo lo',
	'Qua dep nen phai khoe',

	// Flirty seductive
	'Anh co thay nong khong?',
	'DM di dung ngai',
	'Single san sang',
	'Muon biet them thi follow',
	'Bi mat trong DM nha',

	// Night vibes
	'Midnight content cuc chay',
	'Dem nay ai co don?',
	'Late night vibes',
	'Ai khong ngu duoc?',
	'Dem khuya content',

	// Very provocative
	'Nong bong tay day',
	'Cang xem cang muon xem',
	'Khong follow hoi han do',
	'Part 2 neu du like',
	'Anh muon gi nua?',

	// Confident sexy
	'Em ko ngoan dau',
	'Bad girl vibes',
	'Sexy va biet dieu do',
	'Xinh dep la vo doi',
	'Queen energy',

	// Interactive hot
	'Rate body 1-10 di',
	'Thich phan nao nhat?',
	'Comment emoji nong nhat',
	'Like neu thay sexy',
	'Share cho crush di',

	// Super bold
	'Hang real 100%',
	'Natural body goals',
	'Khong photoshop nha',
	'Original content only',
	'Anti fake beauty',

	// More 18+
	'Chi nguoi lon moi hieu',
	'Content nong 40 do',
	'Warning: Gay chay',
	'Dem nay em dep lam',
	'Ai san sang?',

	// Extra spicy
	'Qua hot nen phai dang',
	'Body nay ai chiu noi',
	'Vong nao cung chuan',
	'Real beauty no filter',
	'Hot khong can co gang',
];

// 40+ descriptions - very engaging & hot (no emojis)
const DESCRIPTIONS = [
	// Flirty bold
	'Nhin gi ma nhin du vay?',
	'Thich thi like, yeu thi DM',
	'Single va dang tim kiem',
	'Co don thi lien he',
	'San sang cho moi thu',

	// Very provocative
	'Warning: Gay nghien',
	'Chi danh cho nguoi lon',
	'Content 18+ real 100%',
	'Dem khuya moi hieu',
	'Nong qua nen phai chia se',

	// Confident sexy
	'Body chuan tung centimet',
	'Vong mot size M nhe',
	'Natural beauty goals',
	'Khong chinh sua van dep',
	'Real va proud of it',

	// Interactive
	'Rate em 1-10 di',
	'Comment phan thich nhat',
	'Like neu em sexy',
	'Follow de xem nhieu hon',
	'Share cho ai can',

	// Night content
	'Late night post',
	'Ai thuc dem like di',
	'Midnight vibes cuc chay',
	'Dem nay co ai?',
	'Content cho nguoi mat ngu',

	// Bold statements
	'Em la real 100%',
	'Anti photoshop gang',
	'Natural is sexy',
	'Confident va proud',
	'Body positive vibes',

	// More engaging
	'Muon xem them? Follow',
	'Part 2 if 1k likes',
	'Bi mat trong DM',
	'Waiting for you',
	'Ready for more?',
];

// 20+ hashtag sets - very hot & trending
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
