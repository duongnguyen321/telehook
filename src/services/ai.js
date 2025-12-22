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

	// === GROUP/MULTI - SOME, ĐÔNG NGƯỜI (35) ===
	'Có ai thêm không?',
	'Thêm người nữa đi',
	'Đông vui hơn nha',
	'Càng đông càng vui',
	'Mời thêm bạn đi',
	'Em chiều được nhiều người',
	'Một mình sao đủ?',
	'Em cần nhiều hơn',
	'Ai muốn join không?',
	'Party đêm nay',
	'Nhiều người chiều em',
	'Em thích được quan tâm',
	'Nhiều tay nhiều chân',
	'Vây quanh em đi',
	'Cùng lúc được không?',
	'Em chiều hết mọi người',
	'Ai cũng được phần',
	'Đủ cho tất cả',
	'Share với bạn bè',
	'Group activity nha',
	'Team work đêm nay',
	'Hội chị em đây',
	'Girls night out',
	'Mấy chị em cùng chơi',
	'Ai mạnh nhất thắng',
	'Anh một mình chiều hết',
	'Em cần nhiều anh hơn',
	'Một anh không đủ',
	'Thêm mấy anh nữa',
	'Nhiều anh một em',
	'Em ham lắm đó',
	'Không bao giờ đủ',
	'Càng nhiều càng thích',
	'Ai tiếp theo nào?',
	'Next please',

	// === COSPLAY & SEXY OUTFIT (40) ===
	'Bunny girl đây nè',
	'Em là thỏ hư',
	'Tai thỏ và đuôi thỏ',
	'Playboy bunny vibes',
	'Maid phục vụ anh',
	'Hầu gái ngoan ngoãn',
	'Em dọn phòng cho anh',
	'Maid dress hôm nay',
	'Nurse chăm sóc anh',
	'Cô y tá sexy',
	'Em khám cho anh nha',
	'Chích thuốc cho anh',
	'School girl bad',
	'Nữ sinh hư hỏng',
	'Váy ngắn đi học',
	'Student cần dạy dỗ',
	'Cat girl meow meow',
	'Em là mèo con',
	'Tai mèo cute ghê',
	'Nyaa anh ơi',
	'Bikini 2 mảnh',
	'Bikini bé xíu',
	'Đồ bơi hở hang',
	'Beach body sẵn sàng',
	'Lingerie đen huyền',
	'Nội y ren sexy',
	'Áo lót gợi cảm',
	'Lace everywhere',
	'Bodysuit bó sát',
	'Catsuit leather',
	'Latex look hot',
	'Đồ da bóng loáng',
	'Fishnet body',
	'Lưới cá quyến rũ',
	'See through nhẹ',
	'Mỏng tang thấy hết',
	'Đầm ngủ silk',
	'Pyjama lụa mềm',
	'Kimono Nhật Bản',
	'Áo dài hở lưng',

	// === MISSING KEYWORDS - TÓC (20) ===
	'Tóc ngắn cá tính',
	'Tóc ngắn vẫn sexy',
	'Short hair tomboy hot',
	'Tóc dài thướt tha',
	'Tóc dài xõa vai',
	'Long hair goddess',
	'Tóc xõa gợi cảm',
	'Buộc tóc đuôi ngựa',
	'Ponytail sexy đây',
	'Tóc buộc lộ cổ',
	'Cột tóc cao quyến rũ',
	'Nắm tóc em đi anh',
	'Tóc em mềm mại',
	'Vuốt tóc sexy quá',
	'Tóc bay bay gợi cảm',
	'Kéo tóc em nha anh',
	'Tóc ướt vẫn hot',
	'Tóc rối trên giường',
	'Mái tóc em thơm',
	'Thả tóc cho anh xem',

	// === MISSING KEYWORDS - ĐỊA ĐIỂM (25) ===
	'Selfie trước gương',
	'Mirror mirror sexy',
	'Tự sướng trước gương',
	'Gương soi body em',
	'Soi gương thấy hot',
	'Karaoke đêm nay',
	'Phòng hát cùng em',
	'Quẩy karaoke nóng',
	'Đèn mờ phòng hát',
	'Ở khách sạn với em',
	'Hotel room đêm nay',
	'Check-in rồi làm gì?',
	'Phòng khách sạn nóng',
	'Đêm trong hotel',
	'Outdoor nắng đẹp',
	'Biển xanh và em',
	'Ngoài trời thoáng mát',
	'Indoor ở nhà chơi',
	'Home alone với em',
	'Bathroom selfie hot',
	'Trong toilet với em',
	'Nắng chiếu body em',
	'Trời nắng em nóng',
	'Nắng đẹp khoe body',
	'Bên bờ biển sexy',

	// === MISSING KEYWORDS - BIỂU CẢM (20) ===
	'Em kêu lên nha',
	'Kêu to lên anh nghe',
	'Ahhh như thế này',
	'Ahh ahh anh ơi',
	'Cười gợi cảm nha',
	'Smile sexy của em',
	'Nụ cười quyến rũ',
	'Cười nhẹ đầy ý nghĩa',
	'Quiet nhưng hot',
	'Silent seduction',
	'Lặng lẽ quyến rũ',
	'Lip bite sexy',
	'Cắn môi đi anh',
	'Profile em sexy',
	'Góc nghiêng gợi cảm',
	'Top view ngực em',
	'Top down sexy',
	'Nhìn từ top xuống',
	'Em im lặng thôi',
	'Không cần kêu cũng sướng',

	// === MISSING KEYWORDS - HÀNH ĐỘNG (25) ===
	'Dance sexy đi em',
	'Quẩy lên nha anh',
	'Bounce cùng em',
	'Bounce theo nhịp',
	'Em sờ body em',
	'Sờ soạng gợi cảm',
	'Touch body em đi',
	'Chạm vào em nha',
	'Bend over đây anh',
	'Cúi gập người sexy',
	'Cong người gợi cảm',
	'Lying on bed',
	'Lying down sexy',
	'Nằm như thế này',
	'Flex body đẹp',
	'Show off đi em',
	'Xoay người cho xem',
	'Quẩy theo beat',
	'Dance như thế này',
	'Nảy theo nhịp nhạc',
	'Vuốt ve body em',
	'Touch myself nha',
	'Gập người về trước',
	'Doggy style đây',
	'Nhún nảy theo anh',

	// === MISSING KEYWORDS - SỐ NGƯỜI (20) ===
	'Solo girl đây',
	'Anh và em thôi',
	'Couple goals đây',
	'Hai đứa mình chơi',
	'Cặp đôi hot đây',
	'Em và anh đêm nay',
	'Together forever',
	'Các em cùng chơi',
	'Nhiều em chiều anh',
	'Hội các em đây',
	'Em chiều anh thôi',
	'Solo em một mình',
	'Một mình em đây',
	'Just two of us',
	'Hai người một giường',
	'Couple content hot',
	'Anh với em đây',
	'Mình cùng nhau nha',
	'Đôi ta yêu nhau',
	'Hội chị em quẩy',

	// === MISSING KEYWORDS - TRANG PHỤC (20) ===
	'Đồ nhà của em',
	'Casual vẫn hot',
	'Mặc bình thường thôi',
	'Đồ lót gợi cảm',
	'Đồ lót sexy đây',
	'Lace đồ lót đẹp',
	'Nude body đây',
	'Nude không che',
	'Không mặc gì luôn',
	'Cởi hết ra nha',
	'Natural body nude',
	'Nước ướt body em',
	'Ướt nước sexy',
	'Water và body',
	'Beach body sẵn sàng',
	'Biển summer hot',
	'Đồ nhà thoải mái',
	'Simple but hot',
	'Tắm xong ướt đẫm',
	'Shower và body',

	// === MISSING KEYWORDS - ĐIỂM NHẤN (15) ===
	'Mông đít em tròn',
	'Đít em cong vút',
	'Legs dài miên man',
	'Long legs sexy',
	'Face em xinh không?',
	'Mặt xinh body đẹp',
	'Toàn thân em đây',
	'Full body view',
	'Back view sexy',
	'Lưng trần gợi cảm',
	'Từ đầu đến chân',
	'Whole body em đây',
	'Toàn bộ body sexy',
	'Em khoe back view',
	'Góc sau body em',
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

	// === GROUP/MULTI DESC (30) ===
	'Một mình anh sao đủ',
	'Em cần nhiều người chiều',
	'Càng đông càng vui nha',
	'Mời thêm bạn anh đi',
	'Party đêm nay cùng em',
	'Có ai muốn join không?',
	'Em chiều được cả nhóm',
	'Nhiều người cùng lúc',
	'Ai cũng sẽ có phần',
	'Đủ cho tất cả mọi người',
	'Em không từ chối ai',
	'Vây quanh em đi các anh',
	'Quan tâm em nhiều hơn',
	'Team work là chìa khóa',
	'Group play tonight',
	'Hội chị em sẵn sàng',
	'Girls night nóng bỏng',
	'Mấy chị em cùng chơi',
	'Ai mạnh nhất được thưởng',
	'Một anh chiều hết bọn em',
	'Thêm mấy anh nữa đi',
	'Nhiều anh chiều một em',
	'Em ham lắm không đủ',
	'Không bao giờ là đủ',
	'Càng nhiều em càng thích',
	'Next person please',
	'Ai tiếp theo nào?',
	'Xếp hàng đi các anh',
	'Lần lượt nhé',
	'Đừng chen lấn nha',

	// === COSPLAY & OUTFIT DESC (35) ===
	'Em là thỏ ngoan của anh',
	'Bunny girl phục vụ anh',
	'Tai thỏ đuôi thỏ sẵn sàng',
	'Hop hop đến với anh',
	'Maid dọn phòng nha anh',
	'Em là hầu gái của anh',
	'Phục vụ anh là hạnh phúc',
	'Gọi gì em cũng có mặt',
	'Nurse chăm sóc đặc biệt',
	'Em khám kỹ cho anh',
	'Thuốc của em rất hiệu quả',
	'Y tá tận tình phục vụ',
	'Student cần được dạy',
	'Nữ sinh hư xin phạt',
	'Thầy ơi em sai rồi',
	'Em xin được educate',
	'Cat girl meo meo',
	'Em là mèo của anh',
	'Vuốt ve em đi anh',
	'Mèo con cần được cưng',
	'Bikini hôm nay hot',
	'Đồ bơi bé xíu',
	'Beach ready body',
	'Summer vibes nóng bỏng',
	'Lingerie collection day',
	'Nội y ren mới mua',
	'Lace đẹp không anh?',
	'Bodysuit fit body em',
	'Leather look tonight',
	'Latex vibes spicy',
	'Fishnet everywhere',
	'See through mood',
	'Silk ngủ đêm nay',
	'Kimono cởi từ từ',
	'Áo dài khoe lưng',

	// === MISSING KEYWORDS DESC - TÓC (20) ===
	'Tóc ngắn nhưng vẫn sexy',
	'Em để tóc ngắn cho gọn',
	'Short hair của em đẹp không?',
	'Tóc dài thướt tha trên vai',
	'Long hair xõa trên giường',
	'Tóc em dài lắm anh ơi',
	'Em thích thướt tha thế này',
	'Buộc tóc ponytail cho gọn',
	'Đuôi ngựa sexy của em',
	'Tóc buộc cao lộ cổ đẹp',
	'Anh nắm tóc em đi',
	'Kéo tóc em về phía anh',
	'Tóc em mềm mại và thơm',
	'Vuốt tóc em sexy nha',
	'Tóc bay trong gió',
	'Tóc xõa trên gối',
	'Mái tóc rối sau khi làm',
	'Tóc ướt sau khi tắm',
	'Thả tóc ra cho anh xem',
	'Tóc em đẹp không anh?',

	// === MISSING KEYWORDS DESC - ĐỊA ĐIỂM (25) ===
	'Selfie trước gương cho anh',
	'Mirror shot gợi cảm nha',
	'Soi gương thấy body em',
	'Trước gương sexy như này',
	'Gương cho thấy cả hai góc',
	'Karaoke đêm nay đi anh',
	'Phòng hát tối và nóng',
	'Quẩy karaoke cùng em',
	'Đèn mờ sexy trong phòng hát',
	'Khách sạn đêm nay nhé',
	'Hotel room chờ anh',
	'Check-in rồi anh đến đi',
	'Trong phòng khách sạn nè',
	'Đêm nay trong hotel cùng em',
	'Outdoor nắng đẹp khoe body',
	'Biển xanh và body em',
	'Ngoài trời thoáng mát sexy',
	'Em thích outdoor như này',
	'Indoor ở nhà với em',
	'Home alone đợi anh',
	'Bathroom sau khi tắm',
	'Trong toilet hot nha',
	'Nắng chiếu lên body em',
	'Trời nắng làm em nóng',
	'Bên bờ biển với anh',

	// === MISSING KEYWORDS DESC - BIỂU CẢM (20) ===
	'Em kêu to cho anh nghe',
	'Kêu lên nha không ai nghe đâu',
	'Ahhh sướng quá anh ơi',
	'Ahh ahh như thế này đi',
	'Em cười gợi cảm cho anh',
	'Smile sexy nha anh',
	'Nụ cười của em đây',
	'Cười nhẹ nhưng đầy ý nghĩa',
	'Quiet nhưng body nói hết',
	'Silent seduction là style em',
	'Lặng lẽ nhưng sexy',
	'Lip bite gợi cảm nha',
	'Cắn môi nhìn anh thế này',
	'Profile em sexy không?',
	'Góc nghiêng của em đây',
	'Top view nhìn xuống ngực',
	'Top down angle sexy',
	'Nhìn từ trên xuống thấy hết',
	'Im lặng nhưng mắt nói hết',
	'Không kêu nhưng sướng',

	// === MISSING KEYWORDS DESC - HÀNH ĐỘNG (25) ===
	'Dance sexy cùng em',
	'Quẩy lên nha anh',
	'Bounce theo nhịp nhạc',
	'Bounce cùng em đi',
	'Em sờ body em thế này',
	'Sờ soạng bản thân gợi cảm',
	'Touch body em đi anh',
	'Chạm vào em nha',
	'Bend over cho anh xem',
	'Cúi gập người gợi cảm',
	'Cong người sexy như này',
	'Lying on bed đợi anh',
	'Lying down gợi cảm',
	'Nằm thế này đợi anh',
	'Flex body đẹp cho anh',
	'Show off body đi em',
	'Xoay người cho anh xem đủ góc',
	'Quẩy theo beat nha',
	'Dance như thế này đi',
	'Nảy theo nhịp sexy',
	'Vuốt ve body em đây',
	'Touch myself cho anh xem',
	'Gập người về phía trước',
	'Doggy style anh thích không?',
	'Nhún nảy theo nhịp anh',

	// === MISSING KEYWORDS DESC - SỐ NGƯỜI (20) ===
	'Solo girl content đây',
	'Chỉ có anh và em thôi',
	'Couple goals của mình',
	'Hai đứa mình chơi nhé',
	'Cặp đôi sexy đây',
	'Em và anh đêm nay nha',
	'Together with you forever',
	'Các em cùng chơi với anh',
	'Nhiều em chiều anh một mình',
	'Hội các em sexy đây',
	'Em chiều anh một mình thôi',
	'Solo em với camera',
	'Một mình em đây nè',
	'Just the two of us',
	'Hai người một giường thôi',
	'Couple content hot đây',
	'Anh với em mình chơi nhé',
	'Mình cùng nhau nha anh',
	'Đôi ta yêu nhau mãi',
	'Chị em cùng quẩy',

	// === MISSING KEYWORDS DESC - TRANG PHỤC (20) ===
	'Đồ nhà thoải mái sexy',
	'Casual but still hot',
	'Mặc bình thường nhưng vẫn gợi cảm',
	'Đồ lót ren sexy nha',
	'Đồ lót mới mua cho anh',
	'Lace đồ lót đẹp không?',
	'Nude body em đây',
	'Nude không che gì hết',
	'Không mặc gì cho anh xem',
	'Cởi hết ra đây nè',
	'Natural body nude đẹp',
	'Nước ướt đẫm body em',
	'Ướt nước sexy như này',
	'Water và body em đây',
	'Beach body ready nha',
	'Biển summer sexy đây',
	'Đồ nhà nhưng vẫn hot',
	'Simple but hot đó anh',
	'Tắm xong ướt đẫm body',
	'Shower xong body thơm',

	// === MISSING KEYWORDS DESC - ĐIỂM NHẤN (15) ===
	'Mông đít em tròn không?',
	'Đít em cong sexy',
	'Legs dài miên man đây',
	'Long legs sexy của em',
	'Face em xinh không anh?',
	'Mặt xinh body cũng đẹp',
	'Toàn thân em đây nè',
	'Full body không che',
	'Back view sexy của em',
	'Lưng trần gợi cảm nha',
	'Từ đầu đến chân đều hot',
	'Whole body em cho anh',
	'Toàn bộ body sexy đây',
	'Em khoe back view nha',
	'Góc sau body em đẹp',
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

