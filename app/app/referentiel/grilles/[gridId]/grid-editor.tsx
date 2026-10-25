"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { FormMessage } from "@/components/forms/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GridItem } from "@/lib/types";
import type { FormState } from "@/lib/validation/auth";
import { saveGrid } from "../../actions";

interface EditableItem {
  key: string;
  label: string;
  description: string;
  maxPoints: string;
  eliminatory: boolean;
}

let nextKey = 0;
const newKey = () => `item-${nextKey++}`;

export function GridEditor({
  gridId,
  name: initialName,
  passScore: initialPassScore,
  items: initialItems,
  editable,
}: {
  gridId: string;
  name: string;
  passScore: number;
  items: GridItem[];
  editable: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [passScore, setPassScore] = useState(String(initialPassScore));
  const [items, setItems] = useState<EditableItem[]>(() =>
    initialItems.map((item) => ({
      key: newKey(),
      label: item.label,
      description: item.description ?? "",
      maxPoints: String(Number(item.max_points)),
      eliminatory: item.eliminatory,
    })),
  );
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  const total = items.reduce((sum, item) => sum + (Number(item.maxPoints) || 0), 0);
  const update = (key: string, patch: Partial<EditableItem>) =>
    setItems((list) => list.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  const move = (index: number, delta: number) =>
    setItems((list) => {
      const copy = [...list];
      const [item] = copy.splice(index, 1);
      copy.splice(index + delta, 0, item!);
      return copy;
    });

  const save = () =>
    startTransition(async () => {
      setState(
        await saveGrid({
          gridId,
          name,
          passScore,
          items: items.map((item) => ({
            label: item.label,
            description: item.description,
            maxPoints: item.maxPoints,
            eliminatory: item.eliminatory,
          })),
        }),
      );
    });

  return (
    <Card>
      <CardHeader className="gap-4">
        <CardTitle>Critères</CardTitle>
        <div className="grid gap-4 md:grid-cols-[1fr_14rem]">
          <div className="grid gap-2">
            <Label htmlFor="grid-name">Nom de la grille</Label>
            <Input id="grid-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!editable} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="grid-pass">Seuil de réussite (sur 100)</Label>
            <Input
              id="grid-pass"
              type="number"
              min={0}
              max={100}
              value={passScore}
              onChange={(e) => setPassScore(e.target.value)}
              disabled={!editable}
            />
          </div>
        </div>
        <p className="text-lg">
          Total : <strong>{total} points</strong>, ramené sur 100 pour le score.{" "}
          {items.some((i) => i.eliminatory) ? (
            <span>Un critère éliminatoire non satisfait entraîne l&apos;échec, quel que soit le score.</span>
          ) : null}
        </p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <FormMessage state={state} />
        <ol className="grid gap-4">
          {items.map((item, index) => (
            <li key={item.key} className="grid gap-3 rounded-lg border-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-lg font-bold">Critère {index + 1}</span>
                {item.eliminatory ? <Badge variant="destructive">Éliminatoire</Badge> : null}
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_9rem]">
                <div className="grid gap-2">
                  <Label htmlFor={`${item.key}-label`}>Libellé</Label>
                  <Input
                    id={`${item.key}-label`}
                    value={item.label}
                    onChange={(e) => update(item.key, { label: e.target.value })}
                    disabled={!editable}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`${item.key}-points`}>Points max</Label>
                  <Input
                    id={`${item.key}-points`}
                    type="number"
                    min={0}
                    step="0.5"
                    value={item.maxPoints}
                    onChange={(e) => update(item.key, { maxPoints: e.target.value })}
                    disabled={!editable}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${item.key}-description`}>Précisions pour le testeur</Label>
                <Textarea
                  id={`${item.key}-description`}
                  value={item.description}
                  onChange={(e) => update(item.key, { description: e.target.value })}
                  disabled={!editable}
                  className="min-h-16"
                />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`${item.key}-eliminatory`}
                    checked={item.eliminatory}
                    onCheckedChange={(checked) => update(item.key, { eliminatory: checked === true })}
                    disabled={!editable}
                  />
                  <Label htmlFor={`${item.key}-eliminatory`}>Critère éliminatoire</Label>
                </div>
                {editable ? (
                  <div className="ml-auto flex gap-2">
                    <Button type="button" variant="outline" size="icon" aria-label={`Monter le critère ${index + 1}`} disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp />
                    </Button>
                    <Button type="button" variant="outline" size="icon" aria-label={`Descendre le critère ${index + 1}`} disabled={index === items.length - 1} onClick={() => move(index, 1)}>
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Supprimer le critère ${index + 1}`}
                      onClick={() => setItems((list) => list.filter((i) => i.key !== item.key))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        {editable ? (
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setItems((list) => [
                  ...list,
                  { key: newKey(), label: "", description: "", maxPoints: "10", eliminatory: false },
                ])
              }
            >
              Ajouter un critère
            </Button>
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer la grille"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
