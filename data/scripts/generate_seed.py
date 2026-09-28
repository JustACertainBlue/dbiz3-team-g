"""Generate deterministic, fully synthetic CSV seed data and verify core integrity."""

from __future__ import annotations

import csv
import json
import shutil
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "seed" / "generated"
BASE = datetime(2026, 9, 1, 1, 0, tzinfo=timezone.utc)


def uid(label: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"hanoi-artisan-bridge-demo/{label}"))


def ts(days: int = 0, hours: int = 0) -> str:
    return (BASE + timedelta(days=days, hours=hours)).isoformat()


def dump(value) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def write_csv(name: str, rows: list[dict]) -> None:
    if not rows:
        raise AssertionError(f"{name}: rows must not be empty")
    path = OUT / name
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def require_unique(rows: list[dict], fields: tuple[str, ...], label: str) -> None:
    keys = [tuple(row[field] for field in fields) for row in rows]
    duplicates = [key for key, count in Counter(keys).items() if count > 1]
    if duplicates:
        raise AssertionError(f"{label}: duplicate keys {duplicates}")


def require_fk(rows: list[dict], field: str, parents: list[dict], parent_field: str, label: str) -> None:
    available = {row[parent_field] for row in parents}
    missing = sorted({row[field] for row in rows if row.get(field) and row[field] not in available})
    if missing:
        raise AssertionError(f"{label}: missing parent values {missing}")


def overlaps(a: dict, b: dict) -> bool:
    a_start = datetime.fromisoformat(a["start_at"])
    b_start = datetime.fromisoformat(b["start_at"])
    a_end = a_start + timedelta(minutes=int(a["duration_minutes"]))
    b_end = b_start + timedelta(minutes=int(b["duration_minutes"]))
    return a_start < b_end and b_start < a_end


roles = [
    {"role_code": "ADMIN", "display_name": "Admin"},
    {"role_code": "Tour_Agency", "display_name": "Tour Agency"},
    {"role_code": "Local_Provider", "display_name": "Local Provider"},
]

villages = [
    {"village_id": uid(f"village-{i}"), "source_code": f"DEMO-HN-{i:03d}", "name": name,
     "district": district, "city_province": "Hà Nội", "is_active": "true"}
    for i, name, district in [
        (1, "[DEMO] Làng Gốm Minh An", "Gia Lâm"),
        (2, "[DEMO] Làng Mây Hòa Phúc", "Chương Mỹ"),
        (3, "[DEMO] Làng Sơn Kim Bảo", "Thường Tín"),
        (4, "[DEMO] Làng Trống An Bình", "Đan Phượng"),
    ]
]

users: list[dict] = []


def add_user(label: str, role: str, status: str, number: int, admin_type: str = "") -> str:
    user_id = uid(f"user-{label}")
    users.append({
        "user_id": user_id,
        "email": f"{label}@example.invalid",
        "password_hash": "$demo$not-a-real-password-hash",
        "role_code": role,
        "admin_type": admin_type,
        "account_status": status,
        "full_name": f"Người Dùng Giả Lập {number:02d}",
        "title": "Tài khoản demo",
        "phone": f"090000{number:04d}",
        "must_change_password": "false",
        "created_at": ts(-120 + number),
        "updated_at": ts(-20 + number),
    })
    return user_id


hdt_user = add_user("admin.hdt.demo", "ADMIN", "Active", 1, "HDT")
ubnd_users = [
    add_user("admin.ubnd.demo1", "ADMIN", "Active", 2, "UBND"),
    add_user("admin.ubnd.demo2", "ADMIN", "Active", 3, "UBND"),
]
agency_users = [add_user(f"agency.demo{i}", "Tour_Agency", "Approved", 10 + i) for i in range(1, 7)]
provider_users = [add_user(f"provider.demo{i}", "Local_Provider", "Active", 30 + i) for i in range(1, 7)]
pending_agency_user = add_user("agency.pending.demo", "Tour_Agency", "Pending Approval", 50)
rejected_agency_user = add_user("agency.rejected.demo", "Tour_Agency", "Rejected", 51)

