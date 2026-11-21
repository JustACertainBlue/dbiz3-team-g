# Ảnh thay cho UI v3: câu hỏi mở và đề xuất (21/11/2026)

Chỉ đọc DEV (SELECT trong transaction READ ONLY, role `hab_app`); không ghi DEV/PROD; chưa sửa code trong repo. Số liệu lấy lúc 12:50 ngày 21/11.

## 1. Vì sao 34 vị trí (không phải 33)

| Nhóm | Số vị trí | Ghi chú |
|---|---|---|
| Ảnh bìa làng có mặt người | 3 | Vạn Phúc, Chuông, Xuân La |
| Ảnh bìa làng còn thiếu | 3 | Chuyên Mỹ, Phùng Xá (Mỹ Đức), Tế Tiêu |
| Trải nghiệm đang dùng ảnh có mặt người hoặc dùng chung file | 20 | 4 ảnh có mặt người + 8 cặp dùng chung, đã gộp trùng |
| Trải nghiệm còn trống | 8 | không trùng với 20 trải nghiệm trên |
| **Cộng** | **34** | 6 làng + 28 trải nghiệm |

20 + 8 + 5 = 33 thiếu **Phùng Xá**: làng này là bìa còn thiếu thứ 6, nhưng không có ứng viên (tơ sen), nên khi đếm "làng có ứng viên" chỉ ra 5. Kết quả: **31 vị trí có ứng viên** (5 làng + 26 trải nghiệm) và **3 vị trí cần tự chụp** (bìa Phùng Xá, trải nghiệm tơ sen Phùng Xá, "Xem múa rối nước tại thủy đình").

**Xưởng: là 7 xưởng (3 ở Vạn Phúc + 4 ở Chuông), không phải 3.** Hà Vân, Hà Liên, Thục Khuê (Vạn Phúc); Mai Khê, Thanh Liễu, Diệp Hà, Hoài Thu (Chuông). **34 vị trí chỉ gồm ảnh bìa làng và ảnh trải nghiệm.** Ảnh xưởng tìm riêng sau đó: 14 ảnh (2 ảnh cho mỗi xưởng, mục 5).

## 2. Bốn file có mặt người: số trải nghiệm đang dùng (profile_media)

| file_id | Ảnh | Số trải nghiệm | Trải nghiệm | Script import |
|---|---|---|---|---|
| `64a9e816-11b6-552b-b704-b2fc62b52ce2` | chị ngồi dệt (Vạn Phúc) | 2 | Dệt lụa truyền thống; Thăm xưởng và tìm hiểu công đoạn dệt lụa | gỡ khỏi trải nghiệm (file dùng chung) |
| `8ed11bbf-aa44-5c3f-a9c1-c158b5e527d3` | bà làm nón (Chuông) | 1 | Làm nón lá | **KHÔNG gỡ** (chỉ 1 trải nghiệm dùng) |
| `56ea4e2a-8e3a-4a2f-a8f4-199f8a7e4697` | người đàn ông sau rối (Đào Thục) | 1 | Xem rối nước và tô màu con rối | **KHÔNG gỡ** (chỉ 1 trải nghiệm dùng) |
| `f67e94a1-0b6e-4aa0-9d87-5036a64b040f` | người đàn ông trong hơi nước (Yên Thái) | 1 | In thủy ấn trên giấy dó | **KHÔNG gỡ** (chỉ 1 trải nghiệm dùng) |

**Script `storage:seed-images` chỉ gỡ (DELETE profile_media) hàng của file mà trải nghiệm khác cũng dùng; hàng của file chỉ 1 trải nghiệm dùng được giữ và dời xuống một vị trí** (`import-seed-images.mjs`, truy vấn `shared`). Vậy sau khi nhập:
- `64a9e816`: gỡ khỏi cả 2 trải nghiệm (cả hai đều có trong JSON mới).
- `8ed11bbf`, `56ea4e2a`, `f67e94a1`: **vẫn hiển thị** ở trải nghiệm tương ứng (ở vị trí thứ 2), mặt người vẫn còn.

Cùng một ảnh còn nằm dưới nhiều file_id khác (bản sao catalog; cùng kích thước byte và độ phân giải). Tính cả các bản sao, DEV có **28 file có mặt người** (38 hàng profile_media, 8 hàng không bị gỡ). Các file chỉ 1 trải nghiệm dùng:

| file_id | Ảnh | Trải nghiệm | Làng |
|---|---|---|---|
| `8ed11bbf-aa44-5c3f-a9c1-c158b5e527d3` | bà làm nón (Chuông) | Làm nón lá | Chuông |
| `bb673534-f702-5187-b1d8-c403ca5bf466` | bà làm nón (Chuông) | Làm nón lá | Chuông |
| `02a0b3e1-63ff-5db7-89e2-c154a5d62b22` | chị ngồi dệt (Vạn Phúc) | Xem các công đoạn làm lụa Vạn Phúc | Vạn Phúc |
| `aaa5e2fe-b8e1-51f2-88f3-97e08484fd12` | chị ngồi dệt (Vạn Phúc) | Xem các công đoạn làm lụa Vạn Phúc | Vạn Phúc |
| `d185dcab-8f2b-599c-8196-0219d47edfec` | chị ngồi dệt (Vạn Phúc) | Xem các công đoạn làm lụa Vạn Phúc | Vạn Phúc |
| `e8fc5e73-04d7-50b9-a779-ab369a32356b` | bà làm nón (Chuông) | Làm nón lá | Chuông |
| `56ea4e2a-8e3a-4a2f-a8f4-199f8a7e4697` | người đàn ông sau rối (Đào Thục) | Xem rối nước và tô màu con rối | Đào Thục |
| `f67e94a1-0b6e-4aa0-9d87-5036a64b040f` | người đàn ông trong hơi nước (Yên Thái) | In thủy ấn trên giấy dó | Yên Thái |

