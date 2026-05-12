"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Loader2,
  MessageSquare,
} from "lucide-react";
import type { Template } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function TemplatesManager() {
  const { data, error, isLoading, mutate } = useSWR<{ list: Template[] }>(
    "/api/templates",
    fetcher
  );
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ nome: "", mensagem: "", ativo: true });
  const [isSaving, setIsSaving] = useState(false);

  const templates = data?.list || [];

  const resetForm = () => {
    setFormData({ nome: "", mensagem: "", ativo: true });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!formData.nome || !formData.mensagem) return;

    setIsSaving(true);
    try {
      await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      mutate();
      resetForm();
    } catch (error) {
      console.error("Error creating template:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !formData.nome || !formData.mensagem) return;

    setIsSaving(true);
    try {
      await fetch("/api/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...formData }),
      });
      mutate();
      resetForm();
    } catch (error) {
      console.error("Error updating template:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este template?")) return;

    try {
      await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
      mutate();
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  const startEdit = (template: Template) => {
    setEditingId(template.Id!);
    setFormData({
      nome: template.nome,
      mensagem: template.mensagem,
      ativo: template.ativo,
    });
    setIsCreating(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-destructive">Erro ao carregar templates</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Templates de Mensagem
            </CardTitle>
            {!isCreating && !editingId && (
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Template
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(isCreating || editingId) && (
            <div className="mb-6 p-4 border border-border rounded-lg space-y-4">
              <h3 className="font-medium">
                {isCreating ? "Novo Template" : "Editar Template"}
              </h3>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Template</label>
                <Input
                  placeholder="Ex: Apresentacao Inicial"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mensagem</label>
                <Textarea
                  placeholder="Ola {nome}! Tudo bem? Somos da cidade de {cidade}..."
                  value={formData.mensagem}
                  onChange={(e) =>
                    setFormData({ ...formData, mensagem: e.target.value })
                  }
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Variaveis disponiveis: {"{nome}"}, {"{cidade}"}, {"{estado}"}, {"{nicho}"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) =>
                    setFormData({ ...formData, ativo: e.target.checked })
                  }
                />
                <label htmlFor="ativo" className="text-sm">
                  Template ativo
                </label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button
                  onClick={isCreating ? handleCreate : handleUpdate}
                  disabled={isSaving || !formData.nome || !formData.mensagem}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          )}

          {templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum template cadastrado</p>
              <p className="text-sm mt-2">
                Crie templates para enviar mensagens personalizadas
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div
                  key={template.Id}
                  className="p-4 border border-border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{template.nome}</h4>
                      <Badge variant={template.ativo ? "success" : "secondary"}>
                        {template.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(template)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(template.Id!)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/50 p-3 rounded">
                    {template.mensagem}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