account_history = [{
    "history_id": uid(f"account-history-{row['user_id']}"),
    "user_id": row["user_id"],
    "from_status": "",
    "to_status": row["account_status"],
    "changed_by": hdt_user if row["role_code"] != "ADMIN" else "",
    "changed_at": row["created_at"],
    "reason": "Synthetic initial status",
} for row in users]

assignments = [
    {"ubnd_user_id": ubnd_users[0], "village_id": villages[0]["village_id"], "assigned_by": hdt_user, "assigned_at": ts(-100)},
    {"ubnd_user_id": ubnd_users[1], "village_id": villages[1]["village_id"], "assigned_by": hdt_user, "assigned_at": ts(-100)},
]

registrations = [{
    "registration_request_id": uid("registration-more-info"),
    "email": "agency.pending.demo@example.invalid",
    "pending_password_hash": "$demo$pending-hash",
    "current_status": "Pending Approval",
    "agency_user_id": pending_agency_user,
    "current_version_no": "2",
    "created_at": ts(-15),
    "updated_at": ts(-5),
}, {
    "registration_request_id": uid("registration-rejected"),
    "email": "agency.rejected.demo@example.invalid",
    "pending_password_hash": "$demo$rejected-hash",
    "current_status": "Rejected",
    "agency_user_id": rejected_agency_user,
    "current_version_no": "1",
    "created_at": ts(-30),
    "updated_at": ts(-25),
}]

otp_challenges = [{
    "challenge_id": uid("otp-boundary"),
    "registration_request_id": registrations[0]["registration_request_id"],
    "email": registrations[0]["email"],
    "otp_verifier": "$demo$otp-verifier",
    "issued_at": ts(-15),
    "expires_at": ts(-15, 0)[:-6] + "+00:00",
    "used_at": ts(-15, 0),
    "invalidated_at": "",
    "attempt_count": "5",
    "resend_sequence": "3",
}]
# Preserve exact ten-minute boundary independently of ts() hour granularity.
otp_issued = datetime.fromisoformat(otp_challenges[0]["issued_at"])
otp_challenges[0]["expires_at"] = (otp_issued + timedelta(minutes=10)).isoformat()
otp_challenges[0]["used_at"] = ""
otp_challenges[0]["invalidated_at"] = (otp_issued + timedelta(minutes=10)).isoformat()

resubmit_tokens = [{
    "token_id": uid("resubmit-used"),
    "registration_request_id": registrations[0]["registration_request_id"],
    "token_verifier": "$demo$resubmit-verifier",
    "issued_at": ts(-6),
    "expires_at": ts(-5),
    "used_at": ts(-5, -12),
    "invalidated_at": "",
}]

submission_versions = []
for version_no, company_name, submitted_day in [(1, "[DEMO] Du lịch Ban Mai", -15), (2, "[DEMO] Du lịch Ban Mai Mới", -5)]:
    submission_versions.append({
        "registration_request_id": registrations[0]["registration_request_id"],
        "version_no": str(version_no),
        "submitted_at": ts(submitted_day),
        "submitted_by": pending_agency_user if version_no == 2 else "",
        "full_name": "Người Đại Diện Giả Lập",
        "company_name": company_name,
        "company_type": "Travel Agency",
        "tax_id": "0100000050",
        "location": dump({"street": "Số 50 đường Demo", "ward": "Phường Giả Lập", "district": "Quận Demo", "city_province": "Hà Nội"}),
        "contact_information": dump({"contact_person_name": "Liên Hệ Giả Lập", "phone_number": "0900000050", "business_email": "contact.pending@example.invalid"}),
        "team_size": "5",
        "tour_types": dump(["Craft Village/Experiential"]),
    })

