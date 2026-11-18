# BỘ 114 CÂU HỎI KIỂM THỬ AI TOUR MATCHING (AIT)

**Dự án:** Hanoi Artisan Bridge  
**Mục tiêu:** Kiểm thử khả năng hiểu yêu cầu agency lữ hành, truy xuất dữ liệu làng nghề/xưởng nghề/trải nghiệm, matching, xử lý hội thoại tự nhiên và chống bịa đặt.

## 1. Quy ước kiểm thử

### Dataset routing

- Input **không chứa chuỗi `test`**: chỉ sử dụng **Seed dataset (8 làng nghề)**.
- Input **có chứa chuỗi `test`**: chỉ sử dụng **Fixture dataset (14 làng nghề)**.
- Quy tắc áp dụng theo input hiện tại của người dùng. Không kế thừa trạng thái Fixture từ lượt trước.
- Không trộn Seed và Fixture trong cùng một lần truy xuất.
- Các câu hỏi không có từ `test` trong bộ này mặc định kiểm tra Seed. Các câu có `test` kiểm tra Fixture.

### Cách chạy

- Câu hỏi đơn: chạy mỗi câu trong một phiên chat độc lập để tránh ngữ cảnh trước ảnh hưởng kết quả.
- Hội thoại nhiều lượt: chạy toàn bộ chuỗi trong cùng một phiên chat, không reset giữa các lượt.
- Không yêu cầu AI phải luôn trả về kết quả. Nếu thiếu thông tin hoặc dataset không có căn cứ, câu trả lời đúng có thể là hỏi lại hoặc thông báo chưa có dữ liệu.
- Khi đánh giá, đối chiếu cả bản ghi được truy xuất/log truy vấn nếu có, không chỉ dựa vào câu trả lời hiển thị.

### Trạng thái đánh giá

- **PASS:** Đáp ứng kết quả mong đợi, dữ liệu có căn cứ và không vi phạm quy tắc bắt buộc.
- **FAIL:** Trả lời sai, truy xuất sai dataset, bỏ qua tiêu chí quan trọng hoặc bịa thông tin.
- **BLOCKED:** Không thể chạy do lỗi môi trường, giao diện, API hoặc database.

---

# PHẦN I. 72 CÂU HỎI NGHIỆP VỤ

## Nhóm 1. Hệ thống là gì? (SYS01–SYS12)

**Mục tiêu:** Kiểm tra AI hiểu đúng vai trò, chức năng, đối tượng sử dụng và nguồn dữ liệu của AIT.

| ID | Loại | Input kiểm thử | Kết quả mong đợi |
|---|---|---|---|
| SYS01 | Cơ bản | AIT là hệ thống gì vậy? | Giới thiệu ngắn gọn về AIT và mục đích sử dụng. |
| SYS02 | Cơ bản | Hanoi Artisan Bridge giúp gì cho công ty du lịch? | Nêu lợi ích trong tìm kiếm và lựa chọn làng nghề, trải nghiệm. |
| SYS03 | Cơ bản | Tôi có thể tìm được những thông tin gì trên hệ thống? | Liệt kê các loại thông tin thực tế có trong dataset. |
| SYS04 | Cơ bản | Hệ thống này dành cho khách du lịch hay dành cho công ty lữ hành? | Xác định đúng đối tượng sử dụng chính. |
| SYS05 | Biến thể | Tôi đang làm tour inbound, muốn tìm các hoạt động trải nghiệm văn hóa bản địa thì dùng công cụ này được không? | Giải thích khả năng hỗ trợ tìm kiếm hoạt động phù hợp. |
| SYS06 | Biến thể | Thay vì tự tìm từng làng nghề trên Google, tôi dùng AIT thì được lợi gì? | Giải thích giá trị của việc tổng hợp và matching dữ liệu. |
| SYS07 | Biến thể | Công cụ này có tìm giúp tôi địa điểm tổ chức workshop cho khách không? | Giải thích khả năng tìm địa điểm dựa trên dữ liệu hoạt động thực tế. |
| SYS08 | Biến thể | Tôi chỉ cần lên ý tưởng tour làng nghề, chưa cần đặt dịch vụ thì có dùng được không? | Xác nhận phạm vi tư vấn và gợi ý. |
| SYS09 | Đánh đố | AIT có đảm bảo tất cả địa điểm được gợi ý đều đang mở cửa và nhận khách không? | Phân biệt dữ liệu hiện có với tình trạng hoạt động theo thời gian thực. |
| SYS10 | Đánh đố | Nếu AI gợi ý một xưởng thì có nghĩa là xưởng đó đã đồng ý hợp tác với công ty tôi đúng không? | Không khẳng định quan hệ hợp tác nếu không có dữ liệu xác nhận. |
| SYS11 | Đánh đố | AI có tự tìm thêm làng nghề ngoài danh sách đang có để trả lời tôi không? | Nêu rõ phạm vi dữ liệu và khả năng tra cứu thực tế. |
| SYS12 | Đánh đố | Tôi thấy AI đề xuất một địa điểm, vậy thông tin đó chắc chắn chính xác 100% chứ? | Không cam kết tuyệt đối; khuyến nghị xác minh thông tin quan trọng với đơn vị cung cấp. |

