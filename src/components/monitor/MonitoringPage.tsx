import { useState } from "react";
import { ProductUrlsPage } from "./ProductUrlsPage";
import { PriceSnapshotsPage } from "./PriceSnapshotsPage";
import { SyncRunsPage } from "./SyncRunsPage";

type SubTab = "urls" | "prices" | "syncs";

export function MonitoringPage() {
  const [tab, setTab] = useState<SubTab>("urls");

  const tabBtnCls = (active: boolean) =>
    `px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
      active
        ? "dark:text-primary text-primary dark:border-primary border-primary"
        : "dark:text-muted-foreground text-muted-foreground border-transparent dark:hover:text-foreground hover:text-foreground"
    }`;

  return (
    <div className="space-y-6">
      {/* Sub-tab bar */}
      <div className="border-b dark:border-white/5 border-border flex gap-1">
        <button className={tabBtnCls(tab === "urls")}   onClick={() => setTab("urls")}>Product URLs</button>
        <button className={tabBtnCls(tab === "prices")} onClick={() => setTab("prices")}>Prices</button>
        <button className={tabBtnCls(tab === "syncs")}  onClick={() => setTab("syncs")}>Sync Runs</button>
      </div>

      {tab === "urls"   && <ProductUrlsPage />}
      {tab === "prices" && <PriceSnapshotsPage />}
      {tab === "syncs"  && <SyncRunsPage />}
    </div>
  );
}