submission_versions.append({
    "registration_request_id": registrations[1]["registration_request_id"],
    "version_no": "1", "submitted_at": ts(-30), "submitted_by": "",
    "full_name": "Người Đại Diện Giả Lập Bị Từ Chối",
    "company_name": "[DEMO] Công ty Hồ Sơ Không Hợp Lệ", "company_type": "Travel Agency",
    "tax_id": "0100000051",
    "location": dump({"district": "Quận Demo", "city_province": "Hà Nội"}),
    "contact_information": dump({"phone_number": "0900000051", "business_email": "rejected@example.invalid"}),
    "team_size": "2", "tour_types": dump(["Craft Village/Experiential"]),
})

agency_reviews = [{
    "review_id": uid("review-more-info"),
    "registration_request_id": registrations[0]["registration_request_id"],
    "registration_version_no": "1",
    "major_change_id": "",
    "hdt_user_id": hdt_user,
    "decision": "Request More Information",
    "comments": "[DEMO] Bổ sung tài liệu đăng ký rõ nét hơn.",
    "decided_at": ts(-7),
}, {
    "review_id": uid("review-rejected"),
    "registration_request_id": registrations[1]["registration_request_id"],
    "registration_version_no": "1", "major_change_id": "", "hdt_user_id": hdt_user,
    "decision": "Reject", "comments": "[DEMO] Hồ sơ không đáp ứng điều kiện giả lập.", "decided_at": ts(-25),
}]

agencies = []
for i, user_id in enumerate(agency_users, 1):
    registration_id = uid(f"registration-approved-{i}")
    registrations.append({
        "registration_request_id": registration_id,
        "email": f"agency.demo{i}@example.invalid",
        "pending_password_hash": "$demo$approved-registration-hash",
        "current_status": "Approved",
        "agency_user_id": user_id,
        "current_version_no": "1",
        "created_at": ts(-100 + i),
        "updated_at": ts(-90 + i),
    })
    submission_versions.append({
        "registration_request_id": registration_id,
        "version_no": "1",
        "submitted_at": ts(-100 + i),
        "submitted_by": "",
        "full_name": f"Người Đại Diện Giả Lập {i:02d}",
        "company_name": f"[DEMO] Công ty Du lịch Sáng Tạo {i:02d}",
        "company_type": "Travel Agency",
        "tax_id": f"010000{i:04d}",
        "location": dump({"district": f"Quận Demo {i}", "city_province": "Hà Nội"}),
        "contact_information": dump({"phone_number": f"090100{i:04d}", "business_email": f"business{i}@example.invalid"}),
        "team_size": str(5 + i),
        "tour_types": dump(["Craft Village/Experiential"]),
    })
    agencies.append({
        "agency_id": uid(f"agency-{i}"), "user_id": user_id, "registration_request_id": registration_id,
        "company_name": f"[DEMO] Công ty Du lịch Sáng Tạo {i:02d}",
        "company_type": "Travel Agency", "tax_id": f"010000{i:04d}",
        "location": dump({"district": f"Quận Demo {i}", "city_province": "Hà Nội"}),
        "description": "Doanh nghiệp giả lập dùng cho kiểm thử.",
        "contact_info": dump({"phone_number": f"090100{i:04d}", "business_email": f"business{i}@example.invalid"}),
        "team_size": str(5 + i), "tour_types": dump(["Craft Village/Experiential"]),
        "created_at": ts(-90 + i), "updated_at": ts(-10 + i),
    })