Không gắn với trải nghiệm nào (n = 0): `791f2241` (chỉ ở xưởng Hoài Thu), `0b0a4ca0` (chỉ ở xưởng Hà Liên), và 3 file bìa làng `54e11ab7`, `2eb2a73c`, `60242583` (script ghi đè `cover_image_id`, file cũ còn trong stored_files).

Ghi chú: trang trải nghiệm hiển thị cả ảnh của xưởng (`v3-detail.ts` gộp ảnh trải nghiệm và ảnh xưởng), nên mặt người còn ở trang trải nghiệm cho đến khi sửa cả ảnh xưởng (mục 3).

## 3. Ảnh có mặt người trong provider_version_media của 7 xưởng

Cả 7 xưởng chỉ có **1 version (v1), đang hiển thị**, và **mọi ảnh của 7 xưởng đều có mặt người: 17/17 hàng**, không có ảnh thay thế sẵn trong gallery.

| Xưởng | Làng | provider_id | file_id | Version hiển thị |
|---|---|---|---|---|
| Xưởng nón Diệp Hà | Chuông | `43e7350c-6139-524e-8e23-6e9aece3619e` | `0e605916-a778-525d-82c6-99710bdcb0fd` (bà làm nón (Chuông)) | v1 (đang hiển thị) |
| Xưởng nón Diệp Hà | Chuông | `43e7350c-6139-524e-8e23-6e9aece3619e` | `c4de3a1f-cf7d-5069-8da2-5b3ccd9d15ce` (bà làm nón (Chuông)) | v1 (đang hiển thị) |
| Xưởng nón Diệp Hà | Chuông | `43e7350c-6139-524e-8e23-6e9aece3619e` | `910ebc0d-6f32-57bf-8f98-7f54ae80cc00` (bà làm nón (Chuông)) | v1 (đang hiển thị) |
| Xưởng nón Hoài Thu | Chuông | `867719ea-c962-56a1-a88c-3f96e8d0af65` | `791f2241-2f3b-5cd4-84fd-8151d7224f52` (bà làm nón (Chuông)) | v1 (đang hiển thị) |
| Xưởng nón Mai Khê | Chuông | `16efef96-dd14-5b8d-886b-d6c0f44c503b` | `da03d290-53c4-52e2-828f-f93d4ae64a4f` (bà làm nón (Chuông)) | v1 (đang hiển thị) |
| Xưởng nón Mai Khê | Chuông | `16efef96-dd14-5b8d-886b-d6c0f44c503b` | `31fe924e-af88-5bc4-865f-8cb48cde6773` (bà làm nón (Chuông)) | v1 (đang hiển thị) |
| Xưởng nón Mai Khê | Chuông | `16efef96-dd14-5b8d-886b-d6c0f44c503b` | `c83b0e06-c939-51fa-8f20-7646fe4e1728` (bà làm nón (Chuông)) | v1 (đang hiển thị) |
| Xưởng nón Thanh Liễu | Chuông | `c8260fbb-c30c-5f24-8267-ad68e64e57b5` | `6b3930ae-ab35-5ae1-8b01-61f691512f8e` (bà làm nón (Chuông)) | v1 (đang hiển thị) |
| Xưởng nón Thanh Liễu | Chuông | `c8260fbb-c30c-5f24-8267-ad68e64e57b5` | `bf1bfee8-5066-56fb-8405-1eaccca051fb` (bà làm nón (Chuông)) | v1 (đang hiển thị) |
| Xưởng nón Thanh Liễu | Chuông | `c8260fbb-c30c-5f24-8267-ad68e64e57b5` | `658c3d49-c0a4-527f-893e-abe9a4a06678` (bà làm nón (Chuông)) | v1 (đang hiển thị) |
| Xưởng lụa Hà Liên | Vạn Phúc | `70efa801-a908-5e16-8510-fd094fbdc020` | `0b0a4ca0-7493-54d2-aa86-36da0eae7ca5` (chị ngồi dệt (Vạn Phúc)) | v1 (đang hiển thị) |
| Xưởng lụa Hà Vân | Vạn Phúc | `ff2310d0-451d-5068-8f10-46dd13755baa` | `d185dcab-8f2b-599c-8196-0219d47edfec` (chị ngồi dệt (Vạn Phúc)) | v1 (đang hiển thị) |
| Xưởng lụa Hà Vân | Vạn Phúc | `ff2310d0-451d-5068-8f10-46dd13755baa` | `02a0b3e1-63ff-5db7-89e2-c154a5d62b22` (chị ngồi dệt (Vạn Phúc)) | v1 (đang hiển thị) |
| Xưởng lụa Hà Vân | Vạn Phúc | `ff2310d0-451d-5068-8f10-46dd13755baa` | `aaa5e2fe-b8e1-51f2-88f3-97e08484fd12` (chị ngồi dệt (Vạn Phúc)) | v1 (đang hiển thị) |
| Xưởng lụa Thục Khuê | Vạn Phúc | `4142a46a-624e-53be-87f3-1f018fde3509` | `706a077a-ac48-5625-8bd7-da1de32baf34` (chị ngồi dệt (Vạn Phúc)) | v1 (đang hiển thị) |
| Xưởng lụa Thục Khuê | Vạn Phúc | `4142a46a-624e-53be-87f3-1f018fde3509` | `1e84c9ce-8e21-5a41-8944-dfbfa0cc9e5b` (chị ngồi dệt (Vạn Phúc)) | v1 (đang hiển thị) |
| Xưởng lụa Thục Khuê | Vạn Phúc | `4142a46a-624e-53be-87f3-1f018fde3509` | `53541dd6-1337-5ae4-89b6-8de0d51d146f` (chị ngồi dệt (Vạn Phúc)) | v1 (đang hiển thị) |

