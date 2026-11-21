# Draft: branch ui/v3-provider (screens 29–33)

Not merged into build-log.md / ui-v3-spec-deviations.md (human merges the drafts).

## Done
- 31 `/provider/[pid]/experiences`: server page, rows with cover image (CoverImage, srcset), price · duration · capacity · cancel clause, upcoming bookings, updated date, pagination 5/page, edit and delete icons, delete popup (EXP132: delete / archive / blocked, same rule as `deleteExperience`). View-model `src/lib/provider/experience-list-view.ts`.
- 29 `/provider/[pid]/dashboard`: greeting, 4 stat cells, month calendar (prev/current/next month, selected-day panel), "Giờ mở cửa" card, "+ Tạo đặt chỗ". View-model `src/lib/provider/month-calendar.ts`. Read-only over bookings.
- 30 `/provider/[pid]`: owner view = mockup 24 data (`providerView`) + edit pencil, own experience links, compact calendar. Previous page kept as `LegacyProviderProfile.tsx` for UBND review panel and for a profile with no published version.
- 33 `/provider/[pid]/experiences/[eid]`: public detail view (`detailView`, `slotRows`) as owner; previous page kept as `LegacyExperienceDetail.tsx` when the experience is not in the public catalog (archived, provider not verified).
- 32 new / edit forms: header (breadcrumb, title, "Xem trang chi tiết ›") and v3 look only; fields and rules unchanged.

## Differs from the spec / mockup
- 29 "Đã nhận qua QR tháng N": no payment data exists yet; the cell shows "—".
- 29 greeting: "Chào <full name>" (mockup says "Chào chị Anh Thư"; no gender field, not guessed).
- 29 dropped from the old page (not in the mockup): profile completion bar, recent chats, booking status counts, module link grid. Kept: UBND revision notice (one line, only when a revision comment exists).
- 30 edit form PRF128 (AI Refine) not redesigned: the mockup has no edit screen.
- 31 "show archived" checkbox removed (not in the mockup); archived experiences are hidden.
- 33 "Hiển thị công khai" switch is a read-only pill: no field to toggle visibility without archiving.
- 33 date/guests shown: nearest day from tomorrow with a free slot, 10 guests (capped at max), as in the mockup example; `?date=&guests=` overrides.

## Mockup 32 sections with no place to store data (not built)
Điểm nổi bật (4 ô), chips "Rất hợp cho đoàn", "Hộp Hoàn hảo cho…", Các ca trong ngày (experience_slots: app role has SELECT only), Bao gồm & tiện ích (8 text areas, chips), FAQ, "Trẻ em", AI gợi ý box. Columns exist in DB (`highlights`, `suitable_for`, `inclusions`, `guide_languages`, `child_policy`) but `createExperience` / `updateExperience` do not write them. Needs a service change (and a grant for slots), not UI only.

## Shared files
- `src/app/provider/provider-ui.css`: heading and link rules wrapped in `:where()` (0 specificity) so v3 classes win. Legacy pages unchanged visually.