## Nhóm 2. Phạm vi dữ liệu (DATA01–DATA12)

**Mục tiêu:** Kiểm tra AI hiểu chính xác dữ liệu đang có, nghề truyền thống, xưởng nghề, hoạt động và khả năng truy xuất thông tin.

| ID | Loại | Input kiểm thử | Kết quả mong đợi |
|---|---|---|---|
| DATA01 | Cơ bản | Hiện tại có những làng nghề nào trong hệ thống? | Liệt kê đúng 8 bản ghi Seed. |
| DATA02 | Cơ bản | Hà Nội hiện có những nhóm nghề truyền thống nào được lưu trong hệ thống? | Tổng hợp các nhóm nghề thực tế trong Seed. |
| DATA03 | Cơ bản | Có làng nghề nào chuyên về gốm không? | Truy xuất bản ghi liên quan đến gốm. |
| DATA04 | Cơ bản | Có những địa điểm nào làm nghề dệt lụa? | Tìm theo nghề và thông tin có trong dataset. |
| DATA05 | Biến thể | Tôi muốn tìm hiểu các nghề thủ công liên quan đến mây tre, có dữ liệu không? | Tìm đúng nhóm nghề nếu có, nếu không thì thông báo chưa có dữ liệu phù hợp. |
| DATA06 | Biến thể | Ngoài làng nghề truyền thống, hệ thống có lưu thông tin từng xưởng sản xuất không? | Phân biệt bản ghi làng nghề và bản ghi xưởng. |
| DATA07 | Biến thể | Có địa điểm nào vừa sản xuất sản phẩm thủ công vừa tổ chức cho khách trải nghiệm không? | Chỉ trả về địa điểm có cả hai thông tin được xác thực. |
| DATA08 | Biến thể | Cho tôi xem những địa điểm có thông tin về sức chứa đoàn khách. | Lọc theo trường sức chứa nếu tồn tại. |
| DATA09 | Đánh đố | Làng nghề nào có nhiều xưởng nhất? | Chỉ so sánh nếu có dữ liệu số lượng xưởng đầy đủ và tương thích. |
| DATA10 | Đánh đố | Liệt kê toàn bộ xưởng đang hoạt động tại Hà Nội, kể cả những xưởng chưa có trong hệ thống. | Không tuyên bố danh sách trong database là toàn bộ xưởng tại Hà Nội. |
| DATA11 | Đánh đố | Có bao nhiêu làng nghề có thể tổ chức tour miễn phí? | Chỉ thống kê nếu có dữ liệu xác thực về giá hoặc chính sách miễn phí. |
| DATA12 | Đánh đố | test: Liệt kê tất cả làng nghề có trong dữ liệu và cho biết nghề chính của từng làng. | Truy xuất đúng 14 bản ghi Fixture và nghề chính theo từng bản ghi. |

## Nhóm 3. Cách sử dụng (USE01–USE12)

**Mục tiêu:** Kiểm tra khả năng hiểu input tự nhiên, nhận diện tiêu chí, hỏi lại khi thiếu thông tin và xử lý yêu cầu thay đổi.

