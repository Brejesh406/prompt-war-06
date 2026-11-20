import { useState, type RefObject } from "react";
import { ExternalLink, Send } from "lucide-react";
import type {
  ChatMessage,
  CommunityPlaybook,
  GroundingSource,
  HouseholdProfile,
} from "../types/air";
import { ResilientImage } from "./ResilientImage";

interface CommunityAndAdvisorProps {
  playbook: CommunityPlaybook | null;
  groundingSources: GroundingSource[];
  profile: HouseholdProfile;
  advisorInputRef: RefObject<HTMLInputElement | null>;
}

const STARTER_QUESTIONS = [
  "AQI is over 200 today — how should we handle school drop-offs?",
  "How do I build a quiet MERV-13 box fan filter on a budget?",
  "What can our neighborhood association do to reduce wood smoke?",
];

export function CommunityAndAdvisor({
  playbook,
  groundingSources,
  profile,
  advisorInputRef,
}: CommunityAndAdvisorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (textOverride?: string) => {
    const content = (textOverride ?? input).trim();
    if (!content || sending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (!textOverride) setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/advisor-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          profile,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to reach ClearHearth advisor.");
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        sources: data.sources ?? [],
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages([...nextMessages, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Advisor request failed.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      id="community-advisor"
      aria-labelledby="community-heading"
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">
            04. Collective Action &amp; Real-Time Guidance
          </p>
          <h2
            id="community-heading"
            className="text-3xl font-semibold tracking-tight text-slate-900"
          >
            Community coordination &amp; GenAI advisor
          </h2>
        </div>
        <p className="text-sm text-slate-600 max-w-xl">
          Coordinate clean-air commutes with neighbors and ask specific questions grounded in local winter conditions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Community Playbook & Grounded Sources */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="h-56 relative">
            <ResilientImage
              src="/src/assets/images/community_winter_transit_1795158666121.jpg"
              alt="Families walking alongside a cargo e-bike and clean electric city tram during winter mist"
              fallbackTitle="Community Clean Transit & Walking School Bus"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
            {playbook ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Neighborhood Playbook · {profile.location}
                  </p>
                  <h3 className="text-xl font-semibold text-slate-900 mt-1">
                    {playbook.title}
                  </h3>
                </div>

                <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                  <div>
                    <span className="font-semibold text-slate-900">Street &amp; Block Action: </span>
                    {playbook.neighborhoodAction}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">School &amp; Transit Coordination: </span>
                    {playbook.schoolOrTransitTip}
                  </div>
                  <div className="pt-3 border-t border-slate-100 text-emerald-900">
                    <span className="font-semibold">Collective Impact: </span>
                    {playbook.collectiveImpactSummary}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-900">
                  Community smog coordination
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Generate your tailored plan above to unlock neighborhood anti-idling, shared clean-air school routes, and block-level heating swaps for {profile.location}.
                </p>
              </div>
            )}

            {groundingSources.length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Grounded Local References
                </p>
                <ul className="space-y-1.5">
                  {groundingSources.map((src) => (
                    <li key={src.uri}>
                      <a
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-800 hover:underline max-w-full truncate"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{src.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right: Interactive GenAI Advisor Chat */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl flex flex-col min-h-[520px]">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                ClearHearth Family &amp; Community Advisor
              </h3>
              <p className="text-xs text-slate-500">
                Context: {profile.location} · {profile.housingType} · {profile.heatingSource}
              </p>
            </div>
          </div>

          <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[420px]">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Ask anything about navigating severe winter smog—from timing window ventilation and DIY HEPA box fans to protecting children with asthma or organizing school clean-air zones.
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500">
                    Suggested questions
                  </p>
                  <div className="flex flex-col items-start gap-2">
                    {STARTER_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => sendMessage(q)}
                        className="px-3.5 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div className="text-xs text-slate-400 mb-1 font-mono tabular-nums">
                    {msg.role === "user" ? "You" : "ClearHearth"} · {msg.timestamp}
                  </div>
                  <div
                    className={`max-w-[90%] px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === "user"
                        ? "bg-emerald-800 text-white"
                        : "bg-slate-50 border border-slate-200 text-slate-800"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                      {msg.sources.map((src) => (
                        <a
                          key={src.uri}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-800 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{src.title}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}

            {sending && (
              <div className="text-xs text-slate-500 font-medium">
                Checking local air quality context and preparing guidance...
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg"
              >
                {error}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-4 border-t border-slate-200 flex gap-2.5"
          >
            <input
              ref={advisorInputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about ${profile.location} smog, filtration, or routines...`}
              aria-label="Ask ClearHearth advisor"
              className="flex-1 min-w-0 min-h-[44px] px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
