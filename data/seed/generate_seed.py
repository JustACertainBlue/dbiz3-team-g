import csv, json, uuid
from pathlib import Path
from datetime import datetime, timedelta, timezone

OUT = Path(__file__).resolve().parent
ROOT = OUT.parent.parent
NS = uuid.UUID("b6aa71de-8e57-4fa3-9a40-8f8f46e50bb7")

def uid(kind, n): return str(uuid.uuid5(NS, f"{kind}:{n}"))
def ts(day, hour=8): return f"2026-09-{day:02d}T{hour:02d}:00:00+07:00"
def j(value): return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
def write(name, fields, rows):
    path = OUT / f"{name}.csv"
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, lineterminator="\n", extrasaction="raise")
        w.writeheader(); w.writerows(sorted(rows, key=lambda r: tuple(str(r.get(k,"")) for k in fields[:2])))

names = ["Nguyễn Minh Anh","Trần Thu Hà","Lê Hoàng Nam","Phạm Ngọc Lan","Đỗ Quang Huy","Vũ Thanh Mai","Bùi Đức Long","Hoàng Thùy Linh","Ngô Hải Đăng","Dương Khánh Vy","Đặng Tuấn Kiệt","Hồ Bảo Châu","Lý Gia Hân","Mai Thành Công","Tạ Phương Thảo","Chu Nhật Minh","Cao Kim Oanh","Đinh Quốc Bảo","Kiều Anh Thư","Lương Việt Dũng","Quách Minh Tâm","Nông Thu Trang","Hà Đức Anh","La Mỹ Duyên","Triệu Trung Hiếu","Thái Ngọc Ánh"]
villages = [
 ("DEMO-HN-BATTRANG","Bát Tràng","Gia Lâm"),("DEMO-HN-VANPHUC","Vạn Phúc","Hà Đông"),
 ("DEMO-HN-PHU-VINH","Phú Vinh","Chương Mỹ"),("DEMO-HN-CHUONG","Chuông","Thanh Oai"),
 ("DEMO-HN-QUATDONG","Quất Động","Thường Tín"),("DEMO-HN-SONDONG","Sơn Đồng","Hoài Đức"),
 ("DEMO-HN-DAO-THUC","Đào Thục","Đông Anh"),("DEMO-HN-HA-THAI","Hạ Thái","Thường Tín")]

# Access and identity
write("roles", ["role_code","display_name"], [
 {"role_code":"ADMIN","display_name":"Quản trị viên"},
 {"role_code":"Local_Provider","display_name":"Hộ cung cấp trải nghiệm"},
 {"role_code":"Tour_Agency","display_name":"Công ty du lịch"}])
perms=[("manage_users","manage","users"),("review_agencies","review","agency registrations"),("review_providers","review","provider profiles"),("manage_rankings","manage","ranking parameters"),("view_dashboard","view","dashboard"),("manage_profile","manage","own profile"),("manage_experiences","manage","experiences"),("manage_bookings","manage","bookings"),("use_matching","use","AI matching"),("use_chat","use","chat")]
write("permissions",["permission_code","action","resource"],[{"permission_code":a,"action":b,"resource":c} for a,b,c in perms])
rp=[]
for i,(p,_,_) in enumerate(perms): rp.append({"role_code":"ADMIN" if i<5 else ("Local_Provider" if i<8 else "Tour_Agency"),"permission_code":p})
write("role_permissions",["role_code","permission_code"],rp)
vrows=[{"village_id":uid("village",i),"source_code":c,"name":n,"district":d,"city_province":"Hà Nội","is_active":"false" if i==7 else "true"} for i,(c,n,d) in enumerate(villages)]
write("villages",list(vrows[0]),vrows)