| ID | Loại | Input kiểm thử | Kết quả mong đợi |
|---|---|---|---|
| USE01 | Cơ bản | Tôi cần nhập những thông tin gì để tìm được địa điểm phù hợp? | Hướng dẫn các tiêu chí có thể nhập như nghề, hoạt động, số khách, thời gian, ngân sách, vị trí. |
| USE02 | Cơ bản | Tôi muốn tìm làng nghề làm gốm thì nhập như thế nào? | Hướng dẫn bằng câu hỏi tự nhiên, không bắt buộc cú pháp cứng. |
| USE03 | Cơ bản | Nếu muốn tìm theo số lượng khách thì tôi phải ghi thế nào? | Hướng dẫn cung cấp quy mô đoàn. |
| USE04 | Cơ bản | Tôi muốn tìm địa điểm theo ngân sách thì cần nhập ra sao? | Hướng dẫn cung cấp ngân sách theo người hoặc theo đoàn. |
| USE05 | Biến thể | Đoàn tôi khoảng 20–25 người, muốn trải nghiệm thủ công trong buổi sáng, tìm giúp nhé. | Hiểu số khách là khoảng 20–25 và thời gian là buổi sáng. |
| USE06 | Biến thể | Ưu tiên chỗ nào gần trung tâm, đi lại đỡ mất thời gian ấy. | Hiểu nhu cầu ưu tiên vị trí gần trung tâm. |
| USE07 | Biến thể | Có thể bỏ điều kiện ngân sách, chỉ lọc theo hoạt động và khoảng cách không? | Bỏ ngân sách, giữ các tiêu chí còn lại. |
| USE08 | Biến thể | Tôi muốn đổi từ trải nghiệm gốm sang trải nghiệm làm tranh, những điều kiện khác giữ nguyên. | Chỉ thay đổi hoạt động, giữ các tiêu chí khác. |
| USE09 | Đánh đố | Tôi muốn tìm một nơi phù hợp, bạn tự chọn hết tiêu chí giúp tôi nhé. | Có thể hỏi thêm hoặc đưa ra giả định rõ ràng, không tự khẳng định nhu cầu chưa được cung cấp. |
| USE10 | Đánh đố | Tôi cần tìm địa điểm cho một đoàn đông, địa điểm nào cũng được, miễn là phù hợp. | Hỏi thêm số lượng khách hoặc thông tin cần thiết để matching. |
| USE11 | Đánh đố | Tìm cho tôi địa điểm tốt nhất. | Làm rõ tiêu chí tốt nhất hoặc đề xuất theo các tiêu chí có dữ liệu, không xếp hạng vô căn cứ. |
| USE12 | Đánh đố | Tôi không nhớ tên làng, chỉ nhớ nơi đó có hoạt động làm đồ thủ công từ đất sét. | Hiểu mô tả hoạt động và tìm theo dữ liệu liên quan đến gốm, không bắt buộc người dùng nhớ tên. |

## Nhóm 4. Giới hạn hệ thống (LIM01–LIM12)

**Mục tiêu:** Kiểm tra khả năng xử lý yêu cầu ngoài phạm vi dữ liệu, đơn vị đo, ngoại ngữ, tiền tệ và điều kiện chưa được hỗ trợ.

| ID | Loại | Input kiểm thử | Kết quả mong đợi |
|---|---|---|---|
| LIM01 | Cơ bản | Hệ thống có hỗ trợ tiếng Anh không? | Trả lời đúng khả năng ngôn ngữ thực tế của AI. |
| LIM02 | Cơ bản | Tôi có thể nhập ngân sách bằng USD không? | Nêu khả năng xử lý ngoại tệ và quy tắc quy đổi nếu được hỗ trợ. |
| LIM03 | Cơ bản | Có thể tìm địa điểm trong bán kính 5–10 km không? | Giải thích khả năng lọc khoảng cách và yêu cầu điểm xuất phát. |
| LIM04 | Cơ bản | Hệ thống có thể tìm địa điểm theo ngày tổ chức cụ thể không? | Nêu rõ có hay không dữ liệu lịch hoạt động/khả năng nhận khách theo ngày. |
| LIM05 | Biến thể | Khách của tôi chỉ có 2 tiếng rảnh, có thể lọc những hoạt động ngắn không? | Matching theo thời lượng nếu có dữ liệu. |
| LIM06 | Biến thể | Tôi muốn tìm nơi có thể đón khách vào cuối tuần này. | Kiểm tra khả năng truy xuất lịch hoạt động; không tự khẳng định còn chỗ. |
| LIM07 | Biến thể | Có địa điểm nào có nhân viên nói tiếng Anh để hướng dẫn khách nước ngoài không? | Chỉ trả về nơi có dữ liệu ngoại ngữ được xác nhận. |
| LIM08 | Biến thể | Tôi muốn lọc các địa điểm có điều hòa, nhà vệ sinh và chỗ đỗ xe. | Lọc theo các tiện ích có trong dữ liệu, thông báo trường còn thiếu. |
| LIM09 | Đánh đố | Tỷ giá USD/VND hôm nay là bao nhiêu và tính luôn giá tour cho tôi? | Không tự đưa tỷ giá hoặc giá tour nếu không có nguồn cập nhật và dữ liệu giá. |
| LIM10 | Đánh đố | Tìm làng nghề cách Hồ Gươm đúng 3,5 km, sai số tối đa 100 m. | Chỉ trả kết quả nếu có tọa độ và phương pháp tính phù hợp; nếu không thì nêu giới hạn. |
| LIM11 | Đánh đố | Tôi cần một địa điểm có thể tiếp nhận 200 khách cùng lúc, bạn xác nhận giúp nhé. | Không xác nhận sức chứa nếu dữ liệu không chứng minh được. |
| LIM12 | Đánh đố | Tôi cần tour diễn ra ngày mai, đảm bảo địa điểm còn nhận khách và có đủ nguyên liệu. | Không cam kết khả năng nhận khách hoặc nguyên liệu nếu không có xác nhận thực tế. |

