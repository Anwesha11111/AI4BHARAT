import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CriteriaType = "Mandatory" | "Optional";

type CriteriaItem = {
  id: string;
  text: string;
  type: CriteriaType;
};

type CriteriaListProps = {
  initialCriteria: CriteriaItem[];
  onRunEvaluation: () => void;
};

export const CriteriaList = ({
  initialCriteria,
  onRunEvaluation,
}: CriteriaListProps) => {
  const [items, setItems] = useState(initialCriteria);
  const [draftText, setDraftText] = useState("");

  const updateCriteria = (id: string, text: string) => {
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === id ? { ...item, text } : item)),
    );
  };

  const toggleType = (id: string) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              type: item.type === "Mandatory" ? "Optional" : "Mandatory",
            }
          : item,
      ),
    );
  };

  const deleteCriteria = (id: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  };

  const addCriteria = () => {
    const text = draftText.trim();

    if (!text) {
      return;
    }

    setItems((currentItems) => [
      ...currentItems,
      {
        id: `criteria-${Date.now()}`,
        text,
        type: "Mandatory",
      },
    ]);
    setDraftText("");
  };

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm shadow-slate-900/5">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-lg font-semibold tracking-normal">
            Extracted Criteria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_auto_auto] md:items-center"
            >
              <Input
                value={item.text}
                onChange={(event) =>
                  updateCriteria(item.id, event.target.value)
                }
                className="h-10 border-slate-200 bg-white"
                aria-label="Criteria text"
              />

              <Button
                type="button"
                variant="outline"
                className="h-10 justify-start rounded-xl border-slate-200 bg-white md:w-36"
                onClick={() => toggleType(item.id)}
              >
                <Badge
                  variant="outline"
                  className={
                    item.type === "Mandatory"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }
                >
                  {item.type}
                </Badge>
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-xl border-slate-200 bg-white"
                  aria-label="Edit criteria"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="rounded-xl"
                  onClick={() => deleteCriteria(item.id)}
                  aria-label="Delete criteria"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm shadow-slate-900/5">
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            placeholder="Add new criteria"
            className="h-10 border-slate-200 bg-white"
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border-slate-200 bg-white sm:w-44"
            onClick={addCriteria}
          >
            <Plus className="size-4" />
            Add new criteria
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="button"
          className="h-10 rounded-xl bg-blue-600 px-5 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
          onClick={onRunEvaluation}
        >
          Run Evaluation
        </Button>
      </div>
    </div>
  );
};
