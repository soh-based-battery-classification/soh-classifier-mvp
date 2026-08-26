# soh-classifier-mvp

배터리 SOH(State of Health) 예측 + 외관 결함(YOLO) 탐지를 합쳐서 폐배터리 팩을
A~D 등급으로 자동 분류하는 서비스. 아키텍처 자세한 건 `docs/architecture.md`
참고 (원래 별도 리서치 저장소에 있던 문서 기반으로 작성됨).

## 구조

```
soh-classifier-mvp/
├── backend/            # FastAPI + SQLAlchemy
│   └── app/
│       ├── main.py             # FastAPI 앱 진입점
│       ├── models_db.py        # DB 모델 (battery_pack, soh_cycle_log, ...)
│       ├── schemas.py          # Pydantic 요청/응답 스키마
│       ├── grading.py          # SOH(%) -> 등급(A/B/C/D)
│       ├── visual_grading.py   # YOLO 결함탐지 결과 -> 등급 오버라이드
│       ├── chatbot.py          # CLOVA Studio(HyperCLOVA X) 등급 설명 챗봇
│       ├── ml/                 # NLinear(SOH) + YOLO(외관 결함) 추론 래퍼
│       └── routers/            # packs / soh / detection / chatbot API
└── frontend/           # React + Vite + TypeScript
    └── src/
        ├── api.ts               # 백엔드 API 클라이언트
        └── pages/                # 홈 / 대시보드 / 팩 등록 / 팩 상세 / 결과
```

## 로컬에서 돌려보기 (Docker 없이, 제일 빠름)

### 1. 백엔드

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

`DATABASE_URL` 안 잡아주면 그냥 `backend/soh.db`(SQLite)가 자동으로 생김. MySQL
쓰고 싶으면 `.env.example`을 `.env`로 복사해서 `DATABASE_URL`만 채우면 됨.

떴으면 http://localhost:8000/docs 에서 API 바로 찔러볼 수 있음.

### 2. 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

http://localhost:5173 에서 확인. 백엔드 주소 바꾸려면 `.env.example` → `.env`
복사해서 `VITE_API_BASE_URL` 수정.

## Docker Compose로 풀스택 실행 (MySQL 포함, 배포 전 통합 테스트용)

```bash
docker compose up --build
```

- backend: http://localhost:8000
- frontend: http://localhost:5173
- MySQL: localhost:3306 (soh_db / soh_user, 비밀번호는 `.env`의 `MYSQL_PASSWORD`)

챗봇 기능 쓰려면 `CLOVA_STUDIO_API_KEY` / `CLOVA_STUDIO_MODEL`도 `.env`에 넣어주면
backend 컨테이너로 그대로 전달됨. 안 넣으면 챗봇 API만 조용히 비활성화됨.

## 지금 뭐가 되고 뭐가 안 되나

- `battery_pack`, `soh_cycle_log`, `soh_prediction`, `pack_final_state`,
  `detection_result`, `detection_object` 테이블 (architecture 문서 4장 스키마
  그대로).
- **SOH 예측**은 NLinear 모델로 함. B0005/B0006/B0007로 학습하고 한 번도 안 본
  B0018로 테스트까지 끝낸 상태고, 학습된 가중치가 이미
  `backend/app/ml/weights/model.pt`에 들어있어서 지금 바로 실제 모델로 예측
  나감(`GET /api/packs/_model/status` 찍어보면 `mode: "trained_model"`).
  가중치가 없는 채로 띄우면 최근 사이클 선형 추세를 그냥 연장하는 naive
  fallback으로 알아서 넘어감.