users=[]
roles=[]
for i in range(8): roles.append(("ADMIN","UBND"))
for i in range(2): roles.append(("ADMIN","HDT"))
for i in range(8): roles.append(("Tour_Agency",""))
for i in range(8): roles.append(("Local_Provider",""))
for i,(role,atype) in enumerate(roles):
    status="Approved" if role=="Tour_Agency" else "Active"
    if i==17: status="Disabled"
    if i==25: status="Disabled"
    users.append({"user_id":uid("user",i),"email":f"thanhvien{i+1}@example.invalid","password_hash":f"$2b$12$seedhash{i:02d}giuChoDuDoDai","role_code":role,"admin_type":atype,"account_status":status,"full_name":names[i],"title":"Chuyên viên" if role=="ADMIN" else "Đại diện đơn vị","phone":f"+8491{1000000+i:07d}","avatar_storage_key":"" if i%3 else f"avatars/{uid('user',i)}.jpg","must_change_password":"true" if i==0 else "false","last_login":"" if i in (7,17,25) else ts(20+i%5,9),"created_at":ts(1+i%8),"updated_at":ts(10+i%8)})
write("user_accounts",list(users[0]),users)
hist=[]
for i in range(8): hist.append({"history_id":uid("account-history",i),"user_id":uid("user",10+i),"from_status":"Pending Approval" if i<7 else "Approved","to_status":"Approved" if i<7 else "Disabled","changed_by":uid("user",8),"changed_at":ts(12+i),"reason":"Đã duyệt hồ sơ" if i<7 else "Tạm khóa theo yêu cầu đơn vị"})
write("account_status_history",list(hist[0]),hist)
assign=[{"ubnd_user_id":uid("user",i),"village_id":uid("village",i),"assigned_by":uid("user",8),"assigned_at":ts(12)} for i in range(8)]
write("ubnd_village_assignments",list(assign[0]),assign)
sessions=[]; resets=[]
for i in range(8):
    sessions.append({"session_id":uid("session",i),"user_id":uid("user",i+10),"role_context":roles[i+10][0],"expires_at":ts(29,18),"revoked_at":ts(28,10) if i==7 else "","created_at":ts(28,8)})
    resets.append({"token_id":uid("reset",i),"user_id":uid("user",i+10),"token_verifier":f"reset-verifier-{uid('reset',i)}","issued_at":f"2026-09-{10+i:02d}T08:00:00+07:00","expires_at":f"2026-09-{10+i:02d}T08:15:00+07:00","used_at":f"2026-09-{10+i:02d}T08:10:00+07:00" if i<5 else ""})
write("sessions",list(sessions[0]),sessions); write("password_reset_tokens",list(resets[0]),resets)

# Agency registration/profile
regs=[]; subs=[]; otps=[]; retokens=[]
for i in range(10):
    approved=i<8; status="Approved" if approved else ("Rejected" if i==8 else "Request More Information")
    regs.append({"registration_request_id":uid("registration",i),"email":f"doanhnghiep{i+1}@example.invalid","pending_password_hash":f"$2b$12$pending{i:02d}giuChoDuDoDai","current_status":status,"agency_user_id":uid("user",10+i) if approved else "","current_version_no":"1","created_at":ts(2+i%5),"updated_at":ts(14+i%5)})
    subs.append({"registration_request_id":uid("registration",i),"version_no":"1","submitted_at":ts(4+i%5),"submitted_by":uid("user",10+i) if approved else "","full_name":names[(10+i)%len(names)],"company_name":f"Công ty Du lịch {['Hồng Hà','Thăng Long','Tràng An','Sen Việt','Ánh Dương','Sông Hồng','Đông Đô','Phố Cổ','Mây Trắng','Bình Minh'][i]}","company_type":["Travel Agency","Tour Operator","TMC"][i%3],"tax_id":f"010{7000000+i:07d}","location":j({"address":f"{20+i} phố Huế","district":"Hai Bà Trưng","city":"Hà Nội"}),"contact_information":j({"email":f"doanhnghiep{i+1}@example.invalid","phone":f"+8493{2000000+i:07d}"}),"team_size":str(1 if i==9 else 8+i),"tour_types":j(["Văn hóa","Làng nghề"] if i%2==0 else ["Giáo dục"])})
    if i<8:
        otps.append({"challenge_id":uid("otp",i),"registration_request_id":uid("registration",i),"email":f"doanhnghiep{i+1}@example.invalid","otp_verifier":f"otp-verifier-{i+1}","issued_at":f"2026-09-{2+i:02d}T08:00:00+07:00","expires_at":f"2026-09-{2+i:02d}T08:10:00+07:00","used_at":f"2026-09-{2+i:02d}T08:05:00+07:00" if i<6 else "","invalidated_at":f"2026-09-{2+i:02d}T08:10:00+07:00" if i>=6 else "","attempt_count":str(5 if i==7 else i%3),"resend_sequence":str(3 if i==7 else i%2)})
        retokens.append({"token_id":uid("resubmit",i),"registration_request_id":uid("registration",i),"token_verifier":f"resubmit-verifier-{uid('resubmit',i)}","issued_at":ts(10+i%5),"expires_at":ts(11+i%5),"used_at":ts(10+i%5,12) if i<5 else "","invalidated_at":ts(10+i%5,13) if i==7 else ""})
