import { ChartLine, Bell, MessageSquare, Play, Package, Megaphone, LayoutGrid, Shirt, RotateCw, ChevronLeft, ChevronRight, Wallet, ShoppingBag, BarChart3, TrendingUp, Users, Globe, ShieldCheck, Building2, Link2, BarChart2, History } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Language, t } from "../lib/i18n";
import { toast } from "sonner@2.0.3";

export type Page = "dashboard" | "orders" | "purchases" | "wallet" | "notifications" | "messages" | "launcher" | "stock" | "publisher" | "published" | "settings" | "tracking-products" | "tracking-vendors" | "tracking-public" | "monitor-dashboard" | "monitor-companies" | "monitor-products" | "monitor-urls" | "monitor-snapshots" | "monitor-syncs";

interface ModernSidebarProps {
  activePage: Page;
  onPageChange: (page: Page) => void;
  language: Language;
  onGlobalRefresh?: () => Promise<void>;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

interface NavItem {
  id: Page;
  icon: any;
  label: string;
  badge?: number;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export function ModernSidebar({
  activePage,
  onPageChange,
  language,
  onGlobalRefresh,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}: ModernSidebarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Define navigation sections
  // NOTE: other sections (accounts, core, operations, listings, tracking) are kept
  // in code but hidden from the UI — they will be re-enabled later.
  const sections: NavSection[] = [
    /*
    {
      title: t(language, "nav.section.accounts"),
      items: [
        { id: "launcher" as Page, icon: Play, label: t(language, "nav.accountLauncher") },
      ]
    },
    {
      title: t(language, "nav.section.core"),
      items: [
        { id: "dashboard" as Page, icon: ChartLine, label: t(language, "nav.dashboard") },
        { id: "notifications" as Page, icon: Bell, label: t(language, "nav.notifications"), badge: 3 },
        { id: "messages" as Page, icon: MessageSquare, label: t(language, "nav.messages"), badge: 5 },
      ]
    },
    {
      title: t(language, "nav.section.operations"),
      items: [
        { id: "orders" as Page, icon: Package, label: t(language, "orders.nav.myOrders") },
        { id: "purchases" as Page, icon: ShoppingBag, label: language === "fr" ? "Mes achats" : "My purchases" },
        { id: "wallet" as Page, icon: Wallet, label: t(language, "nav.wallet") },
      ]
    },
    {
      title: t(language, "nav.section.listings"),
      items: [
        { id: "stock" as Page, icon: Shirt, label: t(language, "nav.stockManager") },
        { id: "publisher" as Page, icon: Megaphone, label: t(language, "nav.listingsPublisher") },
        { id: "published" as Page, icon: LayoutGrid, label: t(language, "nav.publishedListings") },
      ]
    },
    {
      title: language === "fr" ? "Tracking" : "Tracking",
      items: [
        { id: "tracking-products" as Page, icon: TrendingUp, label: language === "fr" ? "Produits" : "Products" },
        { id: "tracking-vendors" as Page, icon: Users, label: language === "fr" ? "Vendeurs" : "Vendors" },
        { id: "tracking-public" as Page, icon: Globe, label: language === "fr" ? "Publiques" : "Public" },
      ]
    },
    */
    {
      title: "Price Monitor",
      items: [
        { id: "monitor-dashboard"  as Page, icon: ShieldCheck, label: "Overview" },
        { id: "monitor-companies"  as Page, icon: Building2,   label: "Companies" },
        { id: "monitor-products"   as Page, icon: Package,     label: "Products" },
        { id: "monitor-urls"       as Page, icon: Link2,       label: "Product URLs" },
        { id: "monitor-snapshots"  as Page, icon: BarChart2,   label: "Prices" },
        { id: "monitor-syncs"      as Page, icon: History,     label: "Sync Runs" },
      ]
    },
  ];

  const handleGlobalRefresh = async () => {
    if (isRefreshing || cooldownRemaining > 0 || !onGlobalRefresh) return;
    
    setIsRefreshing(true);
    
    try {
      await onGlobalRefresh();
      toast.success(t(language, "globalRefresh.toastDone"));
      
      const cooldownDuration = 5000;
      const cooldownStep = 100;
      let remaining = cooldownDuration;
      
      const cooldownInterval = setInterval(() => {
        remaining -= cooldownStep;
        setCooldownRemaining(Math.max(0, remaining));
        
        if (remaining <= 0) {
          clearInterval(cooldownInterval);
        }
      }, cooldownStep);
    } catch (error) {
      toast.error(t(language, "globalRefresh.toastError"));
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activePage === item.id;

    if (collapsed) {
      return (
        <Button
          key={item.id}
          variant="ghost"
          size="icon"
          className={`w-10 h-10 rounded-xl relative transition-all duration-200 ${
            isActive
              ? "dark:bg-primary/15 bg-primary/10 dark:text-primary text-primary border dark:border-primary/40 border-primary/30"
              : "dark:text-muted-foreground text-muted-foreground dark:hover:text-foreground hover:text-foreground dark:hover:bg-surface-hover hover:bg-muted/50 dark:hover:border-primary/20 hover:border-primary/10 border border-transparent"
          }`}
          onClick={() => { onPageChange(item.id); onMobileClose(); }}
        >
          <Icon className="h-5 w-5" />
          {item.badge && item.badge > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
              {item.badge > 9 ? "9+" : item.badge}
            </span>
          )}
        </Button>
      );
    }

    return (
      <Button
        key={item.id}
        variant="ghost"
        className={`w-full justify-start h-9 rounded-xl px-3 gap-3 relative ${
          isActive
            ? "dark:bg-primary/15 bg-primary/10 dark:text-primary text-primary border dark:border-primary/40 border-primary/30"
            : "dark:text-muted-foreground text-muted-foreground dark:hover:text-foreground hover:text-foreground dark:hover:bg-surface-hover hover:bg-muted/50"
        }`}
        onClick={() => { onPageChange(item.id); onMobileClose(); }}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left truncate">{item.label}</span>
        {item.badge && item.badge > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-white">
            {item.badge > 9 ? "9+" : item.badge}
          </span>
        )}
      </Button>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}
    <div
      className={`fixed left-0 top-0 h-screen z-50 flex flex-col transition-all duration-300 border-r border-border
        ${collapsed ? "w-[72px]" : "w-[240px]"}
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        dark:bg-gradient-to-b dark:from-[#0E0E18] dark:to-[#0A0A0F] bg-gradient-to-b from-[#fafafa] to-[#f5f5f5]`}
      style={{ boxShadow: "2px 0 24px rgba(0, 0, 0, 0.08)" }}
    >
      {/* Empty header section */}
      <div className="h-16"></div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Logo above nav */}
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 pb-3 border-b dark:border-white/5 border-border mb-1">
            <svg width="32" height="32" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="38" height="38" rx="12" fill="#ffffff"/>
              <rect x="9" y="9" width="20" height="20" rx="8" fill="#ffffff" style={{filter:"drop-shadow(0px 4px 14px rgba(0,0,0,0.12))"}}/>
              <rect x="12" y="12" width="14" height="3.6" rx="2" fill="#6E76FF"/>
              <rect x="12" y="17" width="14" height="3.6" rx="2" fill="#A78BFA"/>
              <rect x="12" y="22" width="14" height="3.6" rx="2" fill="#111827"/>
            </svg>
            <span className="text-sm font-semibold dark:text-white text-foreground tracking-tight">RSP Monitor</span>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center pb-3 border-b dark:border-white/5 border-border mb-1">
            <svg width="28" height="28" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="38" height="38" rx="12" fill="#ffffff"/>
              <rect x="9" y="9" width="20" height="20" rx="8" fill="#ffffff" style={{filter:"drop-shadow(0px 4px 14px rgba(0,0,0,0.12))"}}/>
              <rect x="12" y="12" width="14" height="3.6" rx="2" fill="#6E76FF"/>
              <rect x="12" y="17" width="14" height="3.6" rx="2" fill="#A78BFA"/>
              <rect x="12" y="22" width="14" height="3.6" rx="2" fill="#111827"/>
            </svg>
          </div>
        )}
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            {!collapsed && section.title && (
              <div className="px-3 mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wider dark:text-primary text-primary opacity-90 leading-tight">
                  {section.title}
                </p>
              </div>
            )}
            <div className={collapsed ? "space-y-1.5 flex flex-col items-center" : "space-y-0.5"}>
              {section.items.map(renderNavItem)}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Actions - no harsh divider */}
      <div 
        className={`px-3 py-4 mt-auto space-y-2 ${
          collapsed ? "flex flex-col items-center" : ""
        }`}
        style={{
          borderTop: "1px solid rgba(139, 92, 246, 0.1)"
        }}
      >
        {/* Global Refresh */}
        {onGlobalRefresh && (
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            onClick={handleGlobalRefresh}
            disabled={isRefreshing || cooldownRemaining > 0}
            className={`${
              collapsed ? "w-11 h-11" : "w-full justify-start h-11 gap-3"
            } rounded-xl dark:text-muted-foreground text-muted-foreground dark:hover:text-foreground hover:text-foreground dark:hover:bg-surface-hover hover:bg-muted/50 dark:hover:border-primary/20 hover:border-primary/10 border border-transparent transition-all duration-200 ${
              (isRefreshing || cooldownRemaining > 0) ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <RotateCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""} ${collapsed ? "" : "shrink-0"}`} />
            {!collapsed && <span className="flex-1 text-left">{t(language, "globalRefresh.tooltip")}</span>}
          </Button>
        )}

        {/* Collapse/Expand Toggle - Same style as Refresh button */}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={onToggleCollapse}
          className={`${
            collapsed ? "w-11 h-11" : "w-full justify-start h-11 gap-3"
          } rounded-xl dark:text-muted-foreground text-muted-foreground dark:hover:text-foreground hover:text-foreground dark:hover:bg-surface-hover hover:bg-muted/50 dark:hover:border-primary/20 hover:border-primary/10 border border-transparent transition-all duration-200`}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-left">{t(language, "nav.collapse")}</span>
            </>
          )}
        </Button>
      </div>
    </div>
    </>
  );
}