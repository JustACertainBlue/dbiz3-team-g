# BUG-01..29 — tái hiện qua route [MOCK]

- Lưu ý: mock tự sinh delta theo heuristic, vì vậy “không tái hiện” không chứng minh model thật đã đúng.
- Generated: 2026-11-19T15:28:03.409Z
- Method: read each BUG reproduction cell from `docs/build/anti-bug-report.md`; for multi-example cells use the first quoted utterance exactly, otherwise send the source cell literally.
- Route: `POST /api/ait/sessions` then `POST /api/ait/sessions/[id]/messages`; each case uses a fresh in-memory demo repository and a stubbed Cloudflare client. No real model, environment file, or Supabase was used.
- Mock boundary: `deltaFor` builds a heuristic delta from the input; this exercises route/state/validator behavior but does not test real-model extraction. BUG-21 deliberately injects an unsupported budget delta to check validator rejection.
- Dataset mode is selected by the route from the standalone `test` marker in the original input; BUG-20 injects a NaN distance through a mocked haversine result.
- Supplemental [MOCK]: `filterCandidateByRadius` excludes candidate distances `NaN` and negative; the route test injects `NaN` from haversine and confirms no `NaN` appears in text. Separate route tests cover unrecognized explicit origin, BUG-10 budget rejection, and BUG-22 comma formatting.
- “Không tái hiện trên [MOCK]” means only that the checked symptom was not observed on this scripted input; it is not evidence about real-model behavior.

### BUG-01

- Câu gây lỗi nguyên văn từ anti report: Candidate có `distance_km` = NaN hoặc tọa độ đảo (lat > 90)
- Input gửi route: Candidate có `distance_km` = NaN hoặc tọa độ đảo (lat > 90)
- Dataset: —
- Kết luận: không tái hiện trên [MOCK] ở mức hàm; không chạy qua route
- Tiêu chí: tests/ait/ait-geo-distance.test.ts gọi filterCandidateByRadius trực tiếp với distance NaN và distance âm; BUG-02 cũng có test route riêng cho radius âm.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: không chạy
- State:
```json
null
```
- Text phản hồi: không có (không gọi route)
- Delta validation:
```json
null
```

### BUG-02

- Câu gây lỗi nguyên văn từ anti report: "dưới -5 km" hoặc candidate khoảng cách âm
- Input gửi route: dưới -5 km
- Dataset: —
- Kết luận: không tái hiện trên [MOCK] ở mức hàm; không chạy qua route
- Tiêu chí: tests/ait/ait-geo-distance.test.ts gọi filterCandidateByRadius trực tiếp với distance NaN và distance âm; BUG-02 cũng có test route riêng cho radius âm.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: không chạy
- State:
```json
null
```
- Text phản hồi: không có (không gọi route)
- Delta validation:
```json
null
```

### BUG-03

- Câu gây lỗi nguyên văn từ anti report: "dưới 0 km"
- Input gửi route: dưới 0 km
- Dataset: seed
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Bán kính 0 tạo kết quả.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 0,
  "relaxed_fields": [],
  "slots": {},
  "turn_history": []
}
```
- Text phản hồi: > Chưa tìm thấy làng nghề phù hợp trong bán kính 0 km tính từ trung tâm Hà Nội.
- Delta validation:
```json
null
```

### BUG-04

- Câu gây lỗi nguyên văn từ anti report: "trên 10 km", "xa hơn 10 km", "từ 5 đến 10 km"
- Input gửi route: trên 10 km
- Dataset: seed
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Cụm yêu cầu khoảng cách tối thiểu/range bị dùng như bán kính tối đa.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 0,
  "relaxed_fields": [],
  "slots": {},
  "turn_history": []
}
```
- Text phản hồi: > Hiện chưa hỗ trợ lọc theo khoảng cách tối thiểu hoặc khoảng cách trong một dải. Bạn có thể nói giới hạn tối đa, ví dụ 'dưới 20 km'.
- Delta validation:
```json
null
```

### BUG-05

- Câu gây lỗi nguyên văn từ anti report: "10 cây số", "10 cây", "mười km", "10 ki-lô-mét"
- Input gửi route: 10 cây số
- Dataset: seed
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Không nhận diện được đơn vị cây số.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 1,
  "relaxed_fields": [],
  "slots": {
    "radius": {
      "value": 10,
      "raw_span": "10 cây số",
      "created_turn": 1,
      "source_turn": 1,
      "source": "explicit"
    }
  },
  "turn_history": [
    {
      "turn": 1,
      "slots": {
        "radius": {
          "value": 10,
          "raw_span": "10 cây số",
          "created_turn": 1,
          "source_turn": 1,
          "source": "explicit"
        }
      }
    }
  ],
  "radius_km": 10
}
```
- Text phản hồi: > Mình tìm được 3 trải nghiệm.
>Có trải nghiệm chưa xác nhận bán kính 10 km do sai số ước tính theo huyện.
>
>1. Nặn gốm thủ công: 150.000đ/người (Cách trung tâm Hà Nội khoảng 8,1 km (đường chim bay))
>2. Dệt lụa truyền thống: 175.000đ/người (Cách trung tâm Hà Nội khoảng 9,9 km (đường chim bay))
>3. Thêu họa tiết: 250.000đ/người (khoảng 17 km (ước tính theo huyện))
>
>Khoảng cách tính từ trung tâm Hà Nội.
>
>Tôi có thể tư vấn cụ thể hơn nếu bạn muốn chia sẻ số khách dự kiến.
>
>Đang lọc: bán kính 10 km.
>
>Đang áp dụng: bán kính 10 km.
- Delta validation:
```json
{
  "accepted": {
    "radius": {
      "action": "set",
      "value": 10,
      "raw_span": "10 cây số"
    }
  },
  "unsupported": {},
  "rejected": []
}
```

### BUG-06

- Câu gây lỗi nguyên văn từ anti report: "có wifi không", "có điều hòa không", "phù hợp trẻ em"
- Input gửi route: có wifi không
- Dataset: seed
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Yêu cầu tiện ích trả kết quả/khẳng định tiện ích thay vì từ chối dữ liệu thiếu.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 200
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 0,
  "relaxed_fields": [],
  "slots": {},
  "turn_history": []
}
```
- Text phản hồi: > Xin lỗi, mình không thể trả lời yêu cầu này vì nằm ngoài phạm vi nền tảng. Bạn muốn mình gợi ý trải nghiệm văn hóa có trong dữ liệu hay tiếp tục ghép tour làng nghề theo số khách, ngày và ngân sách?
- Delta validation:
```json
null
```

