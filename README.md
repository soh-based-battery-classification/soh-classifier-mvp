# soh-classifier-mvp

배터리 SOH 기반 폐배터리 등급 분류 서비스. Phase 1(SOH 예측 API + 등급 오버라이드
구조)의 기본 프론트/백엔드 스캐폴드. 아키텍처 상세는 `docs/architecture.md` 참고
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
│       ├── visual_grading.py   # 등급 오버라이드 매트릭스 (4-1장)
│       ├── ml/                 # NLinear 모델 + 추론 래퍼
│       └── routers/            # packs / soh / detection API
└── frontend/           # React + Vite + TypeScript
    └── src/
        ├── api.ts               # 백엔드 API 클라이언트
        └── pages/                # 대시보드 / 팩 등록 / 팩 상세
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
- MySQL: localhost:3306 (soh_db / soh_user / soh_pass)

## 현재 구현 범위 (Phase 1)

- `battery_pack`, `soh_cycle_log`, `soh_prediction`, `pack_final_state`,
  `detection_result`, `detection_object` 테이블 (architecture 문서 4장 스키마 그대로)
- SOH 예측: NLinear 모델. **B0005/B0006/B0007로 학습, B0018(학습에 전혀 안 쓴 셀)로
  테스트까지 완료된 상태**이며, 학습된 가중치가 `backend/app/ml/weights/model.pt`에
  이미 배포되어 있어 지금 바로 실제 모델로 예측이 동작합니다
  (`GET /api/packs/_model/status`에서 `mode: "trained_model"` 확인 가능).
  가중치가 없는 상태로 서비스를 띄우면 최근 사이클의 선형 추세를 연장하는 naive
  fallback으로 자동 전환됩니다.
- 등급 오버라이드(4-1장): `PUT /api/packs/{pack_id}/visual-severity`로 비전 브랜치
  결과를 임시 지정해 최종 등급 산출 로직을 테스트 가능. YOLO 객체탐지 서비스가
  붙기 전(Phase 2 이전) 임시 스텁.
- 팩/사이클 로그 삭제(`DELETE /api/packs/{pack_id}`, `DELETE /api/packs/{pack_id}/cycles/{id}`)
  및 사이클 로그 CSV 일괄 업로드(`POST /api/packs/{pack_id}/cycles/bulk`) 지원.

### 학습 결과 (B0005+B0006+B0007 학습 → B0018 테스트)

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

### 재학습 방법

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