write("agency_registration_requests",list(regs[0]),regs); write("registration_submission_versions",list(subs[0]),subs)
write("registration_otp_challenges",list(otps[0]),otps); write("registration_resubmission_tokens",list(retokens[0]),retokens)

files=[]
for i in range(40): files.append({"file_id":uid("file",i),"storage_key":f"seed/2026/09/{uid('file',i)}.{'pdf' if i<16 else 'jpg'}","file_name":f"{'Giay-phep' if i<16 else 'Hinh-anh-lang-nghe'}-{i+1}.{'pdf' if i<16 else 'jpg'}","media_type":"application/pdf" if i<16 else "image/jpeg","file_size_bytes":str(10485760 if i==39 else 150000+i*2750),"uploaded_by":uid("user",10+i%16),"created_at":ts(8+i%10)})
write("stored_files",list(files[0]),files)
docs=[]
for i in range(10): docs.append({"registration_request_id":uid("registration",i),"version_no":"1","file_id":uid("file",i),"document_type":"Giấy phép kinh doanh" if i<8 else "Tài liệu bổ sung"})
write("registration_documents",list(docs[0]),docs)
agencies=[]
for i in range(8): agencies.append({"agency_id":uid("agency",i),"user_id":uid("user",10+i),"registration_request_id":uid("registration",i),"company_name":subs[i]["company_name"],"company_type":subs[i]["company_type"],"tax_id":subs[i]["tax_id"],"location":subs[i]["location"],"description":"Đơn vị tổ chức tour trải nghiệm văn hóa và làng nghề tại Hà Nội.","contact_info":subs[i]["contact_information"],"team_size":subs[i]["team_size"],"tour_types":subs[i]["tour_types"],"created_at":ts(15),"updated_at":ts(20)})
write("agency_profiles",list(agencies[0]),agencies)
major=[]
for i in range(8):
    status=["Approved","Approved","Rejected","Pending Review","Request More Information","Approved","Rejected","Approved"][i]
    major.append({"major_change_id":uid("major",i),"agency_id":uid("agency",i),"proposed_company_name":f"{agencies[i]['company_name']} Mới" if i%2==0 else "","proposed_tax_id":f"010{8000000+i:07d}" if i%2 else "","review_status":status,"submitted_at":ts(21),"reviewed_at":ts(23) if status in ("Approved","Rejected") else ""})
write("agency_major_change_requests",list(major[0]),major)
reviews=[]
for i in range(8):
    dec="Reject" if i==7 else "Approve"
    reviews.append({"review_id":uid("agency-review",i),"registration_request_id":uid("registration",i),"registration_version_no":"1","major_change_id":"","hdt_user_id":uid("user",8+i%2),"decision":dec,"comments":"Hồ sơ không đáp ứng điều kiện" if dec=="Reject" else "","decided_at":ts(14+i%5)})
write("agency_review_records",list(reviews[0]),reviews)

