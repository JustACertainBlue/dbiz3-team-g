/**
 * Card Resolver for Hanoi Artisan Bridge AI Matching
 * Provides structured Village Cards and Provider Cards with verified media and metadata.
 */

export interface VillageCardData {
  village_id: string
  name: string
  craft: string
  district: string
  image_url: string
  description: string
}

export interface ProviderActivity {
  experience_id: string
  name: string
  price?: number
  duration_minutes?: number
}

export interface ProviderCardData {
  provider_id: string
  village_id: string
  village_name: string
  business_name: string
  artisan_name?: string
  craft_type: string
  location_address: string
  description: string
  activities: ProviderActivity[]
  image_url: string
  primary_experience_id: string
  is_verified?: boolean
}

export interface ActivityCardData {
  experience_id: string
  provider_id: string
  provider_name: string
  village_id: string
  village_name: string
  name: string
  description: string
  category: string
  duration_minutes: number
  price_per_person: number
  max_participants: number
  image_url: string
  is_verified?: boolean
}

export type CardScope = 'village' | 'provider' | 'activity' | 'all' | 'none'

/**
 * Detects the specific scope of cards the user wants based on user input.
 * Ensures strict scoping: asking about a village shows ONLY village cards.
 */
export function detectCardScope(userText: string): CardScope {
  const lower = userText.toLowerCase().trim()

  const hasProvider = /(?:danh sách xưởng|xưởng tại|xưởng nghề|các xưởng|local providers?|cơ sở thủ công|nghệ nhân|tìm xưởng|thông tin xưởng|xưởng)/i.test(lower)
  const hasActivity = /(?:hoạt động|trải nghiệm|workshop|tham quan|ngắm cảnh|làm gì|chơi gì|thực hành|học làm|khoá học|giá vé)/i.test(lower)
  const hasVillage = /(?:làng nghề|danh sách làng|các làng|làng nào|về làng|thông tin làng|ở làng|làng gốm|làng lụa|làng mộc|làng chuông|làng quất động|làng hạ thái|làng đào thục|làng phú vinh|làng|village)/i.test(lower)

  // Multiple scopes requested explicitly
  if (hasVillage && hasProvider && hasActivity) return 'all'
  if (hasVillage && hasProvider) return 'all'

  // Single focus intent:
  // If specifically asking for workshops/providers:
  if (hasProvider && !hasVillage && !hasActivity) return 'provider'
  // If specifically asking for activities/workshops:
  if (hasActivity && !hasVillage && !hasProvider) return 'activity'
  // If specifically asking about village(s):
  if (hasVillage && !hasProvider && !hasActivity) return 'village'

  // If a village is mentioned alongside an activity keyword (e.g. "hoạt động tại làng Bát Tràng"):
  // The primary interest is the activity!
  if (hasActivity) return 'activity'

  // If a village is mentioned alongside a provider keyword (e.g. "xưởng tại làng Bát Tràng"):
  // The primary interest is the provider/workshop!
  if (hasProvider) return 'provider'

  // If only village is mentioned (e.g. "làng gốm Bát Tràng", "ở Hà Nội có những làng nào"):
  if (hasVillage) return 'village'

  return 'none'
}

export const CRAFT_MEDIA = {
  ceramics: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Bat-Trang-Ceramic-Village11.jpg/1280px-Bat-Trang-Ceramic-Village11.jpg',
  silk: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/Van_Phuc_weaver_at_Jacquard_loom.jpg/1280px-Van_Phuc_weaver_at_Jacquard_loom.jpg',
  woodcarving: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/B%C3%ACnh_Phong_g%E1%BB%97.jpg/1280px-B%C3%ACnh_Phong_g%E1%BB%97.jpg',
  waterpuppets: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/Hanoi_Vietnam_Thang-Long-Water-Puppet-Theatre-01.jpg/1280px-Hanoi_Vietnam_Thang-Long-Water-Puppet-Theatre-01.jpg',
  bamboo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/Handicraft_products_in_Phu_Vinh_bamboo_and_rattan_village%2CVietNam.jpg/1280px-Handicraft_products_in_Phu_Vinh_bamboo_and_rattan_village%2CVietNam.jpg',
  conicalhats: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Hatter_Vietnam.jpg/1280px-Hatter_Vietnam.jpg',
  embroidery: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/02/Silk_embroidery_with_Tree_of_Life_motif_from_Vietnam.JPG/1280px-Silk_embroidery_with_Tree_of_Life_motif_from_Vietnam.JPG',
  lacquer: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/Four_seasons%2C_lacquer_engraving_-_Vietnam_National_Museum_of_Fine_Arts_-_Hanoi%2C_Vietnam_-_DSC05121.JPG/1280px-Four_seasons%2C_lacquer_engraving_-_Vietnam_National_Museum_of_Fine_Arts_-_Hanoi%2C_Vietnam_-_DSC05121.JPG',
}