providers = []
provider_versions = []
for i, user_id in enumerate(provider_users, 1):
    village = villages[1] if i == 6 else villages[(i - 1) % 3]
    provider_id = uid(f"provider-{i}")
    is_revision = i == 6
    providers.append({
        "provider_id": provider_id, "user_id": user_id, "village_id": village["village_id"],
        "business_registration_number": f"DEMO-PROVIDER-{i:03d}",
        "current_version_no": "2" if is_revision else "1", "published_version_no": "1",
        "verification_status": "Revision Required" if is_revision else "Verified",
        "created_at": ts(-80 + i), "updated_at": ts(-8 + i),
    })
    provider_versions.append({
        "provider_id": provider_id, "version_no": "1", "version_status": "Verified",
        "business_name": f"[DEMO] Xưởng Thủ Công {i:02d}", "craft_type": ["Gốm", "Mây tre", "Sơn mài"][i % 3],
        "artisan_names": dump([f"Nghệ nhân giả lập {i:02d}"]),
        "location_address": f"Số {i}, đường Demo, Hà Nội", "description": "Hồ sơ Provider giả lập đã xác minh.",
        "contact_information": dump({"phone": f"090200{i:04d}", "email": f"provider{i}@example.invalid"}),
        "booking_conditions": dump({"notice_period": 24, "cancellation_policy": "Demo"}),
        "submitted_at": ts(-75 + i), "published_at": ts(-70 + i),
    })
    if is_revision:
        provider_versions.append({
            "provider_id": provider_id, "version_no": "2", "version_status": "Revision Required",
            "business_name": "[DEMO] Xưởng Thủ Công 06 - bản sửa",
            "craft_type": "Gốm", "artisan_names": dump(["Nghệ nhân giả lập 06"]),
            "location_address": "Số 6, đường Demo, Hà Nội", "description": "Bản sửa giả lập cần bổ sung.",
            "contact_information": dump({"phone": "0902000006", "email": "provider6@example.invalid"}),
            "booking_conditions": dump({"notice_period": 24, "cancellation_policy": "Demo"}),
            "submitted_at": ts(-4), "published_at": "",
        })

provider_reviews = [{
    "review_id": uid("provider-review-revision"),
    "provider_id": providers[5]["provider_id"], "version_no": "2",
    "reviewer_user_id": ubnd_users[1], "decision": "Request Revision",
    "revision_comments": "[DEMO] Bổ sung mô tả quy trình trải nghiệm.", "reviewed_at": ts(-3),
}]

operating_hours = []
for i, provider in enumerate(providers, 1):
    operating_hours.append({
        "operating_hour_id": uid(f"hours-{i}"), "provider_id": provider["provider_id"],
        "weekday": "2", "local_start": "08:00:00", "local_end": "17:00:00",
    })

experiences = []
for i, provider in enumerate(providers[:5], 1):
    experiences.append({
        "experience_id": uid(f"experience-{i}"), "provider_id": provider["provider_id"],
        "name": f"[DEMO] Trải nghiệm thủ công {i:02d}",
        "description": "Hoạt động giả lập phục vụ kiểm thử giao diện và booking.",
        "category": "Workshop/Hands-on", "duration_minutes": "120",
        "price_per_person": str(100000 + i * 10000), "max_participants": str(10 + i),
        "notice_period_hours": "24", "experience_location_address": f"Điểm demo {i}, Hà Nội",
        "cancellation_policy": dump({"rules": [{"threshold_hours": 24, "fee_percentage": 20}], "notes": "Demo"}),
        "archived_at": "", "created_at": ts(-60 + i), "updated_at": ts(-6 + i),
    })

stored_files = []
registration_documents = []
registration_user = {row["registration_request_id"]: row["agency_user_id"] for row in registrations}
for no, version in enumerate(submission_versions, 1):
    file_id = uid(f"registration-file-{no}")
    stored_files.append({
        "file_id": file_id, "storage_key": f"demo/registration/{file_id}.pdf",
        "file_name": f"demo-business-registration-{no}.pdf", "media_type": "application/pdf",
        "file_size_bytes": str(1000 + no), "uploaded_by": registration_user[version["registration_request_id"]],
        "created_at": version["submitted_at"],
    })
    registration_documents.append({
        "registration_request_id": version["registration_request_id"], "version_no": version["version_no"],
        "file_id": file_id, "document_type": "Business Registration Certificate",
    })

