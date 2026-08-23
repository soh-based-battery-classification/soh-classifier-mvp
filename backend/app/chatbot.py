"""CLOVA Studio(HyperCLOVA X) 챗봇 연동.

최종 등급이 산출된 후, 사용자가 고른 산업 분야 맥락에서 그 등급이 어떤 의미인지
대화형으로 설명해준다. 산업별 안내 문구를 정적으로 다 써두는 대신, 자유 질문에도
답할 수 있도록 CLOVA Studio Chat Completions API를 호출한다.
"""

from __future__ import annotations

import uuid

import requests
from fastapi import HTTPException

from .config import CLOVA_STUDIO_API_KEY, CLOVA_STUDIO_MODEL

CLOVA_STUDIO_URL = f"https://clovastudio.stream.ntruss.com/v1/chat-completions/{CLOVA_STUDIO_MODEL}"

INDUSTRIES: dict[str, str] = {
    "ess": "ESS(에너지 저장 시스템) 재사용 — 정적 설치 환경, 장기 사이클 수명과 안전성이 중요",
    "ev_remanufacture": "전기차 배터리 재제조 — 높은 출력/에너지 밀도, 엄격한 안전·인증 기준 요구",
    "small_appliance": "소형 가전/전동공구용 재사용 — 상대적으로 낮은 성능 요구, 비용 민감",
    "recycling": "재활용(소재 회수) — 재사용이 어려운 저등급 팩 대상, 니켈/코발트/리튬 회수",
}


def _build_system_prompt(industry_key: str, grade_context: str) -> str:
    industry_label = INDUSTRIES.get(industry_key, industry_key)
    return (
        "당신은 폐배터리 등급 분류 결과를 산업 현장 담당자에게 설명해주는 전문 어드바이저입니다.\n"
        f"사용자가 선택한 활용 분야: {industry_label}\n"
        f"분석 대상 배터리 팩 정보:\n{grade_context}\n\n"
        "이 정보를 바탕으로 사용자의 질문에 대해 해당 분야 맥락에 맞춰 등급이 의미하는 바, "
        "적합성, 추가로 검토해야 할 사항을 한국어로 친절하고 구체적으로 설명하세요. "
        "모르는 정량적 수치나 규정은 추측해서 단정하지 말고, 일반적인 가이드라인 수준으로만 "
        "답변하며 실제 결정 전 전문가 검토가 필요하다는 점을 알려주세요."
    )


def ask_clova(industry_key: str, grade_context: str, messages: list[dict]) -> str:
    """대화 이력(messages)에 시스템 프롬프트를 붙여 CLOVA Studio에 질의하고 답변 텍스트를 반환한다."""
    if not CLOVA_STUDIO_API_KEY:
        raise HTTPException(status_code=503, detail="CLOVA_STUDIO_API_KEY가 설정되지 않았습니다.")

    payload_messages = [
        {"role": "system", "content": _build_system_prompt(industry_key, grade_context)},
        *messages,
    ]

    try:
        resp = requests.post(
            CLOVA_STUDIO_URL,
            headers={
                "Authorization": f"Bearer {CLOVA_STUDIO_API_KEY}",
                "X-NCP-CLOVASTUDIO-REQUEST-ID": str(uuid.uuid4()),
                "Content-Type": "application/json",
            },
            json={
                "messages": payload_messages,
                "temperature": 0.5,
                "topP": 0.8,
                "topK": 0,
                "maxTokens": 512,
                "repeatPenalty": 5.0,
                "includeAiFilters": True,
            },
            timeout=30,
        )
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"CLOVA Studio 호출 실패: {e}")

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502, detail=f"CLOVA Studio 오류 ({resp.status_code}): {resp.text[:300]}"
        )

    data = resp.json()
    try:
        return data["result"]["message"]["content"]
    except (KeyError, TypeError):
        raise HTTPException(status_code=502, detail=f"CLOVA Studio 응답 형식 오류: {data}")
