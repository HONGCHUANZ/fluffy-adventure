// store/useStore.ts

import { create } from "zustand";

interface AppState {
  activeCategoryId: string;
  activeTab: string;
  selectedPlatforms: string[];
  selectedDate: string;
  reportView: "date" | "topic";
  topicDays: 7 | 14 | 30;
  sidebarCollapsed: boolean;
  isRefreshing: boolean;
  refreshMessage: string;
  contentKey: number; // increment to force re-fetch

  factoryView: 'input' | 'editor' | 'settings' | 'optimize';
  factorySessionId: string | null;
  factoryInput: string;
  factoryPlatforms: string[];
  factoryTwitterMode: 'single' | 'thread';
  factoryActivePlatform: string;
  factoryOptimizeSource: { platform: string; content: string } | null;
  wechatSyncDraft: {
    sessionId: string;
    platform: string;
    html: string;
    title?: string;
    digest?: string;
    author?: string;
    coverImageUrl?: string;
  } | null;

  setActiveCategory: (id: string) => void;
  setActiveTab: (tab: string) => void;
  togglePlatform: (platform: string) => void;
  setSelectedDate: (date: string) => void;
  setReportView: (view: "date" | "topic") => void;
  setTopicDays: (days: 7 | 14 | 30) => void;
  toggleSidebar: () => void;
  setRefreshing: (value: boolean) => void;
  setRefreshMessage: (msg: string) => void;
  bumpContentKey: () => void;

  setFactoryView: (view: 'input' | 'editor' | 'settings' | 'optimize') => void;
  setFactoryOptimizeSource: (source: { platform: string; content: string } | null) => void;
  setFactorySessionId: (id: string | null) => void;
  setFactoryInput: (input: string) => void;
  toggleFactoryPlatform: (platform: string) => void;
  setFactoryTwitterMode: (mode: 'single' | 'thread') => void;
  setFactoryActivePlatform: (platform: string) => void;
  setWechatSyncDraft: (draft: {
    sessionId: string;
    platform: string;
    html: string;
    title?: string;
    digest?: string;
    author?: string;
    coverImageUrl?: string;
  } | null) => void;
  resetFactoryInput: () => void;
}

export const useStore = create<AppState>((set) => ({
  activeCategoryId: "claudecode",
  activeTab: "home",
  selectedPlatforms: [],
  selectedDate: "4月10日",
  reportView: "date",
  topicDays: 7,
  sidebarCollapsed: false,
  isRefreshing: false,
  refreshMessage: "",
  contentKey: 0,

  factoryView: 'input',
  factorySessionId: null,
  factoryInput: '',
  factoryPlatforms: [],
  factoryTwitterMode: 'single',
  factoryActivePlatform: '公众号文章',
  factoryOptimizeSource: null,
  wechatSyncDraft: null,

  setActiveCategory: (id: string) => set({ activeCategoryId: id, activeTab: "content" }),
  setActiveTab: (tab: string) => set({ activeTab: tab }),
  togglePlatform: (platform: string) =>
    set((state) => {
      if (platform === "all") return { selectedPlatforms: [] };
      const current = state.selectedPlatforms;
      const next = current.includes(platform)
        ? current.filter((p) => p !== platform)
        : [...current, platform];
      return { selectedPlatforms: next };
    }),
  setSelectedDate: (date: string) => set({ selectedDate: date }),
  setReportView: (view: "date" | "topic") => set({ reportView: view }),
  setTopicDays: (days: 7 | 14 | 30) => set({ topicDays: days }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setRefreshing: (value: boolean) => set({ isRefreshing: value }),
  setRefreshMessage: (msg: string) => set({ refreshMessage: msg }),
  bumpContentKey: () => set((state) => ({ contentKey: state.contentKey + 1 })),

  setFactoryView: (view: 'input' | 'editor' | 'settings' | 'optimize') => set({ factoryView: view }),
  setFactorySessionId: (id: string | null) => set({ factorySessionId: id }),
  setFactoryInput: (input: string) => set({ factoryInput: input }),
  toggleFactoryPlatform: (platform: string) =>
    set((state) => {
      const current = state.factoryPlatforms;
      const next = current.includes(platform)
        ? current.filter((p) => p !== platform)
        : [...current, platform];
      return { factoryPlatforms: next };
    }),
  setFactoryTwitterMode: (mode: 'single' | 'thread') => set({ factoryTwitterMode: mode }),
  setFactoryActivePlatform: (platform: string) => set({ factoryActivePlatform: platform }),
  setWechatSyncDraft: (draft) => set({ wechatSyncDraft: draft }),
  resetFactoryInput: () => set({ factoryView: 'input', factorySessionId: null, factoryInput: '', factoryPlatforms: [], factoryTwitterMode: 'single', factoryActivePlatform: '公众号文章', factoryOptimizeSource: null, wechatSyncDraft: null }),
  setFactoryOptimizeSource: (source) => set({ factoryOptimizeSource: source }),
}));
