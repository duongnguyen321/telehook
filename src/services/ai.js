/**
 * Random content generator for TikTok videos
 * Target: 20-30 age, sexy/18+ content
 * Note: Vietnamese with proper diacritics
 */

// 350+ titles - tiếng Việt có dấu đầy đủ, dirty talk style
const TITLES = [
	// === DIRTY TALK - GỢI DỤC (25) ===
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
	'Làm em nóng đi anh',
	'Anh có khỏe không?',
	'Đêm nay anh rảnh không?',
	'Em muốn anh chiều em',
	'Chịu được mấy round?',
	'Anh có thể làm em mệt?',
	'Em thích slow hay fast?',
	'Anh giỏi không?',
	'Làm em run đi anh',
	'Em muốn more...',

	// === PASSIONATE DIRTY TALK (40) ===
	'Cho em xin đi anh',
	'Thưởng cho em đi',
	'Cho em đi anh ơi',
	'Em xin anh đó',
	'Em muốn nhận từ anh',
	'Cho em tất cả đi',
	'Đừng tiếc em gì',
	'Anh cho em nhiều đi',
	'Em hứng hết cho anh',
	'Em sẵn sàng nhận',
	'Vỗ nhẹ em đi anh',
	'Phạt em đi anh',
	'Em hư quá má em',
	'Tay anh mạnh quá',
	'Bad girl xin thưởng',
	'Nắm tóc em nha',
	'Kéo em lại gần',
	'Ghì em chặt hơn',
	'Ôm em mạnh đi',
	'Siết em chặt nha',
	'Cắn nhẹ em đi',
	'Hôn cổ em nha',
	'Hút nhẹ vai em',
	'Đánh dấu em đi',
	'Để lại dấu nha',
	'Taste em đi anh',
	'Thử em đi nào',
	'Chạm sâu hơn đi',
	'Đi sâu vào em',
	'Vào trong em đi',
	'Mạnh lên anh ơi',
	'Nhanh hơn đi anh',
	'Đừng nhẹ nữa',
	'Em thích mạnh bạo',
	'Thô bạo với em',
	'Chiếm lấy em đi',
	'Chinh phục em nào',
	'Quản em đi anh',
	'Sở hữu em đi',
	'Em thuộc về anh',

	// === KHIÊU KHÍCH - TEASING (25) ===
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
	'Nhìn em anh nghĩ gì?',
	'Da em trắng không?',
	'Môi em mềm lắm',
	'Mắt em biết nói',
	'Tóc em dài quá',
	'Chân em thon không?',
	'Eo em bé xíu',
	'Má em hồng hồng',
	'Mũi em xinh ghê',
	'Cổ em dài đẹp',

	// === ĐÊM KHUYA - NÓNG BỎNG (25) ===
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
	'Midnight vibes',
	'Late night mood',
	'2AM và em vẫn thức',
	'Đêm nay em cô đơn',
	'Ai online giờ này?',
	'Khuya rồi ai chưa ngủ?',
	'Đêm khuya em buồn',
	'Ai ôm em đêm nay?',
	'Giường rộng quá anh ơi',
	'Em sợ ngủ một mình',

	// === BODY HOT - KHOE THÂN (25) ===
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
	'Body chuẩn gym',
	'Eo thon mông cong',
	'Ngực đẹp tự nhiên',
	'Đùi thon chân dài',
	'Da trắng mịn màng',
	'Body không tì vết',
	'Đường cong hoàn hảo',
	'3 vòng như mơ',
	'Body tạc tượng',
	'Hàng real 100%',

	// === THẢ THÍNH - FLIRTY (25) ===
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
	'Anh có muốn quen không?',
	'Em đang tìm người yêu',
	'Anh có gấu chưa?',
	'Em single lâu rồi',
	'Cần người chăm sóc',
	'Anh có thật lòng không?',
	'Em muốn được yêu',
	'Anh có nhớ em không?',
	'Em nghĩ về anh hoài',
	'Anh đâu rồi?',

	// === BÍ ẨN - MYSTERIOUS (20) ===
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
	'Bí mật của em đây',
	'Muốn biết không?',
	'Em có điều muốn kể',
	'Phần 2 nóng hơn',
	'Full HD trong IB',

	// === TÁOBẠO - BOLD (20) ===
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
	'Em táo bạo lắm',
	'Anh chịu nổi không?',
	'Em wild lắm đó',
	'Nóng không tưởng',
	'Fire content đây',

	// === CONFIDENT SEXY (20) ===
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
	'Tự tin là sexy',
	'Em xinh em biết',
	'Đẹp tự nhiên 100%',
	'No filter needed',
	'Original content',

	// === TƯƠNG TÁC HOT (20) ===
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
	'Comment số điểm',
	'Rate 1-100 đi',
	'Thích thì like',
	'Yêu thì follow',
	'Miss thì save',

	// === DIRTY MOTION - CHUYỂN ĐỘNG GỢI DỤC (30) ===
	'Em lắc hông thế này',
	'Đong đưa theo nhịp',
	'Uốn éo như rắn',
	'Xoay người gợi cảm',
	'Nghiêng người từ từ',
	'Cúi xuống một chút',
	'Ngẩng đầu lên nào',
	'Quay lưng cho anh xem',
	'Đứng lên ngồi xuống',
	'Nằm xuống từ từ',
	'Trườn người sexy',
	'Nhún nhảy theo beat',
	'Vặn eo gợi cảm',
	'Lắc mông đây này',
	'Đong đưa đôi vai',
	'Cuộn người trên giường',
	'Trở mình gợi cảm',
	'Ngả người ra sau',
	'Nghiêng hông đong đưa',
	'Vuốt tóc sexy',
	'Liếm môi một chút',
	'Cắn môi gợi cảm',
	'Chạm người từ từ',
	'Vuốt ve bản thân',
	'Đưa tay lên cao',
	'Kéo dây áo xuống',
	'Vén váy một chút',
	'Xoay 360 cho anh',
	'Slow motion sexy',
	'Chậm rãi gợi cảm',

	// === BODY DETAIL - MÔ TẢ CHI TIẾT (30) ===
	'Ngực em căng mọng',
	'Mông em tròn đầy',
	'Eo em thon gọn',
	'Đùi em mịn màng',
	'Vai em trần trắng',
	'Lưng em cong sexy',
	'Bụng em phẳng lì',
	'Hông em bốc lửa',
	'Chân em dài miên man',
	'Môi em đỏ mọng',
	'Mắt em lim dim',
	'Tóc em xõa vai',
	'Cổ em trắng ngần',
	'Ngực tràn áo lót',
	'Mông căng trong quần',
	'Rãnh ngực sâu hun hút',
	'Đường cong chữ S',
	'Body đồng hồ cát',
	'Vòng 1 size khủng',
	'Vòng 3 nảy lửa',
	'Da thịt mịn màng',
	'Làn da trắng hồng',
	'Thân hình bốc lửa',
	'Body nóng rực',
	'Đường cong tuyệt đẹp',
	'Thân hình quyến rũ',
	'Body đẹp từng cm',
	'Số đo hoàn hảo',
	'3 vòng lý tưởng',
	'Thân hình goddess',

	// === POSE GỢI CẢM (30) ===
	'Nằm nghiêng trên giường',
	'Quỳ gối gợi cảm',
	'Tư thế doggy style',
	'Nằm ngửa nhìn lên',
	'Nằm sấp sexy',
	'Ngồi xổm gợi dục',
	'Dựa tường khoe thân',
	'Cúi người về trước',
	'Ngả lưng về sau',
	'Giơ chân lên cao',
	'Dang chân một chút',
	'Khép đùi kín đáo',
	'Vén áo khoe bụng',
	'Kéo quần xuống thấp',
	'Áo rơi vai một bên',
	'Váy cao hết cỡ',
	'Áo ngắn lộ eo',
	'Quần ngắn lộ mông',
	'Bikini 2 mảnh',
	'Lingerie đen huyền',
	'Đầm ngủ mỏng tang',
	'Áo lót ren sexy',
	'Quần lót string',
	'Đồ ngủ gợi cảm',
	'Bodysuit bó sát',
	'See through nhẹ',
	'Wet look sexy',
	'Khoe rãnh ngực',
	'Khoe vòng 3',
	'Khoe da thịt',

	// === BED CONTENT - NỘI DUNG GIƯỜNG CHIẾU (30) ===
	'Trên giường với em',
	'Giường em êm lắm',
	'Chăn gối thơm tho',
	'Nằm chờ anh đây',
	'Giường đủ cho 2',
	'Chờ ai lên giường?',
	'Đêm nay trên giường',
	'Gối đầu lên đùi em',
	'Cuộn trong chăn',
	'Trằn trọc không ngủ',
	'Giường rộng cô đơn',
	'Nằm một mình buồn',
	'Đếm cừu không xong',
	'Mơ về anh',
	'Giấc mơ nóng bỏng',
	'Thức dậy cùng em',
	'Sáng ra bên em',
	'Đêm qua thật dài',
	'Mệt nhưng sướng',
	'Còn muốn nữa không?',
	'Thêm round nữa?',
	'Anh còn khỏe không?',
	'Em chưa đủ đâu',
	'Tiếp tục đi anh',
	'Đừng dừng lại',
	'Nhanh hơn đi',
	'Chậm lại một chút',
	'Đúng chỗ đó',
	'Em thích thế này',
	'Anh giỏi quá',

	// === AFTER SHOWER - SAU KHI TẮM (20) ===
	'Mới tắm xong nè',
	'Tóc còn ướt',
	'Body thơm phức',
	'Da còn ẩm',
	'Quấn khăn tắm',
	'Chưa kịp mặc đồ',
	'Lau người từ từ',
	'Khăn rơi một chút',
	'Shower thoughts',
	'Fresh and clean',
	'Thơm tho mời gọi',
	'Sẵn sàng cho đêm nay',
	'Chuẩn bị ngủ thôi',
	'Ngủ ngon nha anh',
	'Mơ về em nha',
	'Đừng quên em',
	'Nhớ em không?',
	'Đêm nay mơ gì?',
	'Sweet dreams',
	'Chúc anh ngủ ngon',
];