// ==================== CATEGORY-BASED CONTENT SYSTEM ====================

/**
 * Category-based content filtering
 * Each category has options with keywords to filter existing TITLES/DESCRIPTIONS
 * This avoids content duplication - all content comes from TITLES and DESCRIPTIONS arrays
 */
const CATEGORIES = {
	// Tư thế / Góc camera
	POSE: {
		name: 'Tư thế',
		emoji: '📷',
		options: {
			FRONT: { label: 'Trước', keywords: ['trước', 'mặt', 'nhìn', 'ngực'] },
			BACK: { label: 'Sau', keywords: ['sau', 'lưng', 'mông', 'quay'] },
			TOP: { label: 'Trên', keywords: ['trên', 'xuống', 'rãnh', 'top'] },
			BOTTOM: { label: 'Dưới', keywords: ['dưới', 'lên', 'chân', 'low'] },
			SIDE: {
				label: 'Nghiêng',
				keywords: ['nghiêng', 'cong', 'đường cong', 'profile'],
			},
		},
	},

	// Hành động
	ACTION: {
		name: 'Hành động',
		emoji: '🎬',
		options: {
			SHOWING: { label: 'Khoe', keywords: ['khoe', 'show', 'flex', 'xem'] },
			BOUNCING: { label: 'Nhún', keywords: ['nhún', 'bounce', 'nảy', 'lắc'] },
			DANCING: {
				label: 'Lắc',
				keywords: ['lắc', 'dance', 'nhảy', 'quẩy', 'xoay'],
			},
			LYING: { label: 'Nằm', keywords: ['nằm', 'giường', 'lying', 'ngủ'] },
			BENDING: { label: 'Cúi', keywords: ['cúi', 'bend', 'gập', 'doggy'] },
			TOUCHING: { label: 'Sờ', keywords: ['sờ', 'chạm', 'vuốt', 'touch'] },
		},
	},

	// Biểu cảm
	EXPRESSION: {
		name: 'Biểu cảm',
		emoji: '😮',
		options: {
			MOANING: { label: 'Kêu', keywords: ['kêu', 'rên', 'sướng', 'ahh', 'ơi'] },
			SILENT: { label: 'Im lặng', keywords: ['im', 'lặng', 'quiet', 'silent'] },
			SMILING: { label: 'Cười', keywords: ['cười', 'smile', 'vui'] },
			SEDUCTIVE: {
				label: 'Gợi tình',
				keywords: ['mắt', 'nhìn', 'gợi', 'quyến rũ'],
			},
			BITING: { label: 'Cắn môi', keywords: ['cắn', 'môi', 'liếm', 'lip'] },
		},
	},

	// Địa điểm
	LOCATION: {
		name: 'Địa điểm',
		emoji: '🏠',
		options: {
			MIRROR: { label: 'Trước gương', keywords: ['gương', 'mirror', 'selfie'] },
			KARAOKE: { label: 'Karaoke', keywords: ['karaoke', 'phòng hát'] },
			OUTDOOR: {
				label: 'Ngoài trời',
				keywords: ['ngoài', 'outdoor', 'beach', 'biển'],
			},
			INDOOR: {
				label: 'Trong nhà',
				keywords: ['nhà', 'phòng', 'indoor', 'home'],
			},
			BED: {
				label: 'Trên giường',
				keywords: ['giường', 'bed', 'nằm', 'gối', 'chăn'],
			},
			BATHROOM: {
				label: 'Phòng tắm',
				keywords: ['tắm', 'bathroom', 'shower', 'ướt'],
			},
			HOTEL: {
				label: 'Khách sạn',
				keywords: ['khách sạn', 'hotel', 'check-in'],
			},
		},
	},

	// Thời gian
	TIME: {
		name: 'Thời gian',
		emoji: '🌙',
		options: {
			DAY: { label: 'Ban ngày', keywords: ['ngày', 'nắng', 'sáng', 'day'] },
			NIGHT: {
				label: 'Đêm',
				keywords: ['đêm', 'khuya', 'night', 'midnight', 'tối'],
			},
			UNKNOWN: { label: 'Không rõ', keywords: [] }, // Match anything
		},
	},

	// Số người
	PEOPLE: {
		name: 'Số người',
		emoji: '👥',
		options: {
			SOLO_FEMALE: { label: '1 nữ', keywords: ['em', 'một mình', 'solo'] },
			MANY_MALE_1_FEMALE: {
				label: 'Nhiều nam 1 nữ',
				keywords: ['nhiều anh', 'các anh', 'nhóm'],
			},
			MANY_FEMALE: {
				label: 'Nhiều nữ',
				keywords: ['chị em', 'hội', 'girls', 'các em'],
			},
			COUPLE: {
				label: 'Cặp đôi',
				keywords: ['anh và em', 'couple', 'hai đứa'],
			},
		},
	},

	// Trang phục
	OUTFIT: {
		name: 'Trang phục',
		emoji: '👙',
		options: {
			BIKINI: {
				label: 'Bikini',
				keywords: ['bikini', 'đồ bơi', 'beach', 'summer'],
			},
			LINGERIE: {
				label: 'Nội y',
				keywords: ['nội y', 'lingerie', 'lace', 'ren', 'đồ lót'],
			},
			COSPLAY: {
				label: 'Cosplay',
				keywords: ['cosplay', 'bunny', 'maid', 'nurse', 'nữ sinh'],
			},
			CASUAL: {
				label: 'Thường',
				keywords: ['đồ nhà', 'casual', 'bình thường'],
			},
			NAKED: {
				label: 'Không mặc',
				keywords: ['cởi', 'nude', 'trần', 'không mặc'],
			},
			WET: { label: 'Ướt', keywords: ['ướt', 'wet', 'nước', 'tắm'] },
		},
	},

	// Tóc
	HAIR: {
		name: 'Tóc',
		emoji: '💇',
		options: {
			SHORT: { label: 'Ngắn', keywords: ['tóc ngắn', 'short hair'] },
			LONG: { label: 'Dài', keywords: ['tóc dài', 'long hair', 'thướt tha'] },
			LOOSE: { label: 'Xõa', keywords: ['xõa', 'tóc xõa', 'vai'] },
			TIED: { label: 'Buộc', keywords: ['buộc', 'ponytail', 'đuôi ngựa'] },
		},
	},

	// Điểm nhấn / Main focus
	FOCUS: {
		name: 'Điểm nhấn',
		emoji: '🎯',
		options: {
			CHEST: { label: 'Ngực', keywords: ['ngực', 'vòng 1', 'rãnh', 'căng'] },
			BUTT: { label: 'Mông', keywords: ['mông', 'vòng 3', 'đít'] },
			WAIST: { label: 'Eo', keywords: ['eo', 'vòng eo', 'bé xíu'] },
			LEGS: { label: 'Chân', keywords: ['chân', 'đùi', 'legs'] },
			FACE: { label: 'Mặt', keywords: ['mặt', 'face', 'xinh'] },
			FULL_BODY: {
				label: 'Toàn thân',
				keywords: ['body', 'full', 'toàn thân', '3 vòng'],
			},
			BACK_BODY: { label: 'Lưng', keywords: ['lưng', 'back'] },
		},
	},
};