# Provider and experience
providers=[]; pversions=[]; preveiws=[]; hours=[]
pstatuses=["Verified","Verified","Verified","Verified","Verified","Draft","Revision Required","Pending Verification"]
for i in range(8):
    vs=pstatuses[i]
    providers.append({"provider_id":uid("provider",i),"user_id":uid("user",18+i),"village_id":uid("village",i),"business_registration_number":f"HKD-HN-{20260001+i}","current_version_no":"1","published_version_no":"1" if vs=="Verified" else "","verification_status":vs,"created_at":ts(3+i),"updated_at":ts(18+i%5)})
    pversions.append({"provider_id":uid("provider",i),"version_no":"1","version_status":vs,"business_name":f"Xưởng thủ công {villages[i][1]}","craft_type":["Gốm","Lụa","Mây tre","Nón lá","Thêu","Tạc tượng","Múa rối","Sơn mài"][i],"artisan_names":j([names[18+i]]),"location_address":f"Thôn nghề truyền thống, {villages[i][1]}, {villages[i][2]}, Hà Nội","description":"Không gian trải nghiệm nghề truyền thống dành cho đoàn khách.","contact_information":j({"phone":f"+8496{3000000+i:07d}","email":f"langnghe{i+1}@example.invalid"}),"booking_conditions":j({"notice_hours":24,"min_pax":1}),"submitted_at":ts(10+i%5) if vs!="Draft" else "","published_at":ts(15+i%5) if vs=="Verified" else ""})
    preveiws.append({"review_id":uid("provider-review",i),"provider_id":uid("provider",i),"version_no":"1","reviewer_user_id":uid("user",i),"decision":"Request Revision" if i==6 else "Approve","revision_comments":"Bổ sung ảnh khu vực đón khách" if i==6 else "","reviewed_at":ts(16+i%5)})
    hours.append({"operating_hour_id":uid("hours",i),"provider_id":uid("provider",i),"weekday":str(i%7+1),"local_start":"08:00:00","local_end":"17:00:00" if i<7 else "23:59:00"})
write("provider_profiles",list(providers[0]),providers); write("provider_profile_versions",list(pversions[0]),pversions)
write("provider_verification_reviews",list(preveiws[0]),preveiws); write("provider_operating_hours",list(hours[0]),hours)
experiences=[]; discounts=[]
for i in range(8):
    experiences.append({"experience_id":uid("experience",i),"provider_id":uid("provider",i),"name":["Nặn gốm thủ công","Dệt lụa truyền thống","Đan mây tre","Làm nón lá","Thêu họa tiết","Tạc tượng dân gian","Điều khiển rối nước","Vẽ sơn mài"][i],"description":"Trải nghiệm có hướng dẫn, vật liệu và sản phẩm mang về cho khách tham gia.","category":"Thủ công truyền thống","duration_minutes":str(60+i*15),"price_per_person":f"{150000+i*25000}.00","max_participants":str(1 if i==7 else 12+i),"notice_period_hours":str(0 if i==7 else 24),"experience_location_address":pversions[i]["location_address"],"cancellation_policy":j({"before_hours":24,"refund_percent":80}),"archived_at":ts(25) if i==7 else "","created_at":ts(16),"updated_at":ts(22)})
    discounts.append({"rule_id":uid("discount",i),"experience_id":uid("experience",i),"rule_kind":"Group Discount" if i<7 else "Special Rate","pax_threshold":str(5+i),"discount_percentage":str(0 if i==7 else 5+i)})
write("experiences",list(experiences[0]),experiences); write("experience_discount_rules",list(discounts[0]),discounts)
media=[]; pvmedia=[]
for i in range(8):
    media.append({"profile_media_id":uid("media",i),"file_id":uid("file",16+i),"agency_id":"","provider_id":"","experience_id":uid("experience",i),"category":"Ảnh trải nghiệm","display_order":str(0 if i==7 else i)})
    pvmedia.append({"provider_id":uid("provider",i),"version_no":"1","file_id":uid("file",24+i),"category":"Ảnh không gian","display_order":str(i)})
