/**
 * Authoritative Knowledge Base for Hanoi Artisan Bridge (HAB)
 * Grounded in docs/prd.md and system specifications.
 * The LLM uses this context to answer platform questions accurately without hallucinations.
 */

export interface KnowledgeItem {
  id: string
  topics: string[]
  titleVi: string
  titleEn: string
  contentVi: string
  contentEn: string
}

export const PLATFORM_KNOWLEDGE_BASE: KnowledgeItem[] = [
  {
    id: 'platform_overview',
    topics: ['overview', 'hanoi artisan bridge', 'hab', 'giới thiệu', 'là gì', 'muc dich', 'purpose'],
    titleVi: 'Giới thiệu Hanoi Artisan Bridge',
    titleEn: 'About Hanoi Artisan Bridge',
    contentVi:
      'Hanoi Artisan Bridge (HAB) là nền tảng B2B chính thức kết nối các Công ty lữ hành (Tour Agencies) với các Xưởng thủ công và Nghệ nhân bậc thầy đã được UBND xác minh tại các làng nghề truyền thống Hà Nội. Nền tảng giúp điều phối tour văn hóa chuẩn xác, kiểm tra lịch trống và bảo tồn giá trị làng nghề.',
    contentEn:
      'Hanoi Artisan Bridge (HAB) is an official B2B platform connecting Tour Agencies with verified traditional artisan workshops and master craftsmen in Hanoi craft villages. It enables authentic cultural tour coordination, real-time availability checks, and cultural heritage preservation.',
  },
  {
    id: 'how_matching_works',
    topics: ['ai matching', 'ghép tour', 'hoạt động', 'cách thức', 'quy trình', 'how it works', 'matching engine'],
    titleVi: 'Quy trình hoạt động của AI Tour Matching',
    titleEn: 'How AI Tour Matching Works',
    contentVi:
      'AI Tour Matching hoạt động theo quy trình 4 bước:\n1. Phân tích yêu cầu tự nhiên: Trợ lý AI trích xuất quy mô đoàn (group size), ngày đi (date), ngân sách (budget), ngành nghề yêu thích (craft preference), và điểm xuất phát (origin).\n2. Lọc ràng buộc cứng (Hard Constraints): Tự động loại trừ các xưởng không đủ sức chứa đoàn hoặc vượt ngân sách tối đa.\n3. Chấm điểm đa yếu tố (Multi-factor Fit Score): Xếp hạng các xưởng đủ điều kiện dựa trên độ phù hợp nghề, khoảng cách di chuyển, lịch sử hợp tác và chất lượng xưởng.\n4. Đề xuất & Handoff: Trả về Top 5 đề xuất tốt nhất kèm lý do phù hợp. Đại lý có thể bấm "Yêu cầu báo giá" hoặc "Nhắn tin" trực tiếp với xưởng.',
    contentEn:
      'AI Tour Matching operates in 4 steps:\n1. Natural Language Requirement Analysis: Extracts group size, tour date, budget, craft preference, and origin location.\n2. Hard Constraint Filtering: Automatically filters out workshops with insufficient capacity or prices above budget.\n3. Multi-Factor Fit Scoring: Scores eligible workshops based on craft match, route convenience, agency preference, and provider quality.\n4. Recommendations & Handoff: Returns Top 5 ranked recommendations with explanations. Agencies can Request Quote or Chat directly with providers.',
  },
  {
    id: 'fit_score_calculation',
    topics: ['fit score', 'điểm phù hợp', 'tính điểm', 'công thức', 'scoring', 'how score calculated', 'weights'],
    titleVi: 'Cách tính điểm phù hợp (Fit Score)',
    titleEn: 'How Fit Score is Calculated',
    contentVi:
      'Fit Score (thang điểm 0 - 100) được tính toán khách quan từ 4 trọng số thành phần:\n- Độ phù hợp trải nghiệm & nghề (Experience Fit - 40%): Trùng khớp ngành nghề (gốm, lụa, mộc...) và loại hình hoạt động (thực hành tay nghề, tham quan).\n- Tuyến đường & thời gian di chuyển (Route Convenience - 25%): Khoảng cách và thời gian di chuyển từ điểm xuất phát (ưu tiên dưới 45 phút từ trung tâm).\n- Sở thích đại lý trong quá khứ (Agency Preferences - 20%): Tín hiệu quan tâm và tương tác trước đây của công ty lữ hành.\n- Chất lượng xưởng thủ công (Provider Quality - 15%): Đánh giá từ khách hàng, số lượng review, chứng nhận nghệ nhân và tỷ lệ hoàn thành tour.',
    contentEn:
      'Fit Score (0-100 scale) is calculated using 4 weighted components:\n- Experience & Craft Fit (40%): Match with desired craft (ceramics, silk, wood...) and experience category (hands-on workshop, sightseeing).\n- Route Convenience (25%): Travel distance and time from group departure point (favoring < 45 mins from Old Quarter).\n- Agency Preferences (20%): Historical agency preference signals and interaction patterns.\n- Provider Quality (15%): Verified customer ratings, review volume, artisan certifications, and completion rates.',
  },
  {
    id: 'verified_craft_villages',
    topics: ['làng nghề', 'villages', 'danh sách', 'bát tràng', 'vạn phúc', 'chàng sơn', 'phú vinh', 'chuông', 'quất động', 'định công', 'cự đà'],
    titleVi: 'Các làng nghề truyền thống trên hệ thống',
    titleEn: 'Verified Craft Villages on Hanoi Artisan Bridge',
    contentVi:
      'Hệ thống hiện kết nối các làng nghề tiêu biểu của Hà Nội:\n- Làng gốm Bát Tràng (Gia Lâm) - Gốm sứ mỹ nghệ & lò nung cổ\n- Làng lụa Vạn Phúc (Hà Đông) - Dệt lụa tơ tằm truyền thống\n- Làng mộc Chàng Sơn (Thạch Thất) & Sơn Đồng (Hoài Đức) - Chạm khắc gỗ, tạc tượng dân gian & kiến trúc cổ\n- Làng mây tre đan Phú Vinh (Chương Mỹ) - Mây tre đan mỹ nghệ\n- Làng nón Chuông (Thanh Oai) - Làm nón lá truyền thống\n- Làng thêu Quất Động (Thường Tín) - Thêu tay truyền thống\n- Làng kim hoàn Định Công (Hoàng Mai) - Bạc đậu mỹ nghệ\n- Làng bún & miến Cự Đà (Thanh Oai) - Ẩm thực truyền thống',
    contentEn:
      'The platform connects verified Hanoi traditional craft villages:\n- Bat Trang (Gia Lâm) - Fine ceramics & ancient pottery kilns\n- Van Phuc (Ha Dong) - Traditional mulberry silk weaving\n- Chang Son & Son Dong (Thach That, Hoai Duc) - Traditional woodcarving, folk statue carving & architecture\n- Phu Vinh (Chuong My) - Bamboo & rattan weaving\n- Chuong (Thanh Oai) - Conical hat making\n- Quat Dong (Thuong Tin) - Traditional hand embroidery\n- Dinh Cong (Hoang Mai) - Silver filigree & jewelry\n- Cu Da (Thanh Oai) - Traditional noodles & soy sauce',
  },
  {
    id: 'platform_scope_and_boundary',
    topics: ['phạm vi', 'hoạt động ngoài trời', 'ngoài trời', 'thể thao', 'trồng cây', 'nông nghiệp', 'trekking', 'cắm trại', 'sóc sơn', 'ba vì', 'scope', 'outdoor'],
    titleVi: 'Phạm vi dịch vụ & Ranh giới nền tảng Hanoi Artisan Bridge',
    titleEn: 'Service Scope & Platform Boundaries of Hanoi Artisan Bridge',
    contentVi:
      'Hanoi Artisan Bridge là nền tảng B2B chuyên biệt CHỈ kết nối các tour văn hóa trải nghiệm tại các Làng nghề truyền thống & Xưởng thủ công được xác minh tại Hà Nội.\n- Nền tảng HỖ TRỢ: Các workshop làm nghề thủ công cùng nghệ nhân (nặn gốm Bát Tràng, dệt lụa Vạn Phúc, chạm gỗ Chàng Sơn, đan mây tre Phú Vinh, làm nón Chuông, vẽ tranh sơn mài Hạ Thái, thêu tay Quất Động, múa rối nước Đào Thục, ẩm thực Cự Đà).\n- Nền tảng KHÔNG CUNG CẤP: Các hoạt động thể thao ngoài trời (đá bóng, bóng chuyền), nông trại nông nghiệp (trồng rau, hái quả), cắm trại dã ngoại, trekking leo núi, hoặc các địa điểm nghỉ dưỡng sinh thái ngoài làng nghề (như Sóc Sơn, Ba Vì).\n- Khi khách hỏi về Sóc Sơn hoặc hoạt động dã ngoại ngoài trời: Trợ lý phải giải thích rõ nền tảng chỉ tập trung vào làng nghề truyền thống Hà Nội, và gợi ý các workshop làng nghề văn hóa phù hợp cho đoàn teambuilding gắn kết.',
    contentEn:
      'Hanoi Artisan Bridge exclusively connects B2B cultural craft village experiences and verified artisan workshops in Hanoi.\n- Supported: Hands-on craft workshops with master artisans (Bat Trang pottery, Van Phuc silk, Chang Son woodcarving, Phu Vinh bamboo, Chuong conical hats, Ha Thai lacquer, Quat Dong embroidery, Dao Thuc water puppetry, Cu Da culinary).\n- Not supported: General outdoor sports (football, volleyball), agro-farming (vegetable harvesting), camping, trekking, or general nature resorts outside craft villages (e.g. Soc Son, Ba Vi).\n- Inquiries about outdoor sports or non-craft locations: Clearly state the platform craft village focus and propose cultural artisan team challenges instead.',
  },
  {
    id: 'teambuilding_cultural_craft',
    topics: ['teambuilding', 'team building', 'làm việc nhóm', 'nhóm', 'đoàn đông', 'tập thể', 'hoạt động nhóm', 'thi đua'],
    titleVi: 'Hoạt động Team Building văn hóa tại các xưởng thủ công',
    titleEn: 'Cultural Team Building Workshops in Craft Villages',
    contentVi:
      'Các xưởng nghề trên Hanoi Artisan Bridge cung cấp các format Team Building văn hóa gắn kết tập thể đặc sắc:\n1. Bát Tràng (Gia Lâm): Thử thách làm gốm đồng đội (Team Pottery Challenge) - các nhóm tự tay nặn gốm, trang trí men và thuyết trình ý nghĩa sản phẩm của đội.\n2. Chàng Sơn (Thạch Thất): Workshop làm quạt nghệ thuật & chạm khắc tranh gỗ kỷ niệm - làm việc nhóm theo tổ 4 - 6 người dưới sự hướng dẫn của nghệ nhân.\n3. Phú Vinh (Chương Mỹ): Thi tài đan lát mây tre mỹ nghệ đồng đội.\n4. Đào Thục (Đông Anh): Trải nghiệm rối nước buồng trò - chia nhóm tập điều khiển con rối nước và biểu diễn tiểu phẩm dân gian hài hước.\n- Sức chứa: Phù hợp nhất cho đoàn từ 10 - 25 khách/lượt. Đoàn trên 25 khách có thể xoay vòng 2 trạm trải nghiệm.',
    contentEn:
      'Verified artisan workshops provide specialized cultural team building formats:\n1. Bat Trang: Team Pottery Challenge - teams sculpt and paint ceramic pieces and present their cultural stories.\n2. Chang Son: Traditional fan decorating & commemorative woodcarving in teams of 4-6 pax.\n3. Phu Vinh: Team bamboo weaving craftsmanship relay.\n4. Dao Thuc: Backstage water puppetry workshop - teams rehearse and perform folk puppet sketches.\n- Capacity: Best suited for 10-25 pax per session, or rotating stations for larger groups.',
  },
  {
    id: 'data_isolation_and_privacy',
    topics: ['agency khác', 'đại lý khác', 'công ty khác', 'báo giá bên khác', 'doanh thu sàn', 'admin', 'bảo mật', 'privacy', 'competitor'],
    titleVi: 'Chính sách bảo mật dữ liệu đa người dùng & Dữ liệu quản trị',
    titleEn: 'B2B Multi-Tenant Data Isolation & Admin Privacy Policy',
    contentVi:
      'Quy định bảo mật B2B nghiêm ngặt trên Hanoi Artisan Bridge:\n1. Cách ly dữ liệu Lữ hành (Agency Isolation): Mỗi công ty lữ hành chỉ được xem thông tin, báo giá, lịch sử tour và tin nhắn của chính mình. Tuyệt đối không tiết lộ dữ liệu báo giá, khách hàng hoặc giao dịch của bất kỳ đơn vị lữ hành nào khác.\n2. Bảo vệ dữ liệu Quản trị (Admin Protection): Doanh thu tổng thể của sàn (GMV), số lượng booking toàn sàn, tài khoản quản trị hệ thống, mã API và cơ sở dữ liệu chỉ dành riêng cho Ban quản trị (Admin / UBND / HĐT). AI Assistant không được phép cung cấp các số liệu này cho người dùng.',
    contentEn:
      'Strict B2B privacy policies on Hanoi Artisan Bridge:\n1. Agency Data Isolation: Tour agencies only access their own quotes, tours, and chats. Information from other agencies is strictly confidential.\n2. Admin Protection: Platform gross revenue (GMV), system-wide booking statistics, admin credentials, API keys, and database schemas are restricted to Platform Administrators.',
  },
  {
    id: 'wood_craft_villages',
    topics: ['làng mộc', 'mộc', 'gỗ', 'chàng sơn', 'sơn đồng', 'tạc tượng', 'chạm khắc gỗ', 'woodcarving'],
    titleVi: 'Làng mộc truyền thống Chàng Sơn & Sơn Đồng',
    titleEn: 'Traditional Woodcarving Villages: Chang Son & Son Dong',
    contentVi:
      'Làng mộc Chàng Sơn (Thạch Thất) và Sơn Đồng (Hoài Đức) là hai cái nôi điêu khắc gỗ nổi tiếng xứ Đoài:\n- Hoạt động nổi bật: Tham quan xưởng mộc cổ truyền, quan sát nghệ nhân đục chạm hoa văn rồng phượng, tự tay thực hành chạm khắc hoa văn nhỏ trên gỗ mít/gỗ dổi dưới sự hướng dẫn của nghệ nhân bậc thầy, làm quạt Chàng Sơn.\n- Sức chứa xưởng: Nhóm từ 8 - 18 khách phù hợp nhất để được nghệ nhân hướng dẫn 1-1.\n- Thời gian di chuyển: Khoảng 35 - 45 phút từ trung tâm Hà Nội qua Đại lộ Thăng Long.',
    contentEn:
      'Chang Son (Thach That) and Son Dong (Hoai Duc) are Hanoi famous woodcarving heritage villages:\n- Key activities: Visit heritage timber workshops, observe master carvers, hands-on woodcarving practice on local timbers, and traditional Chang Son fan making.\n- Group capacity: 8 - 18 pax ideal for personalized master artisan instruction.\n- Travel time: 35 - 45 minutes from central Hanoi via Thang Long Avenue.',
  },
  {
    id: 'contact_and_booking',
    topics: ['liên hệ', 'báo giá', 'đặt chỗ', 'chat', 'nhắn tin', 'quote', 'contact', 'booking'],
    titleVi: 'Cách thức liên hệ và đặt chỗ với xưởng',
    titleEn: 'How to Contact and Book with Providers',
    contentVi:
      'Từ kết quả đề xuất AI Matching, Đại lý du lịch có thể:\n1. Bấm "Yêu cầu báo giá": Tạo yêu cầu báo giá thương mại chính thức gửi đến xưởng, đồng thời mở kênh hội thoại trao đổi.\n2. Bấm "Nhắn tin": Mở ngay phiên chat B2B trực tiếp với đại diện xưởng để trao đổi yêu cầu riêng (ngôn ngữ HDV, ăn uống, lối đi xe lăn).\n3. Bấm "Xem chi tiết trải nghiệm": Xem ảnh chụp thực tế xưởng (không gian, hoạt động, sản phẩm) và bảng giá chiết khấu theo số lượng khách.',
    contentEn:
      'From the AI Matching recommendations, Tour Agencies can:\n1. Click "Request Quote": Submits a formal B2B quote request to the workshop and initializes communication.\n2. Click "Chat": Opens a real-time B2B chat channel directly with the workshop manager for custom requests (French guide, dietary, wheelchair access).\n3. Click "View Experience Details": Reviews certified photos (Space, Activity, Product) and tiered group discount schedules.',
  },
  {
    id: 'requirements_guide',
    topics: ['cần cung cấp gì', 'thông tin cần thiết', 'yêu cầu tour', 'hướng dẫn', 'what to provide', 'requirements'],
    titleVi: 'Thông tin cần cung cấp để ghép tour hiệu quả nhất',
    titleEn: 'Information Needed for the Best Tour Match',
    contentVi:
      'Để AI tìm được xưởng phù hợp nhất, bạn nên cung cấp:\n- Số lượng khách (ví dụ: đoàn 15 khách)\n- Ngày tổ chức dự kiến (ví dụ: 25/11 hoặc Thứ Năm tuần sau)\n- Ngành nghề mong muốn (ví dụ: làm gốm vuốt tay, dệt lụa tơ tằm, đan mây tre)\n- Ngân sách tối đa/khách (ví dụ: dưới 400.000 đ/người)\n- Điểm đón/khởi hành (ví dụ: từ Hoàn Kiếm, phố cổ)',
    contentEn:
      'To get the most accurate match, please mention:\n- Group size (e.g. 15 guests)\n- Target date (e.g. Nov 25 or next Thursday)\n- Desired craft (e.g. pottery, silk weaving, rattan)\n- Budget per person (e.g. under 400,000 VND)\n- Departure origin (e.g. from Old Quarter / Hoan Kiem)',
  },
]

/**
 * Searches the platform knowledge base for matching items based on user query
 */
export function queryKnowledgeBase(queryText: string): KnowledgeItem[] {
  const normalized = queryText.toLowerCase()
  const words = normalized.split(/\s+/).filter(w => w.length > 2)

  const scored = PLATFORM_KNOWLEDGE_BASE.map(item => {
    let score = 0
    for (const topic of item.topics) {
      if (normalized.includes(topic.toLowerCase())) {
        score += 3
      }
    }
    for (const word of words) {
      if (item.contentVi.toLowerCase().includes(word) || item.contentEn.toLowerCase().includes(word)) {
        score += 1
      }
    }
    return { item, score }
  })

  return scored
    .filter(s => s.score > 2)
    .sort((a, b) => b.score - a.score)
    .map(s => s.item)
}
