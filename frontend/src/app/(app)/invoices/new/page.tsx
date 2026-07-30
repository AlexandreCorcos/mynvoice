"use client";

/* =========================================================================
   New invoice — a thin wrapper around the shared editor.
   ========================================================================= */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  EditorSkeleton,
  InvoiceEditor,
  blankLine,
  type InvoicePayload,
} from "@/components/app/invoice-editor";
import type { Client, Invoice, Item } from "@/types";

/** Default terms of 30 days, so the due date is never an empty required field. */
function inDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [catalog, setCatalog] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([api.get<Client[]>("/clients/"), api.get<Item[]>("/items/")])
      .then(([c, i]) => {
        if (c.status === "fulfilled") setClients(c.value);
        if (i.status === "fulfilled") setCatalog(i.value);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <EditorSkeleton />;

  const create = async (payload: InvoicePayload) => {
    const result = await api.post<Invoice>("/invoices/", payload);
    router.push(`/invoices/${result.id}`);
  };

  return (
    <InvoiceEditor
      mode="create"
      clients={clients}
      catalog={catalog}
      initialForm={{
        client_id: "",
        issue_date: new Date().toISOString().split("T")[0],
        due_date: inDays(30),
        tax_rate: "0",
        discount_amount: "0",
        currency: user?.currency || "GBP",
        notes: "",
        terms: "",
        pdf_template: "classic",
      }}
      initialItems={[blankLine()]}
      onSubmit={create}
    />
  );
}
