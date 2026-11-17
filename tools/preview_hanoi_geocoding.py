#!/usr/bin/env python3
"""Preview village-level Hanoi coordinates through Photon without editing seed data."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import os
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


PHOTON_URL = "https://photon.komoot.io/api/"
HANOI_BOUNDS = (20.55, 21.45, 105.25, 106.05)
MIN_REQUEST_INTERVAL = 1.05
RESULT_LIMIT = 5
DEFAULT_CITY_PROVINCE = "Hà Nội"

# © OpenStreetMap contributors (ODbL), geocoding qua Photon (komoot).


def normalize(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value.casefold().replace("đ", "d"))
    without_marks = "".join(char for char in decomposed if unicodedata.category(char) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", without_marks).strip()


def normalize_district(value: str) -> str:
    normalized = normalize(value)
    prefixes = ("huyen ", "quan ", "thi xa ", "thanh pho ")
    suffixes = (" district", " county", " city")
    for prefix in prefixes:
        if normalized.startswith(prefix):
            normalized = normalized[len(prefix):]
            break
    for suffix in suffixes:
        if normalized.endswith(suffix):
            normalized = normalized[:-len(suffix)]
            break
    return normalized.strip()


def _village_id(row: dict[str, Any]) -> str:
    return str(row.get("village_id") or row.get("id") or row.get("name") or "").strip()


def _empty_village(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": _village_id(row),
        "name": str(row.get("name") or row.get("village_name") or "").strip(),
        "district": str(row.get("district") or row.get("district_raw") or "").strip(),
        "city_province": str(row.get("city_province") or "").strip() or DEFAULT_CITY_PROVINCE,
        "lat": None,
        "lng": None,
        "precision": None,
        "flags": [],
    }


def load_csv_villages(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8-sig", newline="") as source:
        rows = list(csv.DictReader(source))
    if not rows:
        raise ValueError(f"{path} contains no village rows.")
    villages: list[dict[str, Any]] = []
    for row in rows:
        village = _empty_village(row)
        if not village["id"] or not village["name"] or not village["district"]:
            raise ValueError(f"{path} must provide village id, name, and district for every row.")
        villages.append(village)
    return villages


def _valid_coordinate(lat: Any, lng: Any) -> tuple[float, float] | None:
    try:
        latitude, longitude = float(lat), float(lng)
    except (TypeError, ValueError):
        return None
    if (
        not math.isfinite(latitude)
        or not math.isfinite(longitude)
        or not -90 <= latitude <= 90
        or not -180 <= longitude <= 180
    ):
        return None
    return latitude, longitude


def adapt_json_villages(raw_villages: Any) -> list[dict[str, Any]]:
    if isinstance(raw_villages, dict):
        raw_villages = raw_villages.get("villages")
    if not isinstance(raw_villages, list):
        raise ValueError("JSON source must be a village array or an object containing a villages array.")

    villages: list[dict[str, Any]] = []
    for raw in raw_villages:
        if not isinstance(raw, dict):
            continue
        village = _empty_village(raw)
        if not village["id"] or not village["name"] or not village["district"]:
            raise ValueError("Each JSON village must provide an id, name, and district.")

        plus_code_points: list[tuple[float, float]] = []
        providers = raw.get("providers")
        for provider in providers if isinstance(providers, list) else []:
            coordinates = provider.get("coordinates") if isinstance(provider, dict) else None
            if not isinstance(coordinates, dict) or coordinates.get("status") != "from_plus_code":
                continue
            point = _valid_coordinate(coordinates.get("lat"), coordinates.get("lng"))
            if point is not None:
                plus_code_points.append(point)
            else:
                village["flags"].append("tọa độ plus_code không hợp lệ")

        distinct_points = set(plus_code_points)
        if plus_code_points:
            village["lat"] = round(sum(point[0] for point in plus_code_points) / len(plus_code_points), 7)
            village["lng"] = round(sum(point[1] for point in plus_code_points) / len(plus_code_points), 7)
            village["precision"] = "plus_code"
            if len(distinct_points) > 1:
                village["flags"].append("plus_code_coordinates_differ")
            if not in_hanoi_bounds(village["lat"], village["lng"]):
                village["flags"].append("tọa độ plus_code ngoài khung Hà Nội")
        villages.append(village)
    return villages


def load_json_villages(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8") as source:
        return adapt_json_villages(json.load(source))


def load_villages(path: Path) -> list[dict[str, Any]]:
    if path.suffix.casefold() == ".csv":
        return load_csv_villages(path)
    if path.suffix.casefold() == ".json":
        return load_json_villages(path)
    raise ValueError(f"Unsupported village source format: {path.suffix}")


def load_cache(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as source:
        cached = json.load(source)
    if not isinstance(cached, dict):
        raise ValueError(f"Invalid Photon cache: {path}")
    return cached


def cache_key(query: str) -> str:
    return hashlib.sha256(query.encode("utf-8")).hexdigest()


class PhotonClient:
    def __init__(self, user_agent: str, cache: dict[str, Any]):
        if not user_agent or "@" not in user_agent:
            raise ValueError("Provide a descriptive User-Agent containing a contact email.")
        self.user_agent = user_agent
        self.cache = cache
        self.last_request_at = 0.0

    def search(self, query: str) -> list[dict[str, Any]]:
        key = cache_key(query)
        if key in self.cache:
            cached = self.cache[key]
            if not isinstance(cached, list):
                raise ValueError(f"Invalid cached Photon results for query: {query}")
            return cached

        delay = MIN_REQUEST_INTERVAL - (time.monotonic() - self.last_request_at)
        if delay > 0:
            time.sleep(delay)

        params = {
            "q": query,
            "limit": str(RESULT_LIMIT),
            "lang": "en",
            "lat": "21.03",
            "lon": "105.85",
        }
        request = urllib.request.Request(
            f"{PHOTON_URL}?{urllib.parse.urlencode(params)}",
            headers={"User-Agent": self.user_agent},
        )
        self.last_request_at = time.monotonic()
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
        features = payload.get("features")
        if not isinstance(features, list):
            raise ValueError("Photon returned a response without a GeoJSON features array.")
        self.cache[key] = features
        return features


def feature_coordinates(feature: dict[str, Any]) -> tuple[float, float] | None:
    geometry = feature.get("geometry")
    raw_coordinates = geometry.get("coordinates") if isinstance(geometry, dict) else None
    if not isinstance(raw_coordinates, list) or len(raw_coordinates) < 2:
        return None
    try:
        lng, lat = float(raw_coordinates[0]), float(raw_coordinates[1])
    except (TypeError, ValueError):
        return None
    if not math.isfinite(lat) or not math.isfinite(lng):
        return None
    return lat, lng


def in_hanoi_bounds(
    lat: float,
    lng: float,
    bounds: tuple[float, float, float, float] = HANOI_BOUNDS,
) -> bool:
    south, north, west, east = bounds
    return south <= lat <= north and west <= lng <= east


def photon_district_values(feature: dict[str, Any]) -> list[str]:
    properties = feature.get("properties")
    if not isinstance(properties, dict):
        return []
    return [
        properties[key].strip()
        for key in ("district", "county", "city")
        if isinstance(properties.get(key), str) and properties[key].strip()
    ]


def select_photon_feature(
    features: list[dict[str, Any]],
    seed_district: str,
    bounds: tuple[float, float, float, float] = HANOI_BOUNDS,
) -> tuple[dict[str, Any] | None, tuple[float, float] | None, list[str]]:
    valid: list[tuple[dict[str, Any], tuple[float, float]]] = []
    excluded_flags: list[str] = []
    for feature in features[:RESULT_LIMIT]:
        properties = feature.get("properties")
        if not isinstance(properties, dict):
            continue
        if properties.get("osm_key") not in {"boundary", "place"}:
            continue
        countrycode = properties.get("countrycode")
        if not isinstance(countrycode, str) or countrycode.upper() != "VN":
            excluded_flags.append("ngoài Việt Nam")
            continue
        point = feature_coordinates(feature)
        if point is None:
            continue
        if not in_hanoi_bounds(*point, bounds):
            excluded_flags.append("ngoài khung Hà Nội")
            continue
        valid.append((feature, point))

    normalized_seed_district = normalize_district(seed_district)
    for feature, point in valid:
        if any(normalize_district(value) == normalized_seed_district for value in photon_district_values(feature)):
            return feature, point, []
    if valid:
        return valid[0][0], valid[0][1], ["huyện không khớp"]
    return None, None, list(dict.fromkeys([*excluded_flags, "không tìm thấy"]))


def geocode_village(
    client: PhotonClient,
    village: dict[str, Any],
    district_cache: dict[str, dict[str, Any]] | None = None,
    manual_coordinates: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    name = str(village.get("name") or "").strip()
    district = village["district"].strip()
    manual = (manual_coordinates or {}).get(normalize(name))
    if manual:
        return {
            "query": "manual_village_coords.csv",
            "feature": None,
            "lat": manual.get("lat"),
            "lng": manual.get("lng"),
            "precision": "manual_gmaps",
            "location_source": "manual_gmaps",
            "flags": [],
        }
    if village.get("precision") == "plus_code":
        return {
            "query": "from_plus_code",
            "feature": None,
            "lat": village.get("lat"),
            "lng": village.get("lng"),
            "precision": "plus_code",
            "location_source": "from_plus_code",
            "flags": list(village.get("flags") or []),
        }
    cache = district_cache if district_cache is not None else {}
    cache_key_value = normalize_district(district)
    if cache_key_value in cache:
        cached = cache[cache_key_value]
        return {**cached, "flags": list(cached.get("flags") or [])}

    query = f"{district}, {DEFAULT_CITY_PROVINCE}"
    features = client.search(query)
    feature, point, flags = select_photon_feature(features, district)
    result = {
        "query": query,
        "feature": feature,
        "lat": point[0] if point else None,
        "lng": point[1] if point else None,
        "precision": "district_centroid" if point else None,
        "location_source": "district_fallback" if point else None,
        "flags": flags,
    }
    cache[cache_key_value] = result
    return {**result, "flags": list(result["flags"])}


def load_manual_village_coordinates(path: Path) -> dict[str, dict[str, Any]]:
    with path.open(encoding="utf-8-sig", newline="") as source:
        rows = list(csv.DictReader(source))
    coordinates: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = normalize(row.get("normalized_key", ""))
        point = _valid_coordinate(row.get("lat"), row.get("lng"))
        if not key or point is None or row.get("source") not in {"manual", "manual_gmaps"}:
            raise ValueError(f"{path} rows require normalized_key, valid lat/lng, and source=manual.")
        if not in_hanoi_bounds(*point):
            raise ValueError(f"{path} contains a coordinate outside the Hanoi bounds: {key}")
        if key in coordinates:
            raise ValueError(f"{path} contains a duplicate normalized_key: {key}")
        coordinates[key] = {
            "lat": point[0],
            "lng": point[1],
            "source": row["source"],
        }
    return coordinates


def output_row(village: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
    feature = result.get("feature")
    properties = feature.get("properties", {}) if feature else {}
    district_values = photon_district_values(feature) if feature else []
    result_flags = result.get("flags")
    return {
        "id": village.get("id") or village.get("village_id", ""),
        "village_name": village.get("name", ""),
        "seed_district": village.get("district", ""),
        "query": result.get("query", ""),
        "photon_name": properties.get("name", "") if isinstance(properties, dict) else "",
        "photon_osm_key": properties.get("osm_key", "") if isinstance(properties, dict) else "",
        "photon_osm_value": properties.get("osm_value", "") if isinstance(properties, dict) else "",
        "photon_district": " / ".join(district_values),
        "lat": result.get("lat"),
        "lng": result.get("lng"),
        "precision": result.get("precision"),
        "location_source": result.get("location_source"),
        "flags": list(result_flags) if isinstance(result_flags, list) else [],
    }


def write_csv(rows: list[dict[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    headers = (
        "Village ID",
        "Làng",
        "Huyện seed",
        "Truy vấn",
        "Photon name",
        "Photon osm_key",
        "Photon osm_value",
        "Photon district/county/city",
        "Lat",
        "Lng",
        "Precision",
        "Location source",
        "Cờ",
    )
    with output_path.open("w", encoding="utf-8-sig", newline="") as destination:
        writer = csv.DictWriter(destination, fieldnames=headers)
        writer.writeheader()
        for row in rows:
            writer.writerow({
                "Village ID": row.get("id", ""),
                "Làng": row.get("village_name", ""),
                "Huyện seed": row.get("seed_district", ""),
                "Truy vấn": row.get("query", ""),
                "Photon name": row.get("photon_name", ""),
                "Photon osm_key": row.get("photon_osm_key", ""),
                "Photon osm_value": row.get("photon_osm_value", ""),
                "Photon district/county/city": row.get("photon_district", ""),
                "Lat": row.get("lat") if row.get("lat") is not None else "",
                "Lng": row.get("lng") if row.get("lng") is not None else "",
                "Precision": row.get("precision") or "",
                "Location source": row.get("location_source") or "",
                "Cờ": ", ".join(row.get("flags") or []),
            })


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Preview village-level coordinates from Photon.")
    parser.add_argument(
        "--source",
        action="append",
        metavar="csv|json[=PATH]|PATH",
        help="Repeat inputs; csv/json selects defaults, or pass csv=PATH, json=PATH, or a file path.",
    )
    parser.add_argument("--output-dir", type=Path, default=Path.home() / "Desktop")
    parser.add_argument("--output", type=Path, help="Override the CSV path when processing one source.")
    parser.add_argument(
        "--manual-coords",
        type=Path,
        help="Manual coordinate CSV; defaults to data/manual_village_coords.csv.",
    )
    args = parser.parse_args(argv)

    repo = Path(__file__).resolve().parents[1]
    known_sources = {
        "csv": [("seed", repo / "data" / "seed" / "villages.csv")],
        "json": [
            ("test-fixture", repo / "tests" / "fixtures" / "ai-matching" / "villages_providers_activities_merged.json"),
            ("src-data", repo / "src" / "data" / "ai-matching" / "villages_providers_activities_merged.json"),
        ],
    }
    source_specs = args.source or ["csv", "json"]
    sources: list[tuple[str, Path]] = []
    for spec in source_specs:
        source_type, separator, source_path = spec.partition("=")
        if source_type in known_sources and separator:
            path = Path(source_path)
            sources.append((path.stem, path))
        elif source_type in known_sources:
            sources.extend(known_sources[source_type])
        else:
            path = Path(spec)
            source_type = path.suffix.casefold().lstrip(".")
            if source_type not in known_sources:
                raise ValueError(f"Unsupported source format: {path.suffix}")
            sources.append((path.stem, path))
    unique_sources = list(dict.fromkeys(sources))
    if args.output is not None and len(unique_sources) != 1:
        raise ValueError("--output can only be used with exactly one source.")

    manual_path = args.manual_coords or repo / "data" / "manual_village_coords.csv"
    manual_coordinates = load_manual_village_coordinates(manual_path)
    cache_path = Path(os.environ.get(
        "HAB_PHOTON_CACHE",
        str(Path.home() / ".cache" / "hanoi-artisan-bridge" / "photon-district-preview-cache.json"),
    ))
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache = load_cache(cache_path)
    user_agent = os.environ.get("HAB_PHOTON_USER_AGENT", "")
    client = PhotonClient(user_agent, cache)

    outputs: list[tuple[int, Path]] = []
    district_cache: dict[str, dict[str, Any]] = {}
    for source_name, source_path in unique_sources:
        villages = load_villages(source_path)
        rows = []
        for village in villages:
            result = geocode_village(client, village, district_cache, manual_coordinates)
            rows.append(output_row(village, result))
        output_path = args.output or args.output_dir / f"{source_name}-village-geocoding.csv"
        write_csv(rows, output_path)
        outputs.append((len(villages), output_path))

    cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for count, output_path in outputs:
        print(f"{count} villages -> {output_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError) as error:
        print(f"Photon geocoding preview failed: {error}", file=sys.stderr)
        raise SystemExit(1)