- **외관 결함(YOLO) 탐지**는 `POST /api/packs/{pack_id}/detect`에 이미지 올리면
  YOLOv8n이 swelling(스웰링)/leak(누액)/corrosion(부식) 세 가지를 잡고,
  `visual_grading.estimate_severity_from_detections()`가 그걸 심각도(CRITICAL/
  MODERATE/OK)로 바꿔서 등급 오버라이드에 바로 반영함
  (`GET /api/packs/_vision_model/status`로 모델 로드됐는지 확인 가능).
  `PUT /api/packs/{pack_id}/visual-severity`로 심각도 값을 손으로 넣는 경로도
  따로 남겨둠 — 오버라이드 로직만 떼서 테스트하고 싶을 때 씀.
- **등급 설명 챗봇**은 최종 등급 나온 다음에 `POST /api/packs/{pack_id}/chat`으로
  CLOVA Studio(HyperCLOVA X) 불러서, 고른 산업(ESS 재사용/전기차 재제조/소형가전
  재사용/재활용) 맥락에 맞춰 등급이 무슨 의미인지 대화식으로 설명해줌.
- 팩/사이클 로그 삭제(`DELETE /api/packs/{pack_id}`,
  `DELETE /api/packs/{pack_id}/cycles/{id}`)랑 사이클 로그 CSV 일괄 업로드
  (`POST /api/packs/{pack_id}/cycles/bulk`)도 됨.

### SOH 예측 학습 결과 (B0005+B0006+B0007 학습 → B0018 테스트)

| 지표 | 값 |
|---|---|
| RMSE | 1.17%p |
| MAE | 0.74%p |
| MAPE | 0.97% |
| 등급(A/B/C/D) accuracy | 94.8% |
| 등급 macro-F1 | 0.71 |

macro-F1이 accuracy보다 낮게 나온 건 모델이 못 맞혀서가 아니라, B0018 테스트
구간에 A등급(SOH≥90%) 사이클이 아예 하나도 없기 때문. 없는 클래스는 F1이 그냥
0으로 잡혀서 평균을 끌어내림. 혼동행렬 까보면 실제 오분류는 B/C, C/D 경계에서
딱 2건씩뿐이라(`backend/training/outputs/nlinear_b5b6b7_test_b18_v1/metrics.json`
참고) 셀 간 일반화는 괜찮은 편.

### YOLO 결함탐지 모델

지금 붙어있는 가중치(`backend/app/ml/weights/yolo_best.pt`, model_version은
`yolov8n_ev_battery_defect_v5_noleak`)는 swelling/leak/corrosion 세 클래스로
학습됐고 `val_map50` 0.981 나왔음(`yolo_model_meta.json` 참고). 다만 학습
데이터가 실제 배터리 팩 사진 25장에다 결함 합성 + 도메인 랜덤화 돌린 725장짜리
synthetic 이미지가 대부분이라, 진짜 실사진에서도 이 정도 성능이 나올지는 나중에
더 검증이 필요함. 이 가중치를 학습한 코드는 이 저장소에 없고,
`backend/training/train_yolo.py`랑 `download_vision_dataset.py`는 그 전에
시도했던 부품탐지(Screw/Nut/Bolt 등) 프로토타입(v1)용이라 지금은 안 씀 —
그냥 기록으로 남겨둔 것.

### SOH 재학습하려면

```bash
cd backend
pip install -r requirements.txt -r training/requirements.txt
python -m training.train_nlinear
```

`backend/training/data/raw/`에 `B0005.mat`, `B0006.mat`, `B0007.mat`,
`B0018.mat`이 있어야 함(용량 커서 git엔 안 올림 — NASA PCoE에서 다시 받거나
직접 넣어주면 됨). 학습 끝나면 결과가
`backend/training/outputs/<model_version>/`에 저장되고, 서비스가 실제로 읽는
`backend/app/ml/weights/`에도 자동으로 배포됨.

## 남은 일

1. 네이버클라우드 플랫폼(NCP) 배포 — `DATABASE_URL`을 Cloud DB for MySQL로,
   `CORS_ORIGINS`을 실제 프론트 도메인으로 바꿔주면 됨
2. YOLO 결함탐지 모델 실사진으로 재검증/재학습 (지금은 합성 데이터가 대부분)
