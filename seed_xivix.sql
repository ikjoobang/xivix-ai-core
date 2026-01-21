-- XIVIX AI Core V1.0 - Seed Data for Production

-- Insert default admin user
INSERT OR IGNORE INTO xivix_users (email, name, password_hash, role, api_key) VALUES 
  ('admin@xivix.kr', 'XIVIX 관리자', 'hashed_password_here', 'admin', 'xvx_admin_key_001');

-- Insert sample owner user
INSERT OR IGNORE INTO xivix_users (email, name, phone, password_hash, role) VALUES 
  ('owner@skincare.kr', '김대표', '010-1234-5678', 'hashed_password_here', 'owner');

-- Insert sample store (피부 관리 샵)
INSERT OR IGNORE INTO xivix_stores (
  user_id, 
  store_name, 
  business_type, 
  address, 
  phone, 
  operating_hours, 
  menu_data, 
  ai_persona, 
  ai_tone,
  naver_talktalk_id,
  naver_reservation_id
) VALUES (
  1,
  '뷰티플 스킨케어',
  '피부관리',
  '서울시 강남구 테헤란로 123',
  '02-1234-5678',
  '10:00-21:00 (월-토), 10:00-18:00 (일)',
  '[
    {"name": "기초 피부관리", "price": 80000, "duration": 60, "description": "딥클렌징 + 수분관리"},
    {"name": "프리미엄 케어", "price": 150000, "duration": 90, "description": "기초관리 + 리프팅 마사지"},
    {"name": "스페셜 트리트먼트", "price": 200000, "duration": 120, "description": "전체 코스 + 특수 앰플 관리"},
    {"name": "여드름 집중 케어", "price": 100000, "duration": 60, "description": "압출 + 진정 관리"},
    {"name": "안티에이징 케어", "price": 180000, "duration": 90, "description": "탄력 + 주름 개선 집중 관리"}
  ]',
  '당신은 뷰티플 스킨케어의 전문 상담사입니다. 10년 경력의 피부관리 전문가로서 고객의 피부 고민을 정확히 파악하고 최적의 서비스를 추천합니다.',
  '전문적이면서도 따뜻한 말투를 사용합니다. 고객의 고민에 공감하며, 신뢰감 있는 조언을 제공합니다.',
  'talktalk_beauty_001',
  'reservation_beauty_001'
);

-- Insert sample conversation logs
INSERT OR IGNORE INTO xivix_conversation_logs (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation) VALUES 
  (1, 'customer_001', 'text', '피부 관리 받고 싶은데 예약 가능한 시간 있나요?', '안녕하세요. 오늘 오후 3시, 5시 슬롯이 가능합니다. 어떤 시간대가 편하실까요? 원하시는 관리 종류도 말씀해주시면 더 자세히 안내드리겠습니다.', 420, 1),
  (1, 'customer_002', 'text', '가격표 좀 알려주세요', '뷰티플 스킨케어 가격 안내드립니다. 기초 피부관리: 80,000원 (60분), 프리미엄 케어: 150,000원 (90분), 스페셜 트리트먼트: 200,000원 (120분). 첫 방문 고객님께는 10% 할인 혜택도 있습니다. 예약 도와드릴까요?', 380, 0),
  (1, 'customer_003', 'mixed', '제 피부 상태 좀 봐주세요', '이미지를 분석해 보았습니다. 볼 쪽에 건조함이 보이고, T존 부위는 약간의 피지 분비가 있는 복합성 피부로 보입니다. 기초 피부관리로 수분 밸런스를 맞추시는 걸 추천드립니다. 방문 예약 도와드릴까요?', 650, 1);

-- Insert sample reservations
INSERT OR IGNORE INTO xivix_reservations (store_id, customer_id, customer_name, service_name, reservation_date, reservation_time, status, created_by) VALUES 
  (1, 'customer_001', '이영희', '기초 피부관리', DATE('now'), '14:00', 'confirmed', 'ai'),
  (1, 'customer_003', '박지민', '기초 피부관리', DATE('now'), '16:30', 'pending', 'ai'),
  (1, 'customer_004', '최수연', '스페셜 트리트먼트', DATE('now'), '18:00', 'confirmed', 'ai'),
  (1, 'customer_005', '김민지', '프리미엄 케어', DATE('now', '+1 day'), '11:00', 'confirmed', 'manual');
