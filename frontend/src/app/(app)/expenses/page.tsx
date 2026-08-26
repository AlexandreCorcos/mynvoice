import { redirect } from "next/navigation";

/* The Expenses screen became the unified Transactions ledger. Keep the old
   path working for bookmarks and in-app links. */
export default function ExpensesRedirect() {
  redirect("/transactions");
}