export const CATALOG_ACTIVITIES: ActivityCardData[] = [
  {
    experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69',
    provider_id: '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374',
    provider_name: 'Xưởng thủ công Bát Tràng',
    village_id: '20896522-6235-5699-aeaf-f48b8150d895',
    village_name: 'Bát Tràng',
    name: 'Nặn gốm thủ công Bát Tràng',
    description: 'Trải nghiệm vuốt gốm trên bàn xoay, trang trí men màu và nung sản phẩm thủ công cùng nghệ nhân.',
    category: 'Workshop/Hands-on',
    duration_minutes: 60,
    price_per_person: 150000,
    max_participants: 12,
    image_url: CRAFT_MEDIA.ceramics,
    is_verified: true,
  },
  {
    experience_id: 'c8281688-2dc1-5cb1-9ff6-139df04ba562',
    provider_id: '70efa801-a908-5e16-8510-fd094fbdc020',
    provider_name: 'Xưởng thủ công Vạn Phúc',
    village_id: 'c0d0d95f-d59c-5c35-946a-f397e380dd14',
    village_name: 'Vạn Phúc',
    name: 'Dệt lụa tơ tằm truyền thống',
    description: 'Khám phá quy trình ươm tơ dệt cửi, thực hành dệt lụa vân truyền thống trên khung dệt Jacquard.',
    category: 'Workshop/Hands-on',
    duration_minutes: 75,
    price_per_person: 175000,
    max_participants: 13,
    image_url: CRAFT_MEDIA.silk,
    is_verified: true,
  },
  {
    experience_id: '67a2cbab-850c-5f69-b496-59f2e9a5f594',
    provider_id: 'c8e989d4-88be-5b00-8382-a41177c4c16d',
    provider_name: 'Xưởng mộc mỹ nghệ Sơn Đồng',
    village_id: '85ec7215-3ec1-5792-afcc-a72d89a3a214',
    village_name: 'Sơn Đồng',
    name: 'Tạc tượng dân gian & Điêu khắc gỗ',
    description: 'Tìm hiểu nghệ thuật chạm khắc hoa văn cổ, thực hành đục đẽo và tạo hình sản phẩm gỗ lưu niệm.',
    category: 'Workshop/Hands-on',
    duration_minutes: 135,
    price_per_person: 275000,
    max_participants: 17,
    image_url: CRAFT_MEDIA.woodcarving,
    is_verified: false,
  },
  {
    experience_id: '8e485337-5a2c-5703-9fbf-5e0c6492cd87',
    provider_id: '84dfc919-6478-5e02-a8a5-b1e219432420',
    provider_name: 'Phường rối nước Đào Thục',
    village_id: '3527fadf-18ef-58d0-95c6-dc3729650f6a',
    village_name: 'Đào Thục',
    name: 'Điều khiển rối nước thủy đình',
    description: 'Trải nghiệm lội buồng trò, tự tay điều khiển con rối nước qua sào dây và tô vẽ rối gỗ truyền thống.',
    category: 'Cultural Show',
    duration_minutes: 150,
    price_per_person: 300000,
    max_participants: 18,
    image_url: CRAFT_MEDIA.waterpuppets,
    is_verified: false,
  },
  {
    experience_id: 'd95bc77b-5e7b-53a6-a8af-5ccaabb485d8',
    provider_id: '0858b5e8-89e1-577f-904a-562150c4fe4f',
    provider_name: 'Xưởng thủ công Phú Vinh',
    village_id: 'e482884e-7190-56cf-bc03-4e69614b1fe5',
    village_name: 'Phú Vinh',
    name: 'Đan mây tre thủ công mỹ nghệ',
    description: 'Thực hành chẻ nan, vót nan chuốt tơ mây và tự tay đan các vật phẩm mây tre lưu niệm mang về.',
    category: 'Workshop/Hands-on',
    duration_minutes: 90,
    price_per_person: 200000,
    max_participants: 14,
    image_url: CRAFT_MEDIA.bamboo,
    is_verified: true,
  },
  {
    experience_id: 'b70bd0fa-6a81-5aec-9ff6-5303210b2fad',
    provider_id: '867719ea-c962-56a1-a88c-3f96e8d0af65',
    provider_name: 'Xưởng thủ công Chuông',
    village_id: '688d408b-9d98-5b66-bfa7-659a67462108',
    village_name: 'Làng Chuông',
    name: 'Làm nón lá truyền thống',
    description: 'Trải nghiệm là phẳng lá lụa, xếp nan tre và tự khâu nón lá 16 vành truyền thống cùng nghệ nhân.',
    category: 'Workshop/Hands-on',
    duration_minutes: 105,
    price_per_person: 225000,
    max_participants: 15,
    image_url: CRAFT_MEDIA.conicalhats,
    is_verified: true,
  },
  {
    experience_id: 'bad51dc8-1529-506a-8302-cb0b1d95954c',
    provider_id: '484e5f78-4ebf-555b-8643-e180d3542ecf',
    provider_name: 'Xưởng thủ công Quất Động',
    village_id: 'b1017646-ec89-58d1-aaa9-df783b1c2506',
    village_name: 'Quất Động',
    name: 'Thêu tay họa tiết truyền thống',
    description: 'Workshop phối chỉ tơ tằm, căng khung thêu và thực hành các đường kim thêu hoa văn tinh xảo.',
    category: 'Workshop/Hands-on',
    duration_minutes: 120,
    price_per_person: 250000,
    max_participants: 16,
    image_url: CRAFT_MEDIA.embroidery,
    is_verified: true,
  },
  {
    experience_id: '800b5192-03c7-5953-849b-32a321e12a47',
    provider_id: '3a5d2ffc-79fa-5b75-a1e6-82beea3bed59',
    provider_name: 'Xưởng thủ công Hạ Thái',
    village_id: '6dfbb5e9-f92e-58a0-b090-d67cea160f62',
    village_name: 'Hạ Thái',
    name: 'Vẽ & Mài tranh sơn mài mỹ nghệ',
    description: 'Trải nghiệm gắn vỏ trứng, rây bột bạc, quét sơn then và mài nước tạo tác phẩm sơn mài độc bản.',
    category: 'Workshop/Hands-on',
    duration_minutes: 165,
    price_per_person: 325000,
    max_participants: 12,
    image_url: CRAFT_MEDIA.lacquer,
    is_verified: false,
  },
  {
    experience_id: 'exp-bat-trang-sightseeing',
    provider_id: '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374',
    provider_name: 'Bảo tàng Gốm Bát Tràng',
    village_id: '20896522-6235-5699-aeaf-f48b8150d895',
    village_name: 'Bát Tràng',
    name: 'Tham quan Bảo tàng Gốm Bát Tràng & Lò Bầu Cổ',
    description: 'Khám phá kiến trúc bảo tàng gốm 7 tầng độc đáo hình bàn xoay, chiêm ngưỡng lò nung bầu cổ và không gian trưng bày tinh hoa di sản gốm Việt.',
    category: 'Sightseeing',
    duration_minutes: 90,
    price_per_person: 60000,
    max_participants: 35,
    image_url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800',
    is_verified: true,
  },
  {
    experience_id: 'exp-van-phuc-sightseeing',
    provider_id: '70efa801-a908-5e16-8510-fd094fbdc020',
    provider_name: 'Làng lụa Vạn Phúc',
    village_id: 'c0d0d95f-d59c-5c35-946a-f397e380dd14',
    village_name: 'Vạn Phúc',
    name: 'Tham quan Tuyến phố Lụa Cổ & Miếu thờ Tổ nghề dệt',
    description: 'Dạo bước con đường ô sắc màu rực rỡ, tham quan Đền thờ Tổ nghề dệt Lụa Vạn Phúc cổ kính và khám phá phố lụa tơ tằm di sản.',
    category: 'Sightseeing',
    duration_minutes: 75,
    price_per_person: 50000,
    max_participants: 40,
    image_url: 'https://images.unsplash.com/photo-1528458876885-e7a0ec4ca040?w=800',
    is_verified: true,
  },
  {
    experience_id: 'exp-chang-son-sightseeing',
    provider_id: 'c8e989d4-88be-5b00-8382-a41177c4c16d',
    provider_name: 'Làng mộc Chàng Sơn',
    village_id: '85ec7215-3ec1-5792-afcc-a72d89a3a214',
    village_name: 'Chàng Sơn',
    name: 'Tham quan Di tích Đình làng & Làng cổ Chàng Sơn',
    description: 'Chiêm ngưỡng kiến trúc điêu khắc gỗ tinh xảo bậc nhất xứ Đoài tại Đình Chàng Sơn và tìm hiểu văn hóa làng quạt giấy truyền thống.',
    category: 'Sightseeing',
    duration_minutes: 60,
    price_per_person: 40000,
    max_participants: 30,
    image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800',
    is_verified: true,
  },
]