Số ảnh mỗi xưởng: Hà Liên 1, Hà Vân 3, Thục Khuê 3, Mai Khê 3, Thanh Liễu 3, Diệp Hà 3, Hoài Thu 1. Script import không đụng `provider_version_media`.

## 4. Đề xuất: EXCLUDED_ENTRIES theo sha256 (chưa sửa code trong repo)

**Vấn đề.** `EXCLUDED_ENTRIES` khớp theo id + tên và ném lỗi nếu tên đổi. Trải nghiệm `096fc4d8` đã đổi tên thành "Xem các công đoạn làm lụa Vạn Phúc", nên chạy `filterEntries` trên JSON mới sẽ dừng với "Excluded image 096fc4d8… no longer matches", dù ảnh mới của nó hợp lệ.

**Đề xuất.** Loại theo sha256 của file ảnh bị loại (cùng hash mà `verifySha256` kiểm). `id`, `ten`, `lang` chỉ còn để báo cáo. Hệ quả:
- JSON 20/11: 3 ảnh bị loại vẫn bị loại, cùng lý do, cùng thứ tự (sha lấy từ chính `approved-photos.json` 20/11); 8 ảnh `co_nguoi_ro_mat = co` vẫn bị loại như cũ.
- Ảnh mới của trải nghiệm cũ (sha khác) được nhập, không còn lỗi "stale".
- Ảnh bị loại xuất hiện dưới id hay tên khác vẫn bị loại.
- Bỏ lỗi "stale exclusion list" (không còn ý nghĩa khi khớp theo hash).

**Test viết trước.** Trong một worktree tạm (đã xoá, repo không đổi): `tests/unit/seed-image-import.test.ts` đổi khối `filterEntries` thành 5 test (3 loại theo sha như JSON 20/11; ảnh bị loại dưới id/tên khác; ảnh mới cùng id không bị loại và không lỗi; mỗi luật có sha 64 hex và hash không trùng; giữ test mặt người). Kết quả: **đỏ 4 test** đúng lý do (luật chưa có sha256; id/tên đổi vẫn ném lỗi), sau khi sửa `seed-image-import-plan.mjs` **xanh 17/17** trong file đó.

<details><summary>Diff đề xuất (từ worktree tạm, base 3007353)</summary>

```diff
diff --git a/scripts/storage/seed-image-import-plan.mjs b/scripts/storage/seed-image-import-plan.mjs
index 57baf6e6..95019c4c 100644
--- a/scripts/storage/seed-image-import-plan.mjs
+++ b/scripts/storage/seed-image-import-plan.mjs
@@ -10,11 +10,15 @@ export const MIN_WIDTH = 1280, MIN_HEIGHT = 720, MAX_SIDE = 1600, PORTRAIT_WIDTH
 export const PORTRAIT_FOCAL = Object.freeze({ x: 50, y: 40 })
 const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
 
-/** Images the human rejected on 2026-11-20 (id + title, so a stale list fails loudly). */
+/**
+ * Photos the human rejected on 2026-11-20, matched by the SHA-256 of the photo file in approved-photos.json (the same hash
+ * verifySha256 checks), not by experience id and title: a renamed experience, or a new photo for the same experience, must not
+ * be caught by (or break on) an old rule. `id`, `ten` and `lang` only say where the photo was seen, for the report.
+ */
 export const EXCLUDED_ENTRIES = Object.freeze([
-  { id: '0c56e775-3b91-5ef0-8e6d-86d0f954aca9', lang: 'Quất Động', ten: 'Thêu khăn tay 1 · Xưởng 12', reason: 'chữ "LOVE" trên vải, không phải ảnh nghề' },
-  { id: '7720b6b1-ae8d-5fa1-8cee-2583bd79a8d9', lang: 'Quất Động', ten: 'Thêu khăn tay 1 · Xưởng 5', reason: 'chữ "YES" trên vải, không phải ảnh nghề' },
-  { id: '096fc4d8-1eed-5d09-8c6f-a93037bb5225', lang: 'Vạn Phúc', ten: 'Tìm hiểu nghề dệt lụa 1 · Xưởng 7', reason: 'ảnh người mẫu, không thấy nghề dệt' },
+  { sha256: 'ca05b2a567315feca3f221ff48d7c7aaa201f913593b7022deb58cdf276535a2', id: '0c56e775-3b91-5ef0-8e6d-86d0f954aca9', lang: 'Quất Động', ten: 'Thêu khăn tay 1 · Xưởng 12', reason: 'chữ "LOVE" trên vải, không phải ảnh nghề' },
+  { sha256: 'e0f489d5de677fb581651eb488907749c2db078e06557ec97690ad97fe6f6522', id: '7720b6b1-ae8d-5fa1-8cee-2583bd79a8d9', lang: 'Quất Động', ten: 'Thêu khăn tay 1 · Xưởng 5', reason: 'chữ "YES" trên vải, không phải ảnh nghề' },
+  { sha256: 'c667be3c32852f8730cabdda2d552d07d511ebde31f791b999108418cd9123ee', id: '096fc4d8-1eed-5d09-8c6f-a93037bb5225', lang: 'Vạn Phúc', ten: 'Tìm hiểu nghề dệt lụa 1 · Xưởng 7', reason: 'ảnh người mẫu, không thấy nghề dệt' },
 ])
 const FACE_REASON = 'có người rõ mặt, không có giấy đồng ý (image_sources_consent_chk; quyết định 2026-11-20)'
 
@@ -22,11 +26,9 @@ const FACE_REASON = 'có người rõ mặt, không có giấy đồng ý (image
 export function filterEntries(entries) {
   const kept = [], excluded = []
   for (const item of entries) {
-    const rule = EXCLUDED_ENTRIES.find(rejected => rejected.id === item.id)
-    if (rule) {
-      if (item.ten !== rule.ten || item.lang !== rule.lang) throw new Error(`Excluded image ${item.id} no longer matches "${rule.lang} – ${rule.ten}"`)
-      excluded.push({ entry: item, reason: rule.reason })
-    } else if (item.co_nguoi_ro_mat === 'co') excluded.push({ entry: item, reason: FACE_REASON })
+    const rule = EXCLUDED_ENTRIES.find(rejected => rejected.sha256 === item.sha256)
+    if (rule) excluded.push({ entry: item, reason: rule.reason })
+    else if (item.co_nguoi_ro_mat === 'co') excluded.push({ entry: item, reason: FACE_REASON })
     else kept.push(item)
   }
   return { kept, excluded }
diff --git a/tests/unit/seed-image-import.test.ts b/tests/unit/seed-image-import.test.ts
index cc3f3537..d8605b52 100644
--- a/tests/unit/seed-image-import.test.ts
+++ b/tests/unit/seed-image-import.test.ts
@@ -18,19 +18,35 @@ const entry = (over: Record<string, string> = {}) => ({
 })
 const MIGRATION = (ref: string) => `postgresql://postgres.${ref}:test-only@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
 
