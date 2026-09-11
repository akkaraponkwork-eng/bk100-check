"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ComputedEngine } from "@/lib/computed/engine";

function buildSchema(fields: any[]) {
  const schemaObj: any = {};
  fields.forEach(f => {
    if (f.form) {
      if (f.type === 'Number') {
        let fieldSchema = z.number({ invalid_type_error: "Must be a number" });
        if (!f.required) schemaObj[f.fieldname] = fieldSchema.optional().or(z.nan());
        else schemaObj[f.fieldname] = fieldSchema;
      } else {
        let fieldSchema = z.string();
        if (f.required) fieldSchema = fieldSchema.min(1, "This field is required");
        else fieldSchema = fieldSchema.optional().or(z.literal(""));
        schemaObj[f.fieldname] = fieldSchema;
      }
    }
  });
  return z.object(schemaObj);
}

export function DynamicForm({ docTypeName, id, userRoles }: { docTypeName: string, id: string, userRoles: string[] }) {
  const router = useRouter();
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  const schema = metadata ? buildSchema(metadata.fields) : z.object({});
  
  const { register, handleSubmit, setValue, getValues, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  });
  
  const watchedValues = watch();
  const isNew = id === 'new';

  // Client-side computed fields
  useEffect(() => {
    if (!metadata) return;
    
    metadata.fields.forEach((field: any) => {
      // computed: 'business' means backend calculates it, client shouldn't eval formula
      if (field.computed === true && field.formula && field.form) {
        try {
          // Build context from currently watched values
          const context: Record<string, any> = {};
          metadata.fields.forEach((f: any) => {
            if (f.fieldname !== field.fieldname) {
              context[f.fieldname] = watchedValues[f.fieldname] || 0;
            }
          });
          
          // Use the safe backend parser
          const result = ComputedEngine.evaluateSafeFormula(field.formula, context);
          
          if (typeof result === 'number' && !isNaN(result) && result !== watchedValues[field.fieldname]) {
             setValue(field.fieldname, result, { shouldValidate: true });
          }
        } catch (e) {
          // Ignore partial math errors while typing (e.g. division by zero, incomplete typing)
        }
      }
    });
  }, [watchedValues, metadata, setValue]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // 1. Fetch metadata
        const metaRes = await fetch(`/api/metadata/${docTypeName}`);
        const metaJson = await metaRes.json();
        if (metaRes.ok) {
          setMetadata(metaJson.data);
        }

        // 2. If editing, fetch record data
        if (!isNew) {
          const dataRes = await fetch(`/api/resource/${docTypeName}/${id}`);
          const dataJson = await dataRes.json();
          if (dataRes.ok && dataJson.data) {
            const record = dataJson.data;
            setCurrentVersion(record.updatedAt || null);
            
            // Populate form
            metaJson.data.fields.forEach((field: any) => {
              if (field.form) {
                setValue(field.fieldname, record[field.fieldname]);
              }
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [docTypeName, id, isNew, setValue]);

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      const payload = { ...data };
      if (!isNew && currentVersion) {
        payload.updatedAt = currentVersion;
      }

      const url = isNew 
        ? `/api/resource/${docTypeName}` 
        : `/api/resource/${docTypeName}/${id}`;
        
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      
      if (!res.ok) {
        if (res.status === 409) {
          alert('Conflict: Record has been modified by someone else. Please refresh.');
        } else {
          alert('Error: ' + (result.error || 'Unknown error'));
        }
        return;
      }
      
      // Success, go back to list
      router.push(`/app/${docTypeName}`);
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Form...</div>;
  }

  if (!metadata) {
    return <div className="p-8 text-center text-red-500">Failed to load metadata</div>;
  }

  const canCreate = metadata.permissions?.create?.some((r: string) => userRoles.includes(r)) ?? true;
  const canUpdate = metadata.permissions?.update?.some((r: string) => userRoles.includes(r)) ?? true;
  const canDelete = metadata.permissions?.delete?.some((r: string) => userRoles.includes(r)) ?? true;

  const canSave = isNew ? canCreate : canUpdate;

  const formFields = metadata.fields.filter((f: any) => f.form);

  // Helper to determine if a field is disabled
  const isFieldDisabled = (field: any) => {
    if (!canSave) return true;
    if (field.readOnly) return true;
    if (field.computed === true || field.computed === 'business') return true;

    // StateMachine UI Logic for the status/state field
    if (metadata.states && metadata.states.field === field.fieldname) {
      if (isNew) return true; // Initial state is enforced by backend, cannot choose
      
      const currentState = getValues(field.fieldname);
      const validTransitions = metadata.states.transitions.filter((t: any) => t.from === currentState);
      
      // If there are no valid transitions from current state, disable it
      if (validTransitions.length === 0) return true;

      // Check if user has role for any transition
      const hasRoleForTransition = validTransitions.some((t: any) => 
        !t.roles || t.roles.length === 0 || t.roles.some((r: string) => userRoles.includes(r))
      );
      
      if (!hasRoleForTransition) return true;
    }

    return false;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isNew ? 'Create' : 'Edit'} {metadata.name}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {formFields.map((field: any) => (
            <div key={field.fieldname} className="space-y-2">
              <Label htmlFor={field.fieldname}>
                {field.label || field.fieldname}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              
              {field.type === 'Select' && field.options ? (
                <Select
                  onValueChange={(val) => setValue(field.fieldname, val)}
                  defaultValue={getValues(field.fieldname)}
                  disabled={isFieldDisabled(field)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${field.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt: any) => {
                      const value = typeof opt === 'string' ? opt : opt.value;
                      const label = typeof opt === 'string' ? opt : opt.label;
                      return <SelectItem key={value} value={value}>{label}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              ) : field.type === 'Number' ? (
                <Input
                  id={field.fieldname}
                  type="number"
                  disabled={isFieldDisabled(field)}
                  className={isFieldDisabled(field) ? "bg-gray-100" : ""}
                  {...register(field.fieldname, { required: field.required, valueAsNumber: true })}
                />
              ) : (
                <Input
                  id={field.fieldname}
                  type="text"
                  disabled={isFieldDisabled(field)}
                  className={isFieldDisabled(field) ? "bg-gray-100" : ""}
                  {...register(field.fieldname, { required: field.required })}
                />
              )}
              {errors[field.fieldname] && (
                <p className="text-sm text-red-500">{(errors[field.fieldname] as any).message || "Invalid input"}</p>
              )}
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.push(`/app/${docTypeName}`)}>
            {canSave ? 'Cancel' : 'Back'}
          </Button>
          {canSave && (
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
