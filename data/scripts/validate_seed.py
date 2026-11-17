"""Cross-file business validation for the deterministic Session 5 seed."""

import csv
import json
import re
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "seed"
AS_OF = datetime.fromisoformat("2026-09-30T00:00:00+07:00")


def rows(name):
    with (ROOT / f"{name}.csv").open(encoding="utf-8", newline="") as stream:
        return list(csv.DictReader(stream))


def at(value):
    return datetime.fromisoformat(value)


manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
assert manifest["logical_entities"] == 47
assert manifest["entity_csv_files"] == len(manifest["table_files"]) == 47
for file_name, expected in manifest["table_files"].items():
    assert len(rows(file_name.removesuffix(".csv"))) == expected, file_name

load_script = (ROOT / "load_seed.sql").read_text(encoding="utf-8")
load_columns = {table: [column.strip() for column in columns.split(",")]
                for table, columns in re.findall(r"^\\copy (\w+) \(([^)]+)\) FROM", load_script, re.MULTILINE)}
assert set(load_columns) == {name.removesuffix(".csv") for name in manifest["table_files"]}
for table, columns in load_columns.items():
    with (ROOT / f"{table}.csv").open(encoding="utf-8", newline="") as stream:
        assert next(csv.reader(stream)) == columns, table

providers = {row["provider_id"]: row for row in rows("provider_profiles")}
experiences = {row["experience_id"]: row for row in rows("experiences")}
chats = {row["chat_session_id"]: row for row in rows("chat_sessions")}
history = defaultdict(list)

hour_rows = rows("provider_operating_hours")
allowed_hour_starts = {"07:00:00", "07:30:00", "08:00:00"}
allowed_hour_ends = {"17:00:00", "17:30:00"}
provider_weekdays = defaultdict(set)
hour_pairs = set()
hour_ids = set()
for hour in hour_rows:
    provider_id = hour["provider_id"]
    weekday = int(hour["weekday"])
    pair = (provider_id, weekday)
    assert provider_id in providers, provider_id
    assert 1 <= weekday <= 7, pair
    assert pair not in hour_pairs, pair
    assert hour["operating_hour_id"] not in hour_ids, hour["operating_hour_id"]
    assert re.fullmatch(r"\d{2}:\d{2}:\d{2}", hour["local_start"]), hour
    assert re.fullmatch(r"\d{2}:\d{2}:\d{2}", hour["local_end"]), hour
    assert hour["local_start"] < hour["local_end"], hour
    assert hour["local_start"] in allowed_hour_starts, hour
    assert hour["local_end"] in allowed_hour_ends, hour
    hour_pairs.add(pair)
    hour_ids.add(hour["operating_hour_id"])
    provider_weekdays[provider_id].add(weekday)

assert len(hour_rows) == len(providers) * 7
for provider_id in providers:
    assert provider_weekdays[provider_id] == set(range(1, 8)), provider_id

activity_limits = {
    "Workshop/Hands-on": (90, 180, 10, 30),
    "Sightseeing": (45, 90, 20, 50),
    "Cultural Show": (45, 90, 20, 60),
}
for experience in rows("experiences"):
    limits = activity_limits.get(experience["category"])
    duration = experience["duration_minutes"]
    capacity = experience["max_participants"]
    if limits is None:
        assert not duration and not capacity, experience["experience_id"]
        continue

    min_duration, max_duration, min_capacity, max_capacity = limits
    assert duration and capacity, experience["experience_id"]
    duration_value = int(duration)
    capacity_value = int(capacity)
    assert min_duration <= duration_value <= max_duration, experience["experience_id"]
    assert duration_value % 15 == 0, experience["experience_id"]
    assert min_capacity <= capacity_value <= max_capacity, experience["experience_id"]
    assert 1 <= capacity_value, experience["experience_id"]

assert experiences["bad51dc8-1529-506a-8302-cb0b1d95954c"]["max_participants"] == "16"

for entry in rows("booking_status_history"):
    history[entry["booking_id"]].append(entry)

allowed = {("On hold", "Booked"), ("On hold", "Cancelled"),
           ("Booked", "Completed"), ("Booked", "Cancelled")}