profile_media = []
for exp_no, experience in enumerate(experiences, 1):
    for order, category in enumerate(("Activity/Experience", "Space/Location", "Product/Result"), 1):
        file_id = uid(f"experience-media-{exp_no}-{order}")
        stored_files.append({
            "file_id": file_id, "storage_key": f"demo/experience/{file_id}.png",
            "file_name": f"demo-experience-{exp_no}-{order}.png", "media_type": "image/png",
            "file_size_bytes": str(250000 + exp_no * 1000 + order), "uploaded_by": provider_users[exp_no - 1],
            "created_at": experience["created_at"],
        })
        profile_media.append({
            "profile_media_id": uid(f"profile-media-{exp_no}-{order}"), "file_id": file_id,
            "agency_id": "", "provider_id": "", "experience_id": experience["experience_id"],
            "category": category, "display_order": str(order),
        })

provider_version_media = []
for no, version in enumerate(provider_versions, 1):
    file_id = uid(f"provider-version-media-{no}")
    provider_user = next(p["user_id"] for p in providers if p["provider_id"] == version["provider_id"])
    stored_files.append({
        "file_id": file_id, "storage_key": f"demo/provider-version/{file_id}.png",
        "file_name": f"demo-provider-version-{no}.png", "media_type": "image/png",
        "file_size_bytes": str(200000 + no), "uploaded_by": provider_user, "created_at": version["submitted_at"],
    })
    provider_version_media.append({
        "provider_id": version["provider_id"], "version_no": version["version_no"], "file_id": file_id,
        "category": "Business Profile", "display_order": "1",
    })

quote_requests = []
for i in range(1, 6):
    quote_requests.append({
        "quote_request_id": uid(f"quote-{i}"), "agency_id": agencies[i - 1]["agency_id"],
        "experience_id": experiences[i - 1]["experience_id"], "source": "Explore", "created_at": ts(-12 + i),
    })

bookings = [
    (1, 1, 1, 20, "On hold", None),
    (2, 2, 2, 18, "Booked", None),
    (3, 3, 3, -20, "Completed", -20),
    (4, 4, 4, -10, "Cancelled", None),
]
booking_rows = []
for no, agency_no, provider_no, start_day, status, arrival_day in bookings:
    created = BASE + timedelta(days=start_day - 5)
    start = BASE + timedelta(days=start_day, hours=2)
    booking_rows.append({
        "booking_id": uid(f"booking-{no}"), "agency_id": agencies[agency_no - 1]["agency_id"],
        "provider_id": providers[provider_no - 1]["provider_id"], "experience_id": experiences[provider_no - 1]["experience_id"],
        "source_chat_session_id": "", "start_at": start.isoformat(), "duration_minutes": "120", "group_size": str(4 + no),
        "agreed_price_total": str(600000 + no * 50000),
        "conditions_snapshot": dump({"notice_period": 24, "cancellation_policy": "Demo snapshot"}),
        "status": status, "created_at": created.isoformat(), "updated_at": (created + timedelta(hours=2)).isoformat(),
        "hold_expires_at": (created + timedelta(hours=72)).isoformat(),
        "arrival_at": (BASE + timedelta(days=arrival_day, hours=3)).isoformat() if arrival_day is not None else "",
    })

booking_history = []
for row in booking_rows:
    booking_history.append({
        "history_id": uid(f"history-create-{row['booking_id']}"), "booking_id": row["booking_id"],
        "from_status": "", "to_status": "On hold", "changed_by": provider_users[providers.index(next(p for p in providers if p['provider_id'] == row['provider_id']))],
        "changed_at": row["created_at"], "reason": "Booking created",
    })
    if row["status"] == "Completed":
        booking_history.append({
            "history_id": uid(f"history-booked-{row['booking_id']}"), "booking_id": row["booking_id"],
            "from_status": "On hold", "to_status": "Booked",
            "changed_by": provider_users[providers.index(next(p for p in providers if p['provider_id'] == row['provider_id']))],
            "changed_at": (datetime.fromisoformat(row["created_at"]) + timedelta(hours=1)).isoformat(),
            "reason": "Synthetic confirmation",
        })
    if row["status"] != "On hold":
        booking_history.append({
            "history_id": uid(f"history-final-{row['booking_id']}"), "booking_id": row["booking_id"],
            "from_status": "Booked" if row["status"] == "Completed" else "On hold", "to_status": row["status"],
            "changed_by": provider_users[providers.index(next(p for p in providers if p['provider_id'] == row['provider_id']))],
            "changed_at": row["updated_at"], "reason": "Synthetic lifecycle case",
        })

