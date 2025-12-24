/**
 * Category-based content filtering
 * Each category has options with keywords to filter existing TITLES
 * This avoids content duplication - all content comes from TITLES array
 */
export const CATEGORIES = {
	// 1. CHỦ ĐỀ & PHONG CÁCH (Theme, Vibe, Expression)
	THEME: {
		name: 'Chủ đề & Phong cách',
		emoji: '✨',
		options: {
			SEXY_BOLD: {
				label: 'Gợi cảm & Táo bạo',
				keywords: [
					'táo bạo',
					'nóng bỏng',
					'quyến rũ',
					'gợi tình',
					'gợi cảm',
					'sexy',
					'18+',
					'hư',
					'bad girl',
					'cởi',
					'hở',
					'ren',
					'xuyên thấu',
					'lọt khe',
					'ướt',
					'mlem',
					'cháy',
					'nóng',
					'gợi',
					'sướng',
					'phê',
					'quyến',
					'rũ',
					'cảm',
					'tình',
					'bỏng',
					'da thịt',
				],
			},
			CUTE_SWEET: {
				label: 'Đáng yêu & Ngọt ngào',
				keywords: ['đáng yêu', 'dễ thương', 'cười', 'ngây thơ', 'nắng', 'hiền'],
			},
			LUXURY_CLASSY: {
				label: 'Sang chảnh & Quý phái',
				keywords: [
					'sang chảnh',
					'quý phái',
					'đẳng cấp',
					'tiệc',
					'dạ hội',
					'resort',
					'kiêu sa',
				],
			},
			CASUAL_DAILY: {
				label: 'Thường ngày & Gần gũi',
				keywords: [
					'thường ngày',
					'ở nhà',
					'đơn giản',
					'ấm áp',
					'chill',
					'thoải mái',
				],
			},
			WET_LOOK: {
				label: 'Ướt át & Đẫm nước',
				keywords: ['ướt', 'nước', 'đẫm', 'nhễ nhại', 'mồ hôi'],
			},
			WILD: {
				label: 'Hoang dại & Điên cuồng',
				keywords: ['hoang dại', 'điên cuồng', 'dữ dội', 'mạnh bạo', 'thô bạo'],
			},
			MYSTERIOUS: {
				label: 'Bí ẩn & Che giấu',
				keywords: ['bí ẩn', 'bí mật', 'che', 'kín', 'giấu', 'mờ'],
			},
		},
	},

	// 2. VAI TRÒ (Role)
	ROLE: {
		name: 'Vai trò',
		emoji: '🎭',
		options: {
			TEACHER: {
				label: 'Cô giáo / Giáo viên',
				keywords: ['cô giáo', 'giáo viên', 'dạy học', 'lớp học', 'bục giảng'],
			},
			STUDENT: {
				label: 'Học sinh / Nữ sinh',
				keywords: [
					'học sinh',
					'nữ sinh',
					'sinh viên',
					'đi học',
					'đồng phục học sinh',
				],
			},
			NURSE: {
				label: 'Y tá / Bác sĩ',
				keywords: ['y tá', 'bác sĩ', 'bệnh viện', 'khám', 'thuốc', 'tiêm'],
			},
			SECRETARY: {
				label: 'Thư ký / Văn phòng',
				keywords: ['thư ký', 'sếp', 'trợ lý', 'giám đốc'],
			},
			MAID: {
				label: 'Hầu gái / Giúp việc',
				keywords: ['hầu gái', 'giúp việc', 'dọn dẹp', 'chủ nhân', 'phục vụ'],
			},
			OFFICE_LADY: {
				label: 'Dân văn phòng (OL)',
				keywords: ['công sở', 'dân văn phòng', 'ol', 'nhân viên'],
			},
			KTV_GIRL: {
				label: 'KTV / Tiếp viên',
				keywords: [
					'karaoke',
					'tay vịn',
					'tiếp viên',
					'ktv',
					'rót bia',
					'phòng hát',
				],
			},
			GYM_GIRL: {
				label: 'Gymer / PT',
				keywords: ['gymer', 'phòng tập', 'huấn luyện viên', 'pt', 'tập gym'],
			},
			RICH_KID: {
				label: 'Tiểu thư / Sang chảnh',
				keywords: [
					'sang chảnh',
					'tiểu thư',
					'con nhà giàu',
					'rich kid',
					'đồ hiệu',
				],
			},
			HOT_GIRL: {
				label: 'Hotgirl / Idol',
				keywords: ['hotgirl', 'hot girl', 'idol', 'nổi tiếng', 'hot face'],
			},
		},
	},

	// 3. TRANG PHỤC (Outfit)
	OUTFIT: {
		name: 'Trang phục',
		emoji: '👗',
		options: {
			BIKINI: {
				label: 'Bikini / Đồ bơi',
				keywords: ['bikini', 'đồ bơi', '2 mảnh', 'áo tắm', 'đi biển'],
			},
			LINGERIE: {
				label: 'Nội y / Đồ ngủ',
				keywords: ['nội y', 'đồ lót', 'ren', 'lọt khe', 'đồ ngủ', 'váy ngủ'],
			},
			AO_DAI: {
				label: 'Áo dài / Yếm',
				keywords: ['áo dài', 'truyền thống', 'yếm', 'cổ trang'],
			},
			OFFICE_WEAR: {
				label: 'Đồ công sở',
				keywords: ['sơ mi', 'vest', 'chân váy', 'quần tây', 'zip', 'blazer'],
			},
			GYM_WEAR: {
				label: 'Đồ tập / Sport',
				keywords: ['đồ tập', 'legging', 'bra sport', 'bó sát', 'quần tập'],
			},
			STREET_STYLE: {
				label: 'Đồ dạo phố',
				keywords: [
					'váy ngắn',
					'áo thun',
					'quần short',
					'dạo phố',
					'đồ thường',
					'jeans',
				],
			},
			DRESS: {
				label: 'Váy / Đầm',
				keywords: ['váy', 'đầm', 'dạ hội', 'đầm ôm', 'váy dây', 'váy body'],
			},
			UNIFORM: {
				label: 'Đồng phục',
				keywords: [
					'đồng phục',
					'trang phục ngành',
					'vest',
					'blazer',
					'sơ mi',
					'blouse',
					'áo dài',
					'scrubs',
				],
			},
			LEATHER: {
				label: 'Đồ da / Latex',
				keywords: ['đồ da', 'da bóng', 'bộ da', 'latex', 'da'],
			},
			MESH: {
				label: 'Lưới / Xuyên thấu',
				keywords: ['lưới', 'xuyên thấu', 'vải màn', 'mỏng tang'],
			},
			TOWEL: {
				label: 'Khăn tắm',
				keywords: ['khăn tắm', 'quấn khăn', 'áo choàng tắm'],
			},
			NUDE: {
				label: 'NUDE',
				keywords: [
					'thoải mái',
					'tự do',
					'tự nhiên',
					'nguyên bản',
					'da thịt tự nhiên',
					'không che đậy',
					'tự do hoàn toàn',
					'thoải mái hoàn toàn',
					'tự do toàn thân',
					'da thịt nguyên bản',
					'cơ thể tự nhiên',
					'cơ thể nguyên bản',
				],
			},
		},
	},

	// 3. HOẠT ĐỘNG (Activity, Motion)
	ACTIVITY: {
		name: 'Hoạt động',
		emoji: '🎬',
		options: {
			POSING_DANCING: {
				label: 'Tạo dáng / Nhảy',
				keywords: [
					'tạo dáng',
					'thả dáng',
					'khoe',
					'đứng',
					'nhìn',
					'ngắm',
					'nhảy',
					'dance',
					'quẩy',
					'lắc',
					'nhún',
					'chuyển động',
					'cover',
					'trend',
					'uốn',
				],
			},
			SITTING: {
				label: 'Ngồi',
				keywords: ['ngồi', 'ghế', 'sofa'],
			},
			KNEELING: {
				label: 'Quỳ / Bò',
				keywords: ['quỳ', 'trườn'],
			},
			SEXY_DANCE: {
				label: 'Nhảy gợi cảm / Lắc hông',
				keywords: [
					'lắc hông',
					'lắc mông',
					'gợi cảm',
					'nóng bỏng',
					'quyến rũ',
					'đong đưa',
					'uốn éo',
				],
			},
			RELAXING: {
				label: 'Nằm / Thư giãn',
				keywords: ['thư giãn', 'nằm', 'ngủ', 'giường', 'sofa'],
			},
			PLAYFUL: {
				label: 'Nghịch / Tương tác',
				keywords: [
					'nghịch',
					'chơi',
					'tương tác',
					'nháy mắt',
					'đá lông nheo',
					'liếm môi',
					'vuốt tóc',
					'cắn môi',
				],
			},
			SHOWING: {
				label: 'Show hàng / Khoe',
				keywords: ['khoe', 'cởi', 'hở', 'lộ', 'phô', 'phơi'],
			},
			SHOW_BACK: {
				label: 'Khoe lưng',
				keywords: ['khoe lưng', 'lưng trần', 'hở lưng', 'lưng', 'quay lưng'],
			},
			SHOW_BUTT: {
				label: 'Khoe mông',
				keywords: [
					'khoe mông',
					'mông',
					'vòng 3',
					'mông',
					'mông cong',
					'mông tròn',
				],
			},
			SHOW_CHEST: {
				label: 'Khoe ngực',
				keywords: [
					'khoe ngực',
					'ngực',
					'vòng 1',
					'ngực căng',
					'ngực tràn',
					'rãnh ngực',
				],
			},
			BATHING: {
				label: 'Tắm / Gội',
				keywords: [
					'tắm',
					'gội',
					'bồn tắm',
					'vòi sen',
					'xà phòng',
					'bong bóng',
					'ướt',
					'nước',
					'phòng tắm',
				],
			},
			MASSAGE: {
				label: 'Massage / Spa',
				keywords: [
					'massage',
					'xoa bóp',
					'spa',
					'tinh dầu',
					'dầu nóng',
					'xông hơi',
					'thư giãn',
				],
			},
			TOUCHING_SELF: {
				label: 'Chạm / Vuốt ve',
				keywords: ['sờ', 'vuốt ve', 'chạm', 'tự sờ', 'sờ soạng', 'vuốt'],
			},
			BENDING: {
				label: 'Cúi / Gập người',
				keywords: ['cúi', 'gập', 'cong người', 'cúi người', 'gập người'],
			},
			SPREADING: {
				label: 'Dang / Mở',
				keywords: ['dang', 'mở', 'dang chân', 'dạng', 'banh'],
			},
			SUCKING_LICKING: {
				label: 'Bú / Mút / Liếm',
				keywords: [
					'bú',
					'mút',
					'liếm',
					'ngậm',
					'thổi',
					'dùng lưỡi',
					'đá lưỡi',
					'nút',
				],
			},
		},
	},

	// 4. TƯ THẾ (Position)
	POSITION: {
		name: 'Tư thế',
		emoji: '🧘‍♀️',
		options: {
			TRADITIONAL: {
				label: 'Truyền thống',
				keywords: ['truyền thống', 'bình thường', 'missionary', 'cơ bản'],
			},
			PRONE: {
				label: 'Úp / Sấp',
				keywords: ['úp', 'sấp', 'nằm sấp'],
			},
			SUPINE: {
				label: 'Ngửa',
				keywords: ['ngửa', 'nằm ngửa'],
			},
			LOVE_CHAIR: {
				label: 'Ghế tình yêu',
				keywords: [
					'ghế tình yêu',
					'ghế tantra',
					'ghế tình dục',
					'ghế đặc biệt',
				],
			},
			DOGGY: {
				label: 'Doggy / Từ sau',
				keywords: ['chổng', 'doggy', 'từ sau'],
			},
			NO_SEX: {
				label: 'Không làm / Tạo dáng',
				keywords: ['tạo dáng', 'thả dáng', 'pose', 'selfie', 'chụp ảnh'],
			},
			RIDING: {
				label: 'Cưỡi / Lên trên',
				keywords: ['cưỡi', 'lên trên', 'ngồi lên', 'ride'],
			},
			ARCHED_BACK: {
				label: 'Võng lưng / Cong lưng',
				keywords: ['võng', 'cong lưng', 'lưng cong', 'võng lưng', 'lưng võng'],
			},
			ORAL_MODE: {
				label: 'Oral / 69',
				keywords: ['69', 'oral', 'thổi kèn', 'bú liếm', 'oral sex'],
			},
		},
	},

	// 4. TIÊU ĐIỂM & GÓC NHÌN (Focus, Angle)
	FOCUS: {
		name: 'Tiêu điểm & Góc nhìn',
		emoji: '🎯',
		options: {
			FULL_BODY: {
				label: 'Toàn thân',
				keywords: [
					'toàn thân',
					'dáng',
					'body',
					'xa',
					'bao quát',
					'view',
					'cơ thể',
					'thân',
					'cơ',
					'trắng',
					'mịn',
					'nuột',
				],
			},
			UPPER_BODY: {
				label: 'Nửa trên (Mặt/Ngực)',
				keywords: [
					'mặt',
					'ngực',
					'vòng 1',
					'vai',
					'cổ',
					'môi',
					'mắt',
					'hôn',
					'vòng',
					'mọng',
					'tay',
				],
			},
			LOWER_BODY: {
				label: 'Nửa dưới (Mông/Chân)',
				keywords: [
					'mông',
					'vòng 3',
					'chân',
					'đùi',
					'eo',
					'squat',
					'ngồi xổm',
					'dưới lên',
				],
			},
			BACK_VIEW: {
				label: 'Phía sau (Lưng/Mông)',
				keywords: [
					'phía sau',
					'lưng',
					'quay lưng',
					'back view',
					'cong',
					'đường cong',
				],
			},
			CLOSEUP_POV: {
				label: 'Cận cảnh / POV',
				keywords: [
					'cận',
					'cận cảnh',
					'zoom',
					'chi tiết',
					'ngôi thứ nhất',
					'nhìn xuống',
					'gần',
					'góc',
				],
			},
			CLEAVAGE: {
				label: 'Rãnh ngực / Khe ngực',
				keywords: ['rãnh ngực', 'khe ngực', 'ngực tràn', 'rãnh', 'khe'],
			},
			WAIST: {
				label: 'Vòng eo / Bụng',
				keywords: ['eo', 'eo thon', 'vòng eo', 'bụng', 'bụng phẳng'],
			},
			CURVES: {
				label: 'Đường cong / Chữ S',
				keywords: ['đường cong', 'cong', 'chữ S', 'curves', 'đồng hồ cát'],
			},
		},
	},

	// 5. ĐỊA ĐIỂM (Location)
	LOCATION: {
		name: 'Địa điểm',
		emoji: '📍',
		options: {
			BEDROOM: {
				label: 'Phòng ngủ / Giường',
				keywords: [
					'phòng ngủ',
					'giường',
					'gối',
					'chăn',
					'nệm',
					'ngủ',
					'đèn ngủ',
				],
			},
			LIVING_ROOM: {
				label: 'Phòng khách / Sofa',
				keywords: ['sofa', 'phòng khách', 'tivi', 'thảm', 'ghế sofa'],
			},
			KITCHEN: {
				label: 'Bếp / Bàn ăn',
				keywords: ['bếp', 'nấu ăn', 'bàn ăn', 'tủ lạnh', 'đảo bếp', 'tạp dề'],
			},
			BATHROOM: {
				label: 'Nhà tắm / Phòng tắm',
				keywords: ['tắm', 'phòng tắm', 'bồn tắm', 'vòi sen', 'ướt', 'lavabo'],
			},
			MIRROR: {
				label: 'Trước gương',
				keywords: ['gương', 'soi', 'phản chiếu', 'trước gương'],
			},
			HOME_GENERAL: {
				label: 'Nhà / Phòng khách',
				keywords: [
					'nhà',
					'phòng',
					'trong nhà',
					'tại gia',
					'riêng tư',
					'sofa',
					'bếp',
				],
			},
			OFFICE: {
				label: 'Văn phòng / Cơ quan',
				keywords: ['văn phòng', 'công sở', 'bàn làm việc', 'sơ mi', 'thư ký'],
			},
			GYM: {
				label: 'Gym / Phòng tập',
				keywords: ['gym', 'phòng tập', 'tập'],
			},
			PUBLIC: {
				label: 'Công cộng / Ngoài trời',
				keywords: ['ngoài trời', 'công viên', 'phố', 'karaoke'],
			},
			STREET: {
				label: 'Ngoài đường / Phố',
				keywords: ['phố', 'đường', 'công viên', 'vỉa hè', 'hẻm', 'dạo phố'],
			},
			CAR: {
				label: 'Xe hơi / Ô tô',
				keywords: ['xe', 'ô tô', 'car', 'ghế phụ', 'lái xe', 'xế hộp'],
			},
			CLUB_BAR: {
				label: 'Bar / Club / Pub',
				keywords: ['bar', 'club', 'pub', 'vũ trường', 'quẩy', 'lên bar'],
			},
			POOL: {
				label: 'Hồ bơi / Bể bơi',
				keywords: ['hồ bơi', 'bể bơi', 'pool', 'bơi', 'thành hồ'],
			},
			BALCONY: {
				label: 'Ban công / Sân thượng',
				keywords: ['ban công', 'sân thượng', 'lan can', 'cửa sổ', 'view'],
			},
			STAIRS: {
				label: 'Cầu thang',
				keywords: ['cầu thang', 'bậc thang', 'tay vịn'],
			},
			NATURE: {
				label: 'Thiên nhiên (Biển/Hồ)',
				keywords: [
					'biển',
					'hồ bơi',
					'bãi biển',
					'sân thượng',
					'vườn',
					'cây',
					'nắng',
					'rừng',
				],
			},
			LUXURY: {
				label: 'Sang trọng (Hotel/Car)',
				keywords: [
					'khách sạn',
					'hotel',
					'resort',
					'villa',
					'xe',
					'ô tô',
					'car',
					'spa',
					'sang',
					'khách',
					'sạn',
				],
			},
		},
	},

	// 6. THỜI GIAN (Time)
	TIME: {
		name: 'Thời gian',
		emoji: '⏰',
		options: {
			DAY: {
				label: 'Ban ngày / Sáng',
				keywords: ['ngày', 'nắng', 'sáng', 'trưa', 'bình minh', 'chiều'],
			},
			NIGHT: {
				label: 'Ban đêm / Tối',
				keywords: ['đêm', 'khuya', 'tối', 'đèn', 'hoàng hôn', 'midnight'],
			},
		},
	},

	// 7. SỐ NGƯỜI (People)
	PEOPLE: {
		name: 'Số người',
		emoji: '👥',
		options: {
			SOLO: {
				label: 'Một mình (Solo)',
				keywords: ['em', 'một mình', 'solo', 'selfie', 'tự'],
			},
			COUPLE: {
				label: 'Cặp đôi',
				keywords: [
					'anh và em',
					'cặp đôi',
					'hai đứa',
					'bạn trai',
					'người yêu',
					'couple',
					'đôi',
					'cặp',
				],
			},
			GROUP: {
				label: 'Nhóm / Nhiều người',
				keywords: ['nhóm', 'hội', 'chị em', 'nhiều người', 'bạn bè'],
			},
			ONE_F_MANY_M: {
				label: '1 nữ nhiều nam',
				keywords: [
					'1 em',
					'một em',
					'một mình em',
					'nhiều anh nè',
					'mấy anh nè',
					'các anh nè',
					'em chiều hết',
				],
			},
			ONE_M_MANY_F: {
				label: '1 nam nhiều nữ',
				keywords: [
					'1 anh nè',
					'một anh nè',
					'anh một mình',
					'nhiều em',
					'mấy em',
					'các em',
					'hội các em',
					'bọn em',
				],
			},
			GIRLS_ONLY: {
				label: 'Nhiều nữ (không nam)',
				keywords: [
					'chị em',
					'hội chị em',
					'các chị',
					'nhóm nữ',
					'team nữ',
					'bạn nữ',
				],
			},
		},
	},

	// 8. TÓC (Hair)
	HAIR: {
		name: 'Kiểu tóc',
		emoji: '💇',
		options: {
			SHORT: {
				label: 'Tóc ngắn',
				keywords: ['tóc ngắn', 'cá tính', 'tóc'],
			},
			LONG: {
				label: 'Tóc dài',
				keywords: ['tóc dài', 'thướt tha', 'suôn', 'xõa'],
			},
			TIED: {
				label: 'Cột / Búi',
				keywords: ['buộc', 'đuôi ngựa', 'búi', 'cột'],
			},
			DYED: {
				label: 'Nhuộm màu',
				keywords: ['nhuộm', 'màu', 'bạch kim', 'hồng', 'đỏ', 'tây'],
			},
			VERY_LONG: {
				label: 'Tóc rất dài / Siêu dài',
				keywords: [
					'tóc rất dài',
					'tóc siêu dài',
					'tóc chấm mông',
					'tóc dài qua lưng',
					'tóc dài miên man',
				],
			},
			WET_HAIR: {
				label: 'Tóc ướt',
				keywords: ['tóc ướt', 'tóc rũ', 'tóc dính', 'tóc ẩm'],
			},
		},
	},
};