/**
 * Filter content from array by keywords
 * @param {string[]} contentArray - Array of titles or descriptions
 * @param {string[]} keywords - Keywords to match
 * @returns {string[]} Filtered content
 */
function filterByKeywords(contentArray, keywords) {
	if (!keywords || keywords.length === 0) {
		return contentArray; // Return all if no keywords (for "unknown" options)
	}

	const filtered = contentArray.filter((content) => {
		const lowerContent = content.toLowerCase();
		return keywords.some((kw) => lowerContent.includes(kw.toLowerCase()));
	});

	// If no matches, return original array to avoid empty results
	return filtered.length > 0 ? filtered : contentArray;
}

/**
 * Get all available categories for UI display
 * @returns {Array<{key: string, name: string, emoji: string}>}
 */
export function getCategories() {
	return Object.entries(CATEGORIES).map(([key, cat]) => ({
		key,
		name: cat.name,
		emoji: cat.emoji,
	}));
}

/**
 * Get options for a specific category
 * @param {string} categoryKey - e.g. 'POSE', 'ACTION', 'EXPRESSION'
 * @returns {Array<{key: string, label: string}>|null}
 */
export function getCategoryOptions(categoryKey) {
	const category = CATEGORIES[categoryKey];
	if (!category) return null;

	return Object.entries(category.options).map(([key, opt]) => ({
		key,
		label: opt.label,
	}));
}

