"use client";

// A coach looking at one of their player's reports (only for players in the coach's room; the API checks).
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ReportView } from "@/components/main/ReportView";
import { ErrorNote, Loading, PageHeader, btnSm } from "@/components/main/ui";
import { api, type Analysis } from "@/lib/api";

export default function PlayerReport() {
  const { id, aid } = useParams<{ id: string; aid: string }>();
  const [a, setA] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Analysis>(`/rooms/${id}/reports/${aid}`).then(setA).catch((e) => setError(e.message));
  }, [id, aid]);
  if (error) return <ErrorNote message={error} />;
  if (!a) return <Loading label="Loading the report" />;
  return (
    <>
      <PageHeader eyebrow={`Player report · ${new Date(a.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}`} title={a.title}
        action={<Link href={`/rooms/${id}`} className={btnSm}><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to the room</Link>} />
      {a.report ? <ReportView report={a.report} coaching={a.coaching} rejected={a.status === "rejected"} /> : <p className="text-chalk/70">This report has no results.</p>}
    </>
  );
}
