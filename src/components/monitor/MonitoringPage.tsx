import { useState } from "react";
import { ProductUrlsPage } from "./ProductUrlsPage";
import { PriceSnapshotsPage } from "./PriceSnapshotsPage";
import { SyncRunsPage } from "./SyncRunsPage";

type SubTab = "urls" | "prices" | "syncs";

export function MonitoringPage({ initialTab = "urls" }: { initialTab?: SubTab }) {
  const [tab, setTab] = useState<SubTab>(initialTab);

  const tabBtnCls = (active: boolean) =>
    `px-5 py-2.5 text-sm font-medium transition-colors ${
      active
        ? "border-b-2 border-black text-black"
        : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent"
    }`;

  return (
    <div className="space-y-6">
      {/* Sub-tab bar */}
      <div className="border-b border-gray-200 flex gap-1">
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