### BUG-07

- Câu gây lỗi nguyên văn từ anti report: "làm giấy dó", "bánh cuốn", "tò he"
- Input gửi route: làm giấy dó
- Dataset: seed
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Nghề ngoài dữ liệu không được báo thiếu dữ liệu.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 0,
  "relaxed_fields": [],
  "slots": {
    "craft": {
      "value": "giấy dó",
      "raw_span": "làm giấy dó",
      "created_turn": 0,
      "source_turn": 0,
      "source": "explicit"
    }
  },
  "turn_history": [],
  "craft": "giấy dó",
  "craft_no_data": true
}
```
- Text phản hồi: > Hiện chưa có dữ liệu về giấy dó.
>
>Mình có thể gợi ý làng nghề khác đang có dữ liệu.
>
>Đang áp dụng: giấy dó.
- Delta validation:
```json
{
  "accepted": {},
  "unsupported": {
    "craft": {
      "action": "set",
      "value": "giấy dó",
      "raw_span": "làm giấy dó"
    }
  },
  "rejected": []
}
```

### BUG-08

- Câu gây lỗi nguyên văn từ anti report: "cho khách hoạt động cách 20 km, làm hương hay tò he cho 10 người"
- Input gửi route: cho khách hoạt động cách 20 km, làm hương hay tò he cho 10 người
- Dataset: seed
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Câu khoảng cách bị gán sang origin hoặc mất bán kính/số khách.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 1,
  "relaxed_fields": [],
  "slots": {
    "group_size": {
      "value": 10,
      "raw_span": "10 người",
      "created_turn": 1,
      "source_turn": 1,
      "source": "explicit"
    },
    "radius": {
      "value": 20,
      "raw_span": "20 km",
      "created_turn": 1,
      "source_turn": 1,
      "source": "explicit"
    },
    "craft": {
      "value": "hương hay tò he",
      "raw_span": "làm hương hay tò he",
      "created_turn": 1,
      "source_turn": 1,
      "source": "explicit"
    }
  },
  "turn_history": [
    {
      "turn": 1,
      "slots": {
        "group_size": {
          "value": 10,
          "raw_span": "10 người",
          "created_turn": 1,
          "source_turn": 1,
          "source": "explicit"
        },
        "radius": {
          "value": 20,
          "raw_span": "20 km",
          "created_turn": 1,
          "source_turn": 1,
          "source": "explicit"
        },
        "craft": {
          "value": "hương hay tò he",
          "raw_span": "làm hương hay tò he",
          "created_turn": 1,
          "source_turn": 1,
          "source": "explicit"
        }
      }
    }
  ],
  "group_size": 10,
  "radius_km": 20,
  "craft": "hương hay tò he",
  "craft_no_data": true
}
```
- Text phản hồi: > Hiện chưa có dữ liệu về hương hay tò he.
>
>Mình có thể gợi ý làng nghề khác đang có dữ liệu.
>
>Đang áp dụng: hương hay tò he, bán kính 20 km, 10 khách.
- Delta validation:
```json
{
  "accepted": {
    "group_size": {
      "action": "set",
      "value": 10,
      "raw_span": "10 người"
    },
    "radius": {
      "action": "set",
      "value": 20,
      "raw_span": "20 km"
    }
  },
  "unsupported": {
    "craft": {
      "action": "set",
      "value": "hương hay tò he",
      "raw_span": "làm hương hay tò he"
    }
  },
  "rejected": []
}
```

### BUG-09

