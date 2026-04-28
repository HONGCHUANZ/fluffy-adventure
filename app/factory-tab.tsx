// app/factory-tab.tsx

"use client";

import { useStore } from "@/store/useStore";
import FactoryInput from "./factory-input";
import FactoryEditor from "./factory-editor";
import FactorySettings from "./factory-settings";
import FactoryOptimize from "./factory-optimize";

export default function FactoryTab() {
  const { factoryView } = useStore();

  return (
    <div className="flex flex-col h-full">
      {factoryView === 'input' && <FactoryInput />}
      {factoryView === 'editor' && <FactoryEditor />}
      {factoryView === 'settings' && <FactorySettings />}
      {factoryView === 'optimize' && <FactoryOptimize />}
    </div>
  );
}