write("profile_media",list(media[0]),media); write("provider_version_media",list(pvmedia[0]),pvmedia)
drafts=[]
for i in range(8): drafts.append({"draft_id":uid("draft",i),"provider_id":uid("provider",i) if i%2==0 else "","experience_id":uid("experience",i) if i%2 else "","original_description":"Mô tả ban đầu do đơn vị nhập.","refined_description_draft":"Mô tả được biên tập rõ lợi ích và nội dung trải nghiệm.","profile_context":j({"village":villages[i][1]}),"created_at":ts(19),"accepted_at":ts(20) if i<5 else ""})
write("ai_description_drafts",list(drafts[0]),drafts)

# Matching and Explore
ms=[]; mm=[]; tp=[]; rr=[]; app=[]; signals=[]
for i in range(8):
    ms.append({"matching_session_id":uid("matching",i),"agency_id":uid("agency",i),"conversation_context":j({"language":"vi","goal":"tour làng nghề"}),"started_at":ts(20,8),"last_activity_at":ts(20,9+i)})
    mm.append({"message_id":uid("matching-message",i),"matching_session_id":uid("matching",i),"sender":"Agency" if i%2==0 else "Assistant","text":"Tìm trải nghiệm phù hợp cho đoàn khách quan tâm văn hóa Hà Nội.","sent_at":ts(20,9)})
    tp.append({"matching_session_id":uid("matching",i),"hard_constraints":j({"max_price":500000}),"matching_attributes":j({"category":"Thủ công truyền thống"}),"inferred_preferences":"" if i==7 else j({"pace":"chậm"}),"preference_weights":j({"price":0.4,"location":0.6}),"is_complete":"false" if i==7 else "true","updated_at":ts(20,10)})
    rr.append({"result_id":uid("recommendation",i),"matching_session_id":uid("matching",i),"run_no":"1","experience_id":uid("experience",i),"rank":"1","match_score":str(0 if i==7 else 82+i),"experience_fit_score":str(100 if i==6 else 80+i),"explanation":"Phù hợp ngân sách, chủ đề và quy mô đoàn.","created_at":ts(20,10)})
    app.append({"agency_id":uid("agency",i),"preference_weights":j({"culture":0.7,"price":0.3}),"updated_at":ts(21)})
    signals.append({"signal_id":uid("signal",i),"agency_id":uid("agency",i),"matching_session_id":uid("matching",i) if i<7 else "","experience_id":uid("experience",i),"signal_type":"recommendation_click" if i<7 else "dismiss","signal_value":j({"selected":i<7}),"confidence_score":"1.000" if i==7 else "0.850","base_weight":"0.00000" if i==7 else "1.00000","captured_at":ts(21,9)})
write("matching_sessions",list(ms[0]),ms); write("matching_messages",list(mm[0]),mm); write("tour_preference_profiles",list(tp[0]),tp)
write("recommendation_results",list(rr[0]),rr); write("agency_preference_profiles",list(app[0]),app); write("preference_signals",list(signals[0]),signals)
quotes=[]; es=[]; ei=[]
for i in range(8):
    quotes.append({"quote_request_id":uid("quote",i),"agency_id":uid("agency",i),"experience_id":uid("experience",i),"source":"Matching" if i%2==0 else "Explore","created_at":ts(22)})
    scope="Personalized" if i<5 else ("Anonymous Analytics" if i<7 else "No Non-essential Tracking")
    es.append({"session_id":uid("explore",i),"agency_id":uid("agency",i) if scope=="Personalized" else "","anonymous_session_ref":"" if scope=="Personalized" else f"anon-{uid('explore',i)}","analytics_consent":"true" if scope!="No Non-essential Tracking" else "false","tracking_scope":scope,"started_at":ts(22,8),"ended_at":ts(22,9) if i!=7 else ""})
    ei.append({"interaction_id":uid("interaction",i),"session_id":uid("explore",i),"experience_id":uid("experience",i) if i!=7 else "","provider_id":uid("provider",i) if i!=7 else "","action_type":["click_card","expand_preview","view_detail","apply_filter","scroll","request_quote","open_chat","scroll"][i],"occurred_at":ts(22,8),"duration_on_previous_screen":str(0 if i==7 else 20+i),"filter_values":j({"village":villages[i][1]}) if i==3 else ""})
