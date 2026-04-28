// app/page.tsx

"use client";

import TabNav from "./tab-nav";
import HomeTab from "./home-tab";
import ContentTab from "./content-tab";
import ReportTab from "./report-tab";
import RecordsTab from "./records-tab";
import FactoryTab from "./factory-tab";
import SettingsTab from "./settings-tab";
import WechatSyncModal from "./wechat-sync-modal";
import { useStore } from "@/store/useStore";

export default function Home() {
  const { activeTab } = useStore();

  return (
    <div className="flex flex-col h-full">
      <TabNav />
      <div className="flex-1 overflow-auto">
        {activeTab === "home" && <HomeTab />}
        {activeTab === "content" && <ContentTab />}
        {activeTab === "report" && <ReportTab />}
        {activeTab === "records" && <RecordsTab />}
        {activeTab === "factory" && <FactoryTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
      <WechatSyncModal />
    </div>
  );
}
