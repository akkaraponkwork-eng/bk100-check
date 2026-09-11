import { NextResponse } from 'next/server';
import { ResourceService } from '@/lib/services/resource';
import { GoogleSheetsRepository } from '@/lib/repository/sheets/repository';
import { DocTypeRegistry } from '@/lib/doctypes/registry';

// Using the Google Sheets Repository for Phase 1
const repository = new GoogleSheetsRepository();
const resourceService = new ResourceService(repository);

// Mock user context extraction (In a real app, this comes from auth headers / session)
function getMockUserContext(req: Request) {
  // Support testing headers for PoC
  const rolesHeader = req.headers.get('x-mock-role');
  if (rolesHeader) {
    return { id: 'mock-123', roles: rolesHeader.split(',') };
  }
  return { id: 'admin-123', roles: ['admin'] };
}

export async function GET(request: Request, { params }: { params: Promise<{ doctype: string }> }) {
  try {
    const resolvedParams = await params;
    const user = getMockUserContext(request);
    
    // DocType checking
    if (!DocTypeRegistry.exists(resolvedParams.doctype)) {
      return NextResponse.json({ error: `DocType '${resolvedParams.doctype}' not found.` }, { status: 404 });
    }

    const records = await resourceService.list(resolvedParams.doctype, user);
    return NextResponse.json({ data: records });
  } catch (error: any) {
    if (error.name === 'SchemaCompatibilityError') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: error.status || 403 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ doctype: string }> }) {
  try {
    const resolvedParams = await params;
    const user = getMockUserContext(request);
    
    if (!DocTypeRegistry.exists(resolvedParams.doctype)) {
      return NextResponse.json({ error: `DocType '${resolvedParams.doctype}' not found.` }, { status: 404 });
    }

    const body = await request.json();
    const createdRecord = await resourceService.create(resolvedParams.doctype, body, user);
    
    return NextResponse.json({ data: createdRecord }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'LegacyGuardError' || error.name === 'ForbiddenError') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: error.status || 400 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ doctype: string }> }) {
  try {
    const resolvedParams = await params;
    const user = getMockUserContext(request);
    
    if (!DocTypeRegistry.exists(resolvedParams.doctype)) {
      return NextResponse.json({ error: `DocType '${resolvedParams.doctype}' not found.` }, { status: 404 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id'); // e.g. ?id=123
    
    const body = await request.json();
    const updatedRecord = await resourceService.update(resolvedParams.doctype, id || body.id, body, user);
    
    return NextResponse.json({ data: updatedRecord });
  } catch (error: any) {
    if (error.name === 'LegacyGuardError' || error.name === 'ForbiddenError') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: error.status || 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ doctype: string }> }) {
  try {
    const resolvedParams = await params;
    const user = getMockUserContext(request);
    
    if (!DocTypeRegistry.exists(resolvedParams.doctype)) {
      return NextResponse.json({ error: `DocType '${resolvedParams.doctype}' not found.` }, { status: 404 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    
    await resourceService.delete(resolvedParams.doctype, id, user);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === 'LegacyGuardError' || error.name === 'ForbiddenError') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: error.status || 400 });
  }
}
