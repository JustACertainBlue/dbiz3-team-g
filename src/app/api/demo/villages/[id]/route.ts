import { filterAsync } from '@/lib/db/async-collections'
import { NextResponse } from 'next/server'
import { demoRepository } from '@/lib/db/application-store'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { eligibleRows, resolveViewer, toCard } from '@/lib/explore/catalog'
import { loadExploreRuntime } from '@/lib/explore/seed-repository'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const repository = demoRepository()
  const village = (await repository.find('villages', row => row.village_id === params.id))
  if (!village) return NextResponse.json({ error: 'Village not found' }, { status: 404 })

  const providers = (await Promise.all((await filterAsync((await repository.all('provider_profiles')),async row => village.is_active==='true' && row.village_id === village.village_id && row.verification_status === 'Verified' && Boolean(row.published_version_no) && (await repository.find('provider_profile_versions',version=>version.provider_id===row.provider_id && version.version_no===row.published_version_no))?.version_status==='Verified' && (await repository.find('user_accounts',user=>user.user_id===row.user_id))?.account_status==='Active'))
    .map(async provider => {
      const version = (await repository.find('provider_profile_versions', row =>
        row.provider_id === provider.provider_id && row.version_no === provider.published_version_no))
      const experienceCount = (await repository.all('experiences'))
        .filter(row => row.provider_id === provider.provider_id && !row.archived_at).length
      return {
        provider_id: provider.provider_id,
        business_name: version?.business_name || 'Local Provider',
        craft_type: version?.craft_type || 'Traditional craft',
        description: version?.description || '',
        location_address: version?.location_address || '',
        experience_count: experienceCount,
      }
    })))

  return NextResponse.json({
    village: {
      village_id: village.village_id,
      source_code: village.source_code,
      name: village.name,
      district: village.district,
      city_province: village.city_province,
      is_active: village.is_active === 'true',
    },
    providers,
    featured_experiences: await featuredExperiences(request, providers.map(provider => provider.provider_id)),
  })
}

// VIL030 §3 #4 (#227): the F-EXPLORE-02 card of each eligible Experience of the village's listed Providers — image,
// workshop name, and the price only for a permitted viewer (Tour Agency), exactly as the Explore cards decide it.
async function featuredExperiences(request: Request, providerIds: string[]) {
  const seed = await loadExploreRuntime()
  const session = await sessionContextFromRequest(request)
  const viewer = resolveViewer(seed, session.role === 'Tour_Agency' ? session.agencyId : null, true)
  return eligibleRows(seed)
    .filter(row => providerIds.includes(row.provider.provider_id))
    .slice(0, 6)
    .map(row => toCard(seed, row, viewer))
    .map(card => ({
      experience_id: card.id, name: card.name, category: card.type, duration_minutes: card.duration_minutes,
      max_participants: card.capacity.max_pax, provider_name: card.provider_name, image: card.images[0]?.storage_key ?? null,
      ...(card.price !== null ? { price_per_person: card.price } : {}),
    }))
}
