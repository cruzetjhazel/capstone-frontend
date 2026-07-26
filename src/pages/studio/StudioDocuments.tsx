import { DashboardLayout } from "@/components/DashboardLayout";
import { FileText, Download, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";

const documents = [
  { id: "DOC-101", title: "Wedding Agreement - Watson", type: "Contract", client: "Emily Watson", date: "Mar 15, 2026", status: "confirmed" as const },
  { id: "DOC-102", title: "Invoice #2045", type: "Invoice", client: "David Kim", date: "Mar 20, 2026", status: "pending" as const },
  { id: "DOC-103", title: "Commercial Release", type: "Waiver", client: "Sarah Chen", date: "Apr 01, 2026", status: "confirmed" as const },
  { id: "DOC-104", title: "Invoice #2046", type: "Invoice", client: "Tom Brennan", date: "Apr 05, 2026", status: "paid" as const }, 
];

export default function StudioDocuments() {
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Documents</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage contracts, invoices, and signed releases.</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Create Document
          </Button>
        </div>

        <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search documents..." className="pl-9 bg-background" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Document</th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Date Sent</th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{doc.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{doc.type}</td>
                    <td className="px-6 py-4 text-sm">{doc.client}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden sm:table-cell">{doc.date}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Download className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}