## Nhóm 5. Đặt tour và liên hệ (BOOK01–BOOK12)

**Mục tiêu:** Kiểm tra AI cung cấp đúng thông tin liên hệ, báo giá, quy trình đặt dịch vụ và phân biệt giữa gợi ý với booking thực tế.

| ID | Loại | Input kiểm thử | Kết quả mong đợi |
|---|---|---|---|
| BOOK01 | Cơ bản | Nếu muốn đưa khách đến làng nghề này thì tôi liên hệ với ai? | Cung cấp đầu mối liên hệ nếu có dữ liệu xác thực. |
| BOOK02 | Cơ bản | Có số điện thoại của xưởng không? | Trả số điện thoại nếu có, nếu không thì thông báo chưa có dữ liệu. |
| BOOK03 | Cơ bản | Tôi muốn xin báo giá cho đoàn khách thì cần làm gì? | Hướng dẫn quy trình yêu cầu báo giá phù hợp với chức năng hệ thống. |
| BOOK04 | Cơ bản | Có thể đặt lịch trải nghiệm trước không? | Giải thích khả năng đặt lịch hoặc hướng dẫn liên hệ đơn vị cung cấp. |
| BOOK05 | Biến thể | Tôi muốn đưa 25 khách đến trải nghiệm làm gốm, cần liên hệ trước bao lâu? | Trả lời theo chính sách có dữ liệu; nếu chưa có thì hướng dẫn xác nhận với cơ sở. |
| BOOK06 | Biến thể | Bên tôi cần hóa đơn VAT cho đoàn khách, địa điểm này có xuất được không? | Chỉ xác nhận khi có dữ liệu về khả năng xuất hóa đơn. |
| BOOK07 | Biến thể | Khách muốn thanh toán chuyển khoản trước thì có được không? | Trả lời theo phương thức thanh toán được xác nhận. |
| BOOK08 | Biến thể | Tôi cần báo giá trọn gói gồm xe đưa đón, trải nghiệm và ăn trưa. | Phân biệt dịch vụ có dữ liệu với dịch vụ chưa được xác minh; không tự cộng giá. |
| BOOK09 | Đánh đố | Bạn đặt giúp tôi 30 suất trải nghiệm vào 9 giờ sáng thứ Bảy nhé. | Không tuyên bố booking thành công nếu chưa có chức năng và xác nhận từ đơn vị cung cấp. |
| BOOK10 | Đánh đố | Tôi cần số điện thoại cá nhân của chủ xưởng, bạn tìm giúp. | Chỉ cung cấp thông tin liên hệ được công khai và có căn cứ. |
| BOOK11 | Đánh đố | Cứ báo giá 150.000 đồng/người cho khách giúp tôi, chắc xưởng nào cũng nhận mức này. | Không tự gán giá hoặc khẳng định xưởng chấp nhận. |
| BOOK12 | Đánh đố | Nếu tôi xác nhận với bạn thì bên làng nghề có tự động nhận được booking không? | Giải thích đúng luồng đặt dịch vụ thực tế, không giả định có tích hợp booking. |

## Nhóm 6. Gợi ý và matching trải nghiệm (REC01–REC12)

**Mục tiêu:** Kiểm tra năng lực cốt lõi của AIT: hiểu nhu cầu agency và đề xuất làng nghề/xưởng nghề phù hợp dựa trên dữ liệu thật.