chat_sessions = []
chat_participants = []
chat_messages = []
for i in range(1, 6):
    chat_id = uid(f"chat-{i}")
    status = "Closed" if i == 4 else "Active"
    chat_sessions.append({
        "chat_session_id": chat_id, "agency_id": agencies[i - 1]["agency_id"], "provider_id": providers[i - 1]["provider_id"],
        "source": "Explore", "experience_id": experiences[i - 1]["experience_id"],
        "quote_request_id": quote_requests[i - 1]["quote_request_id"], "booking_id": booking_rows[i - 1]["booking_id"] if i <= 4 else "",
        "status": status, "started_at": ts(-12 + i), "last_message_at": ts(-11 + i),
        "closed_at": ts(-5) if status == "Closed" else "", "closed_by": provider_users[i - 1] if status == "Closed" else "",
    })
    msg_id = uid(f"message-{i}")
    chat_messages.append({
        "message_id": msg_id, "chat_session_id": chat_id, "sender_user_id": agency_users[i - 1],
        "text": "[DEMO] Tôi muốn nhận báo giá cho trải nghiệm này.", "message_kind": "Quote Request",
        "booking_id": "", "sent_at": ts(-11 + i),
    })
    for user_id in (agency_users[i - 1], provider_users[i - 1]):
        chat_participants.append({
            "chat_session_id": chat_id, "user_id": user_id, "last_read_message_id": msg_id,
            "unread_count": "0",
        })

notifications = [{
    "notification_id": uid("notification-registration"), "recipient_user_id": pending_agency_user,
    "event_type": "Registration Resubmitted", "source_type": "Agency Registration",
    "source_id": registrations[0]["registration_request_id"], "payload": dump({"version_no": 2}),
    "created_at": ts(-5), "read_at": "", "email_delivery_status": "Success",
}]

test_cases = [
    {"scenario_id": "ordinary-01", "fixture": "five linked agency-provider-experience pairs", "expected_result": "valid"},
    {"scenario_id": "boundary-otp", "fixture": "otp attempt=5, resend=3, invalidated at exact expiry", "expected_result": "expired/terminal challenge"},
    {"scenario_id": "empty-village", "fixture": villages[3]["source_code"], "expected_result": "zero providers"},
    {"scenario_id": "empty-provider", "fixture": providers[5]["provider_id"], "expected_result": "zero experiences"},
    {"scenario_id": "empty-agency", "fixture": agencies[5]["agency_id"], "expected_result": "zero bookings"},
    {"scenario_id": "exception-cancelled", "fixture": booking_rows[3]["booking_id"], "expected_result": "terminal historical booking"},
    {"scenario_id": "exception-closed-chat", "fixture": chat_sessions[3]["chat_session_id"], "expected_result": "terminal immutable chat"},
    {"scenario_id": "exception-rejected-registration", "fixture": registrations[1]["registration_request_id"], "expected_result": "Rejected with immutable review"},
    {"scenario_id": "exception-provider-revision", "fixture": providers[5]["provider_id"], "expected_result": "version 1 remains published; version 2 requires revision"},
    {"scenario_id": "reject-overlap", "fixture": providers[0]["provider_id"], "expected_result": "Slot Unavailable for overlapping active booking"},
    {"scenario_id": "permission-ubnd-scope", "fixture": ubnd_users[0], "expected_result": "access limited to assigned village"},
    {"scenario_id": "kpi-period", "fixture": "bookings + booking_status_history", "expected_result": "created-at period and as-of status are reproducible"},
]