- Câu gây lỗi nguyên văn từ anti report: "sân bay Nội Bài", "Mỹ Đình", "khách sạn Sofitel Metropole", "phố cổ"
- Input gửi route: sân bay Nội Bài
- Dataset: seed
- Kết luận: không kết luận được từ lượt [MOCK]
- Tiêu chí: Input nguồn chỉ ghi “sân bay Nội Bài”, không nói rõ đây là điểm xuất phát; delta mock không tự suy diễn origin. Kiểm tra route riêng với delta origin tường minh đã xác nhận có thông báo.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 0,
  "relaxed_fields": [],
  "slots": {},
  "turn_history": []
}
```
- Text phản hồi: > Mình tìm được 5 trải nghiệm.
>
>1. Làm nón lá: 225.000đ/người (Cách trung tâm Hà Nội khoảng 24,4 km (đường chim bay))
>2. Thêu họa tiết: 250.000đ/người (khoảng 17 km (ước tính theo huyện))
>3. Dệt lụa truyền thống: 175.000đ/người (Cách trung tâm Hà Nội khoảng 9,9 km (đường chim bay))
>4. Nặn gốm thủ công: 150.000đ/người (Cách trung tâm Hà Nội khoảng 8,1 km (đường chim bay))
>5. Đan mây tre: 200.000đ/người (Cách trung tâm Hà Nội khoảng 23,7 km (đường chim bay))
>
>Khoảng cách tính từ trung tâm Hà Nội.
>
>Tôi có thể tư vấn cụ thể hơn nếu bạn muốn chia sẻ số khách dự kiến.
>
>Đang lọc: các tiêu chí đã nêu.
>
>Đang áp dụng: trống.
- Delta validation:
```json
{
  "accepted": {},
  "unsupported": {},
  "rejected": []
}
```

### BUG-10

- Câu gây lỗi nguyên văn từ anti report: "10 khách, dưới 10 km, 10k"
- Input gửi route: 10 khách, dưới 10 km, 10k
- Dataset: seed
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Thông báo sai lý do loại kết quả, nêu thiếu khoảng cách.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 1,
  "relaxed_fields": [],
  "slots": {
    "group_size": {
      "value": 10,
      "raw_span": "10 khách",
      "created_turn": 1,
      "source_turn": 1,
      "source": "explicit"
    },
    "radius": {
      "value": 10,
      "raw_span": "10 km",
      "created_turn": 1,
      "source_turn": 1,
      "source": "explicit"
    },
    "budget_per_person": {
      "value": 10000,
      "raw_span": "10k",
      "created_turn": 1,
      "source_turn": 1,
      "source": "explicit"
    }
  },
  "turn_history": [
    {
      "turn": 1,
      "slots": {
        "group_size": {
          "value": 10,
          "raw_span": "10 khách",
          "created_turn": 1,
          "source_turn": 1,
          "source": "explicit"
        },
        "radius": {
          "value": 10,
          "raw_span": "10 km",
          "created_turn": 1,
          "source_turn": 1,
          "source": "explicit"
        },
        "budget_per_person": {
          "value": 10000,
          "raw_span": "10k",
          "created_turn": 1,
          "source_turn": 1,
          "source": "explicit"
        }
      }
    }
  ],
  "group_size": 10,
  "radius_km": 10,
  "budget_per_person": 10000
}
```
- Text phản hồi: > Không tìm thấy trải nghiệm nào phù hợp với ngân sách tối đa 10.000đ/người.
>
>Tôi có thể tư vấn lịch phù hợp hơn nếu bạn cho biết ngày đi.
>
>Đang áp dụng: bán kính 10 km, 10 khách, ngân sách 10.000đ.
- Delta validation:
```json
{
  "accepted": {
    "group_size": {
      "action": "set",
      "value": 10,
      "raw_span": "10 khách"
    },
    "radius": {
      "action": "set",
      "value": 10,
      "raw_span": "10 km"
    },
    "budget_per_person": {
      "action": "set",
      "value": 10000,
      "raw_span": "10k"
    }
  },
  "unsupported": {},
  "rejected": [
    {
      "slot": "budget_basis",
      "reason": "per_person_basis_not_stated"
    }
  ]
}
```

### BUG-11

- Câu gây lỗi nguyên văn từ anti report: Mọi câu hiển thị khoảng cách tọa độ thật
- Input gửi route: Mọi câu hiển thị khoảng cách tọa độ thật
- Dataset: seed
- Kết luận: không kết luận được từ lượt [MOCK]
- Tiêu chí: Nguồn chỉ nêu “mọi câu hiển thị khoảng cách tọa độ thật”, không có câu truy vấn; chạy nguyên văn mô tả không kiểm tra được định dạng khoảng cách.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 200
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 0,
  "relaxed_fields": [],
  "slots": {},
  "turn_history": []
}
```
- Text phản hồi: > Xin lỗi, mình không thể trả lời yêu cầu này vì nằm ngoài phạm vi nền tảng. Bạn muốn mình gợi ý trải nghiệm văn hóa có trong dữ liệu hay tiếp tục ghép tour làng nghề theo số khách, ngày và ngân sách?
- Delta validation:
```json
null
```

### BUG-12

- Câu gây lỗi nguyên văn từ anti report: Mọi lượt hỏi có nghề
- Input gửi route: Mọi lượt hỏi có nghề
- Dataset: seed
- Kết luận: không kết luận được từ lượt [MOCK]
- Tiêu chí: Nguồn chỉ nêu “mọi lượt hỏi có nghề”, không có câu truy vấn cụ thể; mock này không xác minh được taxonomy ở các lượt matching.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 0,
  "relaxed_fields": [],
  "slots": {},
  "turn_history": []
}
```
- Text phản hồi: > Mình tìm được 5 trải nghiệm.
>
>1. Làm nón lá: 225.000đ/người (Cách trung tâm Hà Nội khoảng 24,4 km (đường chim bay))
>2. Thêu họa tiết: 250.000đ/người (khoảng 17 km (ước tính theo huyện))
>3. Dệt lụa truyền thống: 175.000đ/người (Cách trung tâm Hà Nội khoảng 9,9 km (đường chim bay))
>4. Nặn gốm thủ công: 150.000đ/người (Cách trung tâm Hà Nội khoảng 8,1 km (đường chim bay))
>5. Đan mây tre: 200.000đ/người (Cách trung tâm Hà Nội khoảng 23,7 km (đường chim bay))
>
>Khoảng cách tính từ trung tâm Hà Nội.
>
>Tôi có thể tư vấn cụ thể hơn nếu bạn muốn chia sẻ số khách dự kiến.
>
>Đang lọc: các tiêu chí đã nêu.
>
>Đang áp dụng: trống.
- Delta validation:
```json
{
  "accepted": {},
  "unsupported": {},
  "rejected": []
}
```

