# soh-classifier-mvp

배터리 SOH(State of Health) 예측 + 외관 결함(YOLO) 탐지를 합쳐서 폐배터리 팩을
A~D 등급으로 자동 분류하는 서비스. 아키텍처 자세한 건 `docs/architecture.md`
참고 (원래 별도 리서치 저장소에 있던 문서 기반으로 작성됨).

## 서비스 소개
<img width="458" height="311" alt="image" src="https://github.com/user-attachments/assets/9cadee3a-117a-45d5-9901-47920243d72d" />

배터리의 전기적 성능과 외형 안전성을 AI로 분류하여 A~D 등급으로 평가하고, 재사용·재제조·재활용 등 후속 활용 방향을 지원하는 웹 기반 서비스

```

## 로컬에서 돌려보기 (Docker 없이)

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

