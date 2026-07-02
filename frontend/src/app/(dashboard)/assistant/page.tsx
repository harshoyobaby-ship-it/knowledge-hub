"use client";

import { Bot, MessageSquare } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AssistantPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  async function send() {
    const q = question.trim();
    if (!q) return;
    setQuestion("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question: q, top_k: 3 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Chat failed");
      setMessages((m) => [...m, { role: "assistant", content: json.data.answer }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Chat failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        description="Ask questions about company policies, procedures, and knowledge"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 rounded-lg border p-4">
            <div className="space-y-2">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ask a policy or process question to get started.
                </p>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={
                      m.role === "user"
                        ? "rounded-md bg-primary/10 p-3 text-sm"
                        : "rounded-md bg-muted p-3 text-sm"
                    }
                  >
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {m.role === "user" ? "You" : "Assistant"}
                    </p>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Ask a question…"
                value={question}
                disabled={loading}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void send();
                }}
              />
              <Button onClick={() => void send()} disabled={loading || !question.trim()}>
                <MessageSquare className="h-4 w-4" />
                {loading ? "Asking…" : "Ask"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