export const CATALOG_VILLAGES: VillageCardData[] = [
  {
    village_id: '20896522-6235-5699-aeaf-f48b8150d895',
    name: 'Làng gốm Bát Tràng',
    craft: 'Gốm sứ truyền thống Bát Tràng',
    district: 'Gia Lâm, Hà Nội',
    image_url: CRAFT_MEDIA.ceramics,
    description: 'Làng gốm cổ truyền hơn 700 năm bên bờ sông Hồng, nổi tiếng với các dòng men lam, men rạn và kỹ thuật nặn vuốt thủ công điêu luyện.',
  },
  {
    village_id: 'c0d0d95f-d59c-5c35-946a-f397e380dd14',
    name: 'Làng lụa Vạn Phúc',
    craft: 'Dệt lụa tơ tằm Vạn Phúc',
    district: 'Hà Đông, Hà Nội',
    image_url: CRAFT_MEDIA.silk,
    description: 'Cái nôi tơ lụa nổi tiếng với lụa vân truyền thống mềm mát, hoa văn tinh tế và kỹ thuật dệt cửi lâu đời.',
  },
  {
    village_id: '85ec7215-3ec1-5792-afcc-a72d89a3a214',
    name: 'Làng mộc Sơn Đồng',
    craft: 'Chạm khắc gỗ mỹ nghệ & Tượng cổ truyền',
    district: 'Hoài Đức & Thạch Thất, Hà Nội',
    image_url: CRAFT_MEDIA.woodcarving,
    description: 'Vùng đất trứ danh xứ Đoài về kỹ nghệ điêu khắc mộc, tạc hoa văn tinh xảo và chế tác quạt truyền thống Chàng Sơn.',
  },
  {
    village_id: '3527fadf-18ef-58d0-95c6-dc3729650f6a',
    name: 'Làng múa rối nước Đào Thục',
    craft: 'Nghệ thuật múa rối nước dân gian',
    district: 'Đông Anh, Hà Nội (cách Sóc Sơn ~20 phút)',
    image_url: CRAFT_MEDIA.waterpuppets,
    description: 'Làng di sản múa rối nước hơn 300 năm, biểu diễn trên mặt nước thủy đình làng cổ với tiếng trống hội rộn rã.',
  },
  {
    village_id: 'e482884e-7190-56cf-bc03-4e69614b1fe5',
    name: 'Làng mây tre đan Phú Vinh',
    craft: 'Mây tre đan thủ công mỹ nghệ',
    district: 'Chương Mỹ, Hà Nội',
    image_url: CRAFT_MEDIA.bamboo,
    description: 'Vương quốc mây tre đan với kỹ thuật chẻ tơ mây nan chuốt điêu luyện thành tác phẩm mỹ nghệ xuất khẩu.',
  },
  {
    village_id: '688d408b-9d98-5b66-bfa7-659a67462108',
    name: 'Làng nón Chuông',
    craft: 'Làm nón lá truyền thống Làng Chuông',
    district: 'Thanh Oai, Hà Nội',
    image_url: CRAFT_MEDIA.conicalhats,
    description: 'Làng nón cổ kính bên dòng sông Đáy, lưu giữ kỹ nghệ làm nón lá 16 vành và nón quai thao thanh lịch.',
  },
  {
    village_id: 'b1017646-ec89-58d1-aaa9-df783b1c2506',
    name: 'Làng thêu ren Quất Động',
    craft: 'Thêu tay & Thêu họa tiết truyền thống',
    district: 'Thường Tín, Hà Nội',
    image_url: CRAFT_MEDIA.embroidery,
    description: 'Đất tổ nghề thêu tay Việt Nam, nổi tiếng với kỹ thuật phối chỉ tơ tằm mềm mại như bức họa chân dung.',
  },
  {
    village_id: '6dfbb5e9-f92e-58a0-b090-d67cea160f62',
    name: 'Làng sơn mài Hạ Thái',
    craft: 'Tranh & Đồ sơn mài mỹ nghệ',
    district: 'Thường Tín, Hà Nội',
    image_url: CRAFT_MEDIA.lacquer,
    description: 'Làng nghề sơn mài truyền thống với kỹ thuật cẩn trứng, thếp vàng bạc và mài nước tạo chiều sâu đa tầng kỳ ảo.',
  },
]