// 300+ descriptions - dirty talk style, gợi dục táo bạo
const DESCRIPTIONS = [
	// === DIRTY TALK (20) ===
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
	'Em thích anh chiều em',
	'Làm em nóng đi',
	'Anh có muốn thử không?',
	'Em sẵn sàng rồi đó',
	'Đến đây với em',
	'Em đang đợi anh',
	'Anh ở đâu rồi?',

	// === BODY SENSATION - CẢM XÚC CƠ THỂ (40) ===
	'Em mệt quá anh ơi',
	'Em sướng quá đi',
	'Em phê quá rồi',
	'Em say quá mất',
	'Em run hết cả người',
	'Em không chịu nổi nữa',
	'Em muốn sâu hơn nữa',
	'Em muốn lâu hơn nữa',
	'Em muốn nhiều hơn nữa',
	'Em muốn mạnh hơn nữa',
	'Em muốn nhanh hơn nữa',
	'Em muốn chậm lại thôi',
	'Em thích quá đi mất',
	'Em đang rất sung',
	'Em đang rất muốn',
	'Em đang rất cần',
	'Em nóng hết cả người',
	'Em ướt hết rồi',
	'Em run không kiểm soát',
	'Em sắp không chịu được',
	'Em đang lên đỉnh',
	'Em sắp tới rồi đó',
	'Em không thể ngừng lại',
	'Em muốn tiếp tục mãi',
	'Đừng dừng lại anh ơi',
	'Tiếp tục đi anh',
	'Thêm nữa đi anh',
	'Đúng chỗ đó anh ơi',
	'Em thích vị trí này',
	'Tư thế này em thích',
	'Em cảm nhận được hết',
	'Em thấy hết rồi đó',
	'Em biết anh đang muốn',
	'Em biết anh thích gì',
	'Em chiều anh mọi thứ',
	'Anh muốn gì em cũng chịu',
	'Em sẵn sàng cho anh',
	'Anh tha hồ với em',
	'Body em thuộc về anh',
	'Em chỉ muốn anh thôi',

	// === GỢI CẢM - SEDUCTIVE (20) ===
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
	'Em sexy mà em biết',
	'Quyến rũ không cần cố',
	'Anh thích em không?',
	'Em có đẹp không?',
	'Rate em đi anh',
	'Em xinh lắm phải không?',
	'Anh nghĩ sao về em?',

	// === ĐÊM KHUYA - LATE NIGHT (20) ===
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
	'Late night vibes',
	'Midnight mood',
	'2AM thoughts',
	'Đêm khuya tâm sự',
	'Ai còn thức?',
	'Khuya rồi nhớ anh',
	'Đêm nay em buồn',

	// === BODY CONFIDENT (20) ===
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
	'Đẹp tự nhiên 100%',
	'No edit needed',
	'Original beauty',
	'Born this way',
	'Natural is best',
	'Real over fake',
	'Authentic beauty',

	// === TƯƠNG TÁC - ENGAGEMENT (20) ===
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
	'Like = yêu em',
	'Follow = support em',
	'Share = giúp em viral',
	'Save = xem lại sau',
	'Comment = tương tác',
	'Thả tim = thích em',
	'Drop emoji nào',

	// === ĐÊM VIBES (15) ===
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
	'Khuya rồi ai chưa ngủ',
	'Midnight story',

	// === TỰ TIN - CONFIDENT (15) ===
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
	'Self love first',
	'Love yourself',

	// === KHIÊU GỢI - TEASING (15) ===
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
	'Phần 2 sắp lên',
	'Stay tuned babe',

	// === DIRTY TALK DESC (25) ===
	'Anh làm em sướng đi',
	'Em muốn anh mạnh hơn',
	'Chậm lại một chút anh',
	'Đúng chỗ đó anh ơi',
	'Em thích thế này lắm',
	'Anh giỏi quá đi',
	'Tiếp tục đi đừng dừng',
	'Em sắp... rồi đó',
	'Anh chiều em nữa đi',
	'Em muốn thêm nữa',
	'Đêm nay anh rảnh không?',
	'Em cần anh tối nay',
	'Chỉ có anh mới làm được',
	'Em chỉ muốn anh thôi',
	'No one else but you',
	'Only you can do this',
	'Em muốn được anh chiều',
	'Làm em thỏa mãn đi',
	'Em đang rất muốn',
	'Body em nóng rực',
	'Chạm vào em đi anh',
	'Ôm em chặt hơn nữa',
	'Hôn em đi anh',
	'Em muốn cảm nhận anh',
	'Gần hơn nữa đi',

	// === BODY DESC (25) ===
	'Ngực em căng tràn',
	'Mông em tròn lắm',
	'Eo em bé xíu luôn',
	'Đùi em mịn màng',
	'Da em trắng mịn',
	'Môi em mọng đỏ',
	'Mắt em lim dim',
	'Body em bốc lửa',
	'Đường cong chữ S đây',
	'3 vòng siêu chuẩn',
	'Vòng 1 căng real',
	'Vòng 3 nảy lửa',
	'Hông em bốc lửa',
	'Chân em dài miên man',
	'Lưng em cong sexy',
	'Vai em trần trắng',
	'Cổ em dài đẹp',
	'Body không tì vết',
	'Real 100% đây anh',
	'Không filter vẫn hot',
	'God made me this way',
	'Natural và sexy',
	'Born to be hot',
	'Body mlem quá',
	'Đẹp từ đầu đến chân',

	// === POSE & MOTION DESC (25) ===
	'Em đang lắc hông đây',
	'Xoay người cho anh xem',
	'Cúi xuống một chút',
	'Ngả người về sau',
	'Nằm xuống từ từ',
	'Quỳ gối thế này',
	'Dựa tường khoe thân',
	'Vén áo một chút',
	'Kéo váy lên cao',
	'Áo rơi vai một bên',
	'Vuốt tóc sexy',
	'Cắn môi gợi cảm',
	'Liếm môi từ từ',
	'Vuốt ve body',
	'Chạm người nhẹ nhàng',
	'Slow motion sexy',
	'Uốn éo theo nhịp',
	'Đong đưa hông em',
	'Cuộn người trên giường',
	'Trở mình gợi cảm',
	'Ngả người lên gối',
	'Dang chân một chút',
	'Giơ tay lên cao',
	'Nghiêng người sexy',
	'Quay lưng khoe mông',

	// === BED DESC (25) ===
	'Em nằm chờ anh đây',
	'Giường em êm lắm',
	'Chờ anh lên giường',
	'Đêm nay trên giường',
	'Cuộn mình trong chăn',
	'Gối đầu lên đùi em',
	'Mơ về anh đêm qua',
	'Đêm dài cần người',
	'Giường rộng cô đơn',
	'Sáng ra bên cạnh em',
	'Thức dậy với em',
	'Đêm qua mệt nhưng sướng',
	'Còn muốn nữa không anh?',
	'Thêm round nữa?',
	'Em chưa đủ đâu',
	'Anh còn khỏe không?',
	'Đừng dừng lại nha',
	'Tiếp tục đi anh',
	'Em thích được anh chiều',
	'Đêm nay em muốn được yêu',
	'Ôm em ngủ đi',
	'Nằm cạnh em nha',
	'Đừng bỏ em một mình',
	'Em sợ ngủ một mình',
	'Cần hơi ấm của anh',
];

