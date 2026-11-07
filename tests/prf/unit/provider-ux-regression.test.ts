import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { cancellationPatch, readCancellationPolicy } from '@/lib/prf/experience-terms'
import { getExperienceById, updateExperience, deleteExperience } from '@/lib/prf/experience-service'
import { getProviderProfile, updateProviderProfile } from '@/lib/prf/provider-service'
import { getProviderDetail } from '@/lib/explore/details'
import { providerCompletion } from '@/lib/prf/provider-completion'
import { toSessionContext } from '@/lib/auth/session'
import { providerSession, guestSession, ubndSession, SEED_IDS } from '../helpers/mockSession'
import type { ExploreSeed } from '@/lib/explore/catalog'

const owner=providerSession()
const repo=demoRepository()
let experienceId:string
beforeEach(()=>{
  repo.reset()
  experienceId=repo.all('experiences').find(row=>row.provider_id===owner.providerId)!.experience_id
})

describe('Provider UX: terms, discounts and destructive-action preview',()=>{
  it('keeps a custom legacy cancellation policy byte-for-byte on unrelated edits',async()=>{
    const saved=JSON.stringify({before_hours:72,refund_percent:35,notes:'Synthetic terms',custom:{approved:true}})
    repo.update('experiences',row=>row.experience_id===experienceId,{cancellation_policy:saved})
    const initial=readCancellationPolicy(saved)
    await updateExperience(experienceId,owner,{description:'Updated synthetic description',...cancellationPatch(initial,{...initial})})
    expect(repo.find('experiences',row=>row.experience_id===experienceId)?.cancellation_policy).toBe(saved)
    await updateExperience(experienceId,owner,cancellationPatch(initial,{...initial,notes:'Changed note'}))
    expect(JSON.parse(repo.find('experiences',row=>row.experience_id===experienceId)!.cancellation_policy)).toMatchObject({before_hours:72,refund_percent:35,custom:{approved:true},notes:'Changed note'})
  })
  it('persists both discount kinds and preserves them when the patch omits them',async()=>{
    const group=[{pax_threshold:20,discount_percentage:10}], special=[{pax_threshold:40,discount_percentage:15}]
    await updateExperience(experienceId,owner,{group_discounts:group,special_rates:special})
    await updateExperience(experienceId,owner,{description:'Only description changed'})
    expect(await getExperienceById(experienceId)).toMatchObject({group_discounts:group,special_rates:special})
    await updateExperience(experienceId,owner,{group_discounts:[]})
    expect(await getExperienceById(experienceId)).toMatchObject({group_discounts:[],special_rates:special})
  })
  it.each([
    {group_discounts:[{pax_threshold:20,discount_percentage:101}]},
    {group_discounts:[{pax_threshold:20,discount_percentage:10},{pax_threshold:20,discount_percentage:15}]},
    {cancellation_policy:{rules:[{threshold_hours:-1,fee_percentage:10}]}},
  ])('rejects invalid terms without persisting other changes: %j',async input=>{
    const before=repo.find('experiences',row=>row.experience_id===experienceId)
    await expect(updateExperience(experienceId,owner,{...input,description:'Must not persist'})).rejects.toMatchObject({statusCode:400})
    expect(repo.find('experiences',row=>row.experience_id===experienceId)).toEqual(before)
  })
  it('previews block/archive/delete consistently with the final booking check',async()=>{
    repo.remove('bookings',row=>row.experience_id===experienceId)
    expect(await getExperienceById(experienceId)).toMatchObject({deletion_outcome:'delete'})
    repo.insert('bookings',{booking_id:'synthetic-preview',experience_id:experienceId,status:'Booked'})
    expect(await getExperienceById(experienceId)).toMatchObject({deletion_outcome:'blocked'})
    await expect(deleteExperience(experienceId,owner)).rejects.toMatchObject({statusCode:409})
    repo.update('bookings',row=>row.booking_id==='synthetic-preview',{status:'Completed'})
    expect(await getExperienceById(experienceId)).toMatchObject({deletion_outcome:'archive'})
    expect(await deleteExperience(experienceId,owner)).toMatchObject({action:'archived'})
  })
})