### BUG-13

- Câu gây lỗi nguyên văn từ anti report: "ho guom, dưới 10 km"
- Input gửi route: ho guom, dưới 10 km
- Dataset: seed
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Text chuẩn hóa “ho guom” thành “Hồ Gươm”.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 1,
  "relaxed_fields": [],
  "slots": {
    "radius": {
      "value": 10,
      "raw_span": "10 km",
      "created_turn": 1,
      "source_turn": 1,
      "source": "explicit"
    }
  },
  "turn_history": [
    {
      "turn": 1,
      "slots": {
        "radius": {
          "value": 10,
          "raw_span": "10 km",
          "created_turn": 1,
          "source_turn": 1,
          "source": "explicit"
        }
      }
    }
  ],
  "radius_km": 10
}
```
- Text phản hồi: > Mình tìm được 3 trải nghiệm.
>Có trải nghiệm chưa xác nhận bán kính 10 km do sai số ước tính theo huyện.
>
>1. Nặn gốm thủ công: 150.000đ/người (Cách trung tâm Hà Nội khoảng 8,1 km (đường chim bay))
>2. Dệt lụa truyền thống: 175.000đ/người (Cách trung tâm Hà Nội khoảng 9,9 km (đường chim bay))
>3. Thêu họa tiết: 250.000đ/người (khoảng 17 km (ước tính theo huyện))
>
>Khoảng cách tính từ trung tâm Hà Nội.
>
>Tôi có thể tư vấn cụ thể hơn nếu bạn muốn chia sẻ số khách dự kiến.
>
>Đang lọc: bán kính 10 km.
>
>Đang áp dụng: bán kính 10 km.
- Delta validation:
```json
{
  "accepted": {
    "radius": {
      "action": "set",
      "value": 10,
      "raw_span": "10 km"
    }
  },
  "unsupported": {},
  "rejected": []
}
```

### BUG-14

- Câu gây lỗi nguyên văn từ anti report: "hôm qua", "ngày 31/02"
- Input gửi route: hôm qua
- Dataset: seed
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Ngày quá khứ/không hợp lệ được chấp nhận hoặc không có cảnh báo.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 0,
  "relaxed_fields": [],
  "slots": {},
  "turn_history": []
}
```
- Text phản hồi: > Ngày hoặc thời gian này không hợp lệ. Vui lòng nhập một ngày hợp lệ.
- Delta validation:
```json
null
```

### BUG-15

- Câu gây lỗi nguyên văn từ anti report: "10 người lớn 3 trẻ em"
- Input gửi route: 10 người lớn 3 trẻ em
- Dataset: seed
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Tổng người lớn và trẻ em không bằng 13.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 1,
  "relaxed_fields": [],
  "slots": {
    "group_size": {
      "value": 13,
      "raw_span": "10 người lớn 3 trẻ em",
      "created_turn": 1,
      "source_turn": 1,
      "source": "explicit"
    }
  },
  "turn_history": [
    {
      "turn": 1,
      "slots": {
        "group_size": {
          "value": 13,
          "raw_span": "10 người lớn 3 trẻ em",
          "created_turn": 1,
          "source_turn": 1,
          "source": "explicit"
        }
      }
    }
  ],
  "group_size": 13
}
```
- Text phản hồi: > Mình tìm được 5 trải nghiệm cho nhóm 13 khách.
>
>1. Đan mây tre: 200.000đ/người (Cách trung tâm Hà Nội khoảng 23,7 km (đường chim bay))
>2. Thêu họa tiết: 250.000đ/người (khoảng 17 km (ước tính theo huyện))
>3. Dệt lụa truyền thống: 175.000đ/người (Cách trung tâm Hà Nội khoảng 9,9 km (đường chim bay))
>4. Làm nón lá: 225.000đ/người (Cách trung tâm Hà Nội khoảng 24,4 km (đường chim bay))
>5. Nặn gốm thủ công: 150.000đ/người (Cách trung tâm Hà Nội khoảng 8,1 km (đường chim bay))
>
>Khoảng cách tính từ trung tâm Hà Nội.
>
>Tôi có thể tư vấn lịch phù hợp hơn nếu bạn cho biết ngày đi.
>
>Đang lọc: 13 khách.
>
>Đang áp dụng: 13 khách.
- Delta validation:
```json
{
  "accepted": {
    "group_size": {
      "action": "set",
      "value": 13,
      "raw_span": "10 người lớn 3 trẻ em"
    }
  },
  "unsupported": {},
  "rejected": []
}
```

### BUG-16

- Câu gây lỗi nguyên văn từ anti report: "0 khách"
- Input gửi route: 0 khách
- Dataset: seed
- Kết luận: còn tái hiện trên [MOCK]
- Tiêu chí: Validator rejects group_size=0 and leaves it out of state, but the route still returns generic matches without explaining the invalid group size.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 0,
  "relaxed_fields": [],
  "slots": {},
  "turn_history": []
}
```
- Text phản hồi: > Mình tìm được 5 trải nghiệm.
>
>1. Làm nón lá: 225.000đ/người (Cách trung tâm Hà Nội khoảng 24,4 km (đường chim bay))
>2. Thêu họa tiết: 250.000đ/người (khoảng 17 km (ước tính theo huyện))
>3. Dệt lụa truyền thống: 175.000đ/người (Cách trung tâm Hà Nội khoảng 9,9 km (đường chim bay))
>4. Nặn gốm thủ công: 150.000đ/người (Cách trung tâm Hà Nội khoảng 8,1 km (đường chim bay))
>5. Đan mây tre: 200.000đ/người (Cách trung tâm Hà Nội khoảng 23,7 km (đường chim bay))
>
>Khoảng cách tính từ trung tâm Hà Nội.
>
>Tôi có thể tư vấn cụ thể hơn nếu bạn muốn chia sẻ số khách dự kiến.
>
>Đang lọc: các tiêu chí đã nêu.
>
>Đang áp dụng: trống.
- Delta validation:
```json
{
  "accepted": {},
  "unsupported": {},
  "rejected": [
    {
      "slot": "group_size",
      "reason": "group_size_must_be_positive_integer"
    }
  ]
}
```

