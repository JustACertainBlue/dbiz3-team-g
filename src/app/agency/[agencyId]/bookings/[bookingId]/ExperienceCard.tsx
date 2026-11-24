import React from 'react'
import CoverImage from '@/app/explore/v3/CoverImage'
import type { ImageRef } from '@/lib/prf/media-urls'
import './agency-booking-v3.css'

// Experience card of screen 06/07 (mockup ChiTietDatCho): 16:9 image, name, workshop line, address, tags.
// The image is in the first screen, so it loads eager; sizes = the 380 px left column at 1440.
export default function ExperienceCard({ name, image, providerLine, address, tags }: { name: string; image: ImageRef | null; providerLine: string; address: string; tags: string[] }) {
  return <div className="v3a-card v3a-xcard">
    <div className="v3a-photo"><CoverImage image={image} alt={name} sizes="380px" priority="eager" /></div>
    <div className="v3a-xbody">
      <p className="v3a-name">{name}</p>
      <p className="v3a-sm">{providerLine}</p>
      {address && <p className="v3a-sm">{address}</p>}
      {tags.length > 0 && <div className="v3a-tags">{tags.map(tag => <span key={tag} className="v3a-tag">{tag}</span>)}</div>}
    </div>
  </div>
}
