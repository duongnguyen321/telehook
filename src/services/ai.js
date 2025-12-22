/**
 * Random content generator for TikTok videos
 * Target: 20-30 age, sexy/18+ content
 * Note: Vietnamese with proper diacritics
 */

// 150+ titles - tiếng Việt có dấu đầy đủ, dirty talk style
const TITLES = [
	// === DIRTY TALK - GỢI DỤC ===
	'Anh thích mạnh hay nhẹ?',
	'Muốn cởi không?',
	'Đêm nay ai làm em mệt?',
	'Chịu được bao lâu?',
	'Em thích ở trên hay dưới?',
	'Nóng quá muốn cởi hết',
	'Ai làm em ướt đêm nay?',
	'Càng đêm càng muốn...',
	'Anh có chịu nổi không?',
	'Em muốn anh làm gì?',
	'Đụng vào là cháy',
	'Anh dám không?',
	'Thích nghịch không?',
	'Em ngoan lắm... đâu?',
	'Muốn thử không anh?',

	// === KHIÊU KHÍCH - TEASING ===
	'Nóng quá ai chịu nổi',
	'Body này ai chiều được?',
	'Ai dám nhìn lâu hơn 5 giây?',
	'Sexy không cần cố gắng',
	'Môi em ngọt lắm nha',
	'Đường cong chết người đây',
	'Nhìn là muốn ôm chặt',
	'Chạm nhẹ thôi cũng run',
	'Da em mịn lắm đó',
	'Lưng trần mời gọi anh',
	'Vai trần thơm phức',
	'Hông em đong đưa',
	'Ngực em căng tròn',
	'Mông em cong vút',
	'Body em nóng bỏng',

	// === ĐÊM KHUYA - NÓNG BỎNG ===
	'Chỉ dành cho người lớn',
	'Warning: Gây nghiện',
	'Đêm khuya ai nóng?',
	'Ai thức đêm với em?',
	'Content 18+ đây',
	'Đêm nay nóng lắm anh',
	'Ai còn thức canh em?',
	'Giường em lạnh quá',
	'Đêm nay ai sưởi ấm em?',
	'Đêm dài lắm anh ơi',
	'Thức khuya có thưởng nóng',
	'Ai mất ngủ vì em?',
	'Đêm về em nhớ anh',
	'Cần người ôm đêm nay',
	'Ai làm em nóng tối nay?',

	// === BODY HOT - KHOE THÂN ===
	'Vòng một căng tròn',
	'Vòng ba gây thương nhớ',
	'Body này ai chịu nổi?',
	'Nhìn kỹ đi đừng bỏ lỡ',
	'Đẹp không góc chết',
	'Hoàn hảo từng đường cong',
	'Body 3 vòng siêu chuẩn',
	'Đẹp từ đầu đến mông',
	'Vòng eo bé xíu',
	'Đùi em thon lắm',
	'Hông em tròn đầy',
	'Ngực em mềm mại',
	'Body mlem mlem',
	'Đường cong sexy quá',
	'Real 100% không fake',

	// === THẢ THÍNH - FLIRTY ===
	'Anh có thấy nóng không?',
	'IB đi đừng ngại',
	'Single sẵn sàng chiều anh',
	'Muốn biết thêm thì IB',
	'Bí mật trong IB nhá',
	'Em đang đợi anh',
	'Nhắn gì đi anh yêu',
	'Có dám tiến tới không?',
	'Anh có đủ gan không?',
	'Tim em chỉ cho anh',
	'Vào IB biết nhiều hơn',
	'Cần anh sưởi ấm',
	'Single và muốn nghịch',
	'Đợi anh dũng cảm IB',
	'Em sẵn sàng cho anh',

	// === BÍ ẨN - MYSTERIOUS ===
	'Em giấu gì dưới váy?',
	'Muốn khám phá em không?',
	'Bí mật trong phòng ngủ',
	'Điều gì em chưa cởi?',
	'Tò mò thì IB',
	'Unlock để xem hết',
	'VIP mới được xem full',
	'Cởi thêm nếu đủ like',
	'Follow để xem nhiều hơn',
	'Phần hay nhất ở IB',
	'Em có bí mật nóng',
	'Chỉ reveal cho anh thôi',
	'Ai tò mò IB đi',
	'Exclusive content trong IB',
	'Đừng bỏ lỡ phần hot',

	// === TÁOBẠO - BOLD ===
	'Nóng bỏng tay đây',
	'Càng xem càng nghiện',
	'Anh muốn gì em chiều',
	'Táo bạo một chút nhé',
	'Em hư lắm anh ơi',
	'Bad girl thích nghịch',
	'Dangerous curves',
	'Warning: Extreme hot',
	'Cấm nhìn lâu sợ cháy',
	'Đốt mắt anh không?',
	'Quá nóng cần dập lửa',
	'Ai dám đến gần em?',
	'Em nguy hiểm lắm đó',
	'Cẩn thận bị nghiện',
	'Em không ngoan đâu',

	// === CONFIDENT SEXY ===
	'Bad girl energy',
	'Sexy và em biết',
	'Queen không cần king',
	'Boss lady here',
	'Em là số 1',
	'Slay mỗi ngày',
	'Born to be hot',
	'Im lặng cũng sexy',
	'Ngắm em đi anh',
	'Đẹp thì em biết',
	'Xinh thì được chiều',
	'Hot girl không fake',
	'Real beauty đây',
	'Natural và sexy',
	'Chuẩn không cần chỉnh',

	// === TƯƠNG TÁC HOT ===
	'Rate body 1-10 đi',
	'Thích phần nào nhất em?',
	'Comment 🔥 nếu hot',
	'Like nếu muốn xem thêm',
	'Share cho ai thèm',
	'Vote: bikini hay lingerie?',
	'Góc nào sexy nhất?',
	'Anh thích em mặc gì?',
	'Duet với em không?',
	'Tag ai đang thèm',
	'Drop 🔥🔥🔥 nếu nóng',
	'Ai brave comment góc sau',
	'Thả tim = xem phần 2',
	'10k like = cởi thêm',
	'IB để xem private',
];