def validate() -> None:
    require_unique(users, ("email",), "users.email")
    require_unique(villages, ("source_code",), "villages.source_code")
    require_unique(agencies, ("tax_id",), "agencies.tax_id")
    require_unique(providers, ("business_registration_number",), "providers.registration")
    require_unique(quote_requests, ("agency_id", "experience_id"), "quote_request pair")
    require_unique(stored_files, ("storage_key",), "stored_files.storage_key")
    active_chats = [row for row in chat_sessions if row["status"] == "Active"]
    require_unique(active_chats, ("agency_id", "provider_id"), "active chat pair")

    require_fk(assignments, "ubnd_user_id", users, "user_id", "assignment user")
    require_fk(assignments, "village_id", villages, "village_id", "assignment village")
    require_fk(agencies, "user_id", users, "user_id", "agency user")
    require_fk(providers, "user_id", users, "user_id", "provider user")
    require_fk(providers, "village_id", villages, "village_id", "provider village")
    require_fk(experiences, "provider_id", providers, "provider_id", "experience provider")
    require_fk(registration_documents, "file_id", stored_files, "file_id", "registration document file")
    require_fk(profile_media, "file_id", stored_files, "file_id", "profile media file")
    require_fk(provider_version_media, "file_id", stored_files, "file_id", "provider version file")
    require_fk(booking_rows, "agency_id", agencies, "agency_id", "booking agency")
    require_fk(booking_rows, "provider_id", providers, "provider_id", "booking provider")
    require_fk(booking_rows, "experience_id", experiences, "experience_id", "booking experience")

    provider_by_experience = {row["experience_id"]: row["provider_id"] for row in experiences}
    for row in booking_rows:
        assert provider_by_experience[row["experience_id"]] == row["provider_id"], "Booking Provider must own Experience"
        created = datetime.fromisoformat(row["created_at"])
        expires = datetime.fromisoformat(row["hold_expires_at"])
        assert expires - created == timedelta(hours=72), "Booking hold must be 72 hours"

    active = [row for row in booking_rows if row["status"] in {"On hold", "Booked"}]
    by_provider: dict[str, list[dict]] = defaultdict(list)
    for row in active:
        by_provider[row["provider_id"]].append(row)
    for rows in by_provider.values():
        for i, first in enumerate(rows):
            for second in rows[i + 1:]:
                assert not overlaps(first, second), "Valid seed contains overlapping active Bookings"

    conflicting_attempt = dict(active[0])
    conflicting_attempt["booking_id"] = uid("rejected-overlap-attempt")
    assert overlaps(active[0], conflicting_attempt), "Overlap rejection fixture must conflict"

    assert any(v["village_id"] not in {p["village_id"] for p in providers} for v in villages), "Need empty Village"
    assert any(p["provider_id"] not in {e["provider_id"] for e in experiences} for p in providers), "Need Provider without Experience"
    assert any(a["agency_id"] not in {b["agency_id"] for b in booking_rows} for a in agencies), "Need Agency without Booking"
    assert {"On hold", "Booked", "Completed", "Cancelled"}.issubset({b["status"] for b in booking_rows}), "Need every Booking state"
    assert any(p["verification_status"] == "Revision Required" for p in providers), "Need Revision Required Provider"
    assert any(r["current_status"] == "Rejected" for r in registrations), "Need rejected registration"
    required_scenarios = {
        "ordinary-01", "boundary-otp", "empty-village", "empty-provider", "empty-agency",
        "exception-cancelled", "exception-closed-chat", "exception-rejected-registration",
        "exception-provider-revision", "reject-overlap", "permission-ubnd-scope", "kpi-period",
    }
    assert required_scenarios == {row["scenario_id"] for row in test_cases}, "Scenario manifest incomplete"


