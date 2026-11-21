// Screen 32, read-only "Nghề và làng nghề": "<craft> · Làng <village>". Craft = villages.editorial_craft, else the Vietnamese label of the
// published version's craft_type (same rule as every v3 page head: rowCraft). Read only; nothing is written.
import { demoRepository } from '@/lib/db/application-store'
import { rowCraft } from '@/lib/explore/vocabulary'

export function craftLine(craftType: string | undefined, village: { name?: string; editorial_craft?: string } | undefined): string {
  const craft = craftType === undefined && !village?.editorial_craft?.trim() ? '' : rowCraft(craftType, village)
  return [craft, village?.name ? `Làng ${village.name}` : ''].filter(Boolean).join(' · ')
}

export async function providerCraftLine(providerId: string): Promise<string> {
  const repository = demoRepository()
  const profile = await repository.find('provider_profiles', row => row.provider_id === providerId)
  if (!profile) return ''
  const versionNo = profile.published_version_no || profile.current_version_no
  const [version, village] = await Promise.all([
    repository.find('provider_profile_versions', row => row.provider_id === providerId && row.version_no === versionNo),
    repository.find('villages', row => row.village_id === profile.village_id),
  ])
  return craftLine(version?.craft_type, village)
}