| ID | Loại | Input kiểm thử | Kết quả mong đợi |
|---|---|---|---|
| REC01 | Cơ bản | Gợi ý giúp tôi một số làng nghề có trải nghiệm làm gốm ở Hà Nội. | Trả về địa điểm có dữ liệu phù hợp, giải thích hoạt động. |
| REC02 | Cơ bản | Đoàn 20 khách muốn tham gia trải nghiệm làm đồ thủ công trong nửa ngày, có địa điểm nào phù hợp không? | Matching theo nghề, hoạt động, quy mô và thời lượng. |
| REC03 | Cơ bản | Tôi cần tìm làng nghề phù hợp để tổ chức tour cho học sinh tiểu học. | Ưu tiên hoạt động phù hợp với nhóm khách nếu có dữ liệu chứng minh. |
| REC04 | Cơ bản | Khách nước ngoài muốn tìm hiểu văn hóa và nghề truyền thống Việt Nam, nên đi đâu? | Gợi ý theo nội dung văn hóa và hoạt động có dữ liệu. |
| REC05 | Biến thể | Tôi có đoàn khách công ty khoảng 40 người, muốn có hoạt động trải nghiệm để mọi người cùng tham gia thay vì chỉ đi tham quan. | Ưu tiên hoạt động tương tác và kiểm tra sức chứa. |
| REC06 | Biến thể | Khách chỉ có buổi sáng ở Hà Nội, muốn vừa xem quy trình sản xuất vừa tự làm một món đồ nhỏ. | Matching nơi có cả tham quan quy trình và thực hành được xác nhận. |
| REC07 | Biến thể | Tôi muốn xây dựng tour trải nghiệm văn hóa cho khách Nhật, không thích những điểm quá đông và thương mại hóa. | Hiểu sở thích, tìm theo dữ liệu phù hợp; không tự khẳng định mật độ khách hoặc mức độ thương mại hóa. |
| REC08 | Biến thể | Có làng nghề nào phù hợp để tổ chức hoạt động ngoại khóa cho sinh viên thiết kế không? | Ưu tiên các nghề, hoạt động liên quan đến sáng tạo và thủ công nếu dữ liệu hỗ trợ. |
| REC09 | Đánh đố | Đoàn 50 người, ngân sách 100.000 đồng/người, muốn làm gốm, có xe đưa đón, ăn trưa và hướng dẫn viên tiếng Anh. Tìm một nơi đáp ứng toàn bộ nhé. | Kiểm tra từng điều kiện, phân biệt điều kiện đáp ứng/chưa xác minh/không đáp ứng; không ép trả một kết quả nếu không đủ dữ liệu. |
| REC10 | Đánh đố | Tôi muốn địa điểm gần Hồ Gươm nhất nhưng cũng phải có trải nghiệm làm gốm tốt nhất. | Cân bằng tiêu chí vị trí và hoạt động; không tuyên bố tốt nhất nếu không có thước đo. |
| REC11 | Đánh đố | Gợi ý cho tôi 3 làng nghề khác nhau nhưng cả 3 đều phải có workshop miễn phí, nhận đoàn 100 khách ngày mai. | Chỉ trả về địa điểm đáp ứng có bằng chứng; nếu không đủ thì thông báo rõ, không tạo đủ 3 kết quả giả. |
| REC12 | Đánh đố | test: Tôi có đoàn 12 khách muốn trải nghiệm một nghề thủ công ít phổ biến, thời lượng 2 tiếng, ưu tiên nơi có thông tin xưởng và hoạt động cụ thể. | Chỉ tìm trong Fixture; matching theo nghề, thời lượng, thông tin xưởng và hoạt động. Không bịa nếu thiếu dữ liệu. |

---

# PHẦN II. 36 CÂU HỎI VĂN NÓI, CÂU CỤT VÀ BIẾN THỂ (NAT01–NAT36)

**Mục tiêu:** Kiểm tra AI có hiểu cách agency giao tiếp tự nhiên: câu ngắn, thiếu chủ ngữ, cách nói đời thường, viết không đầy đủ và không theo cấu trúc biểu mẫu.

## Nhóm 1. Hỏi về hệ thống (NAT01–NAT06)

| ID | Input thực tế | Kết quả mong đợi |
|---|---|---|
| NAT01 | Cái này dùng làm gì thế? | Hiểu người dùng hỏi về chức năng AIT. |
| NAT02 | Dùng để tìm làng nghề à? | Giải thích chức năng tìm kiếm và matching. |
| NAT03 | Có gì hay ho không? | Giới thiệu ngắn gọn giá trị của hệ thống. |
| NAT04 | Dữ liệu ở đâu ra vậy? | Giải thích nguồn dữ liệu thực tế. |
| NAT05 | Có phải cứ hỏi là ra tour không? | Phân biệt gợi ý địa điểm với xây dựng và đặt tour. |
| NAT06 | Cái này dành cho bên tour đúng không? | Xác định đúng đối tượng agency lữ hành. |

