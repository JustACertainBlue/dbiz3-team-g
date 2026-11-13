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
  },
]

/**
 * Resolves Village Cards relevant to user query or AI response.
 */
export function resolveVillageCards(text: string): VillageCardData[] {
  const lower = text.toLowerCase()

  // Match specific craft or village
  if (lower.includes('mộc') || lower.includes('chàng sơn') || lower.includes('sơn đồng') || lower.includes('gỗ')) {
    return CATALOG_VILLAGES.filter(v => v.village_id === '85ec7215-3ec1-5792-afcc-a72d89a3a214')
  }
  if (lower.includes('gốm') || lower.includes('bát tràng')) {
    return CATALOG_VILLAGES.filter(v => v.village_id === '20896522-6235-5699-aeaf-f48b8150d895')
  }
  if (lower.includes('lụa') || lower.includes('vạn phúc')) {
    return CATALOG_VILLAGES.filter(v => v.village_id === 'c0d0d95f-d59c-5c35-946a-f397e380dd14')
  }
  if (lower.includes('rối nước') || lower.includes('đào thục')) {
    return CATALOG_VILLAGES.filter(v => v.village_id === '3527fadf-18ef-58d0-95c6-dc3729650f6a')
  }
  if (lower.includes('mây tre') || lower.includes('phú vinh')) {
    return CATALOG_VILLAGES.filter(v => v.village_id === 'e482884e-7190-56cf-bc03-4e69614b1fe5')
  }
  if (lower.includes('nón') || lower.includes('chuông')) {
    return CATALOG_VILLAGES.filter(v => v.village_id === '688d408b-9d98-5b66-bfa7-659a67462108')
  }
  if (lower.includes('thêu') || lower.includes('quất động')) {
    return CATALOG_VILLAGES.filter(v => v.village_id === 'b1017646-ec89-58d1-aaa9-df783b1c2506')
  }
  if (lower.includes('sơn mài') || lower.includes('hạ thái')) {
    return CATALOG_VILLAGES.filter(v => v.village_id === '6dfbb5e9-f92e-58a0-b090-d67cea160f62')
  }

  // If user asks about villages in general, near Soc Son, or near center
  const isGeneralVillageInquiry = /(?:làng nghề|danh sách làng|gợi ý làng|tìm làng|các làng|gần sóc sơn|gần trung tâm)/i.test(lower)
  if (isGeneralVillageInquiry) {
    if (lower.includes('sóc sơn')) {
      // Near Soc Son: Dao Thuc (Dong Anh ~20 min), Bat Trang, Son Dong
      return CATALOG_VILLAGES.filter(v => ['3527fadf-18ef-58d0-95c6-dc3729650f6a', '20896522-6235-5699-aeaf-f48b8150d895', '85ec7215-3ec1-5792-afcc-a72d89a3a214'].includes(v.village_id))
    }
    // Return top 3 well-known villages
    return CATALOG_VILLAGES.slice(0, 3)
  }

  return []
}

/**
 * Resolves Provider Cards (up to 5) for a requested village or craft query.
 */
export function resolveProviderCards(text: string): ProviderCardData[] {
  const lower = text.toLowerCase()

  // Specific village provider list request (e.g., triggered by clicking "Xem danh sách xưởng nghề" button)
  const isProviderListQuery = /(?:danh sách xưởng|xưởng tại|xưởng nghề|local providers?|các xưởng|cơ sở thủ công)/i.test(lower)

  if (lower.includes('bát tràng') || (isProviderListQuery && lower.includes('gốm'))) {
    return CATALOG_PROVIDERS.filter(p => p.village_id === '20896522-6235-5699-aeaf-f48b8150d895').slice(0, 5)
  }
  if (lower.includes('vạn phúc') || (isProviderListQuery && lower.includes('lụa'))) {
    return CATALOG_PROVIDERS.filter(p => p.village_id === 'c0d0d95f-d59c-5c35-946a-f397e380dd14').slice(0, 5)
  }
  if (lower.includes('sơn đồng') || lower.includes('chàng sơn') || (isProviderListQuery && lower.includes('mộc'))) {
    return CATALOG_PROVIDERS.filter(p => p.village_id === '85ec7215-3ec1-5792-afcc-a72d89a3a214').slice(0, 5)
  }
  if (lower.includes('đào thục') || (isProviderListQuery && lower.includes('rối nước'))) {
    return CATALOG_PROVIDERS.filter(p => p.village_id === '3527fadf-18ef-58d0-95c6-dc3729650f6a').slice(0, 5)
  }
  if (lower.includes('phú vinh') || (isProviderListQuery && lower.includes('mây tre'))) {
    return CATALOG_PROVIDERS.filter(p => p.village_id === 'e482884e-7190-56cf-bc03-4e69614b1fe5').slice(0, 5)
  }
  if (lower.includes('chuông') || (isProviderListQuery && lower.includes('nón'))) {
    return CATALOG_PROVIDERS.filter(p => p.village_id === '688d408b-9d98-5b66-bfa7-659a67462108').slice(0, 5)
  }
  if (lower.includes('quất động') || (isProviderListQuery && lower.includes('thêu'))) {
    return CATALOG_PROVIDERS.filter(p => p.village_id === 'b1017646-ec89-58d1-aaa9-df783b1c2506').slice(0, 5)
  }
  if (lower.includes('hạ thái') || (isProviderListQuery && lower.includes('sơn mài'))) {
    return CATALOG_PROVIDERS.filter(p => p.village_id === '6dfbb5e9-f92e-58a0-b090-d67cea160f62').slice(0, 5)
  }

  // If user says "xem danh sách xưởng" without naming village, show top verified providers
  if (isProviderListQuery) {
    return CATALOG_PROVIDERS.slice(0, 5)
  }

  return []
}