write("quote_requests",list(quotes[0]),quotes); write("explore_sessions",list(es[0]),es); write("explore_interactions",list(ei[0]),ei)
rv=[]; ra=[]
for i in range(8):
    status="Active" if i==0 else ("Retired" if i<5 else "Draft")
    rv.append({"version_id":uid("ranking",i),"parameter_map":j({"relevance":round(0.5+i*0.03,2),"quality":round(0.5-i*0.03,2)}),"tuning_log":"Phiên bản hiệu chỉnh từ dữ liệu đánh giá nội bộ." if i else "Phiên bản đang áp dụng.","version_status":status,"created_at":ts(5+i)})
    ra.append({"assessment_id":uid("assessment",i),"version_id":uid("ranking",i),"period_start":f"2026-0{i%8+1}-01","period_end":f"2026-0{i%8+1}-28","score":str(0 if i==7 else 78+i*2),"assessment":"Đánh giá chất lượng theo mức độ phù hợp của kết quả gợi ý.","kpi_values":j({"click_through_rate":round(0.2+i*0.03,2)})})
write("ranking_parameter_versions",list(rv[0]),rv); write("ranking_quality_assessments",list(ra[0]),ra)

# Booking, chat and operational evidence
book=[]; bh=[]; chats=[]; cm=[]; cp=[]; ca=[]; notices=[]; audits=[]
bst=["Booked","Booked","Completed","Completed","Cancelled","Booked","On hold","Cancelled"]
for i in range(8):
    start=f"2026-10-{5+i:02d}T09:00:00+07:00"; created=f"2026-09-{20+i%5:02d}T08:00:00+07:00"; hold=f"2026-09-{23+i%5:02d}T08:00:00+07:00"
    book.append({"booking_id":uid("booking",i),"agency_id":uid("agency",i),"provider_id":uid("provider",i),"experience_id":uid("experience",i),"source_chat_session_id":"","start_at":start,"duration_minutes":str(60+i*15),"group_size":str(1 if i==7 else 6+i),"agreed_price_total":f"{900000+i*250000}.00","conditions_snapshot":j({"cancellation":"Hoàn 80% trước 24 giờ"}),"status":bst[i],"created_at":created,"updated_at":f"2026-09-{24+i%5:02d}T08:00:00+07:00","hold_expires_at":hold,"arrival_at":f"2026-10-{5+i:02d}T10:30:00+07:00" if bst[i]=="Completed" else ""})
    bh.append({"history_id":uid("booking-history",i),"booking_id":uid("booking",i),"from_status":"On hold" if bst[i]!="On hold" else "","to_status":bst[i] if bst[i]!="On hold" else "On hold","changed_by":uid("user",18+i),"changed_at":f"2026-09-{24+i%5:02d}T08:00:00+07:00","reason":"Khách hủy lịch" if bst[i]=="Cancelled" else "Cập nhật theo vòng đời đặt chỗ"})
    closed=i in (4,7)
    chats.append({"chat_session_id":uid("chat",i),"agency_id":uid("agency",i),"provider_id":uid("provider",i),"source":["Matching","Explore","Booking","Direct"][i%4],"experience_id":uid("experience",i),"quote_request_id":uid("quote",i),"booking_id":uid("booking",i),"status":"Closed" if closed else "Active","started_at":ts(22,10),"last_message_at":ts(23,10),"closed_at":ts(24,10) if closed else "","closed_by":uid("user",10+i) if closed else ""})
    kind="Attachment" if i<7 else "Booking Update"
    cm.append({"message_id":uid("chat-message",i),"chat_session_id":uid("chat",i),"sender_user_id":uid("user",10+i) if kind!="Booking Update" else "","text":"Tệp thông tin đoàn khách." if kind=="Attachment" else "Đặt chỗ đã được cập nhật.","message_kind":kind,"booking_id":uid("booking",i),"sent_at":ts(23,10)})
    cp.append({"chat_session_id":uid("chat",i),"user_id":uid("user",10+i),"last_read_message_id":uid("chat-message",i) if i<7 else "","unread_count":str(0 if i<7 else 12)})
    cp.append({"chat_session_id":uid("chat",i),"user_id":uid("user",18+i),"last_read_message_id":"","unread_count":str(i)})
    ca.append({"attachment_id":uid("attachment",i),"message_id":uid("chat-message",i),"file_id":uid("file",32+i),"uploaded_by":uid("user",10+i),"created_at":ts(23,10)})
    notices.append({"notification_id":uid("notification",i),"recipient_user_id":uid("user",10+i),"event_type":"Booking Status Changed","source_type":"Booking","source_id":uid("booking",i),"payload":j({"status":bst[i]}),"created_at":ts(24,9),"read_at":ts(24,10) if i<5 else "","email_delivery_status":["Success","Success","Success","Success","Success","Fail","Not Applicable",""][i]})
    audits.append({"audit_id":uid("audit",i),"actor_user_id":uid("user",8+i%2) if i<7 else "","action":"UPDATE_BOOKING_STATUS" if i<7 else "SYSTEM_RETENTION_CHECK","target_type":"Booking","target_id":uid("booking",i),"occurred_at":ts(24,9),"change_or_result":j({"to":bst[i]})})