## Nhóm 2. Hỏi về dữ liệu (NAT07–NAT12)

| ID | Input thực tế | Kết quả mong đợi |
|---|---|---|
| NAT07 | Có những làng nào nhỉ? | Liệt kê 8 làng trong Seed. |
| NAT08 | Có gốm không? | Tìm dữ liệu liên quan đến nghề gốm. |
| NAT09 | Làm lụa ở đâu? | Tìm các bản ghi liên quan đến dệt lụa. |
| NAT10 | Có chỗ nào làm đồ tre không? | Tìm nghề mây tre, tre nứa nếu có dữ liệu phù hợp. |
| NAT11 | Có xưởng luôn không hay chỉ có tên làng? | Phân biệt dữ liệu làng nghề và xưởng nghề. |
| NAT12 | Có chỗ nào cho khách tự làm không? | Tìm các địa điểm có hoạt động thực hành được xác nhận. |

## Nhóm 3. Cách sử dụng (NAT13–NAT18)

| ID | Input thực tế | Kết quả mong đợi |
|---|---|---|
| NAT13 | Tìm kiểu gì nhỉ? | Hướng dẫn nhập yêu cầu bằng ngôn ngữ tự nhiên. |
| NAT14 | Cứ nhập bình thường thôi à? | Xác nhận người dùng có thể nhập câu tự nhiên. |
| NAT15 | Muốn đổi cái vừa tìm thì sao? | Hướng dẫn thay đổi tiêu chí. |
| NAT16 | Làm lại từ đầu nhé. | Thực hiện reset yêu cầu tìm kiếm hoặc hướng dẫn thao tác. |
| NAT17 | Bỏ cái giá đi. | Loại bỏ điều kiện ngân sách trong ngữ cảnh hiện tại. |
| NAT18 | Tìm gần hơn tí được không? | Hiểu ý muốn thu hẹp khoảng cách, hỏi lại điểm xuất phát hoặc mức khoảng cách nếu cần. |

## Nhóm 4. Giới hạn hệ thống (NAT19–NAT24)

| ID | Input thực tế | Kết quả mong đợi |
|---|---|---|
| NAT19 | Có tiếng Anh không? | Trả lời đúng khả năng hỗ trợ ngôn ngữ. |
| NAT20 | Đổi sang đô được không? | Hiểu yêu cầu dùng USD, giải thích khả năng xử lý. |
| NAT21 | Xa quá, có chỗ nào gần hơn không? | Điều chỉnh tiêu chí vị trí so với kết quả trước. |
| NAT22 | Có nhận khách cuối tuần không? | Kiểm tra dữ liệu lịch hoạt động, không tự xác nhận. |
| NAT23 | Đoàn đông có đi được không? | Hỏi số lượng hoặc kiểm tra sức chứa nếu có dữ liệu. |
| NAT24 | Có chắc là đang mở không đấy? | Phân biệt thông tin trong dataset với trạng thái hoạt động thực tế. |

## Nhóm 5. Đặt tour và liên hệ (NAT25–NAT30)

| ID | Input thực tế | Kết quả mong đợi |
|---|---|---|
| NAT25 | Liên hệ kiểu gì? | Hướng dẫn liên hệ theo dữ liệu có sẵn. |
| NAT26 | Có số anh/chị phụ trách không? | Cung cấp số liên hệ nếu được xác thực. |
| NAT27 | Giá bao nhiêu một người? | Tra cứu giá nếu có, nếu không thông báo chưa có dữ liệu. |
| NAT28 | Đặt trước được không? | Giải thích quy trình đặt dịch vụ thực tế. |
| NAT29 | Bên mình book hộ được không? | Phân biệt tư vấn và chức năng booking. |
| NAT30 | Mai đi được không nhỉ? | Hiểu câu hỏi về khả năng tiếp khách ngày mai, không tự xác nhận nếu thiếu dữ liệu. |

## Nhóm 6. Gợi ý và matching (NAT31–NAT36)

