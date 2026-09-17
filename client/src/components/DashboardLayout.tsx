import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { getInitials } from "@/lib/veriscan";
import {
  FileCheck2,
  FileSearch,
  History,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { AshokaChakra } from "./VeriScanLogo";
import { GovMasthead } from "./common/GovMasthead";
import { useI18n } from "@/contexts/I18nContext";

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
  { icon: ShieldCheck, label: "Border Terminal", path: "/border" },
  { icon: FileSearch, label: "Verify Document", path: "/verify" },
  { icon: FileCheck2, label: "Verdicts & Reports", path: "/reports" },
  { icon: History, label: "Audit Ledger", path: "/history" },
  { icon: Settings2, label: "Settings", path: "/settings" },
];

const SIDEBAR_WIDTH_KEY = "veriscan-sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 220;
const MAX_WIDTH = 340;

export default function DashboardLayout({
  children,
  allowGuest = false,
}: {
  children: React.ReactNode;
  allowGuest?: boolean;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user, logout } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user && !allowGuest) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-900 font-sans">
        <GovMasthead theme="light" />

        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-xs">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600">
              <AshokaChakra className="h-7 w-7 text-indigo-600" />
            </div>

            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              NATIONAL COMPLIANCE NODE
            </span>

            <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
              Institutional Forensic Workspace
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Authentication required for evidentiary screening logs.
            </p>

            <div className="mt-6 space-y-2">
              <Button
                onClick={() => (window.location.href = "/auth/login")}
                size="lg"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 rounded-xl shadow-xs"
              >
                Sign In to Continue
              </Button>
              <Button
                onClick={() => (window.location.href = "/")}
                variant="outline"
                size="sm"
                className="w-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold h-9 rounded-xl"
              >
                Back to Homepage
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent
        sidebarWidth={sidebarWidth}
        setSidebarWidth={setSidebarWidth}
        user={user}
        logout={logout}
      >
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  sidebarWidth,
  setSidebarWidth,
  user,
  logout,
}: {
  children: React.ReactNode;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  user: any;
  logout: () => void;
}) {
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const { t } = useI18n();

  const menuItems = [
    { icon: LayoutDashboard, label: t("nav_dashboard"), path: "/dashboard" },
    { icon: ShieldCheck, label: t("nav_border"), path: "/border" },
    { icon: FileSearch, label: t("nav_verify"), path: "/verify" },
    { icon: FileCheck2, label: "Verdicts & Reports", path: "/reports" },
    { icon: History, label: t("nav_history"), path: "/history" },
    { icon: Settings2, label: t("nav_settings"), path: "/settings" },
  ];

  const activeMenuItem =
    menuItems.find(
      (item) =>
        location === item.path ||
        (item.path !== "/dashboard" && location.startsWith(item.path))
    ) || menuItems[0];

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      let newWidth = e.clientX;
      if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH;
      if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH;
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc] text-slate-900 font-sans">
      {/* Official Government of India Top Masthead */}
      <GovMasthead theme="light" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div ref={sidebarRef} className="relative">
          <Sidebar
            collapsible="icon"
            className="border-r border-slate-200/80 bg-white text-slate-900"
            disableTransition={isResizing}
          >
            <SidebarHeader className="h-14 justify-center border-b border-slate-200/80 px-3 bg-white">
              <div className="flex items-center gap-2.5 px-1.5">
                <button
                  onClick={toggleSidebar}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 focus:outline-none transition-colors shadow-xs"
                  aria-label="Toggle navigation"
                >
                  <PanelLeft className="h-3.5 w-3.5" />
                </button>
                {!isCollapsed && (
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-sans text-sm font-bold tracking-tight text-slate-900">
                        VeriScan
                      </p>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-bold">
                        SIH-2026
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </SidebarHeader>

            <SidebarContent className="px-2.5 py-3 bg-white">
              <p className="font-sans text-[10px] font-bold uppercase tracking-wider mb-2 px-2 text-slate-400 group-data-[collapsible=icon]:hidden">
                COMMAND DECK
              </p>
              <SidebarMenu className="gap-1 font-sans">
                {menuItems.map((item) => {
                  const isActive =
                    location === item.path ||
                    (item.path !== "/dashboard" && location.startsWith(item.path));
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className={`h-8 px-2.5 transition-all text-xs rounded-lg border ${
                          isActive
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700 font-bold shadow-xs"
                            : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                        <span className="text-[12px] tracking-normal font-medium">
                          {item.label}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>

              {!isCollapsed && (
                <div className="mt-auto px-1 pt-4">
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 text-xs shadow-xs">
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={2} />
                      <span className="text-[11px] font-bold text-slate-800">
                        Evidentiary Node
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                      Statutory Sandbox · 11 Active Parameters
                    </p>
                  </div>
                </div>
              )}
            </SidebarContent>

            <SidebarFooter className="border-t border-slate-200/80 p-2.5 bg-white">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex w-full items-center gap-2 p-1.5 rounded-lg text-left border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-colors focus:outline-none group-data-[collapsible=icon]:justify-center">
                    <Avatar className="h-6 w-6 border border-indigo-200 bg-indigo-50">
                      <AvatarFallback className="bg-indigo-100 text-[9px] font-bold text-indigo-700">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                      <p className="truncate text-[11px] font-bold text-slate-800">
                        {user?.name || "OFFICER"}
                      </p>
                      <p className="truncate text-[10px] text-slate-500 font-medium">
                        {user?.email || "ACCOUNT"}
                      </p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 border border-slate-200 bg-white p-1.5 text-slate-800 shadow-md rounded-xl font-sans"
                >
                  <div className="border-b border-slate-100 p-2 text-xs">
                    <p className="font-bold text-slate-900">{user?.name}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {user?.email}
                    </p>
                    <span className="mt-1.5 inline-block px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-semibold">
                      ROLE: {user?.role || "analyst"}
                    </span>
                  </div>
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="cursor-pointer px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 focus:bg-rose-50 rounded-lg mt-1"
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarFooter>
          </Sidebar>
          <div
            className={`absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize transition-colors hover:bg-indigo-500 bg-slate-200 ${
              isCollapsed ? "hidden" : ""
            }`}
            onMouseDown={() => setIsResizing(true)}
          />
        </div>

        {/* Main Content Pane */}
        <SidebarInset className="min-h-screen bg-[#f8fafc] text-slate-900">
          {isMobile && (
            <div className="sticky top-0 z-40 flex h-11 items-center gap-3 border-b border-slate-200 bg-white px-3">
              <SidebarTrigger className="h-7 w-7 rounded-md border border-slate-200 bg-slate-50" />
              <span className="text-xs font-bold text-slate-900">
                {activeMenuItem.label}
              </span>
            </div>
          )}
          <main className="p-2.5 sm:p-4">
            <div className="mx-auto max-w-[1600px]">{children}</div>
          </main>
        </SidebarInset>
      </div>
    </div>
  );
}