// 90+ descriptions - dirty talk style, gợi dục táo bạo
const DESCRIPTIONS = [
	// === DIRTY TALK ===
	'Anh muốn em làm gì?',
	'Chịu được bao lâu nào?',
	'Em thích mạnh hay nhẹ?',
	'Đêm nay ai làm em mệt?',
	'Nóng quá muốn cởi hết',
	'Càng nhìn càng muốn chạm',
	'Ai làm em run tối nay?',
	'Em muốn anh ở gần hơn',
	'Chạm vào là cháy đó',
	'Anh có chịu nổi em không?',
	'Em hư lắm anh biết không?',
	'Đêm nay em muốn nghịch',
	'Ai dám làm em mệt?',

	// === GỢI CẢM - SEDUCTIVE ===
	'Nhìn gì mà nhìn dữ vậy anh?',
	'Thích thì IB, yêu thì follow',
	'Single và sẵn sàng chiều',
	'Cô đơn thì IB em',
	'Sẵn sàng cho mọi thứ',
	'Mắt em biết dụ anh',
	'Chạm vào là tan chảy',
	'Nóng từ mắt đến body',
	'Để em làm anh say',
	'Nhìn thôi đã muốn ôm chặt',
	'Hương em quyến rũ lắm',
	'Em là giấc mơ ướt đêm nay',
	'Body em nóng lắm anh',

	// === ĐÊM KHUYA - LATE NIGHT ===
	'Warning: Gây nghiện nặng',
	'Chỉ dành cho người lớn thôi',
	'Content 18+ real 100%',
	'Đêm khuya mới hiểu hết',
	'Đêm nay em cần anh',
	'Ai sưởi ấm đêm đông?',
	'Giường em lạnh cần người',
	'Thức khuya có quà nóng',
	'Đêm về em nhớ anh quá',
	'Cô đơn cần bạn thân thiết',
	'Midnight confession nóng bỏng',
	'Ai ôm em đêm nay?',
	'Đêm dài cần người bầu bạn',

	// === BODY CONFIDENT ===
	'Body chuẩn từng cm',
	'Vòng một căng real',
	'Natural và proud of it',
	'Đường cong chết người',
	'3 vòng chuẩn như vẽ',
	'Body goals chứ gì nữa',
	'Không filter vẫn hot',
	'Raw beauty đây anh',
	'Tự tin với từng đường cong',
	'God made me perfect',
	'Số đo chuẩn không chỉnh',
	'Real và sexy',
	'Body mlem quá đi',

	// === TƯƠNG TÁC - ENGAGEMENT ===
	'Rate em 1-10 đi anh',
	'Comment phần anh thích nhất',
	'Like nếu em sexy',
	'Follow để xem nhiều hơn nữa',
	'Thả 🔥 nếu em hot',
	'Drop heart nếu muốn xem tiếp',
	'Tag crush để flex',
	'Duet với em không anh?',
	'Ai brave đủ comment?',
	'Vote: giữ hay cởi?',
	'Rate góc nào sexy nhất',
	'Comment anh muốn em mặc gì',
	'10k like em cởi thêm',

	// === ĐÊM VIBES ===
	'Late night post nóng',
	'Ai thức đêm với em?',
	'Midnight vibes nóng bỏng',
	'Đêm nay có ai cô đơn?',
	'Content cho người mất ngủ vì em',
	'Ai còn online lúc này?',
	'Night owl content hot',
	'Cho những ai không ngủ được',
	'2AM thoughts và body',
	'Insomnia club rise up',
	'Đêm về em lại nhớ anh',
	'Ai thức late IB em',
	'Đêm dài cần bạn tâm sự',

	// === TỰ TIN - CONFIDENT ===
	'Em là real 100%',
	'Anti photoshop gang',
	'Natural is the new sexy',
	'Confident và proud',
	'Body positive vibes',
	'Self love đi anh',
	'Em xinh em biết mà',
	'Không cần filter',
	'Tự tin là sexy nhất',
	'Own your beauty queen',
	'Em là masterpiece',
	'Đẹp từ trong ra ngoài',
	'Hot girl đích thực',

	// === KHIÊU GỢI - TEASING ===
	'Muốn xem thêm? IB',
	'Part 2 if 5k likes',
	'Bí mật trong IB anh ơi',
	'Waiting for you in IB',
	'Ready for more baby?',
	'Unlock premium trong IB',
	'Exclusive cho follower thân',
	'VIP mới được xem full',
	'Like để mở khóa content',
	'Follow = xem phần hot',
	'5k like = full reveal',
	'IB để biết thêm nè',
	'Private content trong IB',
];