### BUG-17

- Câu gây lỗi nguyên văn từ anti report: "viết bài thơ về làng gốm", "đặt tour luôn", "SELECT * FROM..."
- Input gửi route: viết bài thơ về làng gốm
- Dataset: seed
- Kết luận: hành vi theo JQ-03; [MOCK] classifier được stub thành catalog_query
- Tiêu chí: No deterministic creative-writing refusal matches this request, so classification is left to the LLM. The harness forces catalog_query; this reflects the entity-first JQ-03 decision only under the stub, not verified real-model behavior.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 1,
  "relaxed_fields": [],
  "slots": {
    "craft": {
      "value": "pottery",
      "raw_span": "viết bài thơ về làng gốm",
      "created_turn": 1,
      "source_turn": 1,
      "source": "explicit"
    }
  },
  "turn_history": [
    {
      "turn": 1,
      "slots": {
        "craft": {
          "value": "pottery",
          "raw_span": "viết bài thơ về làng gốm",
          "created_turn": 1,
          "source_turn": 1,
          "source": "explicit"
        }
      }
    }
  ],
  "craft": "pottery",
  "craft_no_data": false
}
```
- Text phản hồi: > Mình tìm được 1 trải nghiệm (nghề làm gốm).
>
>1. Nặn gốm thủ công: 150.000đ/người (Cách trung tâm Hà Nội khoảng 8,1 km (đường chim bay))
>
>Khoảng cách tính từ trung tâm Hà Nội.
>
>Tôi có thể tư vấn cụ thể hơn nếu bạn muốn chia sẻ số khách dự kiến.
>
>Đang lọc: làm gốm.
>
>Đang áp dụng: làm gốm.
- Delta validation:
```json
{
  "accepted": {
    "craft": {
      "action": "set",
      "value": "pottery",
      "raw_span": "viết bài thơ về làng gốm"
    }
  },
  "unsupported": {},
  "rejected": []
}
```

### BUG-18

- Câu gây lỗi nguyên văn từ anti report: "1,5 triệu cho cả đoàn 10 người"
- Input gửi route: 1,5 triệu cho cả đoàn 10 người
- Dataset: seed
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Tổng ngân sách không được chia theo 10 khách hoặc mất basis.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 1,
  "relaxed_fields": [],
  "slots": {
    "group_size": {
      "value": 10,
      "raw_span": "10 người",
      "created_turn": 1,
      "source_turn": 1,
      "source": "explicit"
    },
    "budget_per_person": {
      "value": 150000,
      "raw_span": "1,5 triệu",
      "created_turn": 1,
      "source_turn": 1,
      "source": "explicit"
    },
    "budget_basis": {
      "value": "group_total",
      "raw_span": "1,5 triệu cho cả đoàn 10 người",
      "created_turn": 1,
      "source_turn": 1,
      "source": "explicit"
    }
  },
  "turn_history": [
    {
      "turn": 1,
      "slots": {
        "group_size": {
          "value": 10,
          "raw_span": "10 người",
          "created_turn": 1,
          "source_turn": 1,
          "source": "explicit"
        },
        "budget_per_person": {
          "value": 150000,
          "raw_span": "1,5 triệu",
          "created_turn": 1,
          "source_turn": 1,
          "source": "explicit"
        },
        "budget_basis": {
          "value": "group_total",
          "raw_span": "1,5 triệu cho cả đoàn 10 người",
          "created_turn": 1,
          "source_turn": 1,
          "source": "explicit"
        }
      }
    }
  ],
  "group_size": 10,
  "budget_per_person": 150000,
  "budget_basis": "group_total"
}
```
- Text phản hồi: > Mình tìm được 1 trải nghiệm cho nhóm 10 khách (ngân sách tối đa 150.000đ/người).
>
>1. Nặn gốm thủ công: 150.000đ/người (Cách trung tâm Hà Nội khoảng 8,1 km (đường chim bay))
>
>Khoảng cách tính từ trung tâm Hà Nội.
>
>Tôi có thể tư vấn lịch phù hợp hơn nếu bạn cho biết ngày đi.
>
>Đang lọc: 10 khách, ngân sách 150.000đ.
>
>Đang áp dụng: 10 khách, ngân sách 150.000đ.
- Delta validation:
```json
{
  "accepted": {
    "group_size": {
      "action": "set",
      "value": 10,
      "raw_span": "10 người"
    },
    "budget_per_person": {
      "action": "set",
      "value": 150000,
      "raw_span": "1,5 triệu"
    },
    "budget_basis": {
      "action": "set",
      "value": "group_total",
      "raw_span": "1,5 triệu cho cả đoàn 10 người"
    }
  },
  "unsupported": {},
  "rejected": []
}
```

### BUG-19

