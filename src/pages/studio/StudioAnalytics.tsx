import { useState } from "react";
import { DollarSign, CalendarDays, Star, Eye, ArrowUpRight, ArrowDownRight, Users, Download, X, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

const monthly = [
  { month: "Oct", revenue: 24000, bookings: 6 },
  { month: "Nov", revenue: 31000, bookings: 8 },
  { month: "Dec", revenue: 48000, bookings: 12 },
  { month: "Jan", revenue: 36000, bookings: 9 },
  { month: "Feb", revenue: 52000, bookings: 14 },
  { month: "Mar", revenue: 61000, bookings: 17 },
];

const serviceMix = [
  { name: "Wedding", value: 42, color: "hsl(25, 55%, 35%)" },
  { name: "Portrait", value: 22, color: "hsl(25, 40%, 50%)" },
  { name: "Events", value: 18, color: "hsl(35, 80%, 56%)" },
  { name: "Engagement", value: 12, color: "hsl(199, 89%, 48%)" },
  { name: "Others", value: 6, color: "hsl(25, 20%, 70%)" },
];

const topClients = [
  { name: "Emily Watson", bookings: 4, spent: 32000 },
  { name: "David Kim", bookings: 3, spent: 21000 },
  { name: "Sarah Chen", bookings: 2, spent: 18000 },
  { name: "Tom Brennan", bookings: 2, spent: 12000 },
];

const kpis = [
  { label: "Total Revenue", value: "₱61,000", change: "+17%", up: true, icon: DollarSign },
  { label: "Bookings (Mar)", value: "17", change: "+3", up: true, icon: CalendarDays },
  { label: "Avg Rating", value: "4.9", change: "+0.1", up: true, icon: Star },
  { label: "Profile Views", value: "1,284", change: "-4%", up: false, icon: Eye },
];

const formatPHP = (value: number) => `₱${value.toLocaleString()}`;

export default function StudioAnalytics() {
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportConfirm = async () => {
    setIsExporting(true);
    try {
      // Simulate API call for generating the report
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success("Analytics report exported successfully!");
      setShowExportModal(false);
    } catch (error) {
      toast.error("Failed to export analytics report.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-up">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-1">Track your performance and business growth.</p>
          </div>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="bg-card rounded-xl p-5 card-shadow border border-border/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{k.label}</p>
                  <p className="text-2xl font-heading font-bold mt-1">{k.value}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <k.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${k.up ? "text-green-600" : "text-red-500"}`}>
                {k.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {k.change}<span className="text-muted-foreground font-normal ml-1">vs last month</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card rounded-xl card-shadow border border-border/50 p-6">
            <h3 className="font-heading font-semibold mb-6">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(25, 10%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(val) => `₱${val / 1000}k`} tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: 8, fontSize: 13 }} 
                  formatter={(value: number) => [formatPHP(value), "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(25, 55%, 35%)" fill="hsl(25, 55%, 35%)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-xl card-shadow border border-border/50 p-6">
            <h3 className="font-heading font-semibold mb-6">Service Mix</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={serviceMix} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {serviceMix.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`, "Share"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {serviceMix.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-muted-foreground">{s.name}</span>
                  </div>
                  <span className="font-medium">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl card-shadow border border-border/50 p-6">
            <h3 className="font-heading font-semibold mb-6">Bookings per Month</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(25, 10%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                <Bar dataKey="bookings" fill="hsl(35, 80%, 56%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-xl card-shadow border border-border/50">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-heading font-semibold">Top Clients</h3>
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="divide-y divide-border">
              {topClients.map((c, i) => (
                <div key={c.name} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.bookings} bookings</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{formatPHP(c.spent)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Export */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border card-shadow p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowExportModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              disabled={isExporting}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-heading font-bold mb-2">Export Analytics</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to export your analytics report? The data will be downloaded as a CSV file to your device.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setShowExportModal(false)} disabled={isExporting}>
                Cancel
              </Button>
              <Button onClick={handleExportConfirm} disabled={isExporting}>
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exporting...
                  </>
                ) : (
                  "Confirm Export"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}