export const CATALOG_PROVIDERS: ProviderCardData[] = [
  {
    provider_id: '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374',
    village_id: '20896522-6235-5699-aeaf-f48b8150d895',
    village_name: 'Bát Tràng',
    business_name: 'Xưởng thủ công Bát Tràng',
    artisan_name: 'Nghệ nhân Kiều Anh Thư',
    craft_type: 'Gốm sứ thủ công',
    location_address: 'Thôn Giang Cao, Bát Tràng, Gia Lâm, Hà Nội',
    description: 'Không gian trải nghiệm làm gốm vuốt tay trên bàn xoay cơ, trang trí men màu và nung sản phẩm cho đoàn khách tour du lịch.',
    activities: [
      {
        experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69',
        name: 'Nặn gốm thủ công',
        price: 150000,
        duration_minutes: 60,
      },
    ],
    image_url: CRAFT_MEDIA.ceramics,
    primary_experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69',
    is_verified: true,
  },
  {
    provider_id: '70efa801-a908-5e16-8510-fd094fbdc020',
    village_id: 'c0d0d95f-d59c-5c35-946a-f397e380dd14',
    village_name: 'Vạn Phúc',
    business_name: 'Xưởng thủ công Vạn Phúc',
    artisan_name: 'Nghệ nhân Lương Việt Dũng',
    craft_type: 'Dệt lụa tơ tằm',
    location_address: 'Thôn nghề dệt lụa, Vạn Phúc, Hà Đông, Hà Nội',
    description: 'Xưởng trải nghiệm dệt cửi khung Jacquard truyền thống, tìm hiểu công đoạn ươm tơ, nhuộm sợi tự nhiên và dệt khăn lụa.',
    activities: [
      {
        experience_id: 'c8281688-2dc1-5cb1-9ff6-139df04ba562',
        name: 'Dệt lụa truyền thống',
        price: 175000,
        duration_minutes: 75,
      },
    ],
    image_url: CRAFT_MEDIA.silk,
    primary_experience_id: 'c8281688-2dc1-5cb1-9ff6-139df04ba562',
    is_verified: true,
  },
  {
    provider_id: 'c8e989d4-88be-5b00-8382-a41177c4c16d',
    village_id: '85ec7215-3ec1-5792-afcc-a72d89a3a214',
    village_name: 'Sơn Đồng',
    business_name: 'Xưởng mộc mỹ nghệ Sơn Đồng',
    artisan_name: 'Nghệ nhân Nguyễn Văn Mộc',
    craft_type: 'Chạm khắc gỗ mỹ nghệ',
    location_address: 'Thôn nghề điêu khắc gỗ, Sơn Đồng, Hoài Đức, Hà Nội',
    description: 'Không gian thực hành điêu khắc gỗ truyền thống, chạm khắc hoa văn trên gỗ mít và làm quạt Chàng Sơn dưới sự hướng dẫn của nghệ nhân.',
    activities: [
      {
        experience_id: '67a2cbab-850c-5f69-b496-59f2e9a5f594',
        name: 'Tạc tượng dân gian & Chạm khắc hoa văn gỗ',
        price: 275000,
        duration_minutes: 135,
      },
    ],
    image_url: CRAFT_MEDIA.woodcarving,
    primary_experience_id: '67a2cbab-850c-5f69-b496-59f2e9a5f594',
    is_verified: false,
  },
  {
    provider_id: '84dfc919-6478-5e02-a8a5-b1e219432420',
    village_id: '3527fadf-18ef-58d0-95c6-dc3729650f6a',
    village_name: 'Đào Thục',
    business_name: 'Phường rối nước Đào Thục',
    artisan_name: 'Nghệ nhân Triệu Trung Hiếu',
    craft_type: 'Múa rối nước dân gian',
    location_address: 'Thôn Đào Thục, Thụy Lâm, Đông Anh, Hà Nội',
    description: 'Trải nghiệm lội nước học cách điều khiển con rối qua sào dây, xem diễn trò Tễu dân gian và tự tay tô vẽ con rối gỗ lưu niệm.',
    activities: [
      {
        experience_id: '8e485337-5a2c-5703-9fbf-5e0c6492cd87',
        name: 'Điều khiển rối nước',
        price: 300000,
        duration_minutes: 150,
      },
    ],
    image_url: CRAFT_MEDIA.waterpuppets,
    primary_experience_id: '8e485337-5a2c-5703-9fbf-5e0c6492cd87',
    is_verified: false,
  },
  {
    provider_id: '0858b5e8-89e1-577f-904a-562150c4fe4f',
    village_id: 'e482884e-7190-56cf-bc03-4e69614b1fe5',
    village_name: 'Phú Vinh',
    business_name: 'Xưởng thủ công Phú Vinh',
    artisan_name: 'Nghệ nhân Quách Minh Tâm',
    craft_type: 'Mây tre đan thủ công',
    location_address: 'Thôn Phú Vinh, An Khánh, Chương Mỹ, Hà Nội',
    description: 'Workshop đan giỏ tre, khay mây và trải nghiệm kỹ thuật vót nan, đan hoa văn đan lóng mốt, lóng đôi truyền thống.',
    activities: [
      {
        experience_id: 'd95bc77b-5e7b-53a6-a8af-5ccaabb485d8',
        name: 'Đan mây tre',
        price: 200000,
        duration_minutes: 90,
      },
    ],
    image_url: CRAFT_MEDIA.bamboo,
    primary_experience_id: 'd95bc77b-5e7b-53a6-a8af-5ccaabb485d8',
    is_verified: true,
  },
  {
    provider_id: '867719ea-c962-56a1-a88c-3f96e8d0af65',
    village_id: '688d408b-9d98-5b66-bfa7-659a67462108',
    village_name: 'Làng Chuông',
    business_name: 'Xưởng thủ công Chuông',
    artisan_name: 'Nghệ nhân Nông Thu Trang',
    craft_type: 'Làm nón lá truyền thống',
    location_address: 'Làng Chuông, Phương Trung, Thanh Oai, Hà Nội',
    description: 'Trải nghiệm là phẳng lá lụa, xếp nan vót tre và tự tay khâu từng mũi cước làm nón lá chuông kỷ niệm mang về.',
    activities: [
      {
        experience_id: 'b70bd0fa-6a81-5aec-9ff6-5303210b2fad',
        name: 'Làm nón lá',
        price: 225000,
        duration_minutes: 105,
      },
    ],
    image_url: CRAFT_MEDIA.conicalhats,
    primary_experience_id: 'b70bd0fa-6a81-5aec-9ff6-5303210b2fad',
    is_verified: true,
  },
  {
    provider_id: '484e5f78-4ebf-555b-8643-e180d3542ecf',
    village_id: 'b1017646-ec89-58d1-aaa9-df783b1c2506',
    village_name: 'Quất Động',
    business_name: 'Xưởng thủ công Quất Động',
    artisan_name: 'Nghệ nhân Hà Đức Anh',
    craft_type: 'Thêu tay truyền thống',
    location_address: 'Làng thêu Quất Động, Thường Tín, Hà Nội',
    description: 'Workshop căng khung thêu, phối chỉ màu tơ tằm và thực hành các đường kim thêu hoa văn truyền thống cùng nghệ nhân.',
    activities: [
      {
        experience_id: 'bad51dc8-1529-506a-8302-cb0b1d95954c',
        name: 'Thêu họa tiết',
        price: 250000,
        duration_minutes: 120,
      },
    ],
    image_url: CRAFT_MEDIA.embroidery,
    primary_experience_id: 'bad51dc8-1529-506a-8302-cb0b1d95954c',
    is_verified: true,
  },
  {
    provider_id: '3a5d2ffc-79fa-5b75-a1e6-82beea3bed59',
    village_id: '6dfbb5e9-f92e-58a0-b090-d67cea160f62',
    village_name: 'Hạ Thái',
    business_name: 'Xưởng thủ công Hạ Thái',
    artisan_name: 'Nghệ nhân Thái Ngọc Ánh',
    craft_type: 'Sơn mài mỹ nghệ',
    location_address: 'Thôn Hạ Thái, Duyên Thái, Thường Tín, Hà Nội',
    description: 'Trải nghiệm gắn vỏ trứng, quét then, rây bột bạc và mài nước hoàn thiện tác phẩm sơn mài nghệ thuật lưu niệm.',
    activities: [
      {
        experience_id: '800b5192-03c7-5953-849b-32a321e12a47',
        name: 'Vẽ sơn mài',
        price: 325000,
        duration_minutes: 165,
      },
    ],
    image_url: CRAFT_MEDIA.lacquer,
    primary_experience_id: '800b5192-03c7-5953-849b-32a321e12a47',
    is_verified: false,
  },
]

