import { NextResponse } from 'next/server'
import { demoRepository } from '@/lib/demo/json-repository'

export function GET(_request: Request, { params }: { params: { id: string } }) {
  const repository = demoRepository()
  const village = repository.find('villages', row => row.village_id === params.id)
  if (!village) return NextResponse.json({ error: 'Village not found' }, { status: 404 })

  const providers = repository.all('provider_profiles')
    .filter(row => row.village_id === village.village_id && row.verification_status === 'Verified')
    .map(provider => {
      const version = repository.find('provider_profile_versions', row =>
        row.provider_id === provider.provider_id && row.version_no === provider.published_version_no)
      const experienceCount = repository.all('experiences')
        .filter(row => row.provider_id === provider.provider_id && !row.archived_at).length
      return {
        provider_id: provider.provider_id,
        business_name: version?.business_name || 'Local Provider',
        craft_type: version?.craft_type || 'Traditional craft',
        description: version?.description || '',
        location_address: version?.location_address || '',
        experience_count: experienceCount,
      }
    })

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
  })
}
