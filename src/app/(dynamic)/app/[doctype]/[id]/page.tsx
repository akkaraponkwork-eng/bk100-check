import { DynamicForm } from "@/components/dynamic/DynamicForm";
import { headers } from "next/headers";

export default async function DynamicFormPage({ params }: { params: Promise<{ doctype: string, id: string }> }) {
  const resolvedParams = await params;
  const headersList = await headers();
  const userRoles = headersList.get("x-user-role")?.split(",") || ["admin"]; // Fallback for dev

  return (
    <div className="container mx-auto py-8 px-4">
      <DynamicForm docTypeName={resolvedParams.doctype} id={resolvedParams.id} userRoles={userRoles} />
    </div>
  );
}