/**
 * Resolves Village Cards relevant to user query or AI response.
 */
export function resolveVillageCards(text: string): VillageCardData[] {
  const lower = text.toLowerCase()
  const matched = new Map<string, VillageCardData>()

  const check = (keywords: string[], villageId: string) => {
    if (keywords.some(k => lower.includes(k))) {
      const v = CATALOG_VILLAGES.find(x => x.village_id === villageId)
      if (v) matched.set(v.village_id, v)
    }
  }

  check(['mộc', 'chàng sơn', 'sơn đồng', 'gỗ', 'tạc tượng'], '85ec7215-3ec1-5792-afcc-a72d89a3a214')
  check(['gốm', 'bát tràng', 'vuốt', 'nặn gốm', 'gốm sứ'], '20896522-6235-5699-aeaf-f48b8150d895')
  check(['lụa', 'vạn phúc', 'dệt', 'tơ tằm'], 'c0d0d95f-d59c-5c35-946a-f397e380dd14')
  check(['rối', 'rối nước', 'đào thục', 'thủy đình'], '3527fadf-18ef-58d0-95c6-dc3729650f6a')
  check(['mây', 'tre', 'phú vinh', 'đan'], 'e482884e-7190-56cf-bc03-4e69614b1fe5')
  check(['nón', 'chuông', 'nón lá'], '688d408b-9d98-5b66-bfa7-659a67462108')
  check(['thêu', 'quất động', 'chỉ tơ'], 'b1017646-ec89-58d1-aaa9-df783b1c2506')
  check(['sơn mài', 'hạ thái', 'cẩn trứng'], '6dfbb5e9-f92e-58a0-b090-d67cea160f62')

  if (matched.size === 0) {
    const isGeneral = /(?:làng nghề|danh sách làng|gợi ý làng|tìm làng|các làng|gần sóc sơn|gần trung tâm|thủ công)/i.test(lower)
    if (isGeneral) {
      if (lower.includes('sóc sơn')) {
        return CATALOG_VILLAGES.filter(v => ['3527fadf-18ef-58d0-95c6-dc3729650f6a', '20896522-6235-5699-aeaf-f48b8150d895', '85ec7215-3ec1-5792-afcc-a72d89a3a214'].includes(v.village_id))
      }
      return CATALOG_VILLAGES.slice(0, 4)
    }
  }

  return Array.from(matched.values())
}