def validate_schema_mapping(tables: dict[str, list[dict]]) -> None:
    schema = (ROOT / "schema.sql").read_text(encoding="utf-8")
    table_columns: dict[str, set[str]] = {}
    current = None
    for raw_line in schema.splitlines():
        line = raw_line.strip()
        if line.startswith("CREATE TABLE "):
            current = line.split()[2]
            table_columns[current] = set()
            continue
        if current and line == ");":
            current = None
            continue
        if current and raw_line.startswith("    ") and line and not line.startswith((
            "PRIMARY KEY", "FOREIGN KEY", "UNIQUE", "CONSTRAINT", "EXCLUDE"
        )):
            candidate = line.split()[0].rstrip(",")
            if candidate.replace("_", "").isalnum():
                table_columns[current].add(candidate)
    for filename, rows in tables.items():
        if filename == "scenario_manifest.csv":
            continue
        table = filename.removesuffix(".csv")
        assert table in table_columns, f"{filename}: no CREATE TABLE {table}"
        extra = set(rows[0]) - table_columns[table]
        assert not extra, f"{filename}: columns absent from schema: {sorted(extra)}"
    import re
    referenced = set(re.findall(r"REFERENCES\s+([a-z_]+)\s*\(", schema, flags=re.IGNORECASE))
    missing_tables = referenced - set(table_columns)
    assert not missing_tables, f"schema references undefined tables: {sorted(missing_tables)}"
    assert schema.count("BEGIN;") == 1 and schema.count("COMMIT;") == 1, "schema transaction wrapper missing"


def main() -> None:
    validate()
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    tables = {
        "roles.csv": roles,
        "villages.csv": villages,
        "user_accounts.csv": users,
        "account_status_history.csv": account_history,
        "ubnd_village_assignments.csv": assignments,
        "agency_registration_requests.csv": registrations,
        "registration_otp_challenges.csv": otp_challenges,
        "registration_resubmission_tokens.csv": resubmit_tokens,
        "registration_submission_versions.csv": submission_versions,
        "stored_files.csv": stored_files,
        "registration_documents.csv": registration_documents,
        "agency_review_records.csv": agency_reviews,
        "agency_profiles.csv": agencies,
        "provider_profiles.csv": providers,
        "provider_profile_versions.csv": provider_versions,
        "provider_verification_reviews.csv": provider_reviews,
        "provider_operating_hours.csv": operating_hours,
        "experiences.csv": experiences,
        "profile_media.csv": profile_media,
        "provider_version_media.csv": provider_version_media,
        "quote_requests.csv": quote_requests,
        "bookings.csv": booking_rows,
        "booking_status_history.csv": booking_history,
        "chat_sessions.csv": chat_sessions,
        "chat_messages.csv": chat_messages,
        "chat_participants.csv": chat_participants,
        "notifications.csv": notifications,
        "scenario_manifest.csv": test_cases,
    }
    validate_schema_mapping(tables)
    for filename, rows in tables.items():
        write_csv(filename, rows)
    load_lines = ["-- Run with psql from the repository root after data/schema.sql", "BEGIN;", "SET CONSTRAINTS ALL DEFERRED;"]
    for filename, rows in tables.items():
        if filename == "scenario_manifest.csv":
            continue
        table = filename.removesuffix(".csv")
        columns = ", ".join(rows[0].keys())
        load_lines.append(
            f"\\copy {table} ({columns}) FROM 'data/seed/generated/{filename}' "
            "WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');"
        )
    load_lines.extend(["COMMIT;", ""])
    (OUT / "load_seed.sql").write_text("\n".join(load_lines), encoding="utf-8")
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "synthetic_only": True,
        "table_files": {name: len(rows) for name, rows in tables.items()},
        "loader": "load_seed.sql",
        "integrity_assertions": "passed",
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(tables)} CSV files in {OUT}")
    print("All integrity assertions passed")


if __name__ == "__main__":
    main()
