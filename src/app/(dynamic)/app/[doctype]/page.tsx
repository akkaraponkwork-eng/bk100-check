import { DynamicList } from "@/components/dynamic/DynamicList";
import { headers } from "next/headers";

export default async function DynamicListPage({ params }: { params: Promise<{ doctype: string }> }) {
  const resolvedParams = await params;
  const headersList = await headers();
  const userRoles = headersList.get("x-user-role")?.split(",") || ["admin"]; // Fallback for dev

  return (
    <div className="container mx-auto py-8 px-4">
      <DynamicList docTypeName={resolvedParams.doctype} userRoles={userRoles} />
    </div>
  );
}