/**
 * Extracts maximum budget per person from query text (e.g. "dưới 150k", "< 150k", "ngân sách 200k", "150k trở xuống").
 */
export function parseBudgetConstraint(text: string): { maxPrice: number; isStrictlyUnder: boolean } | null {
  const lower = text.toLowerCase()

  // 1. Dạng "dưới / under / <" kèm số
  const strictMatch = lower.match(/(?:dưới|<|under)\s*(\d+(?:[.,]\d{3})*|\d+)\s*(k|nghìn|ngàn|tr|triệu|\.000|000)?\s*(?:vnd|đ|\/người|\/khách|\/pax)?/i)
  if (strictMatch) {
    let rawStr = (strictMatch[1] || '').trim()
    let cleanDigits = rawStr.replace(/[.,]/g, '')
    let amount = parseInt(cleanDigits, 10)
    const unit = (strictMatch[2] || '').toLowerCase()
    if (unit === 'k' || unit === 'nghìn' || unit === 'ngàn') amount *= 1000
    else if (unit === 'tr' || unit === 'triệu') amount *= 1000000
    else if (amount < 1000) amount *= 1000
    return { maxPrice: amount, isStrictlyUnder: true }
  }

  // 2. Dạng "ngân sách / budget / tối đa / tầm / khoảng / mức giá" kèm số
  const budgetMatch = lower.match(/(?:budget|ngân sách|tối đa|tầm|khoảng|mức giá)\s*(\d+(?:[.,]\d{3})*|\d+)\s*(k|nghìn|ngàn|tr|triệu|\.000|000)?\s*(?:vnd|đ|\/người|\/khách|\/pax|trở xuống)?/i)
  if (budgetMatch) {
    let rawStr = (budgetMatch[1] || '').trim()
    let cleanDigits = rawStr.replace(/[.,]/g, '')
    let amount = parseInt(cleanDigits, 10)
    const unit = (budgetMatch[2] || '').toLowerCase()
    if (unit === 'k' || unit === 'nghìn' || unit === 'ngàn') amount *= 1000
    else if (unit === 'tr' || unit === 'triệu') amount *= 1000000
    else if (amount < 1000) amount *= 1000
    return { maxPrice: amount, isStrictlyUnder: false }
  }

  // 3. Dạng số đứng trước "trở xuống / đổ lại / quay đầu" (ví dụ: "150k trở xuống")
  const suffixMatch = lower.match(/(\d+(?:[.,]\d{3})*|\d+)\s*(k|nghìn|ngàn|tr|triệu|\.000|000)?\s*(?:vnd|đ)?\s*(?:trở xuống|đổ lại|quay đầu)/i)
  if (suffixMatch) {
    let rawStr = (suffixMatch[1] || '').trim()
    let cleanDigits = rawStr.replace(/[.,]/g, '')
    let amount = parseInt(cleanDigits, 10)
    const unit = (suffixMatch[2] || '').toLowerCase()
    if (unit === 'k' || unit === 'nghìn' || unit === 'ngàn') amount *= 1000
    else if (unit === 'tr' || unit === 'triệu') amount *= 1000000
    else if (amount < 1000) amount *= 1000
    return { maxPrice: amount, isStrictlyUnder: false }
  }

  return null
}