- Câu gây lỗi nguyên văn từ anti report: "1e3 km" (scientific notation)
- Input gửi route: 1e3 km
- Dataset: seed
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Scientific notation bị parse thành 3 km.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 0,
  "relaxed_fields": [],
  "slots": {},
  "turn_history": []
}
```
- Text phản hồi: > Giá trị bán kính không hợp lệ. Vui lòng nhập một số bán kính dương bằng km.
- Delta validation:
```json
null
```

### BUG-20

- Câu gây lỗi nguyên văn từ anti report: "từ 5 đến NaN km làng làm giấy dó test" và các câu tương tự
- Input gửi route: từ 5 đến NaN km làng làm giấy dó test
- Dataset: fixture
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Đã inject distance NaN vào haversine trong test route; text phản hồi không được chứa NaN.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 0,
  "relaxed_fields": [],
  "slots": {
    "craft": {
      "value": "giấy dó",
      "raw_span": "làm giấy dó",
      "created_turn": 0,
      "source_turn": 0,
      "source": "explicit"
    }
  },
  "turn_history": [],
  "craft": "giấy dó",
  "craft_no_data": true
}
```
- Text phản hồi: > Hiện chưa có dữ liệu về giấy dó.
>
>Mình có thể gợi ý làng nghề khác đang có dữ liệu.
>
>Đang áp dụng: giấy dó.
- Delta validation:
```json
{
  "accepted": {},
  "unsupported": {
    "craft": {
      "action": "set",
      "value": "giấy dó",
      "raw_span": "làm giấy dó"
    }
  },
  "rejected": []
}
```

### BUG-21

- Câu gây lỗi nguyên văn từ anti report: Nghề không tồn tại trong dữ liệu (tò he, giấy dó) + câu có "khoảng Xkm"
- Input gửi route: khoảng Xkm
- Dataset: seed
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Delta ngân sách không có căn cứ tiền được chấp nhận.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 0,
  "relaxed_fields": [],
  "slots": {},
  "turn_history": []
}
```
- Text phản hồi: > Mình tìm được 5 trải nghiệm.
>
>1. Làm nón lá: 225.000đ/người (Cách trung tâm Hà Nội khoảng 24,4 km (đường chim bay))
>2. Thêu họa tiết: 250.000đ/người (khoảng 17 km (ước tính theo huyện))
>3. Dệt lụa truyền thống: 175.000đ/người (Cách trung tâm Hà Nội khoảng 9,9 km (đường chim bay))
>4. Nặn gốm thủ công: 150.000đ/người (Cách trung tâm Hà Nội khoảng 8,1 km (đường chim bay))
>5. Đan mây tre: 200.000đ/người (Cách trung tâm Hà Nội khoảng 23,7 km (đường chim bay))
>
>Khoảng cách tính từ trung tâm Hà Nội.
>
>Tôi có thể tư vấn cụ thể hơn nếu bạn muốn chia sẻ số khách dự kiến.
>
>Đang lọc: các tiêu chí đã nêu.
>
>Đang áp dụng: trống.
- Delta validation:
```json
{
  "accepted": {},
  "unsupported": {},
  "rejected": [
    {
      "slot": "budget_per_person",
      "reason": "raw_span_not_in_latest_user_turn"
    }
  ]
}
```

### BUG-22

- Câu gây lỗi nguyên văn từ anti report: "dưới 8.14 km" / "dưới 8,14 km" (đúng khoảng cách Bát Tràng)
- Input gửi route: dưới 8.14 km
- Dataset: seed
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Kiểm tra dấu chấm trong số km hiển thị sau khi radius state được làm tròn theo JQ-04.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 1,
  "relaxed_fields": [],
  "slots": {
    "radius": {
      "value": 8.1,
      "raw_span": "8.14 km",
      "created_turn": 1,
      "source_turn": 1,
      "source": "explicit"
    }
  },
  "turn_history": [
    {
      "turn": 1,
      "slots": {
        "radius": {
          "value": 8.1,
          "raw_span": "8.14 km",
          "created_turn": 1,
          "source_turn": 1,
          "source": "explicit"
        }
      }
    }
  ],
  "radius_km": 8.1
}
```
- Text phản hồi: > Mình tìm được 2 trải nghiệm.
>Có trải nghiệm chưa xác nhận bán kính 8,1 km do sai số ước tính theo huyện.
>
>1. Nặn gốm thủ công: 150.000đ/người (Cách trung tâm Hà Nội khoảng 8,1 km (đường chim bay))
>2. Thêu họa tiết: 250.000đ/người (khoảng 17 km (ước tính theo huyện))
>
>Khoảng cách tính từ trung tâm Hà Nội.
>
>Tôi có thể tư vấn cụ thể hơn nếu bạn muốn chia sẻ số khách dự kiến.
>
>Đang lọc: bán kính 8,1 km.
>
>Đang áp dụng: bán kính 8,1 km.
- Delta validation:
```json
{
  "accepted": {
    "radius": {
      "action": "set",
      "value": 8.14,
      "raw_span": "8.14 km"
    }
  },
  "unsupported": {},
  "rejected": []
}
```

### BUG-23