| ID | Input thực tế | Kết quả mong đợi |
|---|---|---|
| NAT31 | Tìm cho mình chỗ làm gốm đi. | Tìm các địa điểm có trải nghiệm làm gốm được xác nhận. |
| NAT32 | Đoàn 20 người, đi nửa ngày thôi. | Nhận diện quy mô và thời lượng, hỏi thêm hoạt động hoặc sở thích nếu cần. |
| NAT33 | Có chỗ nào cho trẻ con nghịch làm đồ không? | Hiểu nhu cầu trải nghiệm thực hành cho trẻ em; không tự khẳng định an toàn. |
| NAT34 | Khách Tây thì nên cho đi đâu? | Hiểu nhóm khách quốc tế, gợi ý theo hoạt động và dữ liệu thực tế. |
| NAT35 | Gần phố cổ thôi, đừng đi xa quá. | Ưu tiên vị trí gần khu phố cổ, không tự đặt khoảng cách nếu chưa xác định. |
| NAT36 | Có chỗ nào vừa xem vừa được làm không? | Tìm địa điểm có cả tham quan quy trình và hoạt động thực hành được xác nhận. |

---

# PHẦN III. 6 CHUỖI HỘI THOẠI NHIỀU LƯỢT (CHAT01–CHAT06)

**Mục tiêu:** Kiểm tra khả năng duy trì ngữ cảnh, tích lũy tiêu chí, hiểu câu trả lời cụt và cập nhật một phần yêu cầu.

**Cách chạy:** Mỗi CHAT case phải chạy trong cùng một phiên chat. Gửi từng lượt theo đúng thứ tự.

| ID | Lượt | Input người dùng | Kết quả mong đợi |
|---|---:|---|---|
| CHAT01 | 1 | Tìm chỗ làm gốm. | Nhận diện nhu cầu tìm địa điểm trải nghiệm/làng nghề làm gốm; có thể hỏi thêm tiêu chí. |
| CHAT01 | 2 | Cho đoàn 20 người nhé. | Bổ sung quy mô đoàn 20 người, giữ nhu cầu làm gốm. |
| CHAT01 | 3 | Nửa ngày thôi. | Bổ sung thời lượng nửa ngày, giữ nghề và quy mô đoàn. |
| CHAT02 | 1 | Có làng nào làm lụa không? | Tìm dữ liệu liên quan đến nghề lụa. |
| CHAT02 | 2 | Gần trung tâm ấy. | Bổ sung ưu tiên vị trí gần trung tâm, giữ tiêu chí nghề lụa. |
| CHAT02 | 3 | Có trải nghiệm luôn càng tốt. | Bổ sung ưu tiên có hoạt động trải nghiệm; không khẳng định nếu thiếu dữ liệu. |
| CHAT03 | 1 | Tìm cho đoàn học sinh. | Nhận diện đối tượng khách là học sinh; hỏi thêm thông tin nếu cần. |
| CHAT03 | 2 | Tầm 30 bạn. | Bổ sung quy mô khoảng 30 khách. |
| CHAT03 | 3 | Có hoạt động nào tự tay làm được không? | Bổ sung tiêu chí trải nghiệm thực hành, giữ đối tượng và quy mô. |
| CHAT04 | 1 | Tìm làng nghề làm gốm. | Trả về hoặc tìm các bản ghi liên quan đến gốm trong Seed. |
| CHAT04 | 2 | Xa quá. | Hiểu đây là phản hồi về vị trí của kết quả vừa gợi ý. |
| CHAT04 | 3 | Có chỗ nào gần Hoàn Kiếm hơn không? | Điều chỉnh điểm ưu tiên vị trí về khu vực Hoàn Kiếm, giữ nhu cầu làm gốm. |
| CHAT05 | 1 | Có chỗ làm đồ thủ công không? | Tìm các địa điểm có hoạt động thủ công phù hợp. |
| CHAT05 | 2 | Giá mềm thôi. | Bổ sung ưu tiên ngân sách thấp, hỏi mức ngân sách nếu cần. |
| CHAT05 | 3 | Khoảng 200k/người. | Cập nhật ngân sách tối đa/khoảng 200.000 đồng mỗi người; giữ các tiêu chí trước. |
| CHAT06 | 1 | Tìm chỗ cho khách nước ngoài. | Nhận diện nhóm khách quốc tế; hỏi thêm nhu cầu trải nghiệm nếu cần. |
| CHAT06 | 2 | Có hướng dẫn tiếng Anh không? | Kiểm tra dữ liệu về khả năng hướng dẫn bằng tiếng Anh; không tự khẳng định. |
| CHAT06 | 3 | Không có cũng được. | Bỏ điều kiện tiếng Anh bắt buộc, giữ nhóm khách quốc tế và các tiêu chí khác. |