// 35+ hashtag sets - đa dạng chủ đề, trending hashtags
const HASHTAG_SETS = [
	// Hot & Sexy
	'#fyp #sexy #hotgirl #18plus #body #vietnam #viral',
	'#fyp #gaixinh #sexy #hot #model #tiktokvn #trend',
	'#fyp #hotgirl #sexy #beautiful #goddess #vietnam',
	'#fyp #sexy #body #goals #hotgirl #asian #viral',
	'#fyp #gaixinh #18plus #hot #sexy #tiktokvietnam',

	// Night & Vibes
	'#fyp #nightlife #sexy #hot #vibes #mood #viral',
	'#fyp #midnight #sexy #content #hot #vibes #trend',
	'#fyp #sexy #late #night #content #hot #viral',
	'#fyp #latenight #insomnia #hot #sexy #vietnam',
	'#fyp #nightowl #sexy #vibes #mood #aesthetic',

	// Baddie & Queen
	'#fyp #baddie #sexy #hot #slay #queen #goddess',
	'#fyp #badgirl #sexy #hot #fire #trending #fyp',
	'#fyp #queen #slay #sexy #confident #boss #viral',
	'#fyp #bosslady #sexy #powerful #hot #trending',
	'#fyp #goddess #divine #sexy #hot #beautiful',

	// Body & Aesthetic
	'#fyp #sexy #body #aesthetic #hot #style #model',
	'#fyp #body #goals #sexy #hot #model #vietnam',
	'#fyp #curves #body #sexy #hot #real #natural',
	'#fyp #bodygoals #fit #sexy #hot #aesthetic',
	'#fyp #bodypositivity #sexy #real #confidence',

	// Vietnamese Hot Girl
	'#fyp #hotgirl #sexy #asian #beauty #viral #trend',
	'#fyp #gaixinh #sexy #confident #hot #beautiful',
	'#fyp #hotgirlvietnam #sexy #trendy #viral',
	'#fyp #vietnamesegirl #sexy #hot #trending',
	'#fyp #asianbabe #sexy #hot #vietnam #viral',

	// Single & Flirty
	'#fyp #gaixinh #sexy #single #available #dm #hot',
	'#fyp #single #flirty #sexy #hot #available',
	'#fyp #dmmepls #sexy #single #hot #viral',
	'#fyp #relationships #single #hot #sexy #vibes',
	'#fyp #crush #flirty #sexy #hot #trending',

	// Real & Natural
	'#fyp #sexy #real #natural #body #hot #viral',
	'#fyp #hotgirl #sexy #natural #real #body #viral',
	'#fyp #nofilter #real #sexy #natural #hot',
	'#fyp #authentic #real #sexy #natural #beauty',
	'#fyp #rawbeauty #noedits #sexy #hot #real',

	// Trending & Viral
	'#fyp #18plus #sexy #hot #content #tiktokvn #viral',
	'#fyp #18plus #hot #sexy #viral #trend #vietnam',
	'#fyp #trending #hot #sexy #viral #fypage',
	'#fyp #foryoupage #hot #sexy #trending #viral',
	'#fyp #explore #sexy #hot #tiktokviral #trend',
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