- Câu gây lỗi nguyên văn từ anti report: "dưới 10.0001 km"
- Input gửi route: dưới 10.0001 km
- Dataset: seed
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Radius/text vẫn giữ bốn chữ số thập phân.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 1,
  "relaxed_fields": [],
  "slots": {
    "radius": {
      "value": 10,
      "raw_span": "10.0001 km",
      "created_turn": 1,
      "source_turn": 1,
      "source": "explicit"
    }
  },
  "turn_history": [
    {
      "turn": 1,
      "slots": {
        "radius": {
          "value": 10,
          "raw_span": "10.0001 km",
          "created_turn": 1,
          "source_turn": 1,
          "source": "explicit"
        }
      }
    }
  ],
  "radius_km": 10
}
```
- Text phản hồi: > Mình tìm được 3 trải nghiệm.
>Có trải nghiệm chưa xác nhận bán kính 10 km do sai số ước tính theo huyện.
>
>1. Nặn gốm thủ công: 150.000đ/người (Cách trung tâm Hà Nội khoảng 8,1 km (đường chim bay))
>2. Dệt lụa truyền thống: 175.000đ/người (Cách trung tâm Hà Nội khoảng 9,9 km (đường chim bay))
>3. Thêu họa tiết: 250.000đ/người (khoảng 17 km (ước tính theo huyện))
>
>Khoảng cách tính từ trung tâm Hà Nội.
>
>Tôi có thể tư vấn cụ thể hơn nếu bạn muốn chia sẻ số khách dự kiến.
>
>Đang lọc: bán kính 10 km.
>
>Đang áp dụng: bán kính 10 km.
- Delta validation:
```json
{
  "accepted": {
    "radius": {
      "action": "set",
      "value": 10.0001,
      "raw_span": "10.0001 km"
    }
  },
  "unsupported": {},
  "rejected": []
}
```

### BUG-24

- Câu gây lỗi nguyên văn từ anti report: Tiếng Anh thuần: "I want to visit pottery villages under 15km, 10 pax", "silk weaving, under 20km"
- Input gửi route: I want to visit pottery villages under 15km, 10 pax
- Dataset: seed
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Input tiếng Anh không được giải thích rõ hoặc vẫn trả kết quả.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 0,
  "relaxed_fields": [],
  "slots": {},
  "turn_history": []
}
```
- Text phản hồi: > Hiện chỉ hỗ trợ tiếng Việt, bạn vui lòng nhập bằng tiếng Việt.
- Delta validation:
```json
null
```

### BUG-25

- Câu gây lỗi nguyên văn từ anti report: "budget \$20 per person" (đô la)
- Input gửi route: budget \$20 per person
- Dataset: seed
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Ngoại tệ bị hiểu thành VND hoặc không có thông báo đơn vị không hỗ trợ.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 0,
  "relaxed_fields": [],
  "slots": {},
  "turn_history": []
}
```
- Text phản hồi: > Hiện chưa hỗ trợ đơn vị tiền này, vui lòng nhập bằng đồng.
- Delta validation:
```json
null
```

### BUG-26

- Câu gây lỗi nguyên văn từ anti report: "làng có homestay bể bơi điều hòa wifi"
- Input gửi route: làng có homestay bể bơi điều hòa wifi
- Dataset: seed
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Yêu cầu tiện ích trả kết quả/khẳng định tiện ích thay vì từ chối dữ liệu thiếu.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 200
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 0,
  "relaxed_fields": [],
  "slots": {},
  "turn_history": []
}
```
- Text phản hồi: > Xin lỗi, mình không thể trả lời yêu cầu này vì nằm ngoài phạm vi nền tảng. Bạn muốn mình gợi ý trải nghiệm văn hóa có trong dữ liệu hay tiếp tục ghép tour làng nghề theo số khách, ngày và ngân sách?
- Delta validation:
```json
null
```

### BUG-27

- Câu gây lỗi nguyên văn từ anti report: "đặt tour luôn cho tôi", "giảm giá 50%", "có phòng khách sạn không", "cho xem giá tháng sau"
- Input gửi route: đặt tour luôn cho tôi
- Dataset: seed
- Kết luận: còn tái hiện trên [MOCK]
- Tiêu chí: Mock route bỏ qua booking action; isBookingActionRequest không khớp “đặt tour luôn”, còn router không có luật cho “giảm giá 50%”/“cho xem giá tháng sau”. TẠM cho Giai đoạn B, không thêm luật ở lượt này.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 0,
  "relaxed_fields": [],
  "slots": {},
  "turn_history": []
}
```
- Text phản hồi: > Mình tìm được 5 trải nghiệm.
>
>1. Làm nón lá: 225.000đ/người (Cách trung tâm Hà Nội khoảng 24,4 km (đường chim bay))
>2. Thêu họa tiết: 250.000đ/người (khoảng 17 km (ước tính theo huyện))
>3. Dệt lụa truyền thống: 175.000đ/người (Cách trung tâm Hà Nội khoảng 9,9 km (đường chim bay))
>4. Nặn gốm thủ công: 150.000đ/người (Cách trung tâm Hà Nội khoảng 8,1 km (đường chim bay))
>5. Đan mây tre: 200.000đ/người (Cách trung tâm Hà Nội khoảng 23,7 km (đường chim bay))
>
>Khoảng cách tính từ trung tâm Hà Nội.
>
>Tôi có thể tư vấn cụ thể hơn nếu bạn muốn chia sẻ số khách dự kiến.
>
>Đang lọc: các tiêu chí đã nêu.
>
>Đang áp dụng: trống.
- Delta validation:
```json
{
  "accepted": {},
  "unsupported": {},
  "rejected": []
}
```

### BUG-28

- Câu gây lỗi nguyên văn từ anti report: "tọa độ GPS của Bát Tràng là bao nhiêu", "có bao nhiêu làng gốm ở Hà Nội"
- Input gửi route: tọa độ GPS của Bát Tràng là bao nhiêu
- Dataset: seed
- Kết luận: không tái hiện trên [MOCK]
- Tiêu chí: Câu hỏi thống kê/GPS bị trả danh sách matching.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 200
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 0,
  "relaxed_fields": [],
  "slots": {},
  "turn_history": []
}
```
- Text phản hồi: > Xin lỗi, mình không thể trả lời yêu cầu này vì nằm ngoài phạm vi nền tảng. Bạn muốn mình gợi ý trải nghiệm văn hóa có trong dữ liệu hay tiếp tục ghép tour làng nghề theo số khách, ngày và ngân sách?
- Delta validation:
```json
null
```

