# soh-classifier-mvp

배터리 SOH(State of Health) 예측 + 외관 결함(YOLO) 탐지를 결합해 폐배터리 팩을
A~D 등급으로 자동 분류하는 서비스. 아키텍처 상세는 `docs/architecture.md` 참고
(별도 리서치 저장소의 architecture 문서 기반).

## 구조

```
soh-classifier-mvp/
├── backend/            # FastAPI + SQLAlchemy
│   └── app/
│       ├── main.py             # FastAPI 앱 진입점
│       ├── models_db.py        # DB 모델 (battery_pack, soh_cycle_log, ...)
│       ├── schemas.py          # Pydantic 요청/응답 스키마
│       ├── grading.py          # SOH(%) -> 등급(A/B/C/D)
│       ├── visual_grading.py   # YOLO 결함탐지 결과 -> 등급 오버라이드 매트릭스
│       ├── chatbot.py          # CLOVA Studio(HyperCLOVA X) 등급 설명 챗봇 연동
│       ├── ml/                 # NLinear(SOH) + YOLO(외관 결함) 추론 래퍼
│       └── routers/            # packs / soh / detection / chatbot API
└── frontend/           # React + Vite + TypeScript
    └── src/
        ├── api.ts               # 백엔드 API 클라이언트
        └── pages/                # 홈 / 대시보드 / 팩 등록 / 팩 상세 / 결과
```

## 로컬 실행 (Docker 없이, 가장 빠른 방법)

### 1. 백엔드

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

기본 설정은 `DATABASE_URL` 없이 실행하면 `backend/soh.db` (SQLite)를 자동 생성합니다.
MySQL을 쓰려면 `.env.example`을 `.env`로 복사해 `DATABASE_URL`을 채우세요.

서버가 뜨면 http://localhost:8000/docs 에서 API를 바로 테스트할 수 있습니다.

### 2. 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

http://localhost:5173 에서 확인. 백엔드 주소를 바꾸려면 `.env.example`을 `.env`로
복사해 `VITE_API_BASE_URL`을 수정하세요.

## Docker Compose로 풀스택 실행 (MySQL 포함, 배포 전 통합 테스트용)

```bash
docker compose up --build
```

- backend: http://localhost:8000
- frontend: http://localhost:5173
- MySQL: localhost:3306 (soh_db / soh_user, 비밀번호는 `.env`의 `MYSQL_PASSWORD`)

`CLOVA_STUDIO_API_KEY` / `CLOVA_STUDIO_MODEL`도 `.env`에서 backend 컨테이너로
전달됩니다 (등급 설명 챗봇 기능에 사용, 미설정 시 챗봇 API만 비활성).

## 현재 구현 범위

- `battery_pack`, `soh_cycle_log`, `soh_prediction`, `pack_final_state`,
  `detection_result`, `detection_object` 테이블 (architecture 문서 4장 스키마 그대로)
- **SOH 예측**: NLinear 모델. B0005/B0006/B0007로 학습, 학습에 전혀 쓰지 않은
  B0018로 테스트까지 완료된 상태이며, 학습된 가중치가
  `backend/app/ml/weights/model.pt`에 이미 배포되어 있어 지금 바로 실제 모델로
  예측이 동작합니다 (`GET /api/packs/_model/status`에서 `mode: "trained_model"`
  확인 가능). 가중치가 없는 상태로 서비스를 띄우면 최근 사이클의 선형 추세를
  연장하는 naive fallback으로 자동 전환됩니다.
- **외관 결함(YOLO) 탐지**: `POST /api/packs/{pack_id}/detect`로 이미지를 올리면
  YOLOv8n 모델이 swelling(스웰링)/leak(누액)/corrosion(부식) 3종 결함을 탐지하고,
  결과를 `visual_grading.estimate_severity_from_detections()`가 심각도(CRITICAL/
  MODERATE/OK)로 변환해 등급 오버라이드에 자동 반영합니다
  (`GET /api/packs/_vision_model/status`에서 모델 로드 여부 확인 가능).
  `PUT /api/packs/{pack_id}/visual-severity`로 심각도를 직접 지정해 오버라이드
  로직만 따로 테스트하는 경로도 별도로 지원합니다.
