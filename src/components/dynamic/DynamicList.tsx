"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Search } from "lucide-react";

export function DynamicList({ docTypeName, userRoles }: { docTypeName: string, userRoles: string[] }) {
  const router = useRouter();
  const [metadata, setMetadata] = useState<any>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

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

        // 2. Fetch data records
        const dataRes = await fetch(`/api/resource/${docTypeName}`);
        const dataJson = await dataRes.json();
        if (dataRes.ok) {
          setData(dataJson.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [docTypeName]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading {docTypeName}...</div>;
  }

  if (!metadata) {
    return <div className="p-8 text-center text-red-500">Failed to load metadata for {docTypeName}</div>;
  }

  // Get fields configured for list view
  const listFields = metadata.fields.filter((f: any) => f.list);
  const searchableFields = metadata.fields.filter((f: any) => f.searchable).map((f: any) => f.fieldname);

  // Filter and Sort logic
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Filter
    if (searchQuery && searchableFields.length > 0) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(row => {
        return searchableFields.some((field: string) => 
          String(row[field] || "").toLowerCase().includes(lowerQuery)
        );
      });
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key] || "";
        const bValue = b[sortConfig.key] || "";
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchQuery, sortConfig, searchableFields]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const canCreate = metadata.permissions?.create?.some((r: string) => userRoles.includes(r)) ?? true;
  const canUpdate = metadata.permissions?.update?.some((r: string) => userRoles.includes(r)) ?? true;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{metadata.name} List</CardTitle>
        {canCreate && (
          <Button onClick={() => router.push(`/app/${docTypeName}/new`)}>
            Create New {metadata.name}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {searchableFields.length > 0 && (
          <div className="flex items-center mb-4">
            <Search className="w-4 h-4 mr-2 text-gray-500" />
            <Input 
              placeholder={`Search by ${searchableFields.join(', ')}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        )}
        
        {filteredAndSortedData.length === 0 ? (
          <div className="py-12 text-center text-gray-500 border rounded-md border-dashed">
            No records found.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {listFields.map((field: any) => (
                    <TableHead 
                      key={field.fieldname} 
                      className="cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => requestSort(field.fieldname)}
                    >
                      <div className="flex items-center">
                        {field.label || field.fieldname}
                        {sortConfig?.key === field.fieldname && (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedData.map((row: any, i: number) => (
                  <TableRow key={row[metadata.primaryKey] || i}>
                    {listFields.map((field: any) => (
                      <TableCell key={field.fieldname}>
                        {row[field.fieldname]}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      {canUpdate ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/app/${docTypeName}/${row[metadata.primaryKey]}`)}
                        >
                          Edit
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/app/${docTypeName}/${row[metadata.primaryKey]}`)}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
