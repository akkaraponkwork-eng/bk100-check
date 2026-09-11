import { NextResponse } from 'next/server';
import { DocTypeRegistry } from '@/lib/doctypes/registry';

export async function GET(request: Request, { params }: { params: Promise<{ doctype: string }> }) {
  try {
    const resolvedParams = await params;
    
    if (!DocTypeRegistry.exists(resolvedParams.doctype)) {
      return NextResponse.json({ error: `DocType '${resolvedParams.doctype}' not found.` }, { status: 404 });
    }

    const docType = DocTypeRegistry.get(resolvedParams.doctype);
    
    // We only send safe metadata to the client (omit backend-only permissions/settings if needed)
    // For now, we'll send the essential UI schema
    const safeSchema = {
      name: docType.name,
      primaryKey: docType.primaryKey,
      permissions: docType.permissions,
      fields: docType.fields.map(f => ({
        fieldname: f.fieldname,
        type: f.type,
        label: f.label,
        options: f.options,
        required: f.required,
        hidden: f.hidden,
        readOnly: f.readOnly,
        list: f.list,
        form: f.form,
        computed: f.computed,
        formula: f.formula,
        dependsOn: f.dependsOn,
        searchable: f.searchable
      }))
    };

    return NextResponse.json({ data: safeSchema });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
