"use client";

/* The admin surface lives at /sys/ctrl. This route stays as a redirect so
   existing links and bookmarks keep working. */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/sys/ctrl");
  }, [router]);

  return null;
}