// 40+ hashtag sets - đa dạng chủ đề, trending hashtags
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

// Global tracking to avoid duplicates across all generated content
const usedTitlesGlobal = new Set();
const usedDescriptionsGlobal = new Set();

/**
 * Get random item from array, avoiding items in usedSet
 * @param {string[]} arr - Array to pick from
 * @param {Set} usedSet - Set of already used items
 * @returns {string} Random unused item
 */
function getUniqueRandom(arr, usedSet) {
	// Reset if we've used too many (80% threshold)
	if (usedSet.size >= arr.length * 0.8) {
		usedSet.clear();
	}

	let item;
	let attempts = 0;
	const maxAttempts = arr.length;

	do {
		item = arr[Math.floor(Math.random() * arr.length)];
		attempts++;
	} while (usedSet.has(item) && attempts < maxAttempts);

	usedSet.add(item);
	return item;
}

/**
 * Get random item from array (simple, for hashtags)
 */
function random(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate 1 unique content option (title + description)
 * Tracks used titles/descriptions globally to minimize duplicates
 */
export function generateContentOptions() {
	const options = [];
	const sessionTitles = new Set();

	for (let i = 0; i < 3; i++) {
		let title;
		// Ensure unique within this generation session too
		do {
			title = getUniqueRandom(TITLES, usedTitlesGlobal);
		} while (sessionTitles.has(title) && sessionTitles.size < TITLES.length);
		sessionTitles.add(title);

		options.push({
			title,
			description: getUniqueRandom(DESCRIPTIONS, usedDescriptionsGlobal),
			hashtags: random(HASHTAG_SETS),
		});
	}

	return options;
}

/**
 * Get stats about content pool usage
 */
export function getContentStats() {
	return {
		titlesTotal: TITLES.length,
		titlesUsed: usedTitlesGlobal.size,
		titlesRemaining: TITLES.length - usedTitlesGlobal.size,
		descriptionsTotal: DESCRIPTIONS.length,
		descriptionsUsed: usedDescriptionsGlobal.size,
		descriptionsRemaining: DESCRIPTIONS.length - usedDescriptionsGlobal.size,
	};
}

/**
 * Reset all tracking (useful for testing or manual reset)
 */
export function resetContentTracking() {
	usedTitlesGlobal.clear();
	usedDescriptionsGlobal.clear();
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
