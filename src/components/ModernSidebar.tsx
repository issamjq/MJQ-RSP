import { Package, ChevronLeft, ChevronRight, LogOut, Building2, BarChart2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Language, t } from "../lib/i18n";
import { logout } from "../lib/firebase";
import { APP_VERSION } from "../lib/version";

export type Page = "dashboard" | "orders" | "purchases" | "wallet" | "notifications" | "messages" | "launcher" | "stock" | "publisher" | "published" | "settings" | "tracking-products" | "tracking-vendors" | "tracking-public" | "monitor-dashboard" | "monitor-companies" | "monitor-products" | "monitor-monitoring";

interface ModernSidebarProps {
  activePage: Page;
  onPageChange: (page: Page) => void;
  language: Language;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

interface NavItem {
  id: Page;
  icon: React.ElementType;
  label: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export function ModernSidebar({
  activePage,
  onPageChange,
  language,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}: ModernSidebarProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const sections: NavSection[] = [
    {
      title: "Price Monitor",
      items: [
        { id: "monitor-dashboard"  as Page, icon: ShieldCheck, label: "Overview" },
        { id: "monitor-companies"  as Page, icon: Building2,   label: "Companies" },
        { id: "monitor-products"   as Page, icon: Package,     label: "Products" },
        { id: "monitor-monitoring" as Page, icon: BarChart2,   label: "Monitoring" },
      ],
    },
  ];

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await logout(); } finally { setLoggingOut(false); }
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activePage === item.id;

    if (collapsed) {
      return (
        <button
          key={item.id}
          title={item.label}
          onClick={() => { onPageChange(item.id); onMobileClose(); }}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            isActive
              ? "bg-gray-900 text-white"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <Icon className="h-5 w-5" />
        </button>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => { onPageChange(item.id); onMobileClose(); }}
        className={`w-full flex items-center gap-3 px-3 h-9 rounded-lg text-sm transition-colors ${
          isActive
            ? "bg-gray-100 text-gray-900 font-medium"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={onMobileClose}
        />
      )}

      <div
        className={`fixed left-0 top-0 h-screen z-50 flex flex-col bg-white border-r border-gray-100 transition-all duration-300
          ${collapsed ? "w-[72px]" : "w-[200px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        style={{ boxShadow: "1px 0 8px rgba(0,0,0,0.04)" }}
      >
        {/* Logo */}
        <div className={`flex items-center gap-2.5 px-4 h-14 border-b border-gray-100 ${collapsed ? "justify-center" : ""}`}>
          {/* Black rounded square with white diamond */}
          <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
            <div
              className="w-3 h-3 bg-white rounded-sm"
              style={{ transform: "rotate(45deg)" }}
            />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-gray-900 tracking-tight">MJQ APP</span>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 scrollbar-hide">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-0.5">
              {!collapsed && section.title && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {section.title}
                </p>
              )}
              <div className={collapsed ? "space-y-1 flex flex-col items-center" : "space-y-0.5"}>
                {section.items.map(renderNavItem)}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom controls */}
        <div className={`px-3 py-4 border-t border-gray-100 space-y-1 ${collapsed ? "flex flex-col items-center" : ""}`}>
          {/* Collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className={`${
              collapsed ? "w-10 h-10 flex items-center justify-center" : "w-full flex items-center gap-3 px-3 h-9"
            } rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors`}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{t(language, "nav.collapse")}</span>
              </>
            )}
          </button>

          {/* Log out */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className={`${
              collapsed ? "w-10 h-10 flex items-center justify-center" : "w-full flex items-center gap-3 px-3 h-9"
            } rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <span className="flex-1 text-left">{loggingOut ? "Signing out…" : "Log out"}</span>
            )}
          </button>

          {/* Version badge */}
          {!collapsed && (
            <div className="pt-1 px-3">
              <span className="text-[10px] text-gray-400 font-medium">{APP_VERSION}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
