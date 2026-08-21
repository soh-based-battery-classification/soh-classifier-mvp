"""
simulate.py - 배터리 재활용 판정 시스템 전체 흐름을 한 번에 실행

사용법:
    1) 먼저 다른 터미널에서 서버를 켜둔 상태여야 합니다:
       uvicorn app.main:app --reload

    2) 이 스크립트를 그 상태에서 실행:
       python simulate.py
       (사진도 같이 테스트하려면: python simulate.py 사진경로.jpg)

무엇을 하는지:
    1. 배터리팩 하나 생성
    2. 사이클 로그 20개 업로드 (SOH가 서서히 떨어지는 가상 데이터)
    3. SOH 예측 실행
    4. (사진을 인자로 줬으면) 그 사진 업로드해서 YOLO 결함 탐지
    5. 최종 통합판정 결과 출력
"""

import sys
import requests

BASE_URL = "http://127.0.0.1:8000"


def check_server():
    try:
        r = requests.get(f"{BASE_URL}/api/packs/_model/status", timeout=5)
        r.raise_for_status()
        print(f"[OK] SOH 모델 상태: {r.json()}")
    except Exception as e:
        print(f"[에러] 서버에 연결할 수 없습니다: {e}")
        print(f"먼저 다른 터미널에서 'uvicorn app.main:app --reload' 를 실행하고,")
        print(f"완전히 뜰 때까지(최대 30초 정도) 기다린 후 다시 시도하세요.")
        sys.exit(1)

    try:
        r = requests.get(f"{BASE_URL}/api/packs/_vision_model/status", timeout=5)
        print(f"[OK] YOLO 모델 상태: {r.json()}")
    except Exception as e:
        print(f"[경고] 비전 모델 상태 확인 실패: {e}")


def create_pack(name="시뮬레이션팩", vehicle_type="nissan_leaf"):
    r = requests.post(f"{BASE_URL}/api/packs", json={"name": name, "vehicle_type": vehicle_type})
    r.raise_for_status()
    pack = r.json()
    print(f"\n[1단계] 팩 생성 완료: id={pack['id']}")
    return pack["id"]


def upload_cycles(pack_id, n=20, start_soh=95.0, decay=0.4):
    cycles = [{"cycle_index": i, "soh_value": round(start_soh - i * decay, 2)} for i in range(n)]
    r = requests.post(f"{BASE_URL}/api/packs/{pack_id}/cycles/bulk", json={"cycles": cycles})
    r.raise_for_status()
    print(f"[2단계] 사이클 로그 {n}개 업로드 완료 (SOH {start_soh}% -> {cycles[-1]['soh_value']}%)")


def predict_soh(pack_id):
    r = requests.post(f"{BASE_URL}/api/packs/{pack_id}/soh/predict")
    r.raise_for_status()
    result = r.json()
    print(f"[3단계] SOH 예측: {result['predicted_soh']:.2f}% (mode={result['mode']})")
    print(f"        임시 판정(비전 결과 반영 전): {result['pack_final_state']}")
    return result


def upload_photo(pack_id, image_path):
    with open(image_path, "rb") as f:
        r = requests.post(f"{BASE_URL}/api/packs/{pack_id}/photos",
                           files={"file": (image_path, f, "image/jpeg")})
    r.raise_for_status()
    result = r.json()
    print(f"\n[4단계] 사진 업로드 및 YOLO 탐지 완료")
    print(f"        vision_mode: {result['vision_mode']}")
    print(f"        visual_severity: {result['visual_severity']}")
    print(f"        탐지된 결함 개수: {result['detections_count']}")
    return result


def get_final_state(pack_id):
    r = requests.get(f"{BASE_URL}/api/packs/{pack_id}")
    r.raise_for_status()
    pack = r.json()
    print(f"\n{'='*50}")
    print(f"최종 통합 판정 결과")
    print(f"{'='*50}")
    fs = pack["final_state"]
    if fs:
        print(f"  SOH:        {fs['soh_value']}")
        print(f"  외관 등급:   {fs['visual_severity']}")
        print(f"  최종 결정:   {fs['final_decision']}")
        print(f"  최종 등급:   {fs['final_grade']}")
        print(f"  판정 사유:   {fs['reasoning']}")
    else:
        print("  아직 판정 데이터 없음")


if __name__ == "__main__":
    print("=" * 50)
    print("배터리 재활용 판정 시스템 시뮬레이션 시작")
    print("=" * 50)

    check_server()
    pack_id = create_pack()
    upload_cycles(pack_id)
    predict_soh(pack_id)

    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        upload_photo(pack_id, image_path)
    else:
        print("\n[4단계 건너뜀] 사진 경로가 인자로 안 주어져서 비전 판정은 스킵합니다.")
        print("사진까지 테스트하려면: python simulate.py 사진경로.jpg")

    get_final_state(pack_id)