write("bookings",list(book[0]),book); write("booking_status_history",list(bh[0]),bh); write("chat_sessions",list(chats[0]),chats)
write("chat_messages",list(cm[0]),cm); write("chat_participants",list(cp[0]),cp); write("chat_attachments",list(ca[0]),ca)
write("notifications",list(notices[0]),notices); write("audit_logs",list(audits[0]),audits)

# Machine-readable coverage evidence. Roles is the only intentional exception: its enum permits exactly 3 values.
table_names=["roles","permissions","role_permissions","villages","user_accounts","account_status_history","ubnd_village_assignments","sessions","password_reset_tokens","agency_registration_requests","registration_otp_challenges","registration_resubmission_tokens","registration_submission_versions","stored_files","registration_documents","agency_profiles","agency_major_change_requests","agency_review_records","provider_profiles","provider_profile_versions","provider_verification_reviews","provider_operating_hours","experiences","experience_discount_rules","profile_media","provider_version_media","ai_description_drafts","matching_sessions","matching_messages","tour_preference_profiles","recommendation_results","agency_preference_profiles","preference_signals","quote_requests","explore_sessions","explore_interactions","ranking_parameter_versions","ranking_quality_assessments","bookings","booking_status_history","chat_sessions","chat_participants","chat_messages","chat_attachments","notifications","audit_logs"]
coverage=[]
boundary_evidence={
 "stored_files":"10 MiB maximum file-size row", "registration_otp_challenges":"attempt=5 and resend=3 row",
 "experiences":"notice_period_hours=0 and max_participants=1 row", "experience_discount_rules":"discount_percentage=0 row",
 "recommendation_results":"scores at 0 and 100", "preference_signals":"confidence=1 and base_weight=0",
 "explore_interactions":"duration_on_previous_screen=0", "ranking_quality_assessments":"score=0",
 "profile_media":"display_order=0", "chat_participants":"unread_count=0"}
exception_evidence={
 "user_accounts":"Disabled account", "sessions":"revoked session", "password_reset_tokens":"unused token",
 "agency_registration_requests":"Rejected and Request More Information", "registration_otp_challenges":"invalidated terminal challenge",
 "registration_resubmission_tokens":"invalidated token", "agency_major_change_requests":"Rejected request",
 "agency_review_records":"review outcome retained", "provider_profiles":"Revision Required profile",
 "provider_profile_versions":"Revision Required version", "provider_verification_reviews":"Request Revision review",
 "experiences":"archived experience", "ai_description_drafts":"unaccepted draft", "tour_preference_profiles":"incomplete profile",
 "explore_sessions":"open session", "ranking_parameter_versions":"Retired version", "bookings":"Cancelled booking",
 "booking_status_history":"Cancelled transition", "chat_sessions":"Closed chat", "chat_messages":"system Booking Update",
 "notifications":"failed email delivery", "audit_logs":"system retention-check result"}