/**
 * Resolves Provider Cards (up to 5) for a requested village or craft query.
 * Strictly respects budget constraints and verification.
 */
export function resolveProviderCards(text: string): ProviderCardData[] {
  const lower = text.toLowerCase()
  const budgetConstraint = parseBudgetConstraint(text)
  const matched = new Map<string, ProviderCardData>()

  const check = (keywords: string[], villageId: string) => {
    if (keywords.some(k => lower.includes(k))) {
      CATALOG_PROVIDERS.filter(p => p.village_id === villageId).forEach(p => {
        if (budgetConstraint) {
          const hasAffordable = p.activities.some(act => (act.price ?? 0) <= budgetConstraint.maxPrice)
          if (hasAffordable) matched.set(p.provider_id, p)
        } else {
          matched.set(p.provider_id, p)
        }
      })
    }
  }

  check(['mộc', 'chàng sơn', 'sơn đồng', 'gỗ'], '85ec7215-3ec1-5792-afcc-a72d89a3a214')
  check(['gốm', 'bát tràng'], '20896522-6235-5699-aeaf-f48b8150d895')
  check(['lụa', 'vạn phúc'], 'c0d0d95f-d59c-5c35-946a-f397e380dd14')
  check(['rối', 'đào thục'], '3527fadf-18ef-58d0-95c6-dc3729650f6a')
  check(['mây', 'tre', 'phú vinh'], 'e482884e-7190-56cf-bc03-4e69614b1fe5')
  check(['nón', 'chuông'], '688d408b-9d98-5b66-bfa7-659a67462108')
  check(['thêu', 'quất động'], 'b1017646-ec89-58d1-aaa9-df783b1c2506')
  check(['sơn mài', 'hạ thái'], '6dfbb5e9-f92e-58a0-b090-d67cea160f62')

  if (matched.size === 0) {
    const isProviderList = /(?:danh sách xưởng|xưởng tại|xưởng nghề|local provider|cơ sở thủ công|nghệ nhân)/i.test(lower)
    if (isProviderList) {
      let pool = CATALOG_PROVIDERS.filter(p => p.is_verified)
      if (budgetConstraint) {
        pool = pool.filter(p => p.activities.some(act => (act.price ?? 0) <= budgetConstraint.maxPrice))
      }
      return pool.slice(0, 4)
    }
  }

  let finalProviders = Array.from(matched.values())
  if (budgetConstraint) {
    finalProviders = finalProviders.filter(p => p.activities.some(act => (act.price ?? 0) <= budgetConstraint.maxPrice))
  }
  return finalProviders
}

/**
 * Detects whether the user is explicitly requesting lowest price (cheapest) or highest price (premium).
 */
