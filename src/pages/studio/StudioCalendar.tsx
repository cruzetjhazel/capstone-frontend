import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { 
  Ban, Camera, Hourglass, ChevronLeft, ChevronRight, 
  Plus, EyeOff, Calendar as CalendarIcon, Check, AlertTriangle,
  Clock, ExternalLink, X, MapPin, User, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast"; 
import { useNavigate } from "react-router-dom"; 

interface CalendarEvent {
  id?: string;
  type: "blocked" | "booked" | "pending";
  title?: string;
  client?: string;
  time?: string; 
  packageDuration?: number; 
  bufferTime?: number; 
  expectedEndTime?: string; 
  reason?: "Vacation" | "Family Event" | "Equipment Maintenance" | "Personal Leave" | "Other";
  notes?: string;
}

const initialEvents: Record<string, CalendarEvent[]> = {
  "2026-04-02": [{ id: "BK-002", type: "pending", title: "Engagement Session", client: "David Kim", time: "4:00 PM", packageDuration: 2, bufferTime: 1, expectedEndTime: "7:00 PM" }],
  "2026-04-05": [
    { id: "BK-003", type: "booked", title: "Corporate Event", client: "Sarah Chen", time: "9:00 AM", packageDuration: 3, bufferTime: 1, expectedEndTime: "1:00 PM" },
    { id: "BK-008", type: "booked", title: "Portrait Session", client: "Mark Torres", time: "3:00 PM", packageDuration: 1, bufferTime: 0.5, expectedEndTime: "4:30 PM" }
  ],
  "2026-04-08": [{ id: "BK-004", type: "booked", title: "Portrait Session", client: "Tom Brennan", time: "11:00 AM", packageDuration: 2, bufferTime: 1, expectedEndTime: "2:00 PM" }],
  "2026-04-12": [{ id: "BK-005", type: "booked", title: "Birthday Event", client: "Mia Lopez", time: "3:00 PM", packageDuration: 4, bufferTime: 1, expectedEndTime: "8:00 PM" }],
  "2026-04-15": [{ type: "blocked", reason: "Equipment Maintenance", notes: "Sending lenses for annual calibration and sensor cleaning." }],
  "2026-04-24": [{ type: "blocked", reason: "Vacation", notes: "Family beach weekend. Strictly no bookings." }],
  "2026-04-25": [{ type: "blocked", reason: "Vacation", notes: "Family beach weekend. Strictly no bookings." }],
};

export default function StudioCalendar() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Record<string, CalendarEvent[]>>(initialEvents);
  const [selectedDateStr, setSelectedDateStr] = useState<string>("2026-04-05");
  
  const [isBlocking, setIsBlocking] = useState(false);
  const [isConfirmingBlock, setIsConfirmingBlock] = useState(false);
  const [isConfirmingUnblock, setIsConfirmingUnblock] = useState(false);
  
  const [showBookingDetails, setShowBookingDetails] = useState<CalendarEvent | null>(null);
  const [blockReason, setBlockReason] = useState<CalendarEvent["reason"]>("Vacation");
  const [blockNotes, setBlockNotes] = useState("");

  const currentMonthName = "April 2026";
  const totalDays = 30;
  const startOffset = 3; 

  const statusConfig = {
    available: { bg: "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", icon: Check },
    blocked: { bg: "bg-zinc-500/10 hover:bg-zinc-500/15 border-zinc-500/20", text: "text-zinc-600 dark:text-zinc-400", dot: "bg-zinc-500", icon: Ban },
    booked: { bg: "bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/20", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500", icon: Camera },
    pending: { bg: "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20", text: "text-amber-600 dark:text-amber-500", dot: "bg-amber-500", icon: Hourglass },
    mixed: { bg: "bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/20", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500", icon: Camera }
  };

  const handleDayClick = (day: number) => {
    const dateStr = `2026-04-${String(day).padStart(2, '0')}`;
    setSelectedDateStr(dateStr);
    setIsBlocking(false);
    setIsConfirmingBlock(false);
    setIsConfirmingUnblock(false); 
  };

  const handleSaveBlock = () => {
    setEvents(prev => {
      const existingEvents = prev[selectedDateStr] || [];
      return {
        ...prev,
        [selectedDateStr]: [
          ...existingEvents,
          { type: "blocked", reason: blockReason, notes: blockNotes }
        ]
      };
    });
    
    toast.success(`Date successfully blocked out for: ${blockReason}`);
    setIsBlocking(false);
    setIsConfirmingBlock(false);
    setBlockNotes("");
  };

  const handleRemoveBlock = () => {
    setEvents(prev => {
      const updated = { ...prev };
      if (updated[selectedDateStr]) {
        // Filter out ONLY the blocked event, keep ongoing bookings
        const filteredEvents = updated[selectedDateStr].filter(e => e.type !== 'blocked');
        if (filteredEvents.length > 0) {
          updated[selectedDateStr] = filteredEvents;
        } else {
          delete updated[selectedDateStr];
        }
      }
      return updated;
    });
    
    toast.success("Blockout removed. Remaining time is now available.");
    setIsConfirmingUnblock(false);
  };

  const dayEvents = events[selectedDateStr] || [];
  // Separate actual bookings from the block status
  const scheduledEvents = dayEvents.filter(e => e.type !== 'blocked');
  const blockEvent = dayEvents.find(e => e.type === 'blocked');

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">
        
        {/* Header Options */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Studio Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage availability, view non-conflicting schedules, and securely block dates.</p>
          </div>
          
          <div className="flex flex-wrap gap-4 bg-card px-4 py-2.5 rounded-md border border-border/60 text-xs font-medium shadow-sm">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"><Check className="w-3.5 h-3.5" /> Available</div>
            <div className="flex items-center gap-1.5 text-zinc-500"><Ban className="w-3.5 h-3.5" /> Blocked</div>
            <div className="flex items-center gap-1.5 text-blue-500"><Camera className="w-3.5 h-3.5" /> Booked</div>
            <div className="flex items-center gap-1.5 text-amber-500"><Hourglass className="w-3.5 h-3.5" /> Pending</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Calendar interface column */}
          <div className="lg:col-span-2 bg-card rounded-lg border border-border/50 p-5 card-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading font-bold text-lg">{currentMonthName}</h2>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground mb-2">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
              </div>

              <div className="grid grid-cols-7 gap-2 auto-rows-[84px]">
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div key={`offset-${i}`} className="bg-muted/20 border border-transparent rounded-md" />
                ))}

                {Array.from({ length: totalDays }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `2026-04-${String(day).padStart(2, '0')}`;
                  const currentEvents = events[dateStr] || [];
                  
                  let status: keyof typeof statusConfig = "available";
                  if (currentEvents.some(e => e.type === 'blocked')) status = "blocked";
                  else if (currentEvents.length > 1) status = "mixed";
                  else if (currentEvents.length === 1) status = currentEvents[0].type as any;

                  const config = statusConfig[status];
                  const StatusIcon = config.icon;
                  const isSelected = selectedDateStr === dateStr;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "p-2 rounded-md border flex flex-col justify-between text-left transition-all relative group",
                        config.bg,
                        isSelected ? "ring-2 ring-primary border-transparent" : "border-border/40"
                      )}
                    >
                      <span className={cn("text-xs font-semibold", isSelected ? "text-primary font-bold" : "text-foreground")}>
                        {day}
                      </span>
                      
                      <div className="flex items-center justify-between mt-auto w-full">
                        <StatusIcon className={cn("w-3.5 h-3.5 opacity-80", config.text)} />
                        <div className="flex gap-0.5">
                          {currentEvents.filter(e => e.type !== 'blocked').slice(0, 3).map((e, idx) => (
                            <span key={idx} className={cn("w-1.5 h-1.5 rounded-full", e.type === 'pending' ? 'bg-amber-500' : 'bg-blue-500')} />
                          ))}
                          {currentEvents.length > 3 && <span className="text-[8px] leading-none text-muted-foreground">+</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Details & Actions Panel Column */}
          <div className="space-y-4">
            <div className="bg-card rounded-lg border border-border/50 p-5 card-shadow space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-heading font-bold text-sm">
                  {new Date(selectedDateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </h3>
              </div>

              {/* 1. SCHEDULED EVENTS (Always show if bookings exist) */}
              {scheduledEvents.length > 0 && !isBlocking && (
                <div className="space-y-3 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Scheduled Events</span>
                    <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-full">{scheduledEvents.length}</span>
                  </div>
                  
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {scheduledEvents.map((evt, idx) => (
                      <div key={idx} className="bg-muted/40 rounded-md p-3 space-y-3 text-xs border border-border/40">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm text-foreground mb-0.5">{evt.title}</p>
                            <p className="text-muted-foreground">Client: <span className="font-medium text-foreground">{evt.client}</span></p>
                          </div>
                          {evt.type === 'pending' && <Hourglass className="w-4 h-4 text-amber-500" />}
                          {evt.type === 'booked' && <Camera className="w-4 h-4 text-blue-500" />}
                        </div>

                        <div className="flex items-center gap-1.5 bg-background border border-border/50 px-2 py-1.5 rounded text-[11px] text-foreground font-medium">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{evt.time} - {evt.expectedEndTime}</span>
                        </div>
                        
                        <Button 
                          variant="outline" size="sm" 
                          className="w-full gap-1.5 bg-card hover:bg-muted font-medium border-border text-foreground transition-all h-8"
                          onClick={() => setShowBookingDetails(evt)}
                        >
                          View Details <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. BLOCKOUT STATUS (Show if block event exists) */}
              {blockEvent && !isBlocking && (
                <div className="space-y-4 pt-2 border-t border-border/40">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Remaining Time Status</span>
                    <div className="flex items-center gap-2 mt-1 font-medium capitalize text-sm">
                      <Ban className="w-4 h-4 text-zinc-500" /> Blocked
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Reason for Lockout</span>
                    <p className="text-sm font-medium text-foreground mt-0.5">{blockEvent.reason}</p>
                  </div>
                  
                  {blockEvent.notes && (
                    <div className="bg-zinc-500/5 border border-zinc-500/10 rounded-md p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
                        <span>PRIVATE NOTES</span>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                          <EyeOff className="w-3 h-3" /> Studio Only
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed font-normal">{blockEvent.notes}</p>
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full text-destructive hover:bg-destructive/5 border-destructive/20 mt-2" onClick={() => setIsConfirmingUnblock(true)}>
                    Remove Blockout
                  </Button>
                </div>
              )}

              {/* 3. BLOCK ACTION BUTTON (Show if NO block event exists) */}
              {!blockEvent && !isBlocking && (
                <div className="pt-2">
                   <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => setIsBlocking(true)}>
                    <Ban className="w-4 h-4" /> {scheduledEvents.length > 0 ? "Block Remaining Time" : "Block This Date"}
                  </Button>
                </div>
              )}

              {/* 4. EMPTY STATE */}
              {scheduledEvents.length === 0 && !blockEvent && !isBlocking && (
                <div className="text-center pb-2">
                  <p className="text-xs text-muted-foreground">This day is completely open and available for client matching.</p>
                </div>
              )}

              {/* 5. BLOCKING FORM */}
              {isBlocking && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Reason</label>
                    <select
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value as CalendarEvent["reason"])}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 ring-primary"
                    >
                      <option value="Vacation">Vacation</option>
                      <option value="Family Event">Family Event</option>
                      <option value="Equipment Maintenance">Equipment Maintenance</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Internal Context</label>
                    <textarea
                      placeholder="e.g., Flying out to regional event..."
                      value={blockNotes}
                      onChange={(e) => setBlockNotes(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-input bg-background p-3 text-xs focus:outline-none focus:ring-1 ring-primary resize-none leading-relaxed"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setIsBlocking(false)}>Cancel</Button>
                    <Button size="sm" className="w-full gap-1.5" onClick={() => setIsConfirmingBlock(true)}>
                      <Ban className="w-3.5 h-3.5" /> Confirm Block
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL: Block Out Date */}
      {isConfirmingBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border/60 bg-amber-500/5">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="font-heading font-bold text-md uppercase tracking-wide">Confirm Blockout</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsConfirmingBlock(false)} className="h-8 w-8 rounded-full">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Are you sure you want to block out <span className="font-bold">{new Date(selectedDateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>?
              </p>
              <p className="text-xs text-muted-foreground">
                {scheduledEvents.length > 0 
                  ? "This will prevent any further client bookings for the remainder of this date. Existing bookings will remain unaffected."
                  : "This action will restrict clients from matching or requesting reservations on this date."}
              </p>
            </div>
            <div className="p-4 border-t border-border/60 bg-muted/10 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setIsConfirmingBlock(false)}>Review Form</Button>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={handleSaveBlock}>Confirm Block</Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: Remove Blockout */}
      {isConfirmingUnblock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border/60 bg-destructive/5">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="font-heading font-bold text-md uppercase tracking-wide">Confirm Unblock</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsConfirmingUnblock(false)} className="h-8 w-8 rounded-full">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Open up the remaining time on <span className="font-bold">{new Date(selectedDateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>?
              </p>
              <p className="text-xs text-muted-foreground">
                This will lift the workspace restrictions, making the remaining hours visible and available for incoming client bookings.
              </p>
            </div>
            <div className="p-4 border-t border-border/60 bg-muted/10 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setIsConfirmingUnblock(false)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={handleRemoveBlock}>Confirm Unblock</Button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Overlay Modal */}
      {showBookingDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border/60 bg-muted/30">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="font-heading font-bold text-lg">Booking #{showBookingDetails.id}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowBookingDetails(null)} className="h-8 w-8 rounded-full">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{showBookingDetails.title}</h3>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{new Date(selectedDateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
                  showBookingDetails.type === 'booked' ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                )}>
                  {showBookingDetails.type}
                </div>
              </div>

              {/* Service Tracker / Schedule breakdown */}
              <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                 <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Schedule Calculation</h4>
                 <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center text-foreground font-medium">
                      <span>Starting Time</span>
                      <span>{showBookingDetails.time}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground border-t border-border/60 pt-2">
                      <span>Package Duration</span>
                      <span>+{showBookingDetails.packageDuration} hours</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground border-t border-border/60 pt-2">
                      <span>System Buffer Time</span>
                      <span>+{showBookingDetails.bufferTime} hours</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-foreground border-t border-border/60 pt-2">
                      <span>Expected End Time</span>
                      <span>{showBookingDetails.expectedEndTime}</span>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/60">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Client</span>
                  <p className="font-medium">{showBookingDetails.client}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Location</span>
                  <p className="font-medium text-sm">Main Studio</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border/60 bg-muted/10 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowBookingDetails(null)}>Close</Button>
              <Button onClick={() => navigate(`/studio/bookings/${showBookingDetails.id}`)}>View Full Booking Details</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}