empty_evidence={
 "villages":"inactive village has no active experience", "user_accounts":"account with no active session",
 "agency_profiles":"agency row with no dependent matching requirement", "provider_profiles":"provider with archived/no active experience case",
 "experiences":"archived experience has no active booking", "matching_sessions":"nullable conversation context supported",
 "explore_sessions":"anonymous session has no Agency", "chat_messages":"Booking Update has no human sender",
 "notifications":"unread row has empty read_at", "audit_logs":"system event has empty actor_user_id"}
for name in table_names:
    with (OUT/f"{name}.csv").open(encoding="utf-8",newline="") as f: count=sum(1 for _ in csv.DictReader(f))
    coverage.append({"entity":name,"csv_file":f"{name}.csv","row_count":count,
      "ordinary_rows":"5+" if count>=8 else "3 (complete closed domain)",
      "boundary_row":boundary_evidence.get(name,"N/A: no declared scalar boundary for this entity"),
      "empty_case":empty_evidence.get(name,"N/A: association/event row; empty state is represented by its parent"),
      "exceptional_state_row":exception_evidence.get(name,"N/A: no lifecycle/exception state declared"),
      "result":"Covered with applicability stated" if count>=8 else "Documented schema-domain exception"})
(OUT/"seed_coverage.json").write_text(json.dumps(coverage,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")

load_order=[name for name in table_names if name not in ("chat_participants","chat_messages","chat_attachments")]
chat_insert_at=load_order.index("notifications")
load_order[chat_insert_at:chat_insert_at]=["chat_messages","chat_participants","chat_attachments"]
with (OUT/"load_seed.sql").open("w",encoding="utf-8",newline="\n") as f:
    f.write("-- Run with psql from the repository root after docs/spec/data/schema.sql\nBEGIN;\nSET CONSTRAINTS ALL DEFERRED;\n")
    for name in load_order:
        with (OUT/f"{name}.csv").open(encoding="utf-8",newline="") as cf: fields=next(csv.reader(cf))
        f.write(f"\\copy {name} ({', '.join(fields)}) FROM 'docs/spec/data/seed/{name}.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');\n")
    f.write("COMMIT;\n")

manifest={"generated_at":"2026-09-28T00:00:00+07:00","synthetic_only":True,"logical_entities":46,"entity_csv_files":46,"coverage_file":"seed_coverage.json","scenario_file":"scenario_manifest.json","table_files":{}}
for name in table_names:
    with (OUT/f"{name}.csv").open(encoding="utf-8",newline="") as f: manifest["table_files"][f"{name}.csv"]=sum(1 for _ in csv.DictReader(f))
(OUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
scenario_rows=[
 {"scenario_id":"ordinary-01","fixture":"eight linked agency-provider-experience chains","expected_result":"valid"},
 {"scenario_id":"boundary-otp","fixture":uid("otp",7),"expected_result":"attempt=5; resend=3; terminal challenge"},
 {"scenario_id":"empty-village","fixture":uid("village",7),"expected_result":"inactive catalog entry has no active experience"},
 {"scenario_id":"exception-cancelled","fixture":uid("booking",7),"expected_result":"terminal historical booking"},
 {"scenario_id":"exception-closed-chat","fixture":uid("chat",7),"expected_result":"terminal immutable chat"},
 {"scenario_id":"exception-rejected-registration","fixture":uid("registration",8),"expected_result":"rejected registration retained"},
 {"scenario_id":"permission-ubnd-scope","fixture":uid("user",0),"expected_result":"access limited to assigned village"},
 {"scenario_id":"kpi-period","fixture":"bookings + booking_status_history","expected_result":"as-of status is reproducible"}]
(OUT/"scenario_manifest.json").write_text(json.dumps(scenario_rows,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
for legacy_aux_csv in (OUT/"seed_coverage.csv", OUT/"scenario_manifest.csv"):
    legacy_aux_csv.unlink(missing_ok=True)
print(f"Generated {len(table_names)} entity CSV files")