export function detectPriceSortPreference(text: string): 'lowest' | 'highest' | undefined {
  if (!text) return undefined
  const lower = text.toLowerCase()
  if (/(?:giá rẻ|giá thấp|rẻ nhất|thấp nhất|chi phí thấp|tiết kiệm|bình dân|giá mềm|cheapest|lowest price|budget friendly)/i.test(lower)) {
    return 'lowest'
  }
  if (/(?:giá cao|cao cấp|đắt nhất|đắt tiền|vip|luxury|premium|highest price|thượng lưu)/i.test(lower)) {
    return 'highest'
  }
  return undefined
}

/**
 * Resolves Activity / Experience Cards relevant to text.
 * Strictly enforces budget ceilings (e.g. "dưới 150k" rejects activities > 150k).
 */
export function resolveActivityCards(text: string): ActivityCardData[] {
  const lower = text.toLowerCase()
  const budgetConstraint = parseBudgetConstraint(text)
  const priceSort = detectPriceSortPreference(text)
  const isSightseeingOnly = /(?:chỉ muốn tham quan|chỉ tham quan|không trải nghiệm|không làm|không workshop|muốn tham quan thôi|chỉ ngắm|không làm đồ)/i.test(lower)
  const isSightseeingRequested = /(?:tham quan|ngắm cảnh|vãn cảnh|đi dạo|bảo tàng|check-in)/i.test(lower)
  const matched = new Map<string, ActivityCardData>()

  if (isSightseeingOnly) {
    let pool = CATALOG_ACTIVITIES.filter(a => a.category === 'Sightseeing' && a.is_verified)
    if (budgetConstraint) {
      pool = pool.filter(a => a.price_per_person <= budgetConstraint.maxPrice)
    }
    if (priceSort === 'lowest') {
      pool.sort((a, b) => a.price_per_person - b.price_per_person)
    } else if (priceSort === 'highest') {
      pool.sort((a, b) => b.price_per_person - a.price_per_person)
    }
    return pool.slice(0, 4)
  }

  const check = (keywords: string[], expId: string) => {
    if (keywords.some(k => lower.includes(k))) {
      const act = CATALOG_ACTIVITIES.find(a => a.experience_id === expId)
      if (act) {
        if (budgetConstraint && act.price_per_person > budgetConstraint.maxPrice) {
          return
        }
        matched.set(act.experience_id, act)
      }
    }
  }

  check(['gốm', 'bát tràng', 'nặn gốm', 'vuốt gốm'], 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69')
  check(['lụa', 'vạn phúc', 'dệt lụa', 'ươm tơ'], 'c8281688-2dc1-5cb1-9ff6-139df04ba562')
  check(['mộc', 'chàng sơn', 'sơn đồng', 'tạc tượng', 'gỗ'], '67a2cbab-850c-5f69-b496-59f2e9a5f594')
  check(['rối', 'rối nước', 'đào thục', 'thủy đình'], '8e485337-5a2c-5703-9fbf-5e0c6492cd87')
  check(['mây', 'tre', 'phú vinh', 'đan giỏ'], 'd95bc77b-5e7b-53a6-a8af-5ccaabb485d8')
  check(['nón', 'chuông', 'nón lá'], 'b70bd0fa-6a81-5aec-9ff6-5303210b2fad')
  check(['thêu', 'quất động', 'thêu tay'], 'bad51dc8-1529-506a-8302-cb0b1d95954c')
  check(['sơn mài', 'hạ thái', 'vẽ tranh'], '800b5192-03c7-5953-849b-32a321e12a47')
  check(['bảo tàng gốm', 'lò bầu', 'tham quan bát tràng'], 'exp-bat-trang-sightseeing')
  check(['phố lụa', 'tham quan vạn phúc'], 'exp-van-phuc-sightseeing')
  check(['đình chàng sơn', 'tham quan chàng sơn'], 'exp-chang-son-sightseeing')

  if (matched.size === 0) {
    const isActivityQuery = /(?:hoạt động|trải nghiệm|workshop|tham quan|làm gì|có gì chơi|thực hành|dưới|ngân sách|budget|<|giá)/i.test(lower)
    if (isActivityQuery) {
      let pool = CATALOG_ACTIVITIES.filter(a => a.is_verified)
      if (isSightseeingRequested) {
        const sightPool = pool.filter(a => a.category === 'Sightseeing')
        if (sightPool.length > 0) pool = sightPool
      }
      if (budgetConstraint) {
        pool = pool.filter(a => a.price_per_person <= budgetConstraint.maxPrice)
      }
      if (priceSort === 'lowest') {
        pool.sort((a, b) => a.price_per_person - b.price_per_person)
      } else if (priceSort === 'highest') {
        pool.sort((a, b) => b.price_per_person - a.price_per_person)
      }
      return pool.slice(0, 4)
    }
  }

  let finalCards = Array.from(matched.values())
  if (budgetConstraint) {
    finalCards = finalCards.filter(a => a.price_per_person <= budgetConstraint.maxPrice)
  }
  if (priceSort === 'lowest') {
    finalCards.sort((a, b) => a.price_per_person - b.price_per_person)
  } else if (priceSort === 'highest') {
    finalCards.sort((a, b) => b.price_per_person - a.price_per_person)
  }
  return finalCards
}
