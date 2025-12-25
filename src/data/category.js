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
 * - HAIR: Kiểu tóc ("tóc dài", "tóc ướt")
 * - POSE: Tư thế ("ngồi", "quỳ", "nằm")
 */

export const CATEGORIES = {
	// 1. BỐI CẢNH - Mở đầu câu chuyện
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
					'tranh thủ sếp vắng',
					'tranh thủ lúc vắng người',
				],
				hashtags: ['#nghitrua', '#giogiaolao', '#break'],
			},
			HOME_ALONE: {
				label: 'Ở nhà một mình',
				keywords: [
					'ở nhà một mình',
					'khi nhà không có ai',
					'tự do một mình',
					'rảnh rỗi ở nhà',
				],
				hashtags: ['#onha', '#motminh'],
			},
			LATE_NIGHT: {
				label: 'Đêm khuya',
				keywords: [
					'đêm khuya thanh vắng',
					'nửa đêm khó ngủ',
					'đêm nay buồn chán',
					'tối muộn cô đơn',
				],
				hashtags: ['#demkhuya', '#khuya', '#midnight'],
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
				hashtags: ['#bimat', '#lenlut', '#riengtu'],
			},
			JUST_BATHED: {
				label: 'Vừa tắm xong',
				keywords: [
					'vừa tắm xong',
					'người còn ướt',
					'vừa bước ra từ phòng tắm',
					'cơ thể còn ẩm ướt',
				],
				hashtags: ['#tamxong', '#fresh', '#shower'],
			},
			DRUNK: {
				label: 'Say/Chill',
				keywords: [
					'hơi men trong người',
					'đang chill',
					'hơi say một chút',
					'trong cơn say',
				],
				hashtags: ['#say', '#chill', '#relaxing'],
			},
			MORNING: {
				label: 'Sáng sớm',
				keywords: [
					'sáng sớm tinh mơ',
					'vừa ngủ dậy',
					'chào ngày mới',
					'bình minh trên giường',
				],
				hashtags: ['#buoisang', '#goodmorning', '#morning'],
			},
		},
	},

	// 2. CẢM XÚC - Thái độ của nhân vật
	EMOTION: {
		name: 'Cảm xúc',
		emoji: '🥰',
		singleChoice: true,
		options: {
			SHY: {
				label: 'Ngại ngùng',
				keywords: ['ngại ngùng', 'e thẹn', 'mắc cỡ', 'lúng túng', 'hay mắc cỡ'],
				hashtags: ['#shy', '#cute', '#ngaingung'],
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
				hashtags: ['#naughty', '#huhong'],
			},
			SWEET: {
				label: 'Ngọt ngào/Ngoan ngoãn',
				keywords: [
					'nũng nịu',
					'ngoan ngoãn',
					'vâng lời',
					'ngọt ngào',
					'dễ thương',
					'ngọt như kẹo',
					'đáng yêu hết nấc',
					'như thiên thần',
					'baby',
					'chịu đựng',
					'phục tùng tuyệt đối',
					'làm nô lệ',
				],
				hashtags: [
					'#sweet',
					'#cute',
					'#ngotngao',
					'#kawaii',
					'#submissive',
					'#obedient',
				],
			},

			CONFIDENT: {
				label: 'Tự tin/Táo bạo',
				keywords: [
					'tự tin',
					'kiêu hãnh',
					'biết mình đẹp',
					'chảnh chọe',
					'mạnh dạn',
					'táo bạo',
					'chủ động',
					'bất chấp',
					'thẳng thắn',
				],
				hashtags: ['#confident', '#queen', '#boss', '#bold', '#taobao'],
			},
			HOT: {
				label: 'Nóng bỏng/Kích thích',
				keywords: [
					'cực kỳ nóng bỏng',
					'thiêu đốt ánh nhìn',
					'bốc lửa',
					'rạo rực',
					'nứng',
					'hứng',
					'kích thích',
					'nóng trong người',
					'khao khát',
				],
				hashtags: ['#hot', '#nongbong', '#fire', '#horny', '#turned'],
			},
			HARDCORE: {
				label: 'Mạnh bạo',
				keywords: ['dữ dội', 'mạnh bạo', 'điên cuồng', 'thú tính'],
				hashtags: ['#wild', '#intense', '#crazy'],
			},

			COSPLAY: {
				label: 'Cosplay',
				keywords: [
					'phong cách cosplay',
					'hóa thân nhân vật',
					'cosplay gợi cảm',
					'đậm chất anime',
				],
				hashtags: ['#cosplay', '#anime', '#costume'],
			},
		},
	},
	ROLE: {
		name: 'Vai trò',
		emoji: '🎭',
		singleChoice: true,
		options: {
			TEACHER: {
				label: 'Cô giáo',
				keywords: [
					'cô giáo',
					'giáo viên chủ nhiệm',
					'cô giáo trẻ',
					'giảng viên',
				],
				hashtags: ['#cogiao', '#giaovien', '#teacher'],
			},
			STUDENT: {
				label: 'Nữ sinh',
				keywords: [
					'cô nhóc học sinh',
					'nữ sinh ngây thơ',
					'sinh viên năm nhất',
					'bạn học cùng bàn',
				],
				hashtags: ['#nusinh', '#hocsinh', '#student'],
			},
			NURSE: {
				label: 'Y tá',
				keywords: ['cô y tá', 'nữ bác sĩ', 'điều dưỡng viên'],
				hashtags: ['#yta', '#bacsi', '#nurse'],
			},

			MAID: {
				label: 'Hầu gái',
				keywords: ['cô hầu gái', 'người giúp việc', 'ô sin gợi cảm'],
				hashtags: ['#haugai', '#maid', '#girl'],
			},
			OFFICE: {
				label: 'Công sở/Thư ký',
				keywords: [
					'em gái văn phòng',
					'chị đồng nghiệp',
					'chị trưởng phòng',
					'nữ thư ký',
					'trợ lý giám đốc',
					'cô nhân viên mới',
				],
				hashtags: ['#congso', '#vanphong', '#office', '#thuky', '#troly'],
			},
			KTV: {
				label: 'KTV',
				keywords: ['em gái hát karaoke', 'nhân viên tiếp thị', 'tay vịn'],
				hashtags: ['#ktv', '#karaoke', '#tiepvien'],
			},
			GYMER: {
				label: 'Gymer',
				keywords: ['huấn luyện viên yoga', 'cô nàng gym', 'PT cá nhân'],
				hashtags: ['#gym', '#fitness', '#yoga'],
			},
			RICH_KID: {
				label: 'Tiểu thư',
				keywords: ['tiểu thư đài các', 'con gái sếp', 'cô chủ nhỏ'],
				hashtags: ['#richkid', '#tieuthuu', '#girl'],
			},
			GIRLFRIEND: {
				label: 'Người yêu',
				keywords: ['người yêu chiều chuộng', 'em yêu', 'bạn gái nhỏ bé'],
				hashtags: ['#girlfriend', '#nguoiyeu', '#love'],
			},
			EX_GIRLFRIEND: {
				label: 'Người yêu cũ',
				keywords: ['người yêu cũ', 'tình cũ', 'bạn gái cũ'],
				hashtags: ['#exgf', '#tinhcu', '#nguoiyeucu'],
			},
			NEIGHBOR: {
				label: 'Hàng xóm',
				keywords: ['cô hàng xóm', 'em gái nhà bên', 'chị hàng xóm'],
				hashtags: ['#hangxom', '#neighbor', '#girl'],
			},
			MASSAGE: {
				label: 'Gái massage',
				keywords: [
					'em gái massage',
					'cô nhân viên spa',
					'kỹ thuật viên massage',
					'gái xông hơi',
				],
				hashtags: ['#massage', '#spa', '#relax'],
			},
		},
	},

	// 4. TRANG PHỤC
	OUTFIT: {
		name: 'Trang phục',
		emoji: '👗',
		singleChoice: true,
		options: {
			BIKINI: {
				label: 'Bikini',
				keywords: ['đồ bơi hai mảnh', 'bikini dây', 'áo tắm gợi cảm'],
				hashtags: ['#bikini', '#doboi', '#summer'],
			},
			LINGERIE: {
				label: 'Nội y',
				keywords: [
					'bộ nội y ren',
					'đồ lót xuyên thấu',
					'chiếc quần lọt khe',
					'váy ngủ mỏng manh',
				],
				hashtags: ['#lingerie', '#noiy', '#sexy'],
			},
			AO_DAI: {
				label: 'Áo dài',
				keywords: [
					'áo dài trắng tinh khôi',
					'áo dài mỏng tang',
					'chiếc yếm đào',
				],
				hashtags: ['#aodai', '#vietnam', '#art'],
			},
			OFFICE_WEAR: {
				label: 'Đồ Công sở',
				keywords: [
					'sơ mi trắng bó sát',
					'chân váy bút chì',
					'quần tất đen',
					'giày cao gót',
					'váy công sở bó sát',
					'sơ mi hở cúc',
					'đồ thư ký',
					'zuýp ngắn',
				],
				hashtags: [
					'#somi',
					'#vest',
					'#congso',
					'#secretary',
					'#thuky',
					'#office',
				],
			},
			GYM_WEAR: {
				label: 'Đồ tập',
				keywords: ['bộ đồ tập bó sát', 'quần legging', 'áo bra thể thao'],
				hashtags: ['#legging', '#gym', '#fitness'],
			},
			STREET: {
				label: 'Dạo phố',
				keywords: [
					'chiếc váy ngắn cũn',
					'quần short jeans',
					'áo hai dây trễ nải',
				],
				hashtags: ['#streetstyle', '#fashion', '#ootd'],
			},
			NURSE_UNIFORM: {
				label: 'Đồ Y tá',
				keywords: [
					'bộ đồ y tá',
					'áo blouse trắng',
					'trang phục điều dưỡng',
					'váy y tá ngắn',
				],
				hashtags: ['#nurse', '#yta', '#cosplay'],
			},
			STUDENT_UNIFORM: {
				label: 'Đồng phục',
				keywords: [
					'đồng phục học sinh',
					'váy xếp ly',
					'sơ mi trắng thắt nơ',
					'áo dài trắng',
				],
				hashtags: ['#student', '#nusinh', '#schoolgirl'],
			},
			MAID_UNIFORM: {
				label: 'Đồ Hầu gái',
				keywords: [
					'trang phục hầu gái',
					'váy tạp dề',
					'đồ maid',
					'váy hầu gái',
				],
				hashtags: ['#maid', '#haugai', '#cosplay'],
			},
			BUNNY: {
				label: 'Đồ Thỏ',
				keywords: ['đồ thỏ sexy', 'bikini tai thỏ', 'bodysuit thỏ'],
				hashtags: ['#bunny', '#rabbit', '#cosplay'],
			},

			POLICE_UNIFORM: {
				label: 'Đồ Cảnh sát',
				keywords: [
					'trang phục cảnh sát',
					'đồ nữ cảnh sát',
					'quân phục cách điệu',
				],
				hashtags: ['#police', '#canhsat', '#cosplay'],
			},
			NO_CLOTHES: {
				label: 'Không mặc',
				keywords: [
					'không mảnh vải che thân',
					'nguyên trạng tự nhiên',
					'hoàn toàn trần trụi',
				],
				hashtags: ['#nude', '#natural', '#art'],
			},
			TOWEL: {
				label: 'Khăn tắm',
				keywords: [
					'chỉ quấn khăn tắm',
					'chiếc áo choàng tắm',
					'khăn tắm hững hờ',
				],
				hashtags: ['#khantam', '#shower', '#fresh'],
			},
			TIGHT_DRESS: {
				label: 'Váy bó sát',
				keywords: ['váy body ôm sát', 'đầm bodycon', 'váy bó tôn dáng'],
				hashtags: ['#bodycon', '#vaybo', '#sexy'],
			},
			PRINCESS_DRESS: {
				label: 'Váy công chúa',
				keywords: ['váy xòe bồng bềnh', 'đầm công chúa', 'váy trắng tinh khôi'],
				hashtags: ['#princess', '#banhbeo', '#cute'],
			},
			TIGHT_TOP: {
				label: 'Áo bó',
				keywords: ['áo thun bó sát', 'áo croptop ôm', 'áo ba lỗ bó'],
				hashtags: ['#tighttop', '#aobo', '#curves'],
			},
			YOGA_PANTS: {
				label: 'Quần Yoga',
				keywords: ['quần tập bó sát', 'quần yoga tôn mông', 'legging bó'],
				hashtags: ['#yogapants', '#legging', '#peach'],
			},
			OVERSIZED_SHIRT: {
				label: 'Áo giấu quần',
				keywords: [
					'áo phông rộng giấu quần',
					'sơ mi rộng thùng thình',
					'mốt giấu quần',
				],
				hashtags: ['#oversized', '#giauquan', '#cute'],
			},
			MINI_SKIRT: {
				label: 'Váy ngắn',
				keywords: ['chân váy siêu ngắn', 'váy ngắn cũn cỡn', 'váy xếp ly ngắn'],
				hashtags: ['#miniskirt', '#vayngan', '#legs'],
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
				label: 'Thư giãn',
				keywords: ['nằm dài thư giãn', 'ngồi nghỉ ngơi', 'nằm lười biếng'],
				hashtags: ['#relax', '#thugian', '#chill'],
			},
			WORKING: {
				label: 'Làm việc',
				keywords: ['đang gõ máy tính', 'đang dọn dẹp', 'đang tưới cây'],
				hashtags: ['#working', '#lamviec', '#busy'],
			},
			EXERCISING: {
				label: 'Tập luyện',
				keywords: ['đang tập squat', 'đang tập yoga', 'đang chạy bộ'],
				hashtags: ['#workout', '#exercise', '#gym'],
			},

			TOUCHING: {
				label: 'Đụng chạm',
				keywords: ['tự vuốt ve cơ thể', 'luồn tay vào trong', 'xoa nắn'],
				hashtags: ['#sensual', '#touch', '#feel'],
			},
			TEASING: {
				label: 'Khiêu khích',
				keywords: [
					'cố tình khoe',
					'vén áo lên',
					'liếm môi gợi tình',
					'cắn nhẹ môi',
					'nháy mắt đưa tình',
					'nhìn chằm chằm',
					'thách thức',
				],
				hashtags: ['#teasing', '#sexy', '#hot', '#khoe'],
			},
			BATHING: {
				label: 'Tắm',
				keywords: ['đang tắm vòi sen', 'ngâm mình trong bồn', 'kỳ cọ cơ thể'],
				hashtags: ['#shower', '#bath', '#bathing'],
			},
			CHANGING: {
				label: 'Thay đồ',
				keywords: ['đang thay đồ', 'đang kéo khóa áo', 'vừa cởi bỏ xiêm y'],
				hashtags: ['#changing', '#behind', '#dressing'],
			},
			SINGING: {
				label: 'Hát',
				keywords: [
					'đang hát karaoke',
					'cầm mic hát nhép',
					'nghêu ngao ca hát',
					'hát theo nhạc',
				],
				hashtags: ['#singing', '#karaoke', '#hat'],
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
				hashtags: ['#phongngu', '#bedroom', '#giuong'],
			},
			LIVING_ROOM: {
				label: 'Phòng khách',
				keywords: [
					'trên ghế sofa phòng khách',
					'ngay tại phòng khách',
					'trước tivi',
				],
				hashtags: ['#phongkhach', '#sofa', '#home'],
			},
			KITCHEN: {
				label: 'Nhà bếp',
				keywords: ['ngay trên bàn bếp', 'trong gian bếp', 'cạnh tủ lạnh'],
				hashtags: ['#bep', '#kitchen', '#cooking'],
			},
			BATHROOM: {
				label: 'Phòng tắm',
				keywords: [
					'trong phòng tắm ướt át',
					'dưới vòi hoa sen',
					'trong bồn tắm đầy bọt',
				],
				hashtags: ['#phongtam', '#bathroom', '#shower'],
			},
			OFFICE: {
				label: 'Văn phòng',
				keywords: [
					'ngay tại văn phòng',
					'trên bàn làm việc của sếp',
					'trong phòng họp',
				],
				hashtags: ['#vanphong', '#office', '#work'],
			},
			PUBLIC: {
				label: 'Công cộng',
				keywords: [
					'trong nhà vệ sinh công cộng',
					'trong rạp chiếu phim',
					'trên xe bus',
					'trong thang máy',
				],
				hashtags: ['#public', '#outdoor', '#risky'],
			},
			OUTDOOR: {
				label: 'Ngoài trời',
				keywords: [
					'ngoài công viên vắng',
					'trên sân thượng lộng gió',
					'ngoài ban công',
				],
				hashtags: ['#outdoor', '#nature', '#fresh'],
			},
			CAR: {
				label: 'Trong xe',
				keywords: [
					'trong xe hơi chật chội',
					'trên ghế sau ô tô',
					'trong hầm gửi xe',
				],
				hashtags: ['#xehoi', '#car', '#drive'],
			},
			STAIRS: {
				label: 'Cầu thang',
				keywords: [
					'nơi góc cầu thang tối',
					'trên bậc cầu thang',
					'khoảng chiếu nghỉ',
				],
				hashtags: ['#cauthang', '#stairs', '#secret'],
			},
			HOTEL: {
				label: 'Khách sạn',
				keywords: [
					'trong phòng khách sạn',
					'trên giường khách sạn',
					'ở resort sang chảnh',
				],
				hashtags: ['#hotel', '#resort', '#sangchanh'],
			},
			POOL: {
				label: 'Hồ bơi',
				keywords: ['bên bể bơi', 'trong hồ bơi', 'cạnh bể jacuzzi'],
				hashtags: ['#pool', '#hoboi', '#summer'],
			},
			GYM: {
				label: 'Phòng gym',
				keywords: ['trong phòng tập', 'trên máy chạy bộ', 'phòng gym vắng'],
				hashtags: ['#gym', '#fitness', '#workout'],
			},
			BEACH: {
				label: 'Bãi biển',
				keywords: ['trên bãi biển', 'ven biển hoang vắng', 'cạnh sóng biển'],
				hashtags: ['#beach', '#bien', '#summer'],
			},
			MIRROR: {
				label: 'Trước gương',
				keywords: [
					'trước gương soi',
					'selfie trước gương',
					'trong phòng thử đồ',
				],
				hashtags: ['#mirror', '#selfie', '#ootd'],
			},
			KARAOKE: {
				label: 'Karaoke',
				keywords: [
					'trong phòng karaoke',
					'tại quán karaoke',
					'dưới ánh đèn mờ ảo quán hát',
				],
				hashtags: ['#karaoke', '#ktv', '#hat'],
			},
			BAR: {
				label: 'Bar/Club',
				keywords: [
					'tại quán bar sôi động',
					'bên quầy rượu',
					'trong pub nhỏ ấm cúng',
					'trên sàn nhảy',
					'trong club náo nhiệt',
					'dưới ánh đèn laser',
				],
				hashtags: ['#bar', '#pub', '#nightlife', '#club', '#dance', '#music'],
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
				hashtags: ['#body', '#curves', '#vong1'],
			},
			BUTT: {
				label: 'Mông',
				keywords: [
					'vòng 3 căng tròn',
					'bờ mông cong vút',
					'cặp mông nảy nở',
					'đường cong vòng 3',
				],
				hashtags: ['#booty', '#vong3', '#curves'],
			},
			LEGS: {
				label: 'Chân',
				keywords: [
					'đôi chân dài miên man',
					'cặp đùi mật ong',
					'bắp đùi thon gọn',
					'bàn chân xinh',
				],
				hashtags: ['#legs', '#chan', '#dai'],
			},
			WAIST: {
				label: 'Eo',
				keywords: [
					'vòng eo con kiến',
					'chiếc eo thon',
					'cơ bụng số 11',
					'rãnh bụng quyến rũ',
				],
				hashtags: ['#eo', '#waist', '#thon'],
			},
			BACK: {
				label: 'Lưng',
				keywords: [
					'tấm lưng trần gợi cảm',
					'võng lưng quyến rũ',
					'rãnh lưng sâu',
				],
				hashtags: ['#back', '#lung', '#sexy'],
			},
			LIPS: {
				label: 'Môi',
				keywords: [
					'đôi môi căng mọng',
					'bờ môi ướt át',
					'chiếc lưỡi tinh nghịch',
				],
				hashtags: ['#lips', '#moi', '#kiss'],
			},
			SKIN: {
				label: 'Da',
				keywords: ['làn da trắng sứ', 'làn da mịn màng', 'da thịt thơm tho'],
				hashtags: ['#skin', '#da', '#glow'],
			},
			GENERAL: {
				label: 'Tổng thể',
				keywords: [
					'đường cong chữ S',
					'ba vòng chuẩn chỉnh',
					'thân hình đồng hồ cát',
				],
				hashtags: ['#body', '#figure', '#curves'],
			},
			FACE: {
				label: 'Khuôn mặt',
				keywords: [
					'gương mặt xinh đẹp',
					'thần thái cuốn hút',
					'nụ cười tỏa nắng',
					'ánh mắt hút hồn',
					'góc nghiêng thần thánh',
				],
				hashtags: ['#face', '#beauty', '#visual', '#xinh'],
			},
		},
	},

	// 9. KIỂU TÓC
	HAIR: {
		name: 'Kiểu tóc',
		emoji: '💇',
		options: {
			LONG: {
				label: 'Tóc dài',
				keywords: ['tóc dài óng ả', 'mái tóc xõa ngang lưng', 'tóc đen dài'],
				hashtags: ['#longhair', '#tocdai', '#beautiful'],
			},
			SHORT: {
				label: 'Tóc ngắn',
				keywords: ['tóc ngắn cá tính', 'tóc pixie', 'tóc bob'],
				hashtags: ['#shorthair', '#tocngan', '#cute'],
			},
			PONYTAIL: {
				label: 'Buộc đuôi ngựa',
				keywords: ['tóc buộc cao', 'đuôi ngựa gợi cảm', 'tóc búi cao'],
				hashtags: ['#ponytail', '#sporty', '#active'],
			},
			WET: {
				label: 'Tóc ướt',
				keywords: ['tóc ướt bết', 'mái tóc ướt sũng', 'tóc dính vào da'],
				hashtags: ['#wethair', '#shower', '#fresh'],
			},
			MESSY: {
				label: 'Tóc rối',
				keywords: ['tóc rối bời', 'tóc xù vừa ngủ dậy', 'mái tóc bung xõa'],
				hashtags: ['#messyhair', '#bedhead', '#natural'],
			},
			COLORED: {
				label: 'Nhuộm màu',
				keywords: ['tóc nhuộm vàng', 'highlight', 'tóc màu nổi bật'],
				hashtags: ['#coloredhair', '#highlight', '#trendy'],
			},
		},
	},

	// 10. TƯ THẾ
	POSE: {
		name: 'Tư thế',
		emoji: '🧘',
		singleChoice: true,
		options: {
			STANDING: {
				label: 'Đứng',
				keywords: ['đứng tựa cửa', 'đứng khom người', 'đứng xoay lưng'],
				hashtags: ['#standing', '#pose', '#model'],
			},
			SITTING: {
				label: 'Ngồi',
				keywords: ['ngồi dạng chân', 'ngồi vắt chéo chân', 'ngồi bệt'],
				hashtags: ['#sitting', '#relax', '#chill'],
			},
			LYING: {
				label: 'Nằm',
				keywords: ['nằm ngửa', 'nằm sấp', 'nằm nghiêng'],
				hashtags: ['#lying', '#bed', '#lazy'],
			},
			KNEELING: {
				label: 'Quỳ',
				keywords: ['quỳ gối', 'quỳ chổng mông', 'tư thế quỳ'],
				hashtags: ['#kneeling', '#pose', '#sexy'],
			},
			BENDING: {
				label: 'Cúi',
				keywords: ['cúi người khom', 'chổng mông', 'khom lưng'],
				hashtags: ['#bending', '#flexible', '#hot'],
			},
			SQUATTING: {
				label: 'Ngồi xổm',
				keywords: ['ngồi xổm', 'tư thế squat', 'ngồi chồm hổm'],
				hashtags: ['#squat', '#fitness', '#gym'],
			},
			CRAWLING: {
				label: 'Bò',
				keywords: ['bò trên giường', 'chống tay quỳ gối', 'bốn chân'],
				hashtags: ['#crawling', '#bed', '#naughty'],
			},
			STRETCHING: {
				label: 'Giãn cơ',
				keywords: ['giãn cơ', 'tư thế split', 'tư thế cobra'],
				hashtags: ['#stretching', '#yoga', '#flexible'],
			},
		},
	},

	// 11. SỐ NGƯỜI
	PEOPLE: {
		name: 'Số người',
		emoji: '👥',
		singleChoice: true,
		options: {
			SOLO: {
				label: '1 mình',
				keywords: ['', '', ''],
				hashtags: ['#solo', '#girl', '#single'],
			},
			COUPLE: {
				label: 'Cặp đôi',
				keywords: ['cùng anh', 'cặp đôi', 'hai người', 'với người yêu'],
				hashtags: ['#couple', '#love', '#capdoi'],
			},
			ONE_GIRL_MANY_BOYS: {
				label: '1 nữ nhiều nam',
				keywords: [
					'một mình em với các anh',
					'em và nhóm bạn nam',
					'cô gái giữa đám con trai',
				],
				hashtags: ['#gangbang', '#group', '#wild'],
			},
			ONE_BOY_MANY_GIRLS: {
				label: '1 nam nhiều nữ',
				keywords: ['anh và các em', '1 nam nhiều nữ', 'hậu cung'],
				hashtags: ['#harem', '#lucky', '#group'],
			},
			GROUP: {
				label: 'Tập thể',
				keywords: ['cả nhóm', 'tập thể', 'party đông người', 'đám đông'],
				hashtags: ['#group', '#party', '#tapthe'],
			},
			MANY_GIRLS_NO_BOY: {
				label: 'Nhiều nữ không nam',
				keywords: ['hội chị em', 'toàn các nàng', 'nhóm bạn gái'],
				hashtags: ['#girls', '#sisters', '#party'],
			},
			MANY_BOYS_NO_GIRL: {
				label: 'Nhiều nam không nữ',
				keywords: ['hội anh em', 'toàn phái mạnh', 'nhóm bạn trai'],
				hashtags: ['#boys', '#brothers', '#men'],
			},
		},
	},
};
