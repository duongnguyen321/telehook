/**
 * Category-based content filtering and sentence generation
 *
 * NGUYÊN TẮC TỪ KHÓA TỰ NHIÊN:
 * - CONTEXT: Trạng ngữ chỉ hoàn cảnh ("Tranh thủ lúc nghỉ trưa")
 * - ROLE: Danh từ chỉ vai trò ("cô giáo", "thư ký")
 * - EMOTION: Tính từ/Động từ chỉ thái độ ("e thẹn", "chủ động")
 * - OUTFIT: Danh từ trang phục ("váy ngắn", "bikini")
 * - ACTIVITY: Động từ hành động ("đang tạo dáng", "lén lút quay")
 * - LOCATION: Giới từ + Địa điểm ("trong văn phòng", "trên bàn làm việc")
 * - FOCUS: Danh từ bộ phận ("đôi chân", "vòng 1")
 * - THEME: Tính từ mô tả phong cách ("gợi cảm", "ngọt ngào")
 * - PEOPLE: Đối tượng hướng đến ("cho anh", "gửi người yêu")
 */

export const CATEGORIES = {
	// 1. BỐI CẢNH (Mới) - Mở đầu câu chuyện
	CONTEXT: {
		name: 'Bối cảnh',
		emoji: '🎬',
		options: {
			BREAK_TIME: {
				label: 'Tranh thủ',
				keywords: [
					'tranh thủ lúc nghỉ trưa',
					'tranh thủ giờ giải lao',
					'tranh thủ sếp vắng',
					'tranh thủ lúc vắng người',
				],
			},
			HOME_ALONE: {
				label: 'Ở nhà một mình',
				keywords: [
					'ở nhà một mình',
					'khi nhà không có ai',
					'tự do một mình',
					'rảnh rỗi ở nhà',
				],
			},
			LATE_NIGHT: {
				label: 'Đêm khuya',
				keywords: [
					'đêm khuya thanh vắng',
					'nửa đêm khó ngủ',
					'đêm nay buồn chán',
					'tối muộn cô đơn',
				],
			},
			SECRET: {
				label: 'Bí mật/Lén lút',
				keywords: [
					'lén lút',
					'bí mật',
					'giấu kín',
					'không để ai biết',
					'âm thầm',
				],
			},
			JUST_BATHED: {
				label: 'Vừa tắm xong',
				keywords: [
					'vừa tắm xong',
					'người còn ướt',
					'vừa bước ra từ phòng tắm',
					'cơ thể còn ẩm ướt',
				],
			},
			DRUNK: {
				label: 'Say/Chill',
				keywords: [
					'hơi men trong người',
					'đang chill',
					'hơi say một chút',
					'trong cơn say',
				],
			},
			MORNING: {
				label: 'Sáng sớm',
				keywords: [
					'sáng sớm tinh mơ',
					'vừa ngủ dậy',
					'chào ngày mới',
					'bình minh trên giường',
				],
			},
		},
	},

	// 2. CẢM XÚC (Mới) - Thái độ của nhân vật
	EMOTION: {
		name: 'Cảm xúc',
		emoji: '🥰',
		options: {
			SHY: {
				label: 'Ngại ngùng',
				keywords: ['ngại ngùng', 'e thẹn', 'mắc cỡ', 'lúng túng', 'hay mắc cỡ'],
			},
			BOLD: {
				label: 'Táo bạo',
				keywords: ['mạnh dạn', 'táo bạo', 'chủ động', 'bất chấp', 'thẳng thắn'],
			},
			NAUGHTY: {
				label: 'Hư hỏng',
				keywords: [
					'hư hỏng',
					'nghịch ngợm',
					'quậy phá',
					'thích trêu chọc',
					'hư đốn',
				],
			},
			SWEET: {
				label: 'Ngọt ngào/Nũng nịu',
				keywords: [
					'nũng nịu',
					'ngoan ngoãn',
					'vâng lời',
					'ngọt ngào',
					'dễ thương',
				],
			},
			HORNY: {
				label: 'Kích thích',
				keywords: [
					'nứng',
					'hứng',
					'kích thích',
					'rạo rực',
					'nóng trong người',
					'khao khát',
				],
			},
			CONFIDENT: {
				label: 'Tự tin',
				keywords: ['tự tin', 'kiêu hãnh', 'biết mình đẹp', 'chảnh chọe'],
			},
		},
	},

	// 3. VAI TRÒ
	ROLE: {
		name: 'Vai trò',
		emoji: '🎭',
		options: {
			TEACHER: {
				label: 'Cô giáo',
				keywords: [
					'cô giáo',
					'giáo viên chủ nhiệm',
					'cô giáo trẻ',
					'giảng viên',
				],
			},
			STUDENT: {
				label: 'Nữ sinh',
				keywords: [
					'cô nhóc học sinh',
					'nữ sinh ngây thơ',
					'sinh viên năm nhất',
					'bạn học cùng bàn',
				],
			},
			NURSE: {
				label: 'Y tá',
				keywords: ['cô y tá', 'nữ bác sĩ', 'điều dưỡng viên'],
			},
			SECRETARY: {
				label: 'Thư ký',
				keywords: ['nữ thư ký', 'trợ lý giám đốc', 'cô nhân viên mới'],
			},
			MAID: {
				label: 'Hầu gái',
				keywords: ['cô hầu gái', 'người giúp việc', 'ô sin gợi cảm'],
			},
			OFFICE: {
				label: 'Công sở',
				keywords: ['dân văn phòng', 'chị đồng nghiệp', 'trưởng phòng'],
			},
			KTV: {
				label: 'KTV',
				keywords: ['em gái hát karaoke', 'nhân viên tiếp thị', 'tay vịn'],
			},
			GYMER: {
				label: 'Gymer',
				keywords: ['huấn luyện viên yoga', 'cô nàng gym', 'PT cá nhân'],
			},
			RICH_KID: {
				label: 'Tiểu thư',
				keywords: ['tiểu thư đài các', 'con gái sếp', 'cô chủ nhỏ'],
			},
			EX_GIRLFRIEND: {
				label: 'Người yêu cũ',
				keywords: ['người yêu cũ', 'tình cũ', 'bạn gái cũ'],
			},
			NEIGHBOR: {
				label: 'Hàng xóm',
				keywords: ['cô hàng xóm', 'em gái nhà bên', 'chị hàng xóm'],
			},
		},
	},

	// 4. TRANG PHỤC
	OUTFIT: {
		name: 'Trang phục',
		emoji: '👗',
		options: {
			BIKINI: {
				label: 'Bikini',
				keywords: ['đồ bơi hai mảnh', 'bikini dây', 'áo tắm gợi cảm'],
			},
			LINGERIE: {
				label: 'Nội y',
				keywords: [
					'bộ nội y ren',
					'đồ lót xuyên thấu',
					'chiếc quần lọt khe',
					'váy ngủ mỏng manh',
				],
			},
			AO_DAI: {
				label: 'Áo dài',
				keywords: [
					'áo dài trắng tinh khôi',
					'áo dài mỏng tang',
					'chiếc yếm đào',
				],
			},
			OFFICE_WEAR: {
				label: 'Công sở',
				keywords: [
					'sơ mi trắng bó sát',
					'chân váy bút chì',
					'quần tất đen',
					'giày cao gót',
				],
			},
			GYM_WEAR: {
				label: 'Đồ tập',
				keywords: ['bộ đồ tập bó sát', 'quần legging', 'áo bra thể thao'],
			},
			STREET: {
				label: 'Dạo phố',
				keywords: [
					'chiếc váy ngắn cũn',
					'quần short jeans',
					'áo hai dây trễ nải',
				],
			},
			COSPLAY: {
				label: 'Cosplay',
				keywords: ['bộ đồ cosplay', 'trang phục hầu gái', 'đồ thỏ sexy'],
			},
			NO_CLOTHES: {
				label: 'Không mặc',
				keywords: [
					'không mảnh vải che thân',
					'nguyên trạng tự nhiên',
					'hoàn toàn trần trụi',
				],
			},
			TOWEL: {
				label: 'Khăn tắm',
				keywords: [
					'chỉ quấn khăn tắm',
					'chiếc áo choàng tắm',
					'khăn tắm hững hờ',
				],
			},
		},
	},

	// 5. HOẠT ĐỘNG
	ACTIVITY: {
		name: 'Hoạt động',
		emoji: '🎬',
		options: {
			POSING: {
				label: 'Tạo dáng',
				keywords: [
					'đang uốn người tạo dáng',
					'cố tình tạo dáng',
					'đứng trước ống kính',
				],
			},
			DANCING: {
				label: 'Nhảy',
				keywords: [
					'đang lắc hông theo nhạc',
					'nhảy sexy dance',
					'uốn éo theo điệu nhạc',
				],
			},
			RELAXING: {
				label: 'Thư giãn',
				keywords: ['nằm dài thư giãn', 'ngồi nghỉ ngơi', 'nằm lười biếng'],
			},
			WORKING: {
				label: 'Làm việc',
				keywords: ['đang gõ máy tính', 'đang dọn dẹp', 'đang tưới cây'],
			},
			EXERCISING: {
				label: 'Tập luyện',
				keywords: ['đang tập squat', 'đang tập yoga', 'đang chạy bộ'],
			},
			SHOWING_OFF: {
				label: 'Khoe hàng',
				keywords: [
					'cố tình khoe',
					'vạch áo cho xem',
					'kéo váy xuống',
					'vén áo lên',
				],
			},
			TOUCHING: {
				label: 'Đụng chạm',
				keywords: ['tự vuốt ve cơ thể', 'luồn tay vào trong', 'xoa nắn'],
			},
			TEASING: {
				label: 'Khiêu khích',
				keywords: [
					'liếm môi gợi tình',
					'cắn nhẹ môi',
					'nháy mắt đưa tình',
					'nhìn chằm chằm',
				],
			},
			BATHING: {
				label: 'Tắm',
				keywords: ['đang tắm vòi sen', 'ngâm mình trong bồn', 'kỳ cọ cơ thể'],
			},
			CHANGING: {
				label: 'Thay đồ',
				keywords: ['đang thay đồ', 'đang kéo khóa áo', 'vừa cởi bỏ xiêm y'],
			},
		},
	},

	// 6. ĐỊA ĐIỂM
	LOCATION: {
		name: 'Địa điểm',
		emoji: '📍',
		options: {
			BEDROOM: {
				label: 'Phòng ngủ',
				keywords: [
					'ngay trên giường ngủ',
					'trong phòng ngủ kín đáo',
					'dưới ánh đèn ngủ mờ ảo',
				],
			},
			LIVING_ROOM: {
				label: 'Phòng khách',
				keywords: [
					'trên ghế sofa phòng khách',
					'ngay tại phòng khách',
					'trước tivi',
				],
			},
			KITCHEN: {
				label: 'Nhà bếp',
				keywords: ['ngay trên bàn bếp', 'trong gian bếp', 'cạnh tủ lạnh'],
			},
			BATHROOM: {
				label: 'Phòng tắm',
				keywords: [
					'trong phòng tắm ướt át',
					'dưới vòi hoa sen',
					'trong bồn tắm đầy bọt',
				],
			},
			OFFICE: {
				label: 'Văn phòng',
				keywords: [
					'ngay tại văn phòng',
					'trên bàn làm việc của sếp',
					'trong phòng họp',
				],
			},
			PUBLIC: {
				label: 'Công cộng',
				keywords: [
					'trong nhà vệ sinh công cộng',
					'trong rạp chiếu phim',
					'trên xe bus',
					'trong thang máy',
				],
			},
			OUTDOOR: {
				label: 'Ngoài trời',
				keywords: [
					'ngoài công viên vắng',
					'trên sân thượng lộng gió',
					'ngoài ban công',
				],
			},
			CAR: {
				label: 'Trong xe',
				keywords: [
					'trong xe hơi chật chội',
					'trên ghế sau ô tô',
					'trong hầm gửi xe',
				],
			},
			STAIRS: {
				label: 'Cầu thang',
				keywords: [
					'nơi góc cầu thang tối',
					'trên bậc cầu thang',
					'khoảng chiếu nghỉ',
				],
			},
		},
	},

	// 7. TIÊU ĐIỂM / ĐIỂM NHẤN
	FOCUS: {
		name: 'Điểm nhấn',
		emoji: '🎯',
		options: {
			CHEST: {
				label: 'Ngực',
				keywords: [
					'đôi gò bồng đảo',
					'khe ngực sâu hun hút',
					'vòng 1 căng tràn sức sống',
					'nhũ hoa lấp ló',
				],
			},
			BUTT: {
				label: 'Mông',
				keywords: [
					'vòng 3 căng tròn',
					'bờ mông cong vút',
					'cặp mông nảy nở',
					'đường cong vòng 3',
				],
			},
			LEGS: {
				label: 'Chân',
				keywords: [
					'đôi chân dài miên man',
					'cặp đùi mật ong',
					'bắp đùi thon gọn',
					'bàn chân xinh',
				],
			},
			WAIST: {
				label: 'Eo',
				keywords: [
					'vòng eo con kiến',
					'chiếc eo thon',
					'cơ bụng số 11',
					'rãnh bụng quyến rũ',
				],
			},
			BACK: {
				label: 'Lưng',
				keywords: [
					'tấm lưng trần gợi cảm',
					'võng lưng quyến rũ',
					'rãnh lưng sâu',
				],
			},
			LIPS: {
				label: 'Môi',
				keywords: [
					'đôi môi căng mọng',
					'bờ môi ướt át',
					'chiếc lưỡi tinh nghịch',
				],
			},
			SKIN: {
				label: 'Da',
				keywords: ['làn da trắng sứ', 'làn da mịn màng', 'da thịt thơm tho'],
			},
			GENERAL: {
				label: 'Tổng thể',
				keywords: [
					'đường cong chữ S',
					'ba vòng chuẩn chỉnh',
					'thân hình đồng hồ cát',
				],
			},
		},
	},

	// 8. CHỦ ĐỀ / PHONG CÁCH
	THEME: {
		name: 'Chủ đề',
		emoji: '✨',
		options: {
			HOT: {
				label: 'Nóng bỏng',
				keywords: [
					'cực kỳ nóng bỏng',
					'thiêu đốt ánh nhìn',
					'bốc lửa',
					'rạo rực',
				],
			},
			SWEET: {
				label: 'Ngọt ngào',
				keywords: [
					'ngọt như kẹo',
					'đáng yêu hết nấc',
					'như thiên thần',
					'baby',
				],
			},
			DARK: {
				label: 'Huyền bí',
				keywords: ['đầy bí ẩn', 'ma mị', 'quyến rũ chết người', 'nguy hiểm'],
			},
			REALISTIC: {
				label: 'Thực tế',
				keywords: ['chân thực', 'không che đậy', 'mộc mạc', 'nguyên bản'],
			},
			HARDCORE: {
				label: 'Mạnh bạo',
				keywords: ['dữ dội', 'mạnh bạo', 'điên cuồng', 'thú tính'],
			},
			SUBMISSIVE: {
				label: 'Phục tùng',
				keywords: [
					'ngoan ngoãn',
					'chịu đựng',
					'phục tùng tuyệt đối',
					'làm nô lệ',
				],
			},
		},
	},

	// 9. ĐỐI TƯỢNG
	PEOPLE: {
		name: 'Đối tượng',
		emoji: '👥',
		options: {
			BOYFRIEND: {
				label: 'Bạn trai/Chồng',
				keywords: [
					'dành riêng cho anh xã',
					'tặng chồng yêu',
					'gửi người yêu',
					'cho anh yêu',
				],
			},
			STRANGER: {
				label: 'Người lạ',
				keywords: ['cho người lạ ơi', 'ai đó xem được', 'người qua đường'],
			},
			FAN: {
				label: 'Fan',
				keywords: ['tặng fan cứng', 'chiêu đãi fan', 'quà cho người hâm mộ'],
			},
			SOMEONE: {
				label: 'Ai đó',
				keywords: ['bất kỳ ai', 'anh nào may mắn', 'người đàn ông của em'],
			},
		},
	},
};
