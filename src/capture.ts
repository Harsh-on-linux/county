import { duplicate, parseSms, type Data, type Suggestion } from "./domain";

export type BankMessage = {
  id: string;
  body: string;
  timestamp: number;
  sender?: string;
};

export function suggestionStatus(s: Suggestion, entries: Data["entries"]) {
  // Legacy builds marked both saved and discarded messages as dismissed.
  if (entries.some((e) => e.smsId === s.id))
    return s.status === "matched" ? "matched" : "saved";
  if (s.status) return s.status;
  return s.dismissed ? "discarded" : "unlabelled";
}

export function ingestMessages(data: Data, messages: BankMessage[]) {
  const seen = new Set([...data.seenSms, ...data.suggestions.map((s) => s.id)]);
  const references = new Set(
    data.suggestions
      .filter((s) => s.reference)
      .map((s) => `${s.type}:${s.reference!.toUpperCase()}`),
  );
  const added: Suggestion[] = [];
  for (const message of messages) {
    if (seen.has(message.id)) continue;
    seen.add(message.id);
    const parsed = parseSms(
      message.id,
      message.body,
      message.timestamp,
      message.sender,
    );
    if (!parsed) continue;
    const reference =
      parsed.reference && `${parsed.type}:${parsed.reference.toUpperCase()}`;
    if (reference && references.has(reference)) continue;
    if (reference) references.add(reference);
    added.push({ ...parsed, status: "unlabelled" });
  }
  return {
    data: {
      ...data,
      suggestions: [...data.suggestions, ...added],
      seenSms: [...seen],
    },
    added: added.length,
  };
}

export function setSuggestionStatus(
  data: Data,
  id: string,
  status: "discarded" | "unlabelled",
) {
  return {
    ...data,
    suggestions: data.suggestions.map((s) =>
      s.id === id && !data.entries.some((e) => e.smsId === id)
        ? { ...s, status, dismissed: status === "discarded" }
        : s,
    ),
  };
}

export function matchSuggestion(data: Data, id: string) {
  const suggestion = data.suggestions.find((s) => s.id === id);
  if (
    !suggestion ||
    suggestionStatus(suggestion, data.entries) !== "unlabelled"
  )
    throw new Error("This message has already been reviewed.");
  const entry = duplicate(suggestion, data.entries);
  if (!entry)
    throw new Error(
      "The matching transaction changed. Review this message again.",
    );
  return {
    ...data,
    entries: data.entries.map((e) =>
      e.id === entry.id
        ? { ...e, smsId: id, updated: new Date().toISOString() }
        : e,
    ),
    suggestions: data.suggestions.map((s) =>
      s.id === id ? { ...s, status: "matched" as const, dismissed: true } : s,
    ),
  };
}
