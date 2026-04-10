// app/factory-editor.tsx

"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import FactoryHistory from "./factory-history";
import FactoryContentArea from "./factory-content-area";

export default function FactoryEditor() {
  const { factorySessionId } = useStore();
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/factory/sessions")
      .then((res) => res.json())
      .then((data) => setSessionHistory(data.sessions || []));
  }, []);

  return (
    <div className="flex h-full">
      {/* Left sidebar */}
      <div className="w-72 shrink-0 border-r border-gray-100 bg-white overflow-y-auto">
        <FactoryHistory sessions={sessionHistory} onRefresh={(sessions) => setSessionHistory(sessions)} />
      </div>
      {/* Right content area */}
      <div className="flex-1 overflow-auto">
        <FactoryContentArea />
      </div>
    </div>
  );
}
