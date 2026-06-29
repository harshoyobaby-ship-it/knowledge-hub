"use client";

import { useQuery } from "@tanstack/react-query";
import { Bot, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

async function fetchHealth() {
  const res = await fetch("/api/assistant/health", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export default function AssistantPage() {
  const { data: health } = useQuery({
    queryKey: ["assistant-health"],
    queryFn: fetchHealth,
    retry: false,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        description="Chat with company documents using RAG (Pinecone + Groq)"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Knowledge Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Phase 2 will connect streaming chat, conversation history, and document citations
            to your existing RAG service at <code className="text-xs">services/rag</code>.
          </p>
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <p><strong>Status:</strong> {health?.status ?? "checking..."}</p>
            <p><strong>RAG service:</strong> {health?.rag?.healthy ? "Connected" : "Unavailable"}</p>
          </div>
          <Button disabled>
            <MessageSquare className="h-4 w-4" />
            Open Chat (Phase 2)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
