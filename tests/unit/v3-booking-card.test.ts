import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ExperienceCard from '@/app/agency/[agencyId]/bookings/[bookingId]/ExperienceCard'

// Screen 06 experience card (mockup ChiTietDatCho): 16:9 image, name, workshop line, address, tags; image helper with srcset.
const image = { url: '/api/prf/media/abc?v=1', width: 1600, height: 900 }
const props = { name: 'Nặn gốm thủ công', providerLine: 'Xưởng thủ công Bát Tràng · Bát Tràng, Gia Lâm', address: 'Bát Tràng, Gia Lâm, Hà Nội', tags: ['Nghệ nhân kèm cả buổi', 'Mang sản phẩm về'] }

describe('ExperienceCard', () => {
  it('renders name, workshop line, address and tags', () => {
    const html = renderToStaticMarkup(React.createElement(ExperienceCard, { ...props, image }))
    for (const text of ['Nặn gốm thủ công', 'Xưởng thủ công Bát Tràng', 'Bát Tràng, Gia Lâm, Hà Nội', 'Nghệ nhân kèm cả buổi', 'Mang sản phẩm về']) expect(html).toContain(text)
  })
  it('uses the image helper: srcset, sizes, eager (first screen), alt = experience name, 16:9 frame', () => {
    const html = renderToStaticMarkup(React.createElement(ExperienceCard, { ...props, image }))
    expect(html).toMatch(/srcSet="[^"]*400w/i)
    expect(html).toContain('sizes="')
    expect(html).toContain('loading="eager"')
    expect(html).toContain('alt="Nặn gốm thủ công"')
    expect(html).toContain('v3a-photo')
  })
  it('no image: empty neutral frame, no broken img', () => {
    const html = renderToStaticMarkup(React.createElement(ExperienceCard, { ...props, image: null }))
    expect(html).not.toContain('<img')
    expect(html).toContain('v3-cover--empty')
  })
  it('hides the tag row when there are no tags', () => {
    expect(renderToStaticMarkup(React.createElement(ExperienceCard, { ...props, image, tags: [] }))).not.toContain('v3a-tags')
  })
})
