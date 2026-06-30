"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";

interface QuestionDraft {
  id?: string;
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string | string[] | boolean;
  points: number;
  order: number;
  explanation?: string;
}

interface QuizQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: string | null;
  quizTitle?: string;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Single choice (MCQ)",
  MULTIPLE_CHOICE: "Multiple choice",
  TRUE_FALSE: "True / False",
  SHORT_ANSWER: "Short answer",
};

function emptyQuestion(order: number): QuestionDraft {
  return {
    type: "SINGLE_CHOICE",
    text: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    points: 1,
    order,
  };
}

export function QuizQuestionsDialog({
  open,
  onOpenChange,
  quizId,
  quizTitle,
}: QuizQuestionsDialogProps) {
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !quizId) return;

    setLoading(true);
    fetch(`/api/quizzes/${quizId}/questions`, { credentials: "include" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        const data = json.data as QuestionDraft[];
        setQuestions(
          data.length > 0
            ? data.map((q, i) => ({
                ...q,
                options: Array.isArray(q.options) ? (q.options as string[]) : [],
                order: i,
              }))
            : [emptyQuestion(0)]
        );
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load questions");
        setQuestions([emptyQuestion(0)]);
      })
      .finally(() => setLoading(false));
  }, [open, quizId]);

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion(prev.length)]);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) =>
      prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, order: i }))
    );
  }

  function addOption(qIndex: number) {
    const q = questions[qIndex];
    updateQuestion(qIndex, { options: [...q.options, ""] });
  }

  function updateOption(qIndex: number, optIndex: number, value: string) {
    const q = questions[qIndex];
    const options = [...q.options];
    const oldVal = options[optIndex];
    options[optIndex] = value;

    let correctAnswer = q.correctAnswer;
    if (q.type === "SINGLE_CHOICE" && correctAnswer === oldVal) {
      correctAnswer = value;
    }
    if (q.type === "MULTIPLE_CHOICE" && Array.isArray(correctAnswer)) {
      correctAnswer = correctAnswer.map((a) => (a === oldVal ? value : a));
    }

    updateQuestion(qIndex, { options, correctAnswer });
  }

  function removeOption(qIndex: number, optIndex: number) {
    const q = questions[qIndex];
    const removed = q.options[optIndex];
    const options = q.options.filter((_, i) => i !== optIndex);

    let correctAnswer = q.correctAnswer;
    if (q.type === "SINGLE_CHOICE" && correctAnswer === removed) {
      correctAnswer = "";
    }
    if (q.type === "MULTIPLE_CHOICE" && Array.isArray(correctAnswer)) {
      correctAnswer = correctAnswer.filter((a) => a !== removed);
    }

    updateQuestion(qIndex, { options, correctAnswer });
  }

  function handleTypeChange(index: number, type: QuestionType) {
    const defaults: Record<QuestionType, Partial<QuestionDraft>> = {
      SINGLE_CHOICE: { options: ["", "", "", ""], correctAnswer: "" },
      MULTIPLE_CHOICE: { options: ["", "", "", ""], correctAnswer: [] },
      TRUE_FALSE: { options: ["True", "False"], correctAnswer: true },
      SHORT_ANSWER: { options: [], correctAnswer: "" },
    };
    updateQuestion(index, { type, ...defaults[type] });
  }

  async function handleSave() {
    if (!quizId) return;

    for (const [i, q] of questions.entries()) {
      if (!q.text.trim()) {
        toast.error(`Question ${i + 1} needs text`);
        return;
      }
      if (q.type === "SINGLE_CHOICE" && !q.correctAnswer) {
        toast.error(`Question ${i + 1}: select the correct option`);
        return;
      }
      if (q.type === "MULTIPLE_CHOICE" && (!Array.isArray(q.correctAnswer) || q.correctAnswer.length === 0)) {
        toast.error(`Question ${i + 1}: select at least one correct option`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = questions.map((q, order) => ({
        type: q.type,
        text: q.text.trim(),
        options: q.type === "TRUE_FALSE" || q.type === "SHORT_ANSWER" ? q.options : q.options.filter(Boolean),
        correctAnswer: q.correctAnswer,
        points: q.points,
        order,
        explanation: q.explanation || null,
      }));

      const res = await fetch(`/api/quizzes/${quizId}/questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: payload }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast.success("Questions saved");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mock Test Questions</DialogTitle>
          <DialogDescription>
            {quizTitle ? `${quizTitle} — ` : ""}
            Add MCQ and other question types. Publish the quiz when ready.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading questions...</p>
        ) : (
          <div className="space-y-6">
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <GripVertical className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">Q{qIndex + 1}</span>
                      <Select
                        value={q.type}
                        onValueChange={(v) => handleTypeChange(qIndex, v as QuestionType)}
                      >
                        <SelectTrigger className="h-8 w-48 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TYPE_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        className="h-8 w-16 text-xs"
                        min={1}
                        value={q.points}
                        onChange={(e) =>
                          updateQuestion(qIndex, { points: parseInt(e.target.value, 10) || 1 })
                        }
                      />
                      <span className="text-xs text-muted-foreground">pts</span>
                      {questions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="ml-auto h-8 w-8"
                          onClick={() => removeQuestion(qIndex)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    <Textarea
                      placeholder="Question text"
                      rows={2}
                      value={q.text}
                      onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                    />

                    {q.type === "TRUE_FALSE" && (
                      <div className="flex gap-4">
                        {(["True", "False"] as const).map((label, i) => (
                          <label key={label} className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name={`tf-${qIndex}`}
                              checked={q.correctAnswer === (i === 0)}
                              onChange={() =>
                                updateQuestion(qIndex, { correctAnswer: i === 0 })
                              }
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    )}

                    {(q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") && (
                      <div className="space-y-2">
                        <Label className="text-xs">Options (mark correct)</Label>
                        {q.options.map((opt, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <input
                              type={q.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
                              name={`q-${qIndex}-correct`}
                              checked={
                                q.type === "MULTIPLE_CHOICE"
                                  ? Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt) && !!opt
                                  : q.correctAnswer === opt && !!opt
                              }
                              onChange={() => {
                                if (!opt.trim()) return;
                                if (q.type === "MULTIPLE_CHOICE") {
                                  const current = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
                                  const next = current.includes(opt)
                                    ? current.filter((a) => a !== opt)
                                    : [...current, opt];
                                  updateQuestion(qIndex, { correctAnswer: next });
                                } else {
                                  updateQuestion(qIndex, { correctAnswer: opt });
                                }
                              }}
                            />
                            <Input
                              value={opt}
                              placeholder={`Option ${optIndex + 1}`}
                              onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                            />
                            {q.options.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => removeOption(qIndex, optIndex)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addOption(qIndex)}
                        >
                          Add option
                        </Button>
                      </div>
                    )}

                    {q.type === "SHORT_ANSWER" && (
                      <div className="space-y-2">
                        <Label className="text-xs">Expected answer (for auto-check)</Label>
                        <Input
                          value={String(q.correctAnswer ?? "")}
                          onChange={(e) =>
                            updateQuestion(qIndex, { correctAnswer: e.target.value })
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" className="w-full" onClick={addQuestion}>
              <Plus className="h-4 w-4" />
              Add question
            </Button>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={saving} onClick={handleSave}>
                {saving ? "Saving..." : "Save questions"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
