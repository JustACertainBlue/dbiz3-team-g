import csv
import io
import importlib.util
import json
import os
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import MagicMock, patch
from urllib.parse import parse_qs, urlparse


SCRIPT = Path(__file__).resolve().parents[2] / "tools" / "preview_hanoi_geocoding.py"
SPEC = importlib.util.spec_from_file_location("preview_hanoi_geocoding", SCRIPT)
GEOCODER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GEOCODER)


def photon_feature(
    lng,
    lat,
    *,
    countrycode="VN",
    district="Gia Lâm",
    county=None,
    city=None,
    name="Bát Tràng",
):
    properties = {
        "countrycode": countrycode,
        "district": district,
        "name": name,
        "osm_key": "place",
        "osm_value": "village",
    }
    if county is not None:
        properties["county"] = county
    if city is not None:
        properties["city"] = city
    return {
        "geometry": {"type": "Point", "coordinates": [lng, lat]},
        "properties": properties,
    }


class FakePhotonClient:
    def __init__(self, results):
        self.results = list(results)
        self.queries = []

    def search(self, query):
        self.queries.append(query)
        return self.results.pop(0)


class PhotonGeocodingTest(unittest.TestCase):
    def test_manual_coordinate_source_is_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "manual.csv"
            path.write_text(
                "normalized_key,lat,lng,source\n"
                "phung-xa,20.72611,105.70667,manual\n",
                encoding="utf-8",
            )

            coordinates = GEOCODER.load_manual_village_coordinates(path)

        self.assertEqual(coordinates["phung xa"]["lat"], 20.72611)
        self.assertEqual(coordinates["phung xa"]["lng"], 105.70667)
        self.assertEqual(coordinates["phung xa"]["source"], "manual")

    def test_csv_adapter_returns_the_shared_village_shape(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "villages.csv"
            with path.open("w", encoding="utf-8", newline="") as destination:
                writer = csv.DictWriter(
                    destination,
                    fieldnames=("village_id", "name", "district", "city_province"),
                )
                writer.writeheader()
                writer.writerow({
                    "village_id": "seed-village-1",
                    "name": "Bát Tràng",
                    "district": "Gia Lâm",
                    "city_province": "Hà Nội",
                })

            villages = GEOCODER.load_csv_villages(path)

        self.assertEqual(
            {key: villages[0][key] for key in ("id", "name", "district", "city_province")},
            {
                "id": "seed-village-1",
                "name": "Bát Tràng",
                "district": "Gia Lâm",
                "city_province": "Hà Nội",
            },
        )

    def test_json_adapter_averages_distinct_plus_codes_and_ignores_unverified_statuses(self):
        raw_village = {
            "village_id": "fixture-village-1",
            "village_name": "Làng gốm Bát Tràng",
            "district_raw": "Gia Lâm",
            "city_province": "Hà Nội",
            "providers": [
                {"coordinates": {"lat": 21.0, "lng": 105.8, "status": "from_plus_code"}},
                {"coordinates": {"lat": 21.02, "lng": 105.82, "status": "from_plus_code"}},
                {"coordinates": {"lat": 20.9, "lng": 105.7, "status": "ai_estimated"}},
                {"coordinates": {"lat": None, "lng": None, "status": "not_found"}},
            ],
        }

        village = GEOCODER.adapt_json_villages([raw_village])[0]

        self.assertEqual(
            {key: village[key] for key in ("id", "name", "district", "city_province")},
            {
                "id": "fixture-village-1",
                "name": "Làng gốm Bát Tràng",
                "district": "Gia Lâm",
                "city_province": "Hà Nội",
            },
        )
        self.assertEqual((village["lat"], village["lng"]), (21.01, 105.81))
        self.assertEqual(village["precision"], "plus_code")
        self.assertIn("plus_code_coordinates_differ", village["flags"])

    def test_json_adapter_leaves_ai_estimated_and_not_found_without_real_coordinates(self):
        raw_village = {
            "village_id": "fixture-village-2",
            "village_name": "Làng thử nghiệm",
            "district_raw": "Gia Lâm",
            "city_province": "Hà Nội",
            "providers": [
                {"coordinates": {"lat": 21.0, "lng": 105.8, "status": "ai_estimated"}},
                {"coordinates": {"lat": None, "lng": None, "status": "not_found"}},
            ],
        }

        village = GEOCODER.adapt_json_villages([raw_village])[0]

        self.assertIsNone(village["lat"])
        self.assertIsNone(village["lng"])
        self.assertIsNone(village["precision"])

    def test_repository_json_sources_use_only_verified_plus_code_coordinates(self):
        repository_root = Path(__file__).resolve().parents[2]
        source_paths = [
            repository_root / "tests" / "fixtures" / "ai-matching" / "villages_providers_activities_merged.json",
            repository_root / "src" / "data" / "ai-matching" / "villages_providers_activities_merged.json",
        ]

        for source_path in source_paths:
            with self.subTest(source=source_path):
                villages = GEOCODER.load_json_villages(source_path)

                self.assertEqual(len(villages), 14)
                self.assertEqual(sum(village["precision"] == "plus_code" for village in villages), 5)
                self.assertTrue(all(village["id"] and village["name"] and village["district"] for village in villages))
                self.assertTrue(all(village["city_province"] == "Hà Nội" for village in villages))

    def test_existing_plus_code_is_used_without_calling_photon(self):
        class NoNetworkClient:
            def search(self, query):
                raise AssertionError(f"Plus-code village should not be geocoded: {query}")

        result = GEOCODER.geocode_village(
            NoNetworkClient(),
            {
                "id": "fixture-village-1",
                "name": "Bát Tràng",
                "district": "Gia Lâm",
                "city_province": "Hà Nội",
                "lat": 21.01,
                "lng": 105.81,
                "precision": "plus_code",
                "flags": [],
            },
        )

        self.assertEqual((result["lat"], result["lng"]), (21.01, 105.81))
        self.assertEqual(result["precision"], "plus_code")

    def test_repeated_source_arguments_write_separate_csvs_without_network(self):
        class NoNetworkClient:
            def __init__(self, _user_agent, _cache):
                pass

            def search(self, _query):
                return []

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            csv_path = root / "seed-input.csv"
            with csv_path.open("w", encoding="utf-8", newline="") as destination:
                writer = csv.DictWriter(
                    destination,
                    fieldnames=("village_id", "name", "district", "city_province"),
                )
                writer.writeheader()
                writer.writerow({
                    "village_id": "seed-1",
                    "name": "Bát Tràng",
                    "district": "Gia Lâm",
                    "city_province": "Hà Nội",
                })
            json_path = root / "test-input.json"
            json_path.write_text(json.dumps({
                "villages": [{
                    "village_id": "test-1",
                    "village_name": "Làng thử nghiệm",
                    "district_raw": "Gia Lâm",
                    "providers": [{
                        "coordinates": {
                            "lat": 21.01,
                            "lng": 105.81,
                            "status": "from_plus_code",
                        },
                    }],
                }],
            }), encoding="utf-8")
            output_dir = root / "output"
            with (
                patch.dict(os.environ, {
                    "HAB_PHOTON_USER_AGENT": "HAB preview (contact: jade@example.com)",
                    "HAB_PHOTON_CACHE": str(root / "cache.json"),
                }),
                patch.object(GEOCODER, "PhotonClient", NoNetworkClient),
                redirect_stdout(io.StringIO()) as output,
            ):
                exit_code = GEOCODER.main([
                    "--source", f"csv={csv_path}",
                    "--source", f"json={json_path}",
                    "--output-dir", str(output_dir),
                ])

            self.assertEqual(exit_code, 0)
            csv_outputs = [
                output_dir / "seed-input-village-geocoding.csv",
                output_dir / "test-input-village-geocoding.csv",
            ]
            for csv_output in csv_outputs:
                self.assertTrue(csv_output.exists())
                self.assertIn(f"1 villages -> {csv_output}", output.getvalue())

    def test_default_sources_export_seed_and_both_json_datasets_offline(self):
        class NoNetworkClient:
            def __init__(self, _user_agent, _cache):
                pass

            def search(self, _query):
                return []

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            output_dir = root / "output"
            with (
                patch.dict(os.environ, {
                    "HAB_PHOTON_USER_AGENT": "HAB preview (contact: jade@example.com)",
                    "HAB_PHOTON_CACHE": str(root / "cache.json"),
                }),
                patch.object(GEOCODER, "PhotonClient", NoNetworkClient),
                redirect_stdout(io.StringIO()) as output,
            ):
                exit_code = GEOCODER.main(["--output-dir", str(output_dir)])

            expected_counts = {
                "seed-village-geocoding.csv": 8,
                "test-fixture-village-geocoding.csv": 14,
                "src-data-village-geocoding.csv": 14,
            }
            self.assertEqual(exit_code, 0)
            for filename, count in expected_counts.items():
                csv_output = output_dir / filename
                self.assertTrue(csv_output.exists())
                self.assertIn(f"{count} villages -> {csv_output}", output.getvalue())

    def test_json_input_identifier_preserves_the_village_id_for_lookup_review(self):
        village = GEOCODER.adapt_json_villages([{
            "village_id": "fixture-village-1",
            "village_name": "Làng thử nghiệm",
            "district_raw": "Gia Lâm",
        }])[0]

        row = GEOCODER.output_row(village, {
            "query": "Làng thử nghiệm, Gia Lâm, Hà Nội",
            "feature": None,
            "lat": None,
            "lng": None,
            "precision": None,
            "flags": ["không tìm thấy"],
        })

        self.assertEqual(row["id"], "fixture-village-1")

    def test_geojson_coordinates_are_read_as_longitude_then_latitude(self):
        self.assertEqual(
            GEOCODER.feature_coordinates(photon_feature(105.85, 21.03)),
            (21.03, 105.85),
        )

    def test_filters_non_vietnam_and_out_of_hanoi_features_before_district_matching(self):
        features = [
            photon_feature(105.85, 21.03, countrycode="LA"),
            photon_feature(106.5, 21.03),
            photon_feature(105.8, 21.0, district="Đông Anh"),
            photon_feature(
                105.81,
                21.01,
                district="Thanh Oai",
                county="Gia Lam",
                name="Làng Bát Tràng",
            ),
        ]

        selected, coordinates, flags = GEOCODER.select_photon_feature(
            features,
            "Gia Lâm",
            GEOCODER.HANOI_BOUNDS,
        )

        self.assertIs(selected, features[3])
        self.assertEqual(coordinates, (21.01, 105.81))
        self.assertEqual(flags, [])

    def test_uses_first_valid_feature_and_flags_district_mismatch(self):
        features = [
            photon_feature(105.85 + index * 0.001, 21.03, district="Đông Anh")
            for index in range(5)
        ] + [photon_feature(105.86, 21.04, district="Gia Lâm")]

        selected, coordinates, flags = GEOCODER.select_photon_feature(
            features,
            "Gia Lâm",
            GEOCODER.HANOI_BOUNDS,
        )

        self.assertIs(selected, features[0])
        self.assertEqual(coordinates, (21.03, 105.85))
        self.assertIn("huyện không khớp", flags)

    def test_district_fallback_queries_only_hanoi_district_and_marks_estimate_source(self):
        client = FakePhotonClient([[photon_feature(105.85, 21.03, district="Gia Lâm")]])

        result = GEOCODER.geocode_village(
            client,
            {"id": "bat-trang", "name": "Bát Tràng", "district": "Gia Lâm"},
            district_cache={},
        )

        self.assertEqual(client.queries, ["Gia Lâm, Hà Nội"])
        self.assertEqual((result["lat"], result["lng"]), (21.03, 105.85))
        self.assertEqual(result["precision"], "district_centroid")
        self.assertEqual(result["location_source"], "district_fallback")

    def test_district_fallback_uses_only_boundary_or_place_features(self):
        excluded = photon_feature(105.85, 21.03)
        excluded["properties"]["osm_key"] = "highway"
        selected = photon_feature(105.86, 21.04, district="Gia Lâm")
        client = FakePhotonClient([[excluded, selected]])

        result = GEOCODER.geocode_village(
            client,
            {"id": "bat-trang", "name": "Bát Tràng", "district": "Gia Lâm"},
            district_cache={},
        )

        self.assertEqual((result["lat"], result["lng"]), (21.04, 105.86))

    def test_manual_coordinate_overrides_fixture_plus_code_without_photon_request(self):
        class NoNetworkClient:
            def search(self, query):
                raise AssertionError(f"Manual coordinate should take priority: {query}")

        result = GEOCODER.geocode_village(
            NoNetworkClient(),
            {
                "id": "bat-trang",
                "name": "Bát Tràng",
                "district": "Gia Lâm",
                "lat": 21.01,
                "lng": 105.81,
                "precision": "plus_code",
            },
            manual_coordinates={
                "bat trang": {
                    "lat": 21.02,
                    "lng": 105.82,
                    "source": "manual_gmaps",
                },
            },
        )

        self.assertEqual((result["lat"], result["lng"]), (21.02, 105.82))
        self.assertEqual(result["precision"], "manual_gmaps")
        self.assertEqual(result["location_source"], "manual_gmaps")

    def test_district_centroid_is_cached_for_villages_in_the_same_district(self):
        client = FakePhotonClient([[photon_feature(105.85, 21.03, district="Gia Lâm")]])
        cache = {}

        first = GEOCODER.geocode_village(
            client,
            {"id": "bat-trang", "name": "Bát Tràng", "district": "Gia Lâm"},
            district_cache=cache,
        )
        second = GEOCODER.geocode_village(
            client,
            {"id": "kim-lan", "name": "Kim Lan", "district": "Gia Lâm"},
            district_cache=cache,
        )

        self.assertEqual(client.queries, ["Gia Lâm, Hà Nội"])
        self.assertEqual((first["lat"], first["lng"]), (second["lat"], second["lng"]))
        self.assertEqual(first["precision"], "district_centroid")
        self.assertEqual(second["precision"], "district_centroid")
        self.assertEqual(first["flags"], [])
        self.assertEqual(second["flags"], [])

    def test_manual_coordinate_csv_uses_normalized_keys_and_requires_manual_source(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "manual_village_coords.csv"
            path.write_text(
                "normalized_key,lat,lng,source\nbat trang,21.03,105.85,manual_gmaps\n",
                encoding="utf-8",
            )

            coordinates = GEOCODER.load_manual_village_coordinates(path)

        self.assertEqual(coordinates["bat trang"], {
            "lat": 21.03,
            "lng": 105.85,
            "source": "manual_gmaps",
        })

    def test_output_rows_always_include_coordinate_precision_and_flag_fields(self):
        village = {"name": "Bát Tràng", "district": "Gia Lâm"}
        cases = [
            {
                "query": "Gia Lâm, Hà Nội",
                "feature": photon_feature(105.85, 21.03),
                "lat": 21.03,
                "lng": 105.85,
                "precision": "district_centroid",
                "location_source": "district_fallback",
                "flags": [],
            },
            {
                "query": "Gia Lâm, Hà Nội",
                "feature": None,
                "lat": None,
                "lng": None,
                "precision": None,
                "flags": ["không tìm thấy"],
            },
        ]

        for result in cases:
            with self.subTest(feature_found=result["feature"] is not None):
                row = GEOCODER.output_row(village, result)
                self.assertTrue({"lat", "lng", "precision", "flags"}.issubset(row))

    def test_csv_row_keeps_photon_place_identifiers_for_manual_review(self):
        feature = photon_feature(
            105.85,
            21.03,
            district="Gia Lâm",
            county="Hà Nội",
            name="Bát Tràng",
        )
        row = GEOCODER.output_row(
            {"name": "Bát Tràng", "district": "Gia Lâm"},
            {
                "query": "Bát Tràng, Gia Lâm, Hà Nội",
                "feature": feature,
                "lat": 21.03,
                "lng": 105.85,
                "flags": [],
            },
        )

        self.assertEqual(row["photon_name"], "Bát Tràng")
        self.assertEqual(row["photon_osm_key"], "place")
        self.assertEqual(row["photon_osm_value"], "village")
        self.assertEqual(row["photon_district"], "Gia Lâm / Hà Nội")

    def test_returns_null_when_no_photon_feature_is_valid(self):
        selected, coordinates, flags = GEOCODER.select_photon_feature(
            [
                photon_feature(105.85, 21.03, countrycode="CN"),
                photon_feature(106.5, 21.03),
            ],
            "Gia Lâm",
            GEOCODER.HANOI_BOUNDS,
        )

        self.assertIsNone(selected)
        self.assertIsNone(coordinates)
        self.assertIn("không tìm thấy", flags)

    def test_not_found_result_keeps_the_complete_nullable_schema(self):
        client = FakePhotonClient([[photon_feature(105.85, 21.03, countrycode="CN")]])
        village = {"name": "Bát Tràng", "district": "Gia Lâm", "city_province": "Hà Nội"}

        result = GEOCODER.geocode_village(client, village, district_cache={})

        self.assertTrue({"lat", "lng", "precision", "flags"}.issubset(result))
        self.assertIsNone(result["lat"])
        self.assertIsNone(result["lng"])
        self.assertIsNone(result["precision"])
        self.assertIn("không tìm thấy", result["flags"])
        self.assertEqual(client.queries, ["Gia Lâm, Hà Nội"])

    def test_photon_request_uses_required_language_limit_bias_and_user_agent(self):
        response = MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = json.dumps({"features": []}).encode("utf-8")
        with patch.object(GEOCODER.urllib.request, "urlopen", return_value=response) as urlopen:
            client = GEOCODER.PhotonClient("HAB geocoding (contact: jade@example.com)", {})
            query = "Bát Tràng, Gia Lâm, Hà Nội"
            client.search(query)
            client.search(query)

        self.assertEqual(urlopen.call_count, 1)
        request = urlopen.call_args.args[0]
        self.assertEqual(urlparse(request.full_url).netloc, "photon.komoot.io")
        params = parse_qs(urlparse(request.full_url).query)
        self.assertEqual(params["limit"], ["5"])
        self.assertEqual(params["lang"], ["en"])
        self.assertEqual(params["lat"], ["21.03"])
        self.assertEqual(params["lon"], ["105.85"])
        self.assertIn("jade@example.com", request.get_header("User-agent"))

    def test_rate_limits_uncached_requests_to_at_least_one_second_apart(self):
        response = MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = json.dumps({"features": []}).encode("utf-8")
        clock_values = [100.0, 100.1, 100.3, 100.4]
        with (
            patch.object(GEOCODER.time, "monotonic", side_effect=clock_values),
            patch.object(GEOCODER.time, "sleep") as sleep,
            patch.object(GEOCODER.urllib.request, "urlopen", return_value=response),
        ):
            client = GEOCODER.PhotonClient("HAB geocoding (contact: jade@example.com)", {})
            client.search("first")
            client.search("second")

        self.assertAlmostEqual(sleep.call_args.args[0], 0.85)


if __name__ == "__main__":
    unittest.main()
