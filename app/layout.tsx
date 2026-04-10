// app/layout.tsx

import "./globals.css";
import Sidebar from "./sidebar";

export const metadata = {
  title: "内容监控工具",
  description: "多平台内容监控与AI选题分析",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#f8f9fc] text-[#1a1a2e] min-h-screen">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