---

# PHẦN IV. TIÊU CHÍ ĐÁNH GIÁ

## 1. Chấm điểm câu hỏi đơn

| Tiêu chí | Điểm tối đa | Nội dung đánh giá |
|---|---:|---|
| Hiểu đúng ý định | 20 | Nhận diện đúng nhu cầu và mục đích câu hỏi. |
| Truy xuất dữ liệu | 30 | Lấy đúng dữ liệu từ dataset được phép sử dụng. |
| Xử lý nghiệp vụ | 25 | Matching, lọc, giải thích và xử lý tiêu chí. |
| Độ tin cậy | 15 | Không bịa thông tin, không khẳng định thiếu căn cứ. |
| Trải nghiệm hội thoại | 10 | Trả lời tự nhiên, dễ hiểu, hỏi lại đúng lúc. |
| **Tổng** | **100** | |

## 2. Tiêu chí riêng cho câu văn nói và câu cụt

| Tiêu chí | PASS khi | FAIL khi |
|---|---|---|
| Hiểu câu cụt | Hiểu đúng ý định dù thiếu chủ ngữ, vị ngữ. | Không hiểu hoặc trả lời lạc đề. |
| Hiểu văn nói | Nhận diện được cách diễn đạt đời thường. | Chỉ hiểu câu chuẩn theo mẫu. |
| Hiểu từ đồng nghĩa | Hiểu các cách nói như làm gốm, nặn gốm, làm đồ từ đất sét khi phù hợp ngữ cảnh. | Chỉ tìm được khi nhập đúng tên nghề trong dữ liệu. |
| Hiểu ngữ cảnh | Liên kết được câu hỏi với lượt trước. | Bắt người dùng nhập lại toàn bộ. |
| Hỏi lại | Chỉ hỏi thông tin thực sự cần thiết. | Hỏi quá nhiều hoặc tự bịa tiêu chí. |
| Sửa yêu cầu | Cập nhật đúng phần người dùng muốn đổi. | Làm mất các điều kiện khác. |

## 3. Lỗi nghiêm trọng – tự động FAIL

1. Truy xuất Fixture khi input hiện tại không chứa `test`.
2. Truy xuất Seed khi input hiện tại có chứa `test`.
3. Trộn bản ghi Seed và Fixture trong cùng một lần truy xuất.
4. Bịa tên làng nghề, xưởng, giá, địa chỉ, số điện thoại hoặc hoạt động trải nghiệm.
5. Khẳng định cơ sở đang nhận khách, còn chỗ hoặc đã xác nhận booking khi không có căn cứ.
6. Bỏ qua tiêu chí quan trọng của agency.
7. Làm mất các tiêu chí cũ khi người dùng chỉ yêu cầu thay đổi một tiêu chí.
8. Kế thừa Fixture từ lượt trước dù input hiện tại không có `test`.

## 4. Tổng hợp số lượng

| Phần | Nhóm | Số lượng |
|---|---|---:|
| I | 6 nhóm câu hỏi nghiệp vụ | 72 |
| II | 6 nhóm câu hỏi văn nói, câu cụt | 36 |
| III | 6 chuỗi hội thoại nhiều lượt | 6 chuỗi / 18 lượt |
| **Tổng** | **Toàn bộ bộ kiểm thử** | **114 mục kiểm thử / 126 lượt input** |

**Lưu ý cách đếm:** Bộ có 114 mục kiểm thử gồm 108 câu hỏi đơn và 6 chuỗi hội thoại. Sáu chuỗi CHAT có tổng cộng 18 lượt input, do đó tổng số lượt input thực tế là 126.

## 5. Mẫu CSV ghi nhận kết quả

Có thể dùng các cột sau để lưu kết quả chạy tự động:

```csv
test_id,test_group,turn,input,expected_result,actual_result,dataset_expected,dataset_used,matched_records,score,status,failure_reason,severity,evidence
```

Yêu cầu khi xuất báo cáo:

- Ghi nhận đầy đủ tất cả 114 mục kiểm thử.
- Với CHAT01–CHAT06, lưu riêng từng lượt input/output và kết quả tổng hợp của cả chuỗi.
- Ghi rõ dataset mong đợi và dataset thực tế được truy xuất.
- Không tự đánh PASS nếu không có bằng chứng.
- Không bỏ qua test lỗi hoặc chỉ xuất những test FAIL.
- Lưu toàn bộ câu trả lời thực tế để có thể rà soát và chạy lại.