describe('Provider UX: versioned documents and public detail',()=>{
  it('attaches a replacement certificate to a revision, preserving the public certificate',async()=>{
    const provider=repo.find('provider_profiles',row=>row.provider_id===owner.providerId)!
    const original=repo.all('provider_version_documents').filter(row=>row.provider_id===owner.providerId && row.version_no===provider.published_version_no)
    const fileId='d0e88c01-6902-4e9b-a755-e212c251aa01'
    repo.insert('stored_files',{file_id:fileId,uploaded_by:owner.userId!,media_type:'application/pdf',storage_key:`prf-media/${fileId}`,file_name:'synthetic-certificate.pdf'})
    await updateProviderProfile(owner.providerId!,owner,{certificate_file_id:fileId})
    const updated=repo.find('provider_profiles',row=>row.provider_id===owner.providerId)!
    expect(updated.published_version_no).toBe(provider.published_version_no)
    expect(updated.current_version_no).not.toBe(provider.published_version_no)
    expect(repo.all('provider_version_documents').filter(row=>row.provider_id===owner.providerId && row.version_no===provider.published_version_no)).toEqual(original)
    expect(repo.find('provider_version_documents',row=>row.provider_id===owner.providerId && row.version_no===updated.current_version_no && row.document_type==='Business Registration Certificate')?.file_id).toBe(fileId)
    expect(await getProviderProfile(owner.providerId!,guestSession())).not.toHaveProperty('business_registration_certificate')
    expect(await getProviderProfile(owner.providerId!,ubndSession(SEED_IDS.village2))).not.toHaveProperty('business_registration_certificate')
  })
  it('rejects another owner’s file and PDF gallery items before creating revisions',async()=>{
    const fileId='d0e88c01-6902-4e9b-a755-e212c251aa02'
    const before=repo.all('provider_profile_versions')
    repo.insert('stored_files',{file_id:fileId,uploaded_by:'another-user',media_type:'application/pdf'})
    await expect(updateProviderProfile(owner.providerId!,owner,{certificate_file_id:fileId})).rejects.toMatchObject({statusCode:403})
    repo.update('stored_files',row=>row.file_id===fileId,{uploaded_by:owner.userId!})
    await expect(updateProviderProfile(owner.providerId!,owner,{profile_images:[{file_id:fileId,category:'Activity'}]})).rejects.toMatchObject({statusCode:403})
    expect(repo.all('provider_profile_versions')).toEqual(before)
  })
  it('preserves unedited booking-condition keys on a partial operational change',async()=>{
    const provider=repo.find('provider_profiles',row=>row.provider_id===owner.providerId)!
    await updateProviderProfile(owner.providerId!,owner,{booking_conditions:{notice_hours:48,notes:'Synthetic note',deposit_percentage:20}})
    const version=repo.find('provider_profile_versions',row=>row.provider_id===owner.providerId && row.version_no===provider.current_version_no)!
    expect(JSON.parse(version.booking_conditions)).toEqual({notice_hours:48,notes:'Synthetic note',deposit_percentage:20})
  })
  it('applies catalog visibility to the public profile API and marks metadata-only certificates unavailable',async()=>{
    const profile=await getProviderProfile(owner.providerId!,owner)
    expect(profile?.business_registration_certificate).toMatchObject({available:false})
    repo.update('user_accounts',row=>row.user_id===owner.userId,{account_status:'Suspended'})
    expect(await getProviderProfile(owner.providerId!,guestSession())).toBeNull()
    expect(await getProviderProfile(owner.providerId!,owner)).not.toBeNull()
  })
  it('shows a published Provider with an empty catalog; suspended Providers remain hidden',()=>{
    const tables=['experiences','provider_profiles','provider_profile_versions','villages','user_accounts','agency_profiles','agency_preference_profiles','profile_media','stored_files']
    const seed=repo.snapshot(tables) as unknown as ExploreSeed
    seed.experiences=seed.experiences.filter(row=>row.provider_id!==owner.providerId)
    expect(getProviderDetail(seed,owner.providerId!,{kind:'guest'})).toMatchObject({experiences:[],private_contact:null})
    seed.user_accounts.find(row=>row.user_id===owner.userId)!.account_status='Suspended'
    expect(getProviderDetail(seed,owner.providerId!,{kind:'guest'})).toBeNull()
  })
  it('counts required business fields and the certificate, without inventing optional requirements',()=>{
    expect(providerCompletion(undefined,false)).toMatchObject({percentage:0,complete:false})
    const fields={business_name:'Synthetic workshop',craft_type:'Pottery',business_registration_number:'SYNTHETIC',location_address:'Synthetic address',contact_information:JSON.stringify({phone_number:'0900000000',business_email:'synthetic@example.invalid'})}
    expect(providerCompletion(fields,false).missing).toEqual(['Giấy đăng ký kinh doanh'])
    expect(providerCompletion(fields,true)).toMatchObject({percentage:100,complete:true})
  })
})
