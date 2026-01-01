/**
 * Category-based content filtering and sentence generation
 * MERGED VERSION: DIVERSE CONTENT + SEO OPTIMIZED
 */

export const CATEGORIES = {
	// 1. BỐI CẢNH
	CONTEXT: {
		name: 'Bối cảnh',
		emoji: '🎬',
		singleChoice: true,
		options: {
			BREAK_TIME: {
				label: 'Tranh thủ',
				keywords: [
					'tranh thủ lúc nghỉ trưa',
					'tranh thủ giờ giải lao',
					'lợi dụng lúc vắng người',
					'tranh thủ sếp đi vắng',
				],
				hashtags: ['#nghitrua', '#breaktime', '#tranhthu'],
			},
			HOME_ALONE: {
				label: 'Ở nhà một mình',
				keywords: [
					'khi nhà không có ai',
					'tự do một mình',
					'ở nhà một mình chán quá',
				],
				hashtags: ['#onha', '#motminh', '#alone'],
			},
			LATE_NIGHT: {
				label: 'Đêm khuya',
				keywords: [
					'đêm khuya thanh vắng',
					'nửa đêm khó ngủ',
					'tối muộn cô đơn',
				],
				hashtags: ['#demkhuya', '#midnight', '#bored'],
			},
			SECRET: {
				label: 'Bí mật/Lén lút',
				keywords: ['lén lút', 'bí mật', 'không để ai biết', 'âm thầm quay'],
				hashtags: ['#bimat', '#lenlut', '#riengtu'],
			},
			JUST_BATHED: {
				label: 'Vừa tắm xong',
				keywords: ['vừa tắm xong', 'người còn ướt', 'vừa bước ra từ phòng tắm'],
				hashtags: ['#tamxong', '#fresh', '#shower'],
			},
			DRUNK: {
				label: 'Say/Chill',
				keywords: [
					'hơi men trong người',
					'đang chill một chút',
					'trong cơn say',
				],
				hashtags: ['#say', '#chill', '#relaxing'],
			},
			MORNING: {
				label: 'Sáng sớm',
				keywords: ['sáng sớm tinh mơ', 'vừa ngủ dậy', 'chào ngày mới'],
				hashtags: ['#buoisang', '#morning', '#wakeup'],
			},
		},
	},

	// 2. CẢM XÚC
	EMOTION: {
		name: 'Cảm xúc',
		emoji: '🥰',
		singleChoice: true,
		options: {
			SHY: {
				label: 'Ngại ngùng',
				keywords: ['ngại ngùng', 'e thẹn', 'mắc cỡ', 'lúng túng che đậy'],
				hashtags: ['#shy', '#ngaingung', '#baby'],
			},
			NAUGHTY: {
				label: 'Hư hỏng',
				keywords: ['hư hỏng', 'nghịch ngợm', 'thích trêu chọc'],
				hashtags: ['#naughty', '#huhong'],
			},
			SWEET: {
				label: 'Ngọt ngào',
				keywords: ['nũng nịu', 'ngoan ngoãn', 'ngọt ngào', 'đáng yêu hết nấc'],
				hashtags: ['#sweet', '#ngotngao', '#kawaii'],
			},
			CONFIDENT: {
				label: 'Tự tin/Táo bạo',
				keywords: [
					'tự tin khoe dáng',
					'mạnh dạn show',
					'bất chấp ánh nhìn',
					'táo bạo',
				],
				hashtags: ['#confident', '#tutin', '#bold'],
			},
			HOT: {
				label: 'Nóng bỏng (Hot)',
				keywords: [
					'cực kỳ nóng bỏng',
					'thiêu đốt ánh nhìn',
					'bốc lửa',
					'kích thích',
				],
				hashtags: ['#hot', '#nongbong', '#fire', '#goicam'],
			},
			COSPLAY: {
				label: 'Cosplay',
				keywords: ['hóa thân nhân vật', 'cosplay gợi cảm', 'đậm chất anime'],
				hashtags: ['#cosplay', '#anime', '#costume'],
			},
		},
	},

	// 3. VAI TRÒ (Đầy đủ + Tối ưu từ khóa)
	ROLE: {
		name: 'Vai trò',
		emoji: '🎭',
		singleChoice: true,
		options: {
			TEACHER: {
				label: 'Cô giáo',
				keywords: ['cô giáo gợi cảm', 'giáo viên chủ nhiệm', 'cô giáo trẻ'],
				hashtags: ['#cogiao', '#teacher'],
			},
			STUDENT: {
				label: 'Nữ sinh',
				keywords: [
					'cô nhóc học sinh',
					'nữ sinh ngây thơ',
					'sinh viên năm nhất',
				],
				hashtags: ['#nusinh', '#hocsinh', '#student'],
			},
			NURSE: {
				label: 'Y tá',
				keywords: ['cô y tá', 'nữ bác sĩ', 'điều dưỡng viên'],
				hashtags: ['#yta', '#nurse', '#bacsi'],
			},
			MAID: {
				label: 'Hầu gái',
				keywords: ['cô hầu gái', 'người giúp việc', 'maid'],
				hashtags: ['#haugai', '#maid', '#cosplay'],
			},
			OFFICE: {
				label: 'Công sở/Thư ký',
				keywords: [
					'em gái văn phòng',
					'nữ thư ký',
					'cô nhân viên mới',
					'chị trưởng phòng',
				],
				hashtags: ['#congso', '#vanphong', '#office', '#thuky'],
			},
			GYMER: {
				label: 'Gymer',
				keywords: ['huấn luyện viên yoga', 'cô nàng gym', 'PT cá nhân'],
				hashtags: ['#gym', '#fitness', '#yoga'],
			},
			RICH_KID: {
				label: 'Tiểu thư',
				keywords: ['tiểu thư đài các', 'cô chủ nhỏ'],
				hashtags: ['#richkid', '#sangchanh'],
			},
			GIRLFRIEND: {
				label: 'Người yêu',
				keywords: ['người yêu bé nhỏ', 'em yêu', 'bạn gái ngoan'],
				hashtags: ['#girlfriend', '#nguoiyeu', '#baby'],
			},
			NEIGHBOR: {
				label: 'Hàng xóm',
				keywords: ['cô hàng xóm', 'em gái nhà bên'],
				hashtags: ['#hangxom', '#neighbor'],
			},
		},
	},

	// 4. TRANG PHỤC (Đầy đủ + Thêm Jean/Legging HOT)
	OUTFIT: {
		name: 'Trang phục',
		emoji: '👗',
		singleChoice: true,
		options: {
			// --- NHÓM HOT TREND (Ưu tiên) ---
			JEAN_SHORT: {
				label: 'Jean ngắn (HOT)',
				keywords: [
					'quần jean siêu ngắn',
					'chiếc quần jean đùi',
					'quần short viền bó sát',
					'quần bò ngắn cũn',
				],
				hashtags: ['#jeanngan', '#shortjeans', '#quanbo', '#short'],
			},
			LEGGING: {
				label: 'Legging/Đồ tập (HOT)',
				keywords: [
					'quần legging bó sát',
					'bộ đồ tập bó chẽn',
					'quần yoga tôn mông',
				],
				hashtags: ['#legging', '#gymwear', '#bocdang', '#yogapants'],
			},
			// --- NHÓM ĐA DẠNG ---
			BIKINI: {
				label: 'Bikini',
				keywords: ['đồ bơi hai mảnh', 'bikini dây', 'áo tắm gợi cảm'],
				hashtags: ['#bikini', '#doboi', '#summer'],
			},
			LINGERIE: {
				label: 'Nội y/Váy ngủ',
				keywords: ['bộ nội y ren', 'váy ngủ mỏng manh', 'đồ lót xuyên thấu'],
				hashtags: ['#lingerie', '#noiy', '#sexy', '#vayngu'],
			},
			AO_DAI: {
				label: 'Áo dài',
				keywords: ['áo dài trắng tinh khôi', 'áo dài mỏng tang'],
				hashtags: ['#aodai', '#vietnam'],
			},
			OFFICE_WEAR: {
				label: 'Đồ Công sở',
				keywords: [
					'sơ mi trắng bó sát',
					'chân váy bút chì',
					'váy công sở ngắn',
					'quần tất đen',
				],
				hashtags: ['#somi', '#congso', '#vaybutchi', '#office'],
			},
			STREET: {
				label: 'Dạo phố/Váy ngắn',
				keywords: [
					'chiếc váy ngắn cũn',
					'áo hai dây trễ nải',
					'váy xếp ly ngắn',
				],
				hashtags: ['#streetstyle', '#vayngan', '#miniskirt'],
			},
			UNIFORM_COSPLAY: {
				label: 'Đồng phục/Cosplay',
				keywords: [
					'bộ đồng phục học sinh',
					'váy hầu gái',
					'bộ đồ y tá',
					'đồ cosplay',
				],
				hashtags: ['#cosplay', '#uniform', '#dongphuc'],
			},
			TIGHT_DRESS: {
				label: 'Váy bó sát',
				keywords: ['váy body ôm sát', 'đầm bodycon', 'váy bó tôn dáng'],
				hashtags: ['#bodycon', '#vaybo', '#sexy'],
			},
			NO_CLOTHES: {
				label: 'Táo bạo/Ít vải',
				keywords: [
					'trang phục thiếu vải',
					'bộ đồ mát mẻ',
					'nguyên trạng tự nhiên',
				],
				hashtags: ['#nude', '#natural', '#showhang'],
			},
			OVERSIZED_SHIRT: {
				label: 'Áo giấu quần',
				keywords: [
					'áo phông rộng giấu quần',
					'sơ mi rộng thùng thình',
					'mốt giấu quần',
				],
				hashtags: ['#oversized', '#giauquan'],
			},
		},
	},

	// 5. HOẠT ĐỘNG
	ACTIVITY: {
		name: 'Hoạt động',
		emoji: '🎬',
		options: {
			DANCING: {
				label: 'Nhảy',
				keywords: [
					'đang lắc hông theo nhạc',
					'nhảy sexy dance',
					'uốn éo theo điệu nhạc',
				],
				hashtags: ['#dance', '#nhay', '#tiktokdance'],
			},
			RELAXING: {
				label: 'Thư giãn/Nằm',
				keywords: [
					'nằm dài thư giãn',
					'ngồi nghỉ ngơi',
					'lười biếng trên giường',
				],
				hashtags: ['#relax', '#thugian', '#chill'],
			},
			CHECKING: {
				label: 'Check dáng/Soi gương',
				keywords: [
					'soi gương kiểm tra dáng',
					'check body trước gương',
					'ngắm nghía cơ thể',
				],
				hashtags: ['#bodycheck', '#dangxinh', '#mirror'],
			},
			TEASING: {
				label: 'Khiêu khích/Khoe',
				keywords: [
					'cố tình khoe',
					'vén áo lên',
					'tạo dáng gợi tình',
					'nháy mắt đưa tình',
				],
				hashtags: ['#teasing', '#sexy', '#hot', '#khoe'],
			},
			WORKING: {
				label: 'Làm việc',
				keywords: ['đang gõ máy tính', 'đang dọn dẹp', 'đang tập trung làm'],
				hashtags: ['#working', '#lamviec'],
			},
			EXERCISING: {
				label: 'Tập luyện',
				keywords: ['đang tập squat', 'đang tập yoga', 'đang chạy bộ'],
				hashtags: ['#workout', '#gym'],
			},
			SINGING: {
				label: 'Hát',
				keywords: ['hát nhép theo nhạc', 'nghêu ngao hát'],
				hashtags: ['#singing', '#lipsync'],
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
					'trên giường ngủ',
					'trong phòng ngủ kín đáo',
					'góc phòng riêng',
				],
				hashtags: ['#phongngu', '#bedroom', '#giuong'],
			},
			LIVING_ROOM: {
				label: 'Phòng khách',
				keywords: ['trên ghế sofa', 'tại phòng khách'],
				hashtags: ['#phongkhach', '#sofa'],
			},
			BATHROOM: {
				label: 'Phòng tắm',
				keywords: ['trong phòng tắm', 'trước gương nhà tắm'],
				hashtags: ['#phongtam', '#bathroom'],
			},
			OFFICE: {
				label: 'Văn phòng',
				keywords: ['tại văn phòng', 'trên bàn làm việc'],
				hashtags: ['#vanphong', '#office', '#work'],
			},
			OUTDOOR: {
				label: 'Ngoài trời/Ban công',
				keywords: ['ngoài ban công', 'trên sân thượng', 'ngoài trời'],
				hashtags: ['#outdoor', '#nature', '#bancong'],
			},
			STAIRS: {
				label: 'Cầu thang',
				keywords: ['góc cầu thang tối', 'trên bậc cầu thang', 'hành lang'],
				hashtags: ['#cauthang', '#stairs'],
			},
			CAR: {
				label: 'Trong xe',
				keywords: ['trong xe hơi', 'trên ghế sau ô tô'],
				hashtags: ['#xehoi', '#car'],
			},
			GYM: {
				label: 'Phòng gym',
				keywords: ['trong phòng tập', 'phòng gym vắng'],
				hashtags: ['#gym', '#fitness'],
			},
			BAR_KARAOKE: {
				label: 'Bar/Karaoke',
				keywords: ['trong phòng karaoke', 'tại quán bar', 'dưới ánh đèn mờ'],
				hashtags: ['#bar', '#karaoke', '#nightlife'],
			},
		},
	},

	// 7. TIÊU ĐIỂM (Cập nhật từ khóa HOT)
	FOCUS: {
		name: 'Điểm nhấn',
		emoji: '🎯',
		options: {
			BUTT: {
				label: 'Mông (Vòng 3)',
				keywords: [
					'vòng 3 căng tròn',
					'bờ mông quả đào',
					'đường cong vòng 3',
					'cặp mông nảy nở',
				],
				hashtags: ['#vong3', '#booty', '#mong', '#peach'],
			},
			CHEST: {
				label: 'Ngực (Vòng 1)',
				keywords: ['đôi gò bồng đảo', 'khe ngực sâu', 'vòng 1 căng tràn'],
				hashtags: ['#vong1', '#chest', '#sexy'],
			},
			LEGS: {
				label: 'Chân dài',
				keywords: [
					'đôi chân dài miên man',
					'cặp đùi mật ong',
					'bắp đùi thon gọn',
				],
				hashtags: ['#legs', '#chandai', '#thongon'],
			},
			WAIST: {
				label: 'Eo thon',
				keywords: ['vòng eo con kiến', 'cơ bụng số 11', 'eo thon phẳng lì'],
				hashtags: ['#eo', '#waist', '#eothon'],
			},
			BACK: {
				label: 'Lưng/Hõm lưng (HOT)',
				keywords: [
					'tấm lưng trần gợi cảm',
					'hõm lưng quyến rũ',
					'rãnh lưng sâu hun hút',
				],
				hashtags: ['#lung', '#back', '#sexyback'],
			},
			FACE: {
				label: 'Khuôn mặt',
				keywords: [
					'gương mặt xinh đẹp',
					'thần thái cuốn hút',
					'nụ cười tỏa nắng',
				],
				hashtags: ['#face', '#thanhthai', '#guongmat'],
			},
			GENERAL: {
				label: 'Toàn thân',
				keywords: [
					'đường cong chữ S',
					'ba vòng chuẩn chỉnh',
					'thân hình đồng hồ cát',
				],
				hashtags: ['#body', '#figure', '#curves'],
			},
		},
	},

	// 8. KIỂU TÓC
	HAIR: {
		name: 'Kiểu tóc',
		emoji: '💇',
		options: {
			LONG: {
				label: 'Tóc dài',
				keywords: ['tóc dài óng ả', 'mái tóc xõa ngang lưng'],
				hashtags: ['#tocdai', '#longhair'],
			},
			SHORT: {
				label: 'Tóc ngắn',
				keywords: ['tóc ngắn cá tính', 'tóc bob'],
				hashtags: ['#tocngan', '#shorthair'],
			},
			PONYTAIL: {
				label: 'Buộc đuôi ngựa',
				keywords: ['tóc buộc cao', 'đuôi ngựa năng động'],
				hashtags: ['#ponytail', '#tocbuoc'],
			},
			WET: {
				label: 'Tóc ướt',
				keywords: ['tóc ướt bết', 'mái tóc ướt sũng'],
				hashtags: ['#wethair', '#tocuot'],
			},
		},
	},

	// 9. TƯ THẾ (Cập nhật tư thế HOT)
	POSE: {
		name: 'Tư thế',
		emoji: '🧘',
		singleChoice: true,
		options: {
			CROSS_LEGGED: {
				label: 'Khoanh chân (HOT)',
				keywords: [
					'ngồi khoanh chân',
					'ngồi xếp bằng gợi cảm',
					'vắt chân chữ ngũ',
				],
				hashtags: ['#khoanhchan', '#crosslegged', '#dangngoi'],
			},
			SQUATTING: {
				label: 'Ngồi xổm',
				keywords: ['ngồi xổm', 'tư thế squat', 'ngồi chồm hổm'],
				hashtags: ['#squat', '#dangngoi'],
			},
			STANDING: {
				label: 'Đứng',
				keywords: ['đứng tựa cửa', 'đứng xoay lưng', 'tạo dáng đứng'],
				hashtags: ['#dangdung', '#posing'],
			},
			SITTING: {
				label: 'Ngồi ghế/bệt',
				keywords: ['ngồi vắt chéo chân', 'ngồi bệt', 'dáng ngồi'],
				hashtags: ['#dangngoi', '#sitting'],
			},
			LYING: {
				label: 'Nằm',
				keywords: ['nằm ngửa', 'nằm sấp gợi cảm', 'nằm nghiêng'],
				hashtags: ['#nam', '#lying', '#sexy'],
			},
			KNEELING: {
				label: 'Quỳ/Bò',
				keywords: ['quỳ gối', 'chống tay quỳ', 'tư thế bò'],
				hashtags: ['#quy', '#kneeling', '#doggy'],
			},
			BENDING: {
				label: 'Cúi/Khom',
				keywords: ['cúi người', 'khom lưng', 'chổng mông'],
				hashtags: ['#cui', '#bending', '#chongmong'],
			},
			BACK_VIEW: {
				label: 'Quay lưng (HOT)',
				keywords: ['quay lưng lại', 'góc quay phía sau', 'nhìn từ đằng sau'],
				hashtags: ['#backview', '#phiasau'],
			},
		},
	},

	// 10. SỐ NGƯỜI
	PEOPLE: {
		name: 'Số người',
		emoji: '👥',
		singleChoice: true,
		options: {
			SOLO: {
				label: '1 mình',
				keywords: ['', ''],
				hashtags: ['#solo', '#girl'],
			},
			COUPLE: {
				label: 'Cặp đôi',
				keywords: ['cùng anh', 'cặp đôi', 'với người yêu'],
				hashtags: ['#couple', '#lover'],
			},
			GROUP: {
				label: 'Nhiều người',
				keywords: ['cả nhóm', 'hội chị em', 'tập thể'],
				hashtags: ['#group', '#friends'],
			},
		},
	},
};
