import { useState, useEffect } from "react";
import { Toaster } from "./components/ui/sonner";
import { ModernSidebar, Page } from "./components/ModernSidebar";
import { useAuth } from "./lib/AuthContext";
import { LoginPage } from "./components/LoginPage";
import { DashboardPage } from "./components/DashboardPage";
import { OrdersPageNew } from "./components/OrdersPageNew";
import { MyPurchasesPage } from "./components/MyPurchasesPage";
import { SettingsPage } from "./components/SettingsPage";
import { NotificationsPage } from "./components/NotificationsPage";
import { MessagesPageNew } from "./components/MessagesPageNew";
import { AccountLauncherPage } from "./components/AccountLauncherPage";
import { StockManagerPage } from "./components/StockManagerPage";
import { ListingsPublisherPage } from "./components/ListingsPublisherPage";
import { PublishedListingsPageNew } from "./components/PublishedListingsPageNew";
import { WalletPage } from "./components/WalletPage";
import { TrackingProductsPage } from "./components/tracking/TrackingProductsPage";
import { TrackingVendorsPage } from "./components/tracking/TrackingVendorsPage";
import { TrackingPublicPage } from "./components/tracking/TrackingPublicPage";
import { MonitorDashboard } from "./components/monitor/MonitorDashboard";
import { CompaniesPage } from "./components/monitor/CompaniesPage";
import { ProductsPage } from "./components/monitor/ProductsPage";
import { MonitoringPage } from "./components/monitor/MonitoringPage";
import { DateRange } from "./components/PageHeader";
import { Language } from "./lib/i18n";

function AppShell() {
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem("language");
    return (savedLanguage === "en" || savedLanguage === "fr") ? savedLanguage : "en";
  });

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const savedState = localStorage.getItem("sidebarCollapsed");
    return savedState === "true";
  });

  const [activePage, setActivePage] = useState<Page>(() => {
    const saved = localStorage.getItem("activePage") as Page | null;
    return saved ?? "monitor-dashboard";
  });
  const [dateRange, setDateRange] = useState<DateRange>("7days");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([
    "Boutique Alice",
    "Frip Tim",
    "Margo Vintage",
  ]);
  const [settingsTab, setSettingsTab] = useState<"profile" | "security" | "preferences" | "employee" | "subscription">("profile");
  const [monitoringTab, setMonitoringTab] = useState<"urls" | "prices" | "syncs">("urls");

  useEffect(() => {
    localStorage.setItem("activePage", activePage);
  }, [activePage]);

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ModernSidebar
        activePage={activePage}
        onPageChange={setActivePage}
        language={language}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <Toaster position="top-right" richColors />

      <div
        className={`flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20 transition-all duration-300 ${
          sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[200px]"
        }`}
      >
        {/* Full-height pages */}
        {(activePage === "launcher" || activePage === "published" || activePage === "messages") && (
          <>
            {activePage === "launcher" && (
              <div className="max-w-[1400px] mx-auto px-6 py-8">
                <AccountLauncherPage language={language} />
              </div>
            )}
            {activePage === "published" && (
              <div className="max-w-[1400px] mx-auto px-6 py-8">
                <PublishedListingsPageNew language={language} />
              </div>
            )}
            {activePage === "messages" && (
              <div className="h-screen px-6">
                <MessagesPageNew language={language} />
              </div>
            )}
          </>
        )}

        {/* Regular pages */}
        {activePage !== "launcher" && activePage !== "published" && activePage !== "messages" && (
          <main>
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
              {activePage === "dashboard" && (
                <DashboardPage
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  selectedAccounts={selectedAccounts}
                  onAccountsChange={setSelectedAccounts}
                  language={language}
                />
              )}
              {activePage === "orders" && <OrdersPageNew language={language} />}
              {activePage === "notifications" && <NotificationsPage language={language} />}
              {activePage === "publisher" && <ListingsPublisherPage language={language} />}
              {activePage === "stock" && <StockManagerPage language={language} />}
              {activePage === "settings" && (
                <SettingsPage
                  language={language}
                  onLanguageChange={setLanguage}
                  theme="light"
                  onThemeChange={() => {}}
                  initialTab={settingsTab}
                />
              )}
              {activePage === "wallet" && (
                <WalletPage
                  language={language}
                  onNavigateToMessages={() => setActivePage("messages")}
                />
              )}
              {activePage === "purchases" && <MyPurchasesPage language={language} />}
              {activePage === "tracking-products" && <TrackingProductsPage language={language} />}
              {activePage === "tracking-vendors" && <TrackingVendorsPage language={language} />}
              {activePage === "tracking-public" && <TrackingPublicPage language={language} />}
              {activePage === "monitor-dashboard" && (
                <MonitorDashboard onNavigate={(page, subTab) => {
                  if (subTab) setMonitoringTab(subTab as "urls" | "prices" | "syncs");
                  setActivePage(page);
                }} />
              )}
              {activePage === "monitor-companies"  && <CompaniesPage />}
              {activePage === "monitor-products"   && <ProductsPage />}
              {activePage === "monitor-monitoring" && <MonitoringPage initialTab={monitoringTab} />}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AppShell />;
}
