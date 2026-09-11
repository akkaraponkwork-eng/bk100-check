import { NextResponse } from 'next/server';
import { ResourceService } from '@/lib/services/resource';
import { GoogleSheetsRepository } from '@/lib/repository/sheets/repository';
import { DocTypeRegistry } from '@/lib/doctypes/registry';

const repository = new GoogleSheetsRepository();
const resourceService = new ResourceService(repository);

function getMockUserContext(req: Request) {
  return { id: 'admin-123', roles: ['admin'] };
}

export async function GET(request: Request, { params }: { params: Promise<{ doctype: string, id: string }> }) {
  try {
    const resolvedParams = await params;
    const user = getMockUserContext(request);
    
    if (!DocTypeRegistry.exists(resolvedParams.doctype)) {
      return NextResponse.json({ error: `DocType '${resolvedParams.doctype}' not found.` }, { status: 404 });
    }

    const record = await resourceService.get(resolvedParams.doctype, resolvedParams.id, user);
    if (!record) {
      return NextResponse.json({ error: `Record not found.` }, { status: 404 });
    }
    return NextResponse.json({ data: record });
  } catch (error: any) {
    if (error.name === 'SchemaCompatibilityError') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: error.status || 403 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ doctype: string, id: string }> }) {
  try {
    const resolvedParams = await params;
    const user = getMockUserContext(request);
    
    if (!DocTypeRegistry.exists(resolvedParams.doctype)) {
      return NextResponse.json({ error: `DocType '${resolvedParams.doctype}' not found.` }, { status: 404 });
    }

    const body = await request.json();
    
    // We expect the client to send the current version they are trying to update
    // If not provided, we extract it if possible, but strict OCC requires it explicitly.
    const currentVersion = body.updatedAt;

    const updatedRecord = await resourceService.update(resolvedParams.doctype, resolvedParams.id, body, user, currentVersion);
    return NextResponse.json({ data: updatedRecord });
  } catch (error: any) {
    if (error.name === 'ConflictError' || error.message.includes('409 Conflict')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error.name === 'SchemaCompatibilityError') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: error.status || 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ doctype: string, id: string }> }) {
  try {
    const resolvedParams = await params;
    const user = getMockUserContext(request);
    
    if (!DocTypeRegistry.exists(resolvedParams.doctype)) {
      return NextResponse.json({ error: `DocType '${resolvedParams.doctype}' not found.` }, { status: 404 });
    }

    const success = await resourceService.delete(resolvedParams.doctype, resolvedParams.id, user);
    if (!success) {
      return NextResponse.json({ error: `Record not found or could not be deleted.` }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === 'SchemaCompatibilityError') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: error.status || 403 });
  }
}