bookings = rows("bookings")
for booking in bookings:
    booking_id = booking["booking_id"]
    assert providers[booking["provider_id"]]["verification_status"] == "Verified", booking_id
    assert booking["experience_id"] in experiences
    assert experiences[booking["experience_id"]]["provider_id"] == booking["provider_id"], booking_id
    assert chats[booking["source_chat_session_id"]]["provider_id"] == booking["provider_id"], booking_id
    assert not experiences[booking["experience_id"]]["archived_at"], booking_id
    snapshot = json.loads(booking["conditions_snapshot"])
    assert isinstance(snapshot.get("notice_period_hours"), int) and snapshot["notice_period_hours"] >= 0, booking_id
    assert isinstance(snapshot.get("cancellation_policy"), dict) and snapshot["cancellation_policy"], booking_id
    assert at(booking["end_at"]) > at(booking["start_at"]), booking_id
    assert (at(booking["end_at"]) - at(booking["start_at"])).total_seconds() == int(booking["duration_minutes"]) * 60, booking_id
    assert at(booking["hold_expires_at"]) == at(booking["created_at"]) + timedelta(hours=72), booking_id
    events = sorted(history[booking_id], key=lambda row: at(row["changed_at"]))
    assert events and events[0]["from_status"] == "" and events[0]["to_status"] == "On hold", booking_id
    assert at(events[0]["changed_at"]) == at(booking["created_at"]), booking_id
    for earlier, later in zip(events, events[1:]):
        assert earlier["to_status"] == later["from_status"], booking_id
        assert (later["from_status"], later["to_status"]) in allowed, booking_id
        assert at(later["changed_at"]) >= at(earlier["changed_at"]), booking_id
        if later["to_status"] == "Cancelled":
            assert later["reason"], booking_id
    assert events[-1]["to_status"] == booking["status"], booking_id
    assert at(events[-1]["changed_at"]) == at(booking["updated_at"]), booking_id
    if booking["status"] == "Completed":
        assert booking["arrival_at"] and at(booking["arrival_at"]) >= at(booking["start_at"]), booking_id
        assert at(booking["updated_at"]) >= at(booking["arrival_at"]), booking_id
    else:
        assert not booking["arrival_at"], booking_id
    if booking["status"] == "On hold":
        assert at(booking["hold_expires_at"]) > AS_OF, booking_id

active_blocks = [booking for booking in bookings if booking["status"] in ("On hold", "Booked")]
for index, first in enumerate(active_blocks):
    for second in active_blocks[index + 1:]:
        if first["provider_id"] == second["provider_id"]:
            assert at(first["end_at"]) <= at(second["start_at"]) or at(second["end_at"]) <= at(first["start_at"]), (first["booking_id"], second["booking_id"])

permission_rows = rows("role_permissions")
permissions = {(row["role_code"], row["permission_code"]) for row in permission_rows}
for required in (("Local_Provider", "use_chat"), ("Tour_Agency", "use_chat"),
                 ("Tour_Agency", "manage_profile")):
    assert required in permissions, required
assert all(row["permission_code"] != "manage_rankings" for row in permission_rows)
assert all(row["permission_code"] != "manage_rankings" for row in rows("permissions"))

ranking = rows("ranking_parameter_versions")
active = [row for row in ranking if row["version_status"] == "Active"]
assert len(active) == 1
users = {row["user_id"]: row for row in rows("user_accounts")}


def permitted(user_id, permission_code):
    user = users[user_id]
    return any(row["role_code"] == user["role_code"]
               and row["permission_code"] == permission_code
               and (not row["admin_type"] or row["admin_type"] == user["admin_type"])
               for row in permission_rows)


assert not any(permitted(user_id, "manage_rankings") for user_id in users)
for agency in rows("agency_profiles"):
    assert users[agency["user_id"]]["role_code"] == "Tour_Agency"
    assert permitted(agency["user_id"], "manage_profile")
activations = [row for row in rows("audit_logs") if row["action"] == "SYSTEM_ACTIVATE_RANKING_VERSION"]
assert len(activations) == 1 and activations[0]["target_id"] == active[0]["version_id"]
assert not activations[0]["actor_user_id"]
for session in rows("explore_sessions"):
    if session["tracking_scope"] == "No Non-essential Tracking":
        assert not session["ranking_version_id"]
        assert not session["ranked_results"]
    else:
        assert session["ranking_version_id"] == active[0]["version_id"]
        assert all(item["rank"] >= 1 for snapshot in json.loads(session["ranked_results"]) for item in snapshot["results"])

print("PASS: 47 CSVs/load headers; seven operating weekdays per provider; Booking lifecycle, eligibility, chronology, snapshots, scopes and ranking audit")
