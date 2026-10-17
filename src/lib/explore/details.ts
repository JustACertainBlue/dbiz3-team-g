import { eligibleRows, findExperienceCard, resolveViewer, type ExploreSeed, type ExperienceCard, type Viewer } from './catalog';
import { calculateAvailability, defaultAvailabilityPeriod } from './availability';

type PublicBlock = { start_at: string; end_at: string; status: string };
type Contact = { phone?: string; email?: string };

function asJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function approvedViewer(seed: ExploreSeed, viewer: Viewer): Viewer {
  return viewer.kind === 'agency' ? resolveViewer(seed, viewer.agencyId, true) : viewer;
}

function mediaKeys(seed: ExploreSeed, fileIds: string[]): string[] {
  const files = new Map(seed.stored_files.map(file => [file.file_id, file]));
  return fileIds.flatMap(id => {
    const file = files.get(id);
    return file?.media_type.startsWith('image/') ? [file.storage_key] : [];
  });
}

function contact(value: string | undefined): Contact {
  const raw = asJson<{ phone_number?: string; business_email?: string }>(value, {});
  return { phone: raw.phone_number, email: raw.business_email };
}

export interface ProviderDetail {
  provider_id: string;
  provider_name: string;
  craft_type: string;
  village_name: string;
  location_address: string;
  public_bio: string;
  public_images: string[];
  experiences: ExperienceCard[];
  private_contact: Contact | null;
  booking_conditions: Record<string, unknown> | null;
}

export function getProviderDetail(seed: ExploreSeed, providerId: string, viewer: Viewer): ProviderDetail | null {
  const rows = eligibleRows(seed).filter(row => row.provider.provider_id === providerId);
  if (rows.length === 0) return null;
  const { version, village } = rows[0];
  const permitted = approvedViewer(seed, viewer).kind === 'agency';
  const media = (seed.provider_version_media ?? [])
    .filter(row => row.provider_id === providerId && row.version_no === version.version_no)
    .sort((a, b) => Number(a.display_order) - Number(b.display_order));
  return {
    provider_id: providerId,
    provider_name: version.business_name,
    craft_type: version.craft_type,
    village_name: village.name,
    location_address: version.location_address,
    public_bio: version.description ?? '',
    public_images: mediaKeys(seed, media.map(row => row.file_id)),
    experiences: rows.map(row => findExperienceCard(seed, row.experience.experience_id, viewer)!),
    private_contact: permitted ? contact(version.contact_information) : null,
    booking_conditions: permitted ? asJson<Record<string, unknown>>(version.booking_conditions, {}) : null
  };
}

export interface ExperienceDetail {
  card: ExperienceCard;
  provider_id: string;
  provider_public_bio: string;
  provider_private_contact: Contact | null;
  gallery: string[];
  experience_location_address: string;
  availability_summary: {
    operating_hours: Array<{ weekday: number; local_start: string; local_end: string }>;
    available_slots: Array<{ start_at: string; end_at: string }>;
    blocked_slots: PublicBlock[];
  };
  pricing_breakdown: { price_per_person: number; group_discounts: Array<{ pax_threshold: number; discount_percentage: number }> } | null;
  operational_booking_info: { class_hours: Array<{ weekday: number; local_start: string; local_end: string }>;
    booking_lead_time: number; cancellation_policy: Record<string, unknown>; provider_booking_conditions: Record<string, unknown> } | null;
  related_experiences: ExperienceCard[];
  other_craft_suggestions: ExperienceCard[];
}

export function getExperienceDetail(seed: ExploreSeed, experienceId: string, viewer: Viewer,
  period = defaultAvailabilityPeriod()): ExperienceDetail | null {
  const selected = eligibleRows(seed).find(row => row.experience.experience_id === experienceId);
  if (!selected) return null;
  const card = findExperienceCard(seed, experienceId, viewer)!;
  const permitted = approvedViewer(seed, viewer).kind === 'agency';
  const { experience, provider, version } = selected;
  const media = seed.profile_media
    .filter(row => row.experience_id === experienceId)
    .sort((a, b) => Number(a.display_order) - Number(b.display_order));
  const related = eligibleRows(seed)
    .filter(row => row.experience.experience_id !== experienceId &&
      (row.provider.provider_id === provider.provider_id || row.experience.category === experience.category))
    .sort((a, b) => Number(b.provider.provider_id === provider.provider_id) - Number(a.provider.provider_id === provider.provider_id)
      || a.experience.name.localeCompare(b.experience.name, 'vi'));
  const otherCrafts = eligibleRows(seed)
    .filter(row => row.experience.category !== experience.category && row.provider.provider_id !== provider.provider_id)
    .sort((a, b) => a.experience.name.localeCompare(b.experience.name, 'vi'));
  return {
    card,
    provider_id: provider.provider_id,
    provider_public_bio: version.description ?? '',
    provider_private_contact: permitted ? contact(version.contact_information) : null,
    gallery: mediaKeys(seed, media.map(row => row.file_id)),
    experience_location_address: experience.experience_location_address,
    availability_summary: calculateAvailability(provider.provider_id, seed.provider_operating_hours ?? [], seed.bookings ?? [], period),
    pricing_breakdown: permitted ? {
      price_per_person: Number(experience.price_per_person),
      group_discounts: (seed.experience_discount_rules ?? [])
        .filter(row => row.experience_id === experienceId && row.rule_kind === 'Group Discount')
        .map(row => ({ pax_threshold: Number(row.pax_threshold), discount_percentage: Number(row.discount_percentage) }))
    } : null,
    operational_booking_info: permitted ? {
      class_hours: (seed.provider_operating_hours ?? []).filter(row => row.provider_id === provider.provider_id)
        .map(row => ({ weekday: Number(row.weekday), local_start: row.local_start, local_end: row.local_end })),
      booking_lead_time: Number(experience.notice_period_hours),
      cancellation_policy: asJson<Record<string, unknown>>(experience.cancellation_policy, {}),
      provider_booking_conditions: asJson<Record<string, unknown>>(version.booking_conditions, {})
    } : null,
    related_experiences: related.map(row => findExperienceCard(seed, row.experience.experience_id, viewer)!),
    other_craft_suggestions: otherCrafts.map(row => findExperienceCard(seed, row.experience.experience_id, viewer)!)
  };
}
