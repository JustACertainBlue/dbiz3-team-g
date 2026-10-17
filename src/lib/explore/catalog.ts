export type CsvRow = Record<string, string>;

export interface ExploreSeed {
  experiences: CsvRow[];
  provider_profiles: CsvRow[];
  provider_profile_versions: CsvRow[];
  villages: CsvRow[];
  user_accounts: CsvRow[];
  agency_profiles: CsvRow[];
  agency_preference_profiles: CsvRow[];
  profile_media: CsvRow[];
  stored_files: CsvRow[];
  provider_operating_hours?: CsvRow[];
  bookings?: CsvRow[];
  experience_discount_rules?: CsvRow[];
  provider_version_media?: CsvRow[];
  ranking_parameter_versions?: CsvRow[];
  explore_interactions?: CsvRow[];
  explore_sessions?: CsvRow[];
}

export type Viewer = { kind: 'guest' } | { kind: 'agency'; agencyId: string };

export interface ExperienceCard {
  id: string;
  provider_id: string;
  name: string;
  type: string;
  location: { village_name: string };
  provider_name: string;
  images: Array<{ storage_key: string }>;
  description: string;
  duration_minutes: number;
  capacity: { min_pax: 1; max_pax: number };
  price: number | null;
  actions: { view_details: true; request_quote: boolean; chat: boolean };
}

export interface ExplorePage {
  experience_cards: ExperienceCard[];
  pagination: { page: number; page_size: number; total_count: number };
}

export function resolveViewer(seed: ExploreSeed, agencyId: string | null | undefined, allowDemo: boolean): Viewer {
  if (!allowDemo || !agencyId) return { kind: 'guest' };
  const agency = seed.agency_profiles.find(row => row.agency_id === agencyId);
  const account = agency && seed.user_accounts.find(row => row.user_id === agency.user_id);
  return account?.role_code === 'Tour_Agency' && account.account_status === 'Approved'
    ? { kind: 'agency', agencyId }
    : { kind: 'guest' };
}

export function eligibleRows(seed: ExploreSeed): Array<{ experience: CsvRow; provider: CsvRow; version: CsvRow; village: CsvRow }> {
  const providers = new Map(seed.provider_profiles.map(row => [row.provider_id, row]));
  const villages = new Map(seed.villages.map(row => [row.village_id, row]));
  const accounts = new Map(seed.user_accounts.map(row => [row.user_id, row]));
  const versions = new Map(seed.provider_profile_versions.map(row => [`${row.provider_id}:${row.version_no}`, row]));

  return seed.experiences.flatMap(experience => {
    const provider = providers.get(experience.provider_id);
    if (!provider || experience.archived_at || provider.verification_status !== 'Verified' || !provider.published_version_no) return [];
    const version = versions.get(`${provider.provider_id}:${provider.published_version_no}`);
    const village = villages.get(provider.village_id);
    const account = accounts.get(provider.user_id);
    if (!version || version.version_status !== 'Verified' || !village || village.is_active !== 'true' || account?.account_status !== 'Active') return [];
    return [{ experience, provider, version, village }];
  }).sort((a, b) => a.experience.name.localeCompare(b.experience.name, 'vi') || a.experience.experience_id.localeCompare(b.experience.experience_id));
}

function toCard(seed: ExploreSeed, row: ReturnType<typeof eligibleRows>[number], viewer: Viewer): ExperienceCard {
  const { experience, version, village } = row;
  const files = new Map(seed.stored_files.map(file => [file.file_id, file]));
  const images = seed.profile_media
    .filter(media => media.experience_id === experience.experience_id && files.get(media.file_id)?.media_type.startsWith('image/'))
    .sort((a, b) => Number(a.display_order) - Number(b.display_order))
    .map(media => ({ storage_key: files.get(media.file_id)!.storage_key }));
  const isAgency = viewer.kind === 'agency';
  return {
    id: experience.experience_id,
    provider_id: row.provider.provider_id,
    name: experience.name,
    type: experience.category,
    location: { village_name: village.name },
    provider_name: version.business_name,
    images,
    description: experience.description,
    duration_minutes: Number(experience.duration_minutes),
    capacity: { min_pax: 1, max_pax: Number(experience.max_participants) },
    price: isAgency ? Number(experience.price_per_person) : null,
    actions: { view_details: true, request_quote: isAgency, chat: isAgency }
  };
}

function safeViewer(seed: ExploreSeed, viewer: Viewer): Viewer {
  return viewer.kind === 'agency' ? resolveViewer(seed, viewer.agencyId, true) : viewer;
}

export function buildExplorePage(
  seed: ExploreSeed,
  options: { page?: number; pageSize?: number; viewer: Viewer; category?: string; rankOrder?: string[] }
): ExplorePage {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 12;
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new RangeError('page and page_size must be positive integers; page_size max is 50');
  }
  const eligible = eligibleRows(seed).filter(row => !options.category || row.experience.category === options.category);
  if (options.rankOrder) {
    const positions = new Map(options.rankOrder.map((id, index) => [id, index]));
    eligible.sort((a, b) => (positions.get(a.experience.experience_id) ?? Number.MAX_SAFE_INTEGER) -
      (positions.get(b.experience.experience_id) ?? Number.MAX_SAFE_INTEGER));
  }
  const selected = eligible.slice((page - 1) * pageSize, page * pageSize);
  const viewer = safeViewer(seed, options.viewer);
  return {
    experience_cards: selected.map(row => toCard(seed, row, viewer)),
    pagination: { page, page_size: pageSize, total_count: eligible.length }
  };
}

export function findExperienceCard(seed: ExploreSeed, id: string, viewer: Viewer): ExperienceCard | null {
  const row = eligibleRows(seed).find(item => item.experience.experience_id === id);
  return row ? toCard(seed, row, safeViewer(seed, viewer)) : null;
}
