import { useEffect, useState } from "react";
import { api } from "../api";
import type { ChatMessage, Industry } from "../types";

export default function GradeChatbot({ packId }: { packId: string }) {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [industry, setIndustry] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listIndustries()
      .then((list) => {
        setIndustries(list);
        if (list.length > 0) setIndustry(list[0].key);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  function handleIndustryChange(key: string) {
    setIndustry(key);
    setMessages([]);
    setError(null);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || !industry || sending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setSending(true);
    try {
      const reply = await api.chat(packId, industry, nextMessages);
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card">
      <h2>등급 설명 챗봇</h2>
      <p className="hint-text">활용하려는 산업 분야를 선택하고, 이 팩의 등급이 어떤 의미인지 물어보세요.</p>

      <label className="field" style={{ marginTop: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        산업 분야
        <select value={industry} onChange={(e) => handleIndustryChange(e.target.value)}>
          {industries.map((i) => (
            <option key={i.key} value={i.key}>
              {i.label}
            </option>
          ))}
        </select>
      </label>

      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="hint-text">아직 대화가 없습니다. 예: "이 등급이면 재사용해도 안전한가요?"</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble chat-bubble--${m.role}`}>
            {m.content}
          </div>
        ))}
        {sending && <div className="chat-bubble chat-bubble--assistant chat-bubble--pending">답변 작성 중...</div>}
      </div>

      {error && <p className="alert-error">⚠️ {error}</p>}

      <div className="inline-form" style={{ marginTop: "var(--space-4)" }}>
        <input
          type="text"
          value={input}
          placeholder="궁금한 점을 입력하세요"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          disabled={sending || !industry}
          style={{ flex: 1 }}
        />
        <button
          className="btn-primary"
          onClick={handleSend}
          disabled={sending || !input.trim() || !industry}
        >
          {sending ? "전송 중..." : "전송"}
        </button>
      </div>
    </div>
  );
}
