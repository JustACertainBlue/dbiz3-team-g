# TỔNG HỢP TOÀN BỘ QUY TẮC (RULES) TÍNH NĂNG AI TOUR MATCHING & LEARNING LOOP
**Hanoi Artisan Bridge — Module AIT (AI Tour Matching)**  
*Tài liệu chuẩn hóa kiến trúc, nghiệp vụ và trải nghiệm người dùng (Cập nhật tháng 11/2026)*

---

## MỤC LỤC
1. [I. Tổng quan & Kiến trúc Hệ thống](#i-tổng-quan--kiến-trúc-hệ-thống)
2. [II. Quy tắc Nghiệp vụ Cốt lõi (Core Business Rules - PRD / Spec)](#ii-quy-tắc-nghiệp-vụ-cốt-lõi-core-business-rules---prd--spec)
3. [III. Quy chuẩn Mô hình Ngôn ngữ & Prompt (LLM & Cloudflare Workers AI)](#iii-quy-chuẩn-mô-hình-ngôn-ngữ--prompt-llm--cloudflare-workers-ai)
4. [IV. Quy tắc Chống Bịa Đặt & Linh hoạt Gợi ý (Anti-Fabrication & Bridging)](#iv-quy-tắc-chống-bịa-đặt--linh-hoạt-gợi-ý-anti-fabrication--bridging)
5. [V. Quy chuẩn Trải nghiệm Người dùng & Giao diện (UI / UX Standards)](#v-quy-chuẩn-trải-nghiệm-người-dùng--giao-diện-ui--ux-standards)
6. [VI. Quy tắc Quản lý Lịch sử Phiên & Loại bỏ Chat Rỗng (Session Management)](#vi-quy-tắc-quản-lý-lịch-sử-phiên--loại-bỏ-chat-rỗng-session-management)
7. [VII. Đặc tả Tính năng Vòng lặp Học hỏi (Learning Loop) & Tối ưu Bố cục Explore](#vii-đặc-tả-tính-năng-vòng-lặp-học-hỏi-learning-loop--tối-ưu-bố-cục-explore)
8. [VIII. Quy tắc Bắt buộc: Chỉ Gợi ý Xưởng đã được Xác minh (Verified Only Rule - BR-003)](#viii-quy-tắc-bắt-buộc-chỉ-gợi-ý-xưởng-đã-được-xác-minh-verified-only-rule---br-003)
9. [IX. Quy tắc Ràng buộc Trần Ngân sách & Toàn vẹn Đơn giá (Budget Ceiling & Pricing Integrity - BR-005, BR-011)](#ix-quy-tắc-ràng-buộc-trần-ngân-sách--toàn-vẹn-đơn-giá-budget-ceiling--pricing-integrity---br-005-br-011)

---

## I. TỔNG QUAN & KIẾN TRÚC HỆ THỐNG

Tính năng **AI Tour Matching (AIT)** đóng vai trò là chuyên gia điều phối tour di sản văn hóa, kết nối các **Công ty Lữ hành (Tour Agency)** với các **Xưởng nghề & Nghệ nhân địa phương đã được xác minh (Verified Local Providers)** quanh Hà Nội.

Hệ thống kết hợp:
1. **Cloudflare Workers AI Free Tier**: Mô hình `@cf/meta/llama-3.1-8b-instruct` (fallback `@cf/zai-org/glm-4.7-flash`) để hiểu ngôn ngữ tự nhiên, đàm thoại và phân tích ngữ cảnh đoàn.
2. **Deterministic Constraint & Scoring Engine**: Bộ lọc ràng buộc cứng (Hard Constraints) và thuật toán chấm điểm xếp hạng (Scoring Engine) đối soát chuẩn mực dữ liệu.
3. **Personalized Learning Loop**: Tự động học sở thích của từng công ty lữ hành qua các phiên ghép tour để cá nhân hóa bố cục màn hình Khám phá (`/explore`).

---

## II. QUY TẮC NGHIỆP VỤ CỐT LÕI (CORE BUSINESS RULES - PRD / SPEC)

| Mã Quy tắc | Nội dung chi tiết | Mục đích & Giải thích |
|---|---|---|
| **BR-001** | AI Tour Matching chỉ khả dụng đối với tài khoản **Công ty Lữ hành (Tour Agency)** đã đăng nhập thành công. | Ngăn chặn truy cập trái phép và bảo vệ dữ liệu thương mại của xưởng. |
| **BR-002** | Khách vãng lai (**Guest**) không được nhìn thấy giao diện AI Matching (nút truy cập bị ẩn hoàn toàn). Nếu gõ trực tiếp URL `/ai-matching`, hệ thống tự động chuyển hướng sang màn hình Đăng nhập. | Đảm bảo tính nhất quán về kiểm soát quyền truy cập. |
| **BR-003** | Chỉ các Trải nghiệm thuộc các **Xưởng nghề địa phương đã được Xác minh (Verified Local Providers)** và đang có phiên bản hồ sơ xuất bản hợp lệ mới được đưa vào danh sách ứng viên ghép tour. | Ngăn ngừa việc gợi ý những xưởng chưa được kiểm định chất lượng. Làng nghề trong MVP không có quy trình xác minh riêng biệt. |
| **BR-004** | Khi thông tin yêu cầu của đoàn bị thiếu các trường cốt lõi (số lượng khách, ngày khởi hành, điểm xuất phát, loại nghề thủ công), AI phải đặt câu hỏi làm rõ (**Follow-up Questions**) trước khi chạy thuật toán chấm điểm cuối cùng. | Tránh đề xuất tour dựa trên dữ liệu phỏng đoán, chắp vá. |
| **BR-005** | Các ràng buộc cứng (**Hard Constraints**) về sức chứa xưởng (capacity), khoảng ngân sách (budget), ngày hoạt động và cung đường di chuyển phải được kiểm tra trước khi tính điểm xếp hạng. | Đảm bảo 100% các xưởng trong top đề xuất là khả thi về mặt vận hành thực tế. |
| **BR-006 / BR-007** | Thứ hạng đề xuất phải dựa trên **Hồ sơ tiêu chí tour (Tour Preference Profile)**. Lời giải thích lý do đề xuất phải nêu cụ thể yếu tố nào khớp với yêu cầu của đại lý lữ hành. | Mang lại kết quả minh bạch, dễ hiểu và thuyết phục đối với điều hành tour. |
| **BR-008** | Đại lý lữ hành có quyền bổ sung, tinh chỉnh yêu cầu (đổi số khách, đổi nghề, đổi ngày) liên tục trong cùng một cuộc trò chuyện để hệ thống cập nhật kết quả. | Hỗ trợ trải nghiệm tìm kiếm tương tác tự nhiên. |
| **BR-009 / BR-010** | Hành động **"Xin báo giá ngay"** là sự quan tâm / đàm phán thương mại bước đầu và **KHÔNG PHẢI là tạo Booking**. Đơn đặt tour (Booking) chỉ được tạo sau đó thông qua module Schedule/Booking khi hai bên đã chốt thỏa thuận. | Tôn trọng quyền tự chủ điều phối lịch và năng lực phục vụ của xưởng thủ công. |
| **BR-011 / BR-020** | Điểm sàn khớp tour mặc định là **60/100**. Nếu không có ứng viên nào đạt từ 60 điểm trở lên, hệ thống phải đưa ra các gợi ý nới lỏng tiêu chí (nới ngân sách, mở rộng khoảng cách di chuyển, linh hoạt ngày) thay vì trả về màn hình trống bế tắc. | Giữ mạch tương tác liên tục cho người dùng. |
| **BR-018** | Tính duy nhất của Yêu cầu báo giá: Một cặp *(Agency – Experience)* chỉ có **1 yêu cầu báo giá duy nhất**. Các lần bấm xin báo giá tiếp theo sẽ tái sử dụng bản ghi hiện có, không tạo trùng lặp. | Tránh gửi trùng yêu cầu thương mại tới cùng một xưởng. |
| **BR-019** | Mỗi cặp *(Agency – Local Provider)* chỉ có tối đa **1 phòng Chat Active**. Các yêu cầu trải nghiệm hoặc báo giá mới sẽ được nối tiếp vào luồng chat này kèm ngữ cảnh; phòng chat đã đóng (Closed) được lưu làm lịch sử và không mở lại. | Duy trì sự liền mạch trong trao đổi hợp tác giữa lữ hành và làng nghề. |

---

## III. QUY CHUẨN MÔ HÌNH NGÔN NGỮ & PROMPT (LLM & CLOUDFLARE WORKERS AI)

1. **Lựa chọn mô hình & Hạ tầng**:
   - Sử dụng hạ tầng **Cloudflare Workers AI Free Tier**:
     - Model chính: `@cf/meta/llama-3.1-8b-instruct`.
     - Model dự phòng (Fallback): `@cf/zai-org/glm-4.7-flash`.
   - Kết nối trực tiếp qua REST API endpoint với `CF_AI_API_TOKEN` và `CF_ACCOUNT_ID`.

2. **Quy định nghiêm ngặt về Định dạng Phản hồi (No Technical Dumps)**:
   - Phản hồi của AI trong trường `conversational_reply` phải là câu văn tự nhiên, thân thiện, mang phong thái chuyên gia điều phối tour di sản Hà Nội.
   - **Tuyệt đối không hiển thị đoạn debug kỹ thuật** dạng bullet points (`Extracted Context: • craft_preference: ... • origin: ...`).
   - Mọi thông số phân tích chỉ được lưu trong đối tượng dữ liệu nội bộ (`extracted_context`), không bao giờ để rò rỉ ra văn bản hiển thị cho người dùng.
   - Cơ chế bảo vệ 3 tầng: Tầng System Prompt $\rightarrow$ Tầng Backend Service (`sanitizeConversationalReply`) $\rightarrow$ Tầng Giao diện người dùng (`renderFormattedContent`).

3. **Cơ chế Fallback an toàn khi AI bận (BR-017)**:
   - Nếu Cloudflare AI Worker timeout, mất kết nối hoặc hết hạn ngạch: Lưu trữ nguyên vẹn đoạn chat hiện tại, thông báo *"Hệ thống AI đang bận. Đã lưu đoạn hội thoại"* kèm nút **Thử lại (Retry)**.
   - Nghiêm cấm bịa đặt hoặc phỏng đoán kết quả ghép tour giả khi AI không khả dụng.

---

## IV. QUY TẮC CHỐNG BỊA ĐẶT & LINH HOẠT GỢI Ý (ANTI-FABRICATION & BRIDGING)

> **NGUYÊN TẮC VÀNG: KHÔNG CÓ DỮ LIỆU THÌ TUYỆT ĐỐI KHÔNG ĐƯỢC BỊA — HÃY LINH HOẠT CÂU TRẢ LỜI VÀ ĐƯA RA NHỮNG GỢI Ý LIÊN QUAN ĐẾN INPUT CỦA NGƯỜI DÙNG.**

1. **Tuyệt đối cấm bịa đặt (Zero Hallucination)**:
   - Nếu người dùng yêu cầu một nghề thủ công, xưởng nghề, địa điểm, mức giá hoặc sức chứa không có trong cơ sở dữ liệu đã xác minh: AI **tuyệt đối không được tự ý sáng tác ra tên xưởng ảo, địa chỉ giả, nghệ nhân không có thật hay giá vé hư cấu**.

2. **Minh bạch và thông báo khéo léo**:
   - Chân thành và khéo léo thông báo cho người dùng biết nền tảng hiện tại tập trung vào mạng lưới làng nghề di sản truyền thống quanh Hà Nội đã được kiểm định chất lượng, và loại hình cụ thể mà họ đang tìm kiếm tạm thời chưa có hồ sơ xác minh trên hệ thống.

3. **Linh hoạt cầu nối & Gợi ý thay thế tương đồng (Contextual Bridging)**:
   - Ngay lập tức đề xuất các giải pháp thay thế gần gũi nhất dựa trên các đặc tính mà người dùng quan tâm:
     - *Nếu hỏi hoạt động ngoài trời / teambuilding tại khu vực ngoại thành*: Gợi ý Workshop Múa rối nước Đào Thục (Đông Anh - sân khấu thủy đình làng cổ ngoài trời độc đáo), hoặc Khuôn viên xưởng nặn gốm đồng đội Bát Tràng, hoặc Workshop mộc Chàng Sơn.
     - *Nếu hỏi nghề hiếm (ví dụ làm đồ da, may mặc hiện đại)*: Linh hoạt gợi ý Lụa tơ tằm Vạn Phúc hoặc Mây tre đan Phú Vinh.
     - *Nếu hỏi địa phương ngoài Hà Nội*: Linh hoạt giới thiệu 9 cụm làng nghề di sản tiêu biểu của Thăng Long – Hà Nội cùng thời gian di chuyển thuận tiện từ trung tâm.
   - Gợi ý câu hỏi định hướng tiếp theo phù hợp với số lượng khách và khoảng thời gian đoàn dự kiến khởi hành.

---

## V. QUY CHUẨN TRẢI NGHIỆM NGƯỜI DÙNG & GIAO DIỆN (UI / UX STANDARDS)

1. **Một thực thể – Một Card riêng biệt kèm ảnh minh họa**:
   - Mỗi Làng nghề (`village_card`), Xưởng nghề (`provider_card`), hay Hoạt động trải nghiệm (`activity_card`) phải nằm trên **một Card riêng rẽ**.
   - Mỗi card có ảnh đại diện thực tế, danh hiệu/thể loại, tên, địa chỉ, khoảng giá, và cụm nút hành động tương ứng.
   - Không gộp văn bản chung chung hay chỉ hiển thị duy nhất 1 card.

2. **Lọc Scope hiển thị nghiêm ngặt (`detectCardScope`)**:
   - **Người dùng chỉ hỏi về Làng** (*"Có những làng nghề nào?", "Gần trung tâm có làng gì?"*): **Chỉ hiển thị Card Làng nghề**; ẩn toàn bộ card Hoạt động và card Xưởng.
   - **Người dùng chỉ hỏi về Xưởng / Nghệ nhân**: Chỉ hiển thị Card Xưởng nghề.
   - **Người dùng chỉ hỏi về Trải nghiệm / Workshop**: Chỉ hiển thị Card Hoạt động trải nghiệm.
   - **Yêu cầu lên Tour trọn gói**: Hiển thị đầy đủ cả Card Hoạt động và Xưởng được xếp hạng cao nhất.

3. **Ghim màn hình ở đầu câu trả lời (`block: 'start'`)**:
   - Khi AI trả lời xong, giao diện tự động cuộn mượt và **ghim ngay tại dòng đầu tiên của bong bóng tin nhắn AI** (`scrollIntoView({ behavior: 'smooth', block: 'start' })`).
   - Tuyệt đối không để màn hình tự trôi tuột xuống đáy trang (chân các danh sách card), giúp người dùng đọc trọn vẹn câu trả lời từ đầu.

4. **Điều hướng Chuyển tiếp Thương mại (Reallocate to Messages Screen)**:
   - Các nút xem chi tiết (*Chi tiết trải nghiệm, Xem làng nghề, Xem hồ sơ xưởng, Xem lịch trống*) mở sang tab mới bằng `target="_blank"` và `rel="noopener noreferrer"`.
   - **Nút "Xin báo giá ngay" / "Báo giá"**: Khi người dùng nhấn nút:
     1. Hệ thống tự động gửi yêu cầu báo giá chính thức kèm tin nhắn ngữ cảnh đến xưởng thủ công qua API `POST /api/ait/sessions/:id/quote`.
     2. Giao diện tự động chuyển tiếp (**reallocate**) sang màn hình Tin nhắn (`/messages?chat_session_id=...`).
     3. Tại màn hình Tin nhắn của hội thoại đó, hệ thống **hiển thị ngay Card Hoạt động trải nghiệm của làng nghề** trực tiếp bên trong bong bóng tin nhắn yêu cầu báo giá (gồm ảnh thực tế, loại hình workshop, tên hoạt động, làng nghề, xưởng chủ quản, thời lượng, sức chứa đoàn, đơn giá B2B/khách và nút xem chi tiết làng nghề/trải nghiệm).
   - Cơ chế mở màn hình mới sử dụng tab đồng bộ mở trước (`window.open('about:blank', '_blank')`) và cập nhật URL đích sau khi có `chat_session_id` — **chống chặn popup 100% trên mọi trình duyệt**.

---

## VI. QUY TẮC QUẢN LÝ LỊCH SỬ PHIÊN & LOẠI BỎ CHAT RỖNG (SESSION MANAGEMENT)

1. **Loại bỏ triệt để các chat rỗng (Zero Empty Sessions)**:
   - Các session mẫu tĩnh/giả lập (như mock-up cũ) bị loại bỏ hoàn toàn.
   - Một phiên chỉ được lưu vào danh sách lịch sử khi và chỉ khi **người dùng đã gửi ít nhất một tin nhắn** (`messages.some(m => m.sender === 'Agency')`).
   - Nếu người dùng bấm "+ Yêu cầu tour mới" nhưng chưa gõ gì trong phiên trước đó, phiên rỗng đó sẽ bị hủy bỏ, không làm rác danh sách lịch sử.

2. **Nút "+ Yêu cầu tour mới" cấp Session độc lập**:
   - Khi bấm "+ Yêu cầu tour mới", hệ thống gọi API `POST /api/ait/sessions` để khởi tạo một `matching_session_id` hoàn toàn mới.
   - Khung chat trở về trạng thái tin nhắn chào mừng, xóa input, sẵn sàng tiếp nhận yêu cầu đoàn mới mà không bị dính líu ngữ cảnh của đoàn cũ.

3. **Khả năng tiếp tục thao tác trên Session cũ**:
   - Danh sách session ở thanh bên trái (Sidebar) hiển thị:
     - Tiêu đề trích xuất từ câu hỏi đầu tiên của đoàn (ví dụ: *"Đoàn 15 khách gốm Bát Tràng"*).
     - Phụ đề gồm thể loại nghề, giờ cập nhật và mã phiên.
   - Khi nhấp vào một session cũ trong sidebar: Hệ thống tải lại toàn bộ tin nhắn, thẻ card và mốc ghim của phiên đó. Người dùng có thể tiếp tục gõ tin nhắn để trò chuyện tiếp trong đúng session đó.
   - Hỗ trợ nút xóa (`✕`) từng session khi người dùng không còn nhu cầu theo dõi.

4. **Phân nhóm thời gian trực quan**:
   - Danh sách phiên được phân loại tự động thành:
     - **HÔM NAY**: Các phiên được cập nhật trong vòng 24 giờ.
     - **7 NGÀY QUA**: Các phiên trong khoảng từ 1 đến 7 ngày.
     - **CŨ HƠN**: Các phiên trên 7 ngày.
   - Có thanh tìm kiếm tức thì để lọc nhanh theo tên hoặc nội dung yêu cầu.

---

## VII. ĐẶC TẢ TÍNH NĂNG VÒNG LẶP HỌC HỎI (LEARNING LOOP) & TỐI ƯU BỐ CỤC EXPLORE

> **MỤC TIÊU: LIÊN TỤC CẢI TIẾN BỐ CỤC (LAYOUT) VÀ THỨ TỰ ƯU TIÊN (PRIORITY) CỦA MÀN HÌNH KHÁM PHÁ (`/EXPLORE`) ĐỂ PHÙ HỢP HOÀN HẢO VỚI GU VÀ NHU CẦU CỦA TỪNG ĐẠI LÝ LỮ HÀNH.**

### 1. Quy tắc Cửa sổ Thời gian 24 Giờ (24-Hour Recency Boost)
- **Quy tắc LL-01**: Các phiên tìm kiếm trong vòng **24 giờ gần nhất** phản ánh nhu cầu thương mại khẩn cấp nhất của đại lý lữ hành (đang lên báo giá tour cho khách).
- Khi đại lý vừa trao đổi với AI về một làng nghề hoặc nghề thủ công (ví dụ: Gốm Bát Tràng, Lụa Vạn Phúc, Mộc Chàng Sơn), hệ số quan tâm (**Affinity Weight**) của các thực thể liên quan sẽ được gia tăng đột biến trong 24 giờ:
  - Trùng loại nghề thủ công: $+30$ điểm.
  - Trùng tên làng nghề: $+40$ điểm.
  - Phù hợp với khoảng sức chứa/ngân sách vừa tìm: $+15$ điểm.

### 2. Tự động Tối ưu hóa Bố cục Màn hình Khám phá (`/explore`)
- **Quy tắc LL-02 (Ưu tiên Hero Section & Banner Làng nghề)**:
  - Làng nghề có điểm tương đồng (Affinity) cao nhất trong 24h qua sẽ được tự động đưa lên **vị trí số 1 trong dải Làng nghề nổi bật (`villageStrip`)**.
  - **Hero Banner** lớn ở đầu trang Khám phá tự động hiển thị hình ảnh đại diện và câu chuyện của làng nghề có độ tương quan cao nhất đó.
- **Quy tắc LL-03 (Ưu tiên Danh mục Trải nghiệm - Experience Reranking)**:
  - Bảng danh mục trải nghiệm được sắp xếp lại theo công thức kết hợp:
    $$\text{Total Score} = (\text{Base Score} \times 0.25) + (\text{Affinity}_{24h} \times 0.50) + (\text{Historical Signals} \times 0.25)$$
  - Các workshop, tour trải nghiệm thuộc làng nghề và ngành nghề lữ hành vừa tìm kiếm trong 24h sẽ được đẩy lên các vị trí đầu tiên của danh sách kết quả.

### 3. Quy tắc Suy giảm theo Thời gian (Time Decay - BR-013 / BR-021)
- **Quy tắc LL-04**: Sau khi hết 24 giờ, độ ưu tiên tăng vọt giảm dần và chuyển về trọng số lịch sử nền, áp dụng hàm suy giảm bán rã theo thời gian (**Exponential Half-life Decay** với chu kỳ $\text{half\_life} = 30\text{ ngày}$).
- Đảm bảo rằng nếu lữ hành chuyển sang quan tâm các chủ đề tour khác trong những tuần tiếp theo, trang Khám phá sẽ mềm dẻo thích ứng theo gu mới mà không bị cố định mãi mãi ở một chủ đề cũ.

### 4. Quy tắc Cách ly Cá nhân hóa (Isolation Scope - BR-014 / BR-022)
- **Quy tắc LL-05**: Thuật toán Learning Loop chỉ áp dụng việc cá nhân hóa giao diện và thứ tự xếp hạng cho **riêng tài khoản Lữ hành đang đăng nhập**.
- Khách vãng lai (Guest) và các công ty lữ hành khác vẫn nhìn thấy giao diện và thứ tự hiển thị tiêu chuẩn/khách quan của hệ thống, không bị ảnh hưởng chéo.

---

## VIII. QUY TẮC BẮT BUỘC: CHỈ GỢI Ý XƯỞNG ĐÃ ĐƯỢC XÁC MINH (VERIFIED ONLY RULE - BR-003)

1. **Nguyên tắc cốt lõi (Core Constraint)**:
   - Hệ sinh thái Hanoi Artisan Bridge hoạt động dựa trên uy tín thương mại giữa Lữ hành và Nghệ nhân. Do đó, theo quy chuẩn **BR-003**, hệ thống AI Tour Matching và các Card giải pháp **CHỈ ĐƯỢC PHÉP gợi ý các Xưởng nghề địa phương đã đạt chứng nhận `Verified`**.
   - Các cơ sở thủ công đang trong trạng thái chưa hoàn thiện hồ sơ hoặc chưa được Ban Quản lý / UBND phê duyệt (như `Draft`, `Pending Verification`, hoặc `Revision Required`) **tuyệt đối không được xuất hiện trong danh sách card gợi ý**, và AI không được đề xuất họ làm ứng viên ghép tour nhận báo giá.

2. **Danh sách 5 Xưởng nghề đã được Xác minh (Verified Providers) trong hệ thống**:
   | Tên Xưởng | Làng nghề | Nghề thủ công | Trạng thái Xác minh | Quyền thương mại (Báo giá / Chat) |
   |---|---|---|---|---|
   | **Xưởng gốm sứ Bát Tràng** | Bát Tràng (Gia Lâm) | Gốm sứ truyền thống (Men lam & vuốt gốm) | `Verified` | Hợp lệ (100% khả dụng) |
   | **Hợp tác xã dệt lụa Vạn Phúc** | Vạn Phúc (Hà Đông) | Dệt lụa tơ tằm truyền thống | `Verified` | Hợp lệ (100% khả dụng) |
   | **Xưởng thủ công Phú Vinh** | Phú Vinh (Chương Mỹ) | Mây tre đan mỹ nghệ | `Verified` | Hợp lệ (100% khả dụng) |
   | **Xưởng thủ công Chuông** | Làng Chuông (Thanh Oai) | Làm nón lá 16 vành | `Verified` | Hợp lệ (100% khả dụng) |
   | **Xưởng thủ công Quất Động** | Quất Động (Thường Tín) | Thêu tay họa tiết truyền thống | `Verified` | Hợp lệ (100% khả dụng) |

3. **Xử lý đối với các cơ sở chưa xác minh (Unverified Handlers)**:
   - Các cơ sở như *Phường rối nước Đào Thục* (`Revision Required`), *Xưởng thủ công Sơn Đồng* (`Draft`), *Xưởng thủ công Hạ Thái* (`Pending Verification`) chỉ dùng cho kiểm thử quy trình duyệt hồ sơ (ADM / PRF), không mở kết nối thương mại trực tiếp.
   - **Tầng Card Resolver (`card-resolver.ts`)**: Bộ lọc tự động loại trừ mọi cơ sở có `is_verified !== true`.
   - **Tầng Giao diện (`ai-matching/page.tsx`)**: Nếu người dùng cố tình thao tác, hệ thống hiển thị thông báo hướng dẫn rõ ràng: *"Cơ sở này đang trong quá trình hoàn thiện hồ sơ xác minh với cơ quan quản lý và chưa mở nhận báo giá trực tuyến"*, đồng thời chặn mở tab thương mại trắng.
   - **Tầng Mô hình LLM (`prompt-templates.ts`)**: Huấn luyện AI nhận biết và chỉ tập trung ghép tour vào 5 xưởng đạt chuẩn `Verified`. Nếu người dùng hỏi về hoạt động đồng đội / teambuilding ngoài trời, AI chủ động chuyển hướng sang các xưởng có không gian phù hợp đã đạt chuẩn như Bát Tràng (Team Pottery Challenge) hoặc Phú Vinh (Workshop đan lát nhà vườn).

---

## IX. QUY TẮC RÀNG BUỘC TRẦN NGÂN SÁCH & TOÀN VẸN ĐƠN GIÁ (BUDGET CEILING & PRICING INTEGRITY - BR-005, BR-011)

1. **Bảng Đơn giá B2B Niêm yết Chuẩn của Toàn Sàn (Verified Activity Price Catalog)**:
   Hệ thống Hanoi Artisan Bridge có mức giá trải nghiệm tính theo đầu khách (VNĐ/người) cụ thể cho từng làng nghề như sau:
   - **Gốm sứ Bát Tràng**: `150.000 VNĐ / người` (*Mức giá khởi điểm thấp nhất trên toàn sàn*).
   - **Dệt lụa tơ tằm Vạn Phúc**: `175.000 VNĐ / người`.
   - **Mây tre đan Phú Vinh**: `200.000 VNĐ / người`.
   - **Nón lá Làng Chuông**: `225.000 VNĐ / người`.
   - **Thêu tay Quất Động**: `250.000 VNĐ / người`.
   - **Mộc mỹ nghệ Sơn Đồng**: `275.000 VNĐ / người`.
   - **Múa rối nước Đào Thục**: `300.000 VNĐ / người`.
   - **Sơn mài Hạ Thái**: `325.000 VNĐ / người`.

2. **Ràng buộc cứng về Trần Ngân sách (Hard Budget Ceiling - BR-005)**:
   - Khi người dùng đưa ra giới hạn ngân sách (ví dụ: *"dưới 150k"*, *"ngân sách tối đa 200k"*, *"chi phí <= 180k"*):
     - **Tầng Card Resolver (`card-resolver.ts`)**: Bộ giải quyết thẻ tự động bóc tách trần ngân sách (`parseBudgetConstraint`) và áp dụng bộ lọc tuyệt đối: `activity.price_per_person <= maxPrice`. Tuyệt đối không trả về bất kỳ Card hoạt động nào có đơn giá vượt trần ngân sách đã nêu (ví dụ: yêu cầu dưới 150k thì không bao giờ hiển thị thẻ 175k của Vạn Phúc hay 200k của Phú Vinh).
     - **Tầng Mô hình LLM (`prompt-templates.ts`)**: Huấn luyện mô hình tuân thủ **Rule 12**: Cấm tuyệt đối việc tự ý gợi ý các hoạt động vượt trần ngân sách của khách hàng trong phần đàm thoại.

3. **Quy tắc Nới lỏng Thông minh khi Ngân sách Dưới Sàn (Constraint Relaxation - BR-011)**:
   - Vì mức giá thấp nhất trên toàn nền tảng hiện tại là **150.000 VNĐ/người (Gốm sứ Bát Tràng)**, nên trên sàn **KHÔNG CÓ hoạt động nào có đơn giá thực sự dưới 150.000 VNĐ**.
   - Khi khách hàng yêu cầu *"dưới 150k"*:
     - AI và hệ thống phải giải thích rõ ràng và minh bạch cho đại lý: *"Hiện tại mức giá trải nghiệm tối thiểu trên nền tảng là 150.000 VNĐ/khách (Workshop Gốm sứ Bát Tràng)"*.
     - Chủ động đề xuất hoạt động gốm Bát Tràng (150.000 VNĐ) như phương án sát ngân sách nhất để đại lý cân nhắc, thay vì tự ý gợi ý các hoạt động đắt hơn (175k, 200k, 225k...).
     - Card giải pháp kèm theo chỉ hiển thị duy nhất hoạt động Bát Tràng (150k), hoàn toàn loại bỏ các hoạt động có giá cao hơn.

---

*Tài liệu này là quy chuẩn thống nhất cho việc phát triển, kiểm thử và mở rộng tính năng AI Tour Matching và Learning Loop của dự án Hanoi Artisan Bridge.*

