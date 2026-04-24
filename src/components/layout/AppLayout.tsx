import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { CommandPalette } from '../CommandPalette';
import { AnnouncementWatcher } from './AnnouncementWatcher';
import { PresenceTracker } from './PresenceTracker';
import { PwaHandler } from '../dev/PwaHandler';
import { OfflineSyncWatcher } from './OfflineSyncWatcher';
import { DirectMessageWatcher } from './DirectMessageWatcher';

import { MobileHeader } from './MobileHeader';
import { BottomNav } from './BottomNav';
import { ChatWidget } from '../chat/ChatWidget';
import { useOneSignal } from "@/hooks/use-onesignal";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";

interface AppLayoutProps {
  children?: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  useOneSignal();
  useRealtimeNotifications();

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex relative z-50">
        <AppSidebar />
      </div>

      <CommandPalette />
      <AnnouncementWatcher />
      <PresenceTracker />
      <PwaHandler />
      <OfflineSyncWatcher />
      <DirectMessageWatcher />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Mobile Top Header */}
        <MobileHeader />

        <main className="flex-1 overflow-x-hidden overflow-y-auto pt-16 pb-20 md:pt-0 md:pb-0">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="reveal-stagger">
              {children || <Outlet />}
            </div>
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <BottomNav />

        {/* Support Chat Widget */}
        <ChatWidget />
      </div>
    </div>
  );
}