- **등급 설명 챗봇**: 최종 등급 산출 후 `POST /api/packs/{pack_id}/chat`으로
  CLOVA Studio(HyperCLOVA X)를 호출해, 사용자가 고른 산업 분야(ESS 재사용/전기차
  재제조/소형가전 재사용/재활용) 맥락에서 등급 의미를 대화형으로 설명합니다.
- 팩/사이클 로그 삭제(`DELETE /api/packs/{pack_id}`, `DELETE /api/packs/{pack_id}/cycles/{id}`)
  및 사이클 로그 CSV 일괄 업로드(`POST /api/packs/{pack_id}/cycles/bulk`) 지원.

### SOH 예측 학습 결과 (B0005+B0006+B0007 학습 → B0018 테스트)

| 지표 | 값 |
|---|---|
| RMSE | 1.17%p |
| MAE | 0.74%p |
| MAPE | 0.97% |
| 등급(A/B/C/D) accuracy | 94.8% |
| 등급 macro-F1 | 0.71 |

macro-F1이 accuracy보다 낮은 건 모델이 못 맞혀서가 아니라 **B0018 테스트 구간에
A등급(SOH≥90%) 사이클이 하나도 없어서** — 존재하지 않는 클래스의 F1이 0으로
집계되며 평균을 끌어내립니다. 실제 오분류는 B/C 경계, C/D 경계에서 각 2건씩뿐이라
(혼동행렬은 `backend/training/outputs/nlinear_b5b6b7_test_b18_v1/metrics.json`
참고) 셀 간 일반화 성능은 양호한 편입니다.

### YOLO 결함탐지 모델

현재 배포된 가중치(`backend/app/ml/weights/yolo_best.pt`, model_version
`yolov8n_ev_battery_defect_v5_noleak`)는 swelling/leak/corrosion 3클래스를
탐지하도록 학습됐고, `val_map50` 0.981을 기록했습니다(`yolo_model_meta.json`
참고). 다만 학습 데이터가 실제 배터리 팩 사진 25장을 기반으로 결함 합성 +
도메인 랜덤화한 725장의 합성(synthetic) 이미지 위주라, 실사진에 대한 일반화는
서비스 확장 시 재검증이 필요합니다. 이 모델을 학습한 스크립트는 이 저장소에
포함되어 있지 않으며, `backend/training/train_yolo.py` +
`download_vision_dataset.py`는 그 이전에 시도했던 부품탐지(Screw/Nut/Bolt 등)
프로토타입(v1)용 스크립트로 지금은 사용하지 않습니다(참고용으로만 남아 있음).

### SOH 재학습 방법

```bash
cd backend
pip install -r requirements.txt -r training/requirements.txt
python -m training.train_nlinear
```

`backend/training/data/raw/`에 `B0005.mat`, `B0006.mat`, `B0007.mat`, `B0018.mat`이
있어야 합니다(용량이 커서 git에는 포함하지 않았습니다 — NASA PCoE에서 재다운로드하거나
직접 업로드해서 채워주세요). 학습이 끝나면 결과가
`backend/training/outputs/<model_version>/`에 저장되고, 동시에 서비스가 실제로 읽는
`backend/app/ml/weights/`에도 자동 배포됩니다.

## 다음 단계

1. 네이버클라우드 플랫폼(NCP) 배포 — `DATABASE_URL`을 Cloud DB for MySQL 접속
   정보로, `CORS_ORIGINS`을 실제 프론트 도메인으로 교체
2. YOLO 결함탐지 모델을 실사진 데이터로 재검증/재학습 (현재는 합성 데이터 위주 학습)
