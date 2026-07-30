"use client";

/* =========================================================================
   Edit invoice — the same editor, pre-filled.

   Paid invoices are not editable; landing here with one bounces straight
   back to the detail view rather than showing a form that can't be saved.
   ========================================================================= */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  EditorSkeleton,
  InvoiceEditor,
  blankLine,
  type InvoicePayload,
  type LineItem,
} from "@/components/app/invoice-editor";
import type { Client, Invoice, Item } from "@/types";

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [catalog, setCatalog] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [inv, cl, cat] = await Promise.all([
          api.get<Invoice>(`/invoices/${invoiceId}`),
          api.get<Client[]>("/clients/"),
          api.get<Item[]>("/items/"),
        ]);
        if (cancelled) return;

        if (inv.status === "paid") {
          router.replace(`/invoices/${invoiceId}`);
          return;
        }

        setInvoice(inv);
        setClients(cl);
        setCatalog(cat);
      } catch {
        if (!cancelled) router.replace("/invoices");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [invoiceId, router]);

  if (loading || !invoice) return <EditorSkeleton />;

  const initialItems: LineItem[] =
    invoice.items.length > 0
      ? [...invoice.items]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((i) => ({
            id: i.id,
            description: i.description,
            quantity: String(i.quantity),
            unit_price: String(i.unit_price),
            unit: i.unit ?? "",
          }))
      : [blankLine()];

  const save = async (payload: InvoicePayload) => {
    await api.put<Invoice>(`/invoices/${invoiceId}`, payload);
    router.push(`/invoices/${invoiceId}`);
  };

  return (
    <InvoiceEditor
      mode="edit"
      invoiceNumber={invoice.invoice_number}
      clients={clients}
      catalog={catalog}
      initialForm={{
        client_id: invoice.client_id ?? "",
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        tax_rate: String(invoice.tax_rate),
        discount_amount: String(invoice.discount_amount),
        currency: invoice.currency,
        notes: invoice.notes ?? "",
        terms: invoice.terms ?? "",
        pdf_template: invoice.pdf_template || "classic",
      }}
      initialItems={initialItems}
      onSubmit={save}
    />
  );
}