/**
 * Generate content based on selected categories
 * Filters existing TITLES and DESCRIPTIONS by keywords from selected categories
 * @param {Object} selectedCategories - e.g. { POSE: 'FRONT', ACTION: 'SHOWING', ... }
 * @returns {Array<{title: string, description: string, hashtags: string}>}
 */
export function generateContentFromCategories(selectedCategories) {
	// Collect all keywords from selected categories
	const allKeywords = [];

	for (const [categoryKey, optionKey] of Object.entries(selectedCategories)) {
		const category = CATEGORIES[categoryKey];
		if (!category) continue;

		const option = category.options[optionKey];
		if (!option) continue;

		allKeywords.push(...(option.keywords || []));
	}

	// If no valid selections, fall back to random
	if (allKeywords.length === 0) {
		return generateContentOptions();
	}

	// Filter titles and descriptions by keywords
	const filteredTitles = filterByKeywords(TITLES, allKeywords);
	const filteredDescriptions = filterByKeywords(DESCRIPTIONS, allKeywords);

	// Generate 3 options from filtered content
	const options = [];
	const usedTitles = new Set();
	const usedDescs = new Set();

	for (let i = 0; i < 3; i++) {
		// Pick unique title
		let title;
		let attempts = 0;
		do {
			title = filteredTitles[Math.floor(Math.random() * filteredTitles.length)];
			attempts++;
		} while (usedTitles.has(title) && attempts < 20);
		usedTitles.add(title);

		// Pick unique description
		let description;
		attempts = 0;
		do {
			description =
				filteredDescriptions[
					Math.floor(Math.random() * filteredDescriptions.length)
				];
			attempts++;
		} while (usedDescs.has(description) && attempts < 20);
		usedDescs.add(description);

		options.push({
			title,
			description,
			hashtags: random(HASHTAG_SETS),
		});
	}

	return options;
}

/**
 * Get category name by key (for display)
 * @param {string} categoryKey
 * @returns {string}
 */
export function getCategoryName(categoryKey) {
	const category = CATEGORIES[categoryKey];
	return category ? `${category.emoji} ${category.name}` : categoryKey;
}

/**
 * Get option label by category and option key
 * @param {string} categoryKey
 * @param {string} optionKey
 * @returns {string}
 */
export function getOptionLabel(categoryKey, optionKey) {
	const category = CATEGORIES[categoryKey];
	if (!category) return optionKey;
	const option = category.options[optionKey];
	return option ? option.label : optionKey;
}

/**
 * Get category key by index
 * @param {number} index
 * @returns {string|null}
 */
export function getCategoryKeyByIndex(index) {
	const keys = Object.keys(CATEGORIES);
	return keys[index] || null;
}

/**
 * Get option key by category index and option index
 * @param {string} categoryKey
 * @param {number} optionIndex
 * @returns {string|null}
 */
export function getOptionKeyByIndex(categoryKey, optionIndex) {
	const category = CATEGORIES[categoryKey];
	if (!category) return null;
	const keys = Object.keys(category.options);
	return keys[optionIndex] || null;
}