### BUG-29

- Câu gây lỗi nguyên văn từ anti report: Persona 6 transcript: "làng mây tre đan hoặc thêu tay, không quá 30km, 15-20 người, ngân sách tổng không quá 5 triệu"
- Input gửi route: làng mây tre đan hoặc thêu tay, không quá 30km, 15-20 người, ngân sách tổng không quá 5 triệu
- Dataset: seed
- Kết luận: không kết luận được từ lượt [MOCK]
- Tiêu chí: Replay dùng câu Persona 6 từ tests/harness/personas.test.ts và ép classifier trả null để đi nhánh fallback; delta vẫn do heuristic mock sinh, nên không kết luận về extraction của model thật.
- Giới hạn kết luận: chỉ quan sát một input trên route [MOCK]; không tái hiện không đồng nghĩa đã xác định commit sửa.
- HTTP: 201
- State:
```json
{
  "dismissed_questions": [],
  "exclusions": {
    "villages": [],
    "crafts": []
  },
  "turn_count": 1,
  "relaxed_fields": [],
  "slots": {
    "craft": {
      "value": "embroidery",
      "raw_span": "làng mây tre đan hoặc thêu tay, không quá 30km, 15-20 người, ngân sách tổng không quá 5 triệu",
      "created_turn": 1,
      "source_turn": 1,
      "source": "explicit"
    },
    "group_size": {
      "value": 20,
      "raw_span": "20 người",
      "created_turn": 1,
      "source_turn": 1,
      "source": "explicit"
    },
    "radius": {
      "value": 30,
      "raw_span": "30km",
      "created_turn": 1,
      "source_turn": 1,
      "source": "explicit"
    },
    "budget_per_person": {
      "value": 5000000,
      "raw_span": "5 triệu",
      "created_turn": 1,
      "source_turn": 1,
      "source": "explicit"
    }
  },
  "turn_history": [
    {
      "turn": 1,
      "slots": {
        "craft": {
          "value": "embroidery",
          "raw_span": "làng mây tre đan hoặc thêu tay, không quá 30km, 15-20 người, ngân sách tổng không quá 5 triệu",
          "created_turn": 1,
          "source_turn": 1,
          "source": "explicit"
        },
        "group_size": {
          "value": 20,
          "raw_span": "20 người",
          "created_turn": 1,
          "source_turn": 1,
          "source": "explicit"
        },
        "radius": {
          "value": 30,
          "raw_span": "30km",
          "created_turn": 1,
          "source_turn": 1,
          "source": "explicit"
        },
        "budget_per_person": {
          "value": 5000000,
          "raw_span": "5 triệu",
          "created_turn": 1,
          "source_turn": 1,
          "source": "explicit"
        }
      }
    }
  ],
  "craft": "embroidery",
  "craft_no_data": false,
  "group_size": 20,
  "radius_km": 30,
  "budget_per_person": 5000000
}
```
- Text phản hồi: > Mình tìm thấy 2 làng nghề phù hợp.
>Khoảng cách tính từ trung tâm Hà Nội.
>1. Làng thêu ren Quất Động (khoảng 17 km (ước tính theo huyện))
>2. Làng mây tre đan Phú Vinh (Cách trung tâm Hà Nội khoảng 23,7 km (đường chim bay))
>
>Đang lọc: thêu tay, bán kính 30 km, 20 khách, ngân sách 5.000.000đ.
>
>Đang áp dụng: thêu tay, bán kính 30 km, 20 khách, ngân sách 5.000.000đ.
- Delta validation:
```json
{
  "accepted": {
    "craft": {
      "action": "set",
      "value": "embroidery",
      "raw_span": "làng mây tre đan hoặc thêu tay, không quá 30km, 15-20 người, ngân sách tổng không quá 5 triệu"
    },
    "group_size": {
      "action": "set",
      "value": 20,
      "raw_span": "20 người"
    },
    "radius": {
      "action": "set",
      "value": 30,
      "raw_span": "30km"
    },
    "budget_per_person": {
      "action": "set",
      "value": 5000000,
      "raw_span": "5 triệu"
    }
  },
  "unsupported": {},
  "rejected": [
    {
      "slot": "budget_basis",
      "reason": "per_person_basis_not_stated"
    }
  ]
}
```


## Truy nguyên commit cho các lượt không tái hiện

- Chỉ được ghi “đã sửa bởi commit X” nếu có test đỏ trước và xanh sau commit. Chưa có bằng chứng cặp test này cho các mã bên dưới, nên tất cả đều không quy được.
- **BUG-03**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.
- **BUG-04**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.
- **BUG-05**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.
- **BUG-06**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.
- **BUG-07**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.
- **BUG-08**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.
- **BUG-10**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.
- **BUG-13**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.
- **BUG-14**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.
- **BUG-15**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.
- **BUG-18**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.
- **BUG-19**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.
- **BUG-20**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.
- **BUG-21**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.
- **BUG-22**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.
- **BUG-23**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.
- **BUG-24**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.
- **BUG-25**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.
- **BUG-26**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.
- **BUG-28**: không quy được; chưa có bằng chứng test đỏ trước và xanh sau commit.