+// The three photos rejected on 2026-11-20, as in that day's approved-photos.json (id, title, SHA-256 of the file).
+const REJECTED = [
+  { id: '0c56e775-3b91-5ef0-8e6d-86d0f954aca9', ten: 'Thêu khăn tay 1 · Xưởng 12', lang: 'Quất Động', sha256: 'ca05b2a567315feca3f221ff48d7c7aaa201f913593b7022deb58cdf276535a2', reason: 'chữ "LOVE" trên vải, không phải ảnh nghề' },
+  { id: '7720b6b1-ae8d-5fa1-8cee-2583bd79a8d9', ten: 'Thêu khăn tay 1 · Xưởng 5', lang: 'Quất Động', sha256: 'e0f489d5de677fb581651eb488907749c2db078e06557ec97690ad97fe6f6522', reason: 'chữ "YES" trên vải, không phải ảnh nghề' },
+  { id: '096fc4d8-1eed-5d09-8c6f-a93037bb5225', ten: 'Tìm hiểu nghề dệt lụa 1 · Xưởng 7', lang: 'Vạn Phúc', sha256: 'c667be3c32852f8730cabdda2d552d07d511ebde31f791b999108418cd9123ee', reason: 'ảnh người mẫu, không thấy nghề dệt' },
+]
 describe('filterEntries', () => {
-  it('drops the three images the human rejected on 2026-11-20, with reasons', () => {
-    expect(EXCLUDED_ENTRIES.map(item => item.id)).toEqual([
-      '0c56e775-3b91-5ef0-8e6d-86d0f954aca9', '7720b6b1-ae8d-5fa1-8cee-2583bd79a8d9', '096fc4d8-1eed-5d09-8c6f-a93037bb5225'])
-    const rejected = EXCLUDED_ENTRIES.map(item => entry({ id: item.id, ten: item.ten, lang: item.lang }))
+  it('drops the three images the human rejected on 2026-11-20 by their SHA-256, with reasons (same result on that day\'s JSON)', () => {
+    expect(EXCLUDED_ENTRIES.map(item => item.sha256)).toEqual(REJECTED.map(item => item.sha256))
+    const rejected = REJECTED.map(item => entry({ id: item.id, ten: item.ten, lang: item.lang, sha256: item.sha256 }))
     const keep = entry()
     const { kept, excluded } = filterEntries([...rejected, keep])
     expect(kept).toEqual([keep])
-    expect(excluded.map(item => [item.entry.id, item.reason])).toEqual([
-      ['0c56e775-3b91-5ef0-8e6d-86d0f954aca9', 'chữ "LOVE" trên vải, không phải ảnh nghề'],
-      ['7720b6b1-ae8d-5fa1-8cee-2583bd79a8d9', 'chữ "YES" trên vải, không phải ảnh nghề'],
-      ['096fc4d8-1eed-5d09-8c6f-a93037bb5225', 'ảnh người mẫu, không thấy nghề dệt'],
-    ])
+    expect(excluded.map(item => [item.entry.id, item.reason])).toEqual(REJECTED.map(item => [item.id, item.reason]))
+  })
+  it('drops a rejected photo wherever it appears: under another id, title or village', () => {
+    const { kept, excluded } = filterEntries([entry({ sha256: REJECTED[2].sha256, ten: 'Xem các công đoạn làm lụa Vạn Phúc' })])
+    expect(kept).toEqual([])
+    expect(excluded[0].reason).toBe(REJECTED[2].reason)
+  })
+  it('keeps a new photo for an experience whose old photo was rejected (different SHA-256), no stale-list error', () => {
+    const renewed = entry({ id: REJECTED[2].id, ten: 'Xem các công đoạn làm lụa Vạn Phúc', lang: 'Vạn Phúc', sha256: 'b'.repeat(64) })
+    const { kept, excluded } = filterEntries([renewed])
+    expect(kept).toEqual([renewed])
+    expect(excluded).toEqual([])
+  })
+  it('every rule carries a 64-hex SHA-256, a title, a village and a reason; hashes are unique', () => {
+    for (const rule of EXCLUDED_ENTRIES) { expect(rule.sha256).toMatch(/^[0-9a-f]{64}$/); expect(rule.ten && rule.lang && rule.reason).toBeTruthy() }
+    expect(new Set(EXCLUDED_ENTRIES.map(rule => rule.sha256)).size).toBe(EXCLUDED_ENTRIES.length)
   })
   it('drops images with clearly visible faces (no consent on file; image_sources_consent_chk)', () => {
     const face = entry({ co_nguoi_ro_mat: 'co' })
@@ -38,9 +54,6 @@ describe('filterEntries', () => {
     expect(kept).toEqual([])
     expect(excluded[0].reason).toMatch(/rõ mặt/)
   })
-  it('refuses an excluded id whose title no longer matches (stale exclusion list)', () => {
-    expect(() => filterEntries([entry({ id: EXCLUDED_ENTRIES[0].id, ten: 'Tên khác' })])).toThrow(/0c56e775/)
-  })
 })
 
 describe('validateEntry', () => {
```

</details>

## 5. Ảnh gallery cho 7 xưởng (ứng viên, chưa nhập; bản chốt ở mục 8)

14 ảnh Pexels (mỗi xưởng 2), không có người; không trùng ảnh trải nghiệm đã chọn; ≥ 1280×720; mỗi ảnh đã xem. Ở trong `review.html` (mục "Xưởng") và `xuong-2111.json` (provider_id, version, file_id cũ cần thay, page_url, author, sha256) trong thư mục notes của phiên.

| Xưởng | Ảnh mới | Chất lượng |
|---|---|---|
| Hà Vân | 6634693 (sợi tơ trên khung dệt), 6634611 (khung dệt) | đúng nghề |
| Hà Liên | 32277772, 18877232 (kén tằm) | đúng nghề |
| Thục Khuê | 6634749, 6634743 (khung dệt) | đúng nghề |
| Mai Khê | 33206775 (nón lá sơn hoa), 7232683 (lá cọ khô) | nón: đúng nghề; lá cọ: nguyên liệu, không phải lá nón Việt Nam |
| Thanh Liễu | 15207113 (nón treo cùng đèn lồng), 4744854 (lá cọ khô) | như trên |
| Diệp Hà | 15207118 (nón treo trên cành tre), 12525308 (lá cọ khô) | như trên |
| Hoài Thu | 18282623 (nón treo trên khung tre), 7232831 (lá cọ khô) | như trên |

Lưu ý: xưởng có 3 ảnh cũ (Hà Vân, Thục Khuê, Mai Khê, Thanh Liễu, Diệp Hà) chỉ được đề xuất 2 ảnh mới, nên 1 ảnh cũ còn lại phải gỡ hoặc thay bằng ảnh thứ 3; Hà Liên và Hoài Thu có 1 ảnh cũ và nhận 2 ảnh mới. Ảnh Hoài Thu 18282623 có tựa gốc "vật thủ công bằng rơm" nhưng hình là nón lá treo trên khung tre.

## 6. file_id của 28 file có mặt người: có cố định giữa DEV và PROD không?

Kiểm bằng phiên bản UUID (ký tự thứ 13) và đối chiếu `data/seed/stored_files.csv` (seed sinh bằng `uuid5`, `data/scripts/generate_seed.py`).

| Loại | Số file | Kết luận |
|---|---|---|
| UUID v5 **và có trong seed CSV** | 8 | cố định: **dùng được trên PROD** (PROD có đủ seed; build-log Entry 114: 24 file seed) |
| UUID v5 nhưng **không có trong seed CSV** | 15 | không chứng minh được là có trên PROD: không script nào trong repo sinh ra chúng; PROD có 45 bản sao ngoài seed so với 42 trên DEV, trong đó 3 file id ngẫu nhiên (Entry 114) → **không dùng được** |
| UUID v4 (ngẫu nhiên) | 5 | `56ea4e2a`, `f67e94a1` và 3 file bìa làng `54e11ab7`, `2eb2a73c`, `60242583`: sinh bằng `randomUUID` ở DEV → **không dùng được** |

8 file dùng được trên PROD: `791f2241`, `64a9e816`, `35fa9e03`, `0b0a4ca0`, `8ed11bbf`, `bb673534`, `113f70fa`, `e8fc5e73`. 20 file còn lại thì không.

**Đề xuất khoá dùng chung hai môi trường: sha256 nội dung file** (`prf-media/<file_id>`). Đã tính trên DEV (chỉ đọc Storage) cho cả 28 file: chỉ có **7 ảnh khác nhau**, khớp đúng nhóm bằng kích thước byte + độ phân giải đã dùng trước đó:

| sha256 (rút gọn) | Ảnh | Số file | Ghi chú |
|---|---|---|---|
| `d8a165bf17c7cd58b0e563f4c4bc59c2f2967ba60f9173c3b048507ff10ce51f` | bà làm nón (Chuông) | 13 | bản sao catalog; v5 trong seed: 4 |
| `6ef25de0a50e87b4afbe0b4368b7ea9752085b014e8392df1c1c554c2426af34` | chị ngồi dệt (Vạn Phúc) | 10 | bản sao catalog; v5 trong seed: 4 |
| `bef18c7d7e8703d231393517998a584099c445a3d60d781dd2b9e524e9507fb5` | người đàn ông sau rối (Đào Thục) | 1 | một file |
| `978152f57b4538b3e2992006b4c195bb1d8dc30ada5c3a7c719eb6ad39383320` | người đàn ông trong hơi nước (Yên Thái) | 1 | một file |
| `5f4580501d68322d13016bc6ea8429d1b57991f1007985cafd4a4503a8d10a61` | chị ở quầy tò he (bìa Xuân La) | 1 | một file |
| `7631d15e343def85a4c8e566e2bb28eb9a0f367fa16c72dab83b681dddc66e37` | chị giữa nón lá (bìa Chuông) | 1 | một file |
| `bcbdd9a2719ff38bb77af4cd3a938a90df99fedddbd49b7b766a0168fdd0421c` | anh giữa lụa vàng (bìa Vạn Phúc) | 1 | một file |

Cách dùng: script tính sha256 từng object `prf-media/<file_id>` trên môi trường đang chạy, khớp với 7 hash trên, rồi gỡ hàng `profile_media` và thay `provider_version_media` theo hash (không theo file_id). Có thể lọc nhanh trước bằng `(file_size_bytes, width_px, height_px)`, nhưng hash mới là khoá.

Điều kiện: bản sao catalog là bản sao từng byte (Entry 114), nên hash giống nhau giữa DEV và PROD **nếu** PROD đã chạy `storage:catalog` và `storage:catalog-copies` như DEV. Tôi chưa đọc PROD, nên người chạy phải đối chiếu 7 hash trên PROD bằng truy vấn đọc trước khi dùng. Hai file `56ea4e2a` và `f67e94a1` (do import tạo trên DEV) chỉ có trên PROD sau khi import chạy ở đó.

## Cần sửa chung

**Ảnh xưởng**
- 7 xưởng, 17 ảnh, 100% có mặt người, đều ở version v1 đang hiển thị. Đã có 14 ảnh ứng viên (mục 5), cần một bước riêng để đổi `provider_version_media`; script import hiện tại không làm việc này. Cần quyết định đi qua quy trình xưởng (version mới) hay sửa trực tiếp dữ liệu DEV.
- Trang trải nghiệm gộp ảnh xưởng, nên mặt người chỉ hết khi cả ảnh trải nghiệm và ảnh xưởng được thay.

**Script `storage:seed-images`**
- Đổi `EXCLUDED_ENTRIES` sang sha256 (mục 4), cần duyệt trước khi sửa.
- Hàng profile_media của file chỉ 1 trải nghiệm dùng không bị gỡ (8 hàng có mặt người, danh sách ở mục 2). Cần quyết định: (a) thêm tuỳ chọn gỡ các file_id có mặt người đã liệt kê, có ghi vào `undo.json`; (b) con người gỡ bằng tay; (c) chấp nhận chúng nằm ở vị trí thứ 2.
- Báo cáo dry run đã in "unlinkedSharedRows" và "shiftedRows"; nên in thêm danh sách hàng được giữ có mặt người để thấy trước.

## 7. Kiểm ảnh xưởng Chuông và danh sách gỡ theo sha256 (21/11, chỉ đọc DEV)

**Ảnh xưởng Chuông.** 8 ảnh của 4 xưởng (Mai Khê, Thanh Liễu, Diệp Hà, Hoài Thu) là **8 ảnh khác nhau** (8 mã ảnh Pexels, 8 sha256 khác nhau), **không có 31624715**, và không trùng ảnh nào trong 31 vị trí bìa/trải nghiệm đã chọn hay 6 xưởng khác (14 ảnh xưởng đều khác nhau).

**Danh sách gỡ ảnh có mặt người: 7 hash.** Số hàng khớp trên DEV (tìm theo 28 file_id có cùng nội dung; đã tính hash từng object Storage):

| sha256 | Ảnh | File | profile_media: trải nghiệm | profile_media: xưởng | provider_version_media (version đang hiển thị) | Bìa làng |
|---|---|---|---|---|---|---|
| `d8a165bf17c7cd58b0e563f4c4bc59c2f2967ba60f9173c3b048507ff10ce51f` | bà làm nón (Chuông) | 13 | 21 | 9 | 10 (10) | 0 |
| `6ef25de0a50e87b4afbe0b4368b7ea9752085b014e8392df1c1c554c2426af34` | chị ngồi dệt (Vạn Phúc) | 10 | 15 | 6 | 7 (7) | 0 |
| `bef18c7d7e8703d231393517998a584099c445a3d60d781dd2b9e524e9507fb5` | người đàn ông sau rối (Đào Thục) | 1 | 1 | 0 | 0 (0) | 0 |
| `978152f57b4538b3e2992006b4c195bb1d8dc30ada5c3a7c719eb6ad39383320` | người đàn ông trong hơi nước (Yên Thái) | 1 | 1 | 0 | 0 (0) | 0 |
| `5f4580501d68322d13016bc6ea8429d1b57991f1007985cafd4a4503a8d10a61` | chị ở quầy tò he (bìa Xuân La) | 1 | 0 | 0 | 0 (0) | 1 |
| `7631d15e343def85a4c8e566e2bb28eb9a0f367fa16c72dab83b681dddc66e37` | chị giữa nón lá (bìa Chuông) | 1 | 0 | 0 | 0 (0) | 1 |
| `bcbdd9a2719ff38bb77af4cd3a938a90df99fedddbd49b7b766a0168fdd0421c` | anh giữa lụa vàng (bìa Vạn Phúc) | 1 | 0 | 0 | 0 (0) | 1 |
| **Cộng** | | **28** | **38** | **15** | **17** | **3** |

Phát hiện thêm: **15 hàng `profile_media` ở cấp xưởng** (cột "xưởng"; `experience_id` rỗng, có `provider_id`) cũng đang giữ ảnh có mặt người: Hà Vân 3, Thục Khuê 3 (hash `6ef25de0…`), Mai Khê 3, Thanh Liễu 3, Diệp Hà 3 (hash `d8a165bf…`). Đây là gallery nháp của hồ sơ xưởng (trang sửa hồ sơ), tách với `provider_version_media` là bản đã duyệt đang hiển thị công khai. Hà Liên và Hoài Thu không có hàng cấp xưởng. Script import hiện tại không đụng các hàng này; nếu chỉ thay `provider_version_media`, lần xuất bản version sau có thể đưa ảnh có mặt người trở lại từ gallery nháp.

Danh sách file_id theo hash (cho truy vấn gỡ):

- `d8a165bf17c7…` (bà làm nón (Chuông)): `791f2241-2f3b-5cd4-84fd-8151d7224f52`, `8ed11bbf-aa44-5c3f-a9c1-c158b5e527d3`, `bb673534-f702-5187-b1d8-c403ca5bf466`, `31fe924e-af88-5bc4-865f-8cb48cde6773`, `658c3d49-c0a4-527f-893e-abe9a4a06678`, `6b3930ae-ab35-5ae1-8b01-61f691512f8e`, `bf1bfee8-5066-56fb-8405-1eaccca051fb`, `da03d290-53c4-52e2-828f-f93d4ae64a4f`, `e8fc5e73-04d7-50b9-a779-ab369a32356b`, `0e605916-a778-525d-82c6-99710bdcb0fd`, `910ebc0d-6f32-57bf-8f98-7f54ae80cc00`, `c4de3a1f-cf7d-5069-8da2-5b3ccd9d15ce`, `c83b0e06-c939-51fa-8f20-7646fe4e1728`
- `6ef25de0a50e…` (chị ngồi dệt (Vạn Phúc)): `64a9e816-11b6-552b-b704-b2fc62b52ce2`, `35fa9e03-059f-5a13-9152-0203b77a5a72`, `0b0a4ca0-7493-54d2-aa86-36da0eae7ca5`, `113f70fa-5880-5863-b3d3-b00a8e91aae9`, `02a0b3e1-63ff-5db7-89e2-c154a5d62b22`, `aaa5e2fe-b8e1-51f2-88f3-97e08484fd12`, `d185dcab-8f2b-599c-8196-0219d47edfec`, `1e84c9ce-8e21-5a41-8944-dfbfa0cc9e5b`, `53541dd6-1337-5ae4-89b6-8de0d51d146f`, `706a077a-ac48-5625-8bd7-da1de32baf34`
- `bef18c7d7e87…` (người đàn ông sau rối (Đào Thục)): `56ea4e2a-8e3a-4a2f-a8f4-199f8a7e4697`
- `978152f57b45…` (người đàn ông trong hơi nước (Yên Thái)): `f67e94a1-0b6e-4aa0-9d87-5036a64b040f`
- `5f4580501d68…` (chị ở quầy tò he (bìa Xuân La)): `60242583-b487-461a-abeb-946817c05bde`
- `7631d15e343d…` (chị giữa nón lá (bìa Chuông)): `2eb2a73c-184b-436b-9724-cb5bab15dfb7`
- `bcbdd9a2719f…` (anh giữa lụa vàng (bìa Vạn Phúc)): `54e11ab7-2426-4cfd-bd89-68dd5f02d032`

Không khớp bằng file_id mà bằng nội dung: mọi file cùng hash coi là cùng ảnh. Hash chỉ đã được kiểm trên DEV; đối chiếu trên PROD trước khi dùng (mục 6).

## 8. Kết quả sau khi Khánh Linh duyệt (21/11) — thay các số ở mục 1 và 5

Quy tắc áp dụng: loại mọi ảnh rối dây; giữ ảnh rối không thấy dây; giữ ảnh tượng đất sét cho bìa Xuân La; loại ảnh marbling của "In thủy ấn" và ảnh nón `31624715`; giữ ảnh bề mặt giấy, vàng lá và tò he phụ; còn lại giữ nguyên.

**Ảnh bị loại (15 mục):**

| Vị trí | Ảnh loại | Lý do | Sau khi loại |
|---|---|---|---|
| Ảnh bìa làng Chuông | 31624715 | nón có chữ | 32658054, 32359576 |
| Vẽ và trang trí nón lá | 31624715 | nón có chữ | 17373219, 32359576 |
| Xem quy trình làm nón lá Chuông | 31624715 | nón có chữ | 32359576 |
| Xem rối nước và tô màu con rối | 12580659 | rối dây | 19026103 |
| Nghe nghệ nhân kể về rối nước | 7511711, 27676231 | rối dây | **không còn ứng viên → tự chụp** |
| Xem sau mành và nghe kể nghề rối | 12580659, 16034770 | rối dây | **không còn ứng viên → tự chụp** |
| Sơn trang trí con rối gỗ | 38240478, 31116441 | rối dây | **không còn ứng viên → tự chụp** |
| Tô màu con rối chú Tễu | 27676231, 31116441 | rối dây | **không còn ứng viên → tự chụp** |
| In thủy ấn trên giấy dó | 14664552, 10373238, 35985299 | marbling | **không còn ứng viên → tự chụp** |

Ảnh `19026103` ("Xem rối nước và tô màu con rối") được giữ: không thấy dây, nhưng là rối tay bằng vải/nhựa, không phải rối gỗ; ghi trong `quality`, Khánh Linh có thể loại thêm.

### Bìa làng + trải nghiệm: `approved-photos-2111-final.json`

- **63 mục, 26 vị trí** (5 bìa làng + 21 trải nghiệm).
- `validateEntry`: 0 lỗi. `targetSize`: 0 ảnh dưới 1280×720 sau khi thu nhỏ. sha256 của file khớp 63/63. `co_nguoi_ro_mat` đều là `khong`. Không mục nào trùng 3 hash bị loại của 20/11.
- `filterEntries` của script hiện tại **vẫn báo lỗi** với id `096fc4d8` (tên đã đổi): cần đổi sang sha256 (mục 4) trước khi nhập.

### Ảnh xưởng: `xuong-2111-final.json`

20 ảnh cho 7 xưởng. Mỗi mục ghi ảnh mới thay cho ảnh cũ nào, ở cả hai nơi: `provider_version_media` (version đang hiển thị, v1) và 15 hàng `profile_media` cấp xưởng (gallery nháp). Ảnh mới thứ k thay hàng thứ k theo `display_order`; ảnh nào không có hàng cũ để thay là thêm mới. Vị trí mới là `display_order` 0, 1, 2 với loại Activity, Space, Product.

| Xưởng | Ảnh mới | Thay (bản duyệt) | Thay (gallery nháp) |
|---|---|---|---|
| Xưởng lụa Hà Vân | 6634693, 6634611, 6634602 | `d185dcab`, `02a0b3e1`, `aaa5e2fe` | `d185dcab`, `02a0b3e1`, `aaa5e2fe` |
| Xưởng lụa Hà Liên | 32277772, 18877232, 6712947 | `0b0a4ca0`, thêm mới, thêm mới | —, —, — |
| Xưởng lụa Thục Khuê | 6634749, 6634743, 6634758 | `706a077a`, `1e84c9ce`, `53541dd6` | `706a077a`, `1e84c9ce`, `53541dd6` |
| Xưởng nón Mai Khê | 33206775, 7232683, 36098294 | `da03d290`, `31fe924e`, `c83b0e06` | `da03d290`, `31fe924e`, `c83b0e06` |
| Xưởng nón Thanh Liễu | 15207113, 4744854, 20448091 | `6b3930ae`, `bf1bfee8`, `658c3d49` | `6b3930ae`, `bf1bfee8`, `658c3d49` |
| Xưởng nón Diệp Hà | 15207118, 12525308, 19556442 | `0e605916`, `c4de3a1f`, `910ebc0d` | `0e605916`, `c4de3a1f`, `910ebc0d` |
| Xưởng nón Hoài Thu | 18282623, 7232831 | `791f2241`, thêm mới | —, — |

- **Hà Liên: 3 ảnh** (1 ảnh cũ được thay, 2 ảnh thêm mới; xưởng không có gallery nháp).
- **Hoài Thu: giữ 2 ảnh.** Chỉ tìm được 3 ảnh nón lá không người và không chữ ngoài những ảnh đã chọn; chúng thuộc Mai Khê, Thanh Liễu, Diệp Hà. Ảnh còn lại là lá cọ cùng một loạt của Mai Khê và Hoài Thu (`7232683`, `7232831`, `7232685` là các góc cắt gần giống nhau), nên không thêm. Ảnh `34320410` bị loại vì có chữ "Việt Nam" trên nón.
- Cột `go_anh_cu` trống ở mọi xưởng: số ảnh mới (3) không ít hơn số ảnh cũ (3) ở 5 xưởng có 3 ảnh cũ.
- 20 ảnh khác nhau đôi một, không trùng ảnh bìa/trải nghiệm; 11 ảnh của 4 xưởng Chuông khác nhau, không có `31624715`.

### Danh sách tự chụp cuối cùng: 8 vị trí (`can-tu-chup-final.json`)

| Vị trí | Lý do |
|---|---|
| Ảnh bìa làng Phùng Xá, Mỹ Đức (bìa làng) | Nghề làng là dệt tơ sen; trên Pexels chỉ có ảnh hoa/lá sen, không có ảnh rút sợi hay dệt tơ sen. Làng này sẽ không còn ảnh nào (bìa lẫn trải nghiệm). |
| Tìm hiểu quy trình rút sợi và dệt tơ sen tại xưởng (trải nghiệm) | Cùng lý do: không có ảnh tơ sen đạt. |
| Xem múa rối nước tại thủy đình Đào Thục (trải nghiệm) | Chỉ có 1 ảnh rối nước đạt (39125133), đã dành cho "Tích trò rối nước". Ảnh hiện tại của trải nghiệm không có mặt người, giữ nguyên cho đến khi có ảnh chụp. |
| In thủy ấn trên giấy dó (trải nghiệm) | Ảnh marbling bị loại. Ảnh hiện tại (f67e94a1, người đàn ông trong hơi nước) sẽ bị gỡ, nên trải nghiệm này sẽ không còn ảnh nào. |
| Nghe nghệ nhân kể về rối nước (trải nghiệm) | Cả 2 ứng viên là rối dây (bị loại). Ảnh hiện tại không có mặt người, giữ nguyên cho đến khi có ảnh chụp (đang dùng chung file với "Tô màu con rối chú Tễu"). |
| Xem sau mành và nghe kể nghề rối (trải nghiệm) | Cả 2 ứng viên là rối dây. Ảnh hiện tại giữ nguyên (dùng chung file với "Sơn trang trí con rối gỗ"). |
| Sơn trang trí con rối gỗ (trải nghiệm) | Cả 2 ứng viên là rối dây. Ảnh hiện tại giữ nguyên (dùng chung file với "Xem sau mành…"). |
| Tô màu con rối chú Tễu (trải nghiệm) | Cả 2 ứng viên là rối dây. Ảnh hiện tại giữ nguyên (dùng chung file với "Nghe nghệ nhân kể…"). |

### Làng nào không còn ảnh nào sau khi duyệt (DEV, chỉ đọc)

Tính trên 20 làng có trải nghiệm đang chạy: bỏ các file có mặt người (28 file), thêm ảnh bìa và ảnh trải nghiệm đã duyệt. **Chỉ Phùng Xá, Mỹ Đức không còn ảnh nào** (không có bìa, trải nghiệm tơ sen không có ảnh), nên làng bị ẩn khỏi trang chủ và danh sách làng (quyết định #9: làng không ảnh không hiện). Mọi làng khác còn ít nhất một ảnh bìa hoặc ảnh trải nghiệm. Trải nghiệm không còn ảnh: tơ sen (Phùng Xá) và "In thủy ấn trên giấy dó" (Yên Thái); 5 trải nghiệm rối ("Xem múa rối nước" và 4 trải nghiệm có ứng viên toàn rối dây) vẫn giữ ảnh hiện tại, không có mặt người, cho đến khi có ảnh chụp.

Các tệp ở thư mục notes của phiên: `final/approved-photos-2111-final.json`, `final/xuong-2111-final.json`, `final/can-tu-chup-final.json`, `final/review.html` và cây ảnh `final/`.
