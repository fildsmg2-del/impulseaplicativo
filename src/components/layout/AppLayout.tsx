import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { CommandPalette } from '../CommandPalette';
import { AnnouncementWatcher } from './AnnouncementWatcher';
import { PresenceTracker } from './PresenceTracker';
import { PwaHandler } from '../dev/PwaHandler';

import { MobileHeader } from './MobileHeader';
import { BottomNav } from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden noise-bg relative">
      <div className="absolute inset-0 gradient-mesh opacity-50 pointer-events-none" />
      
      {/* Desktop Sidebar */}
      <div className="hidden md:flex relative z-10">
        <AppSidebar />
      </div>

      <CommandPalette />
      <AnnouncementWatcher />
      <PresenceTracker />
      <PwaHandler />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Mobile Top Header */}
        <MobileHeader />

        <main className="flex-1 overflow-x-hidden overflow-y-auto pt-16 pb-20 md:pt-0 md:pb-0">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="reveal-stagger">
              {children}
            </div>
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <BottomNav />
      </div>
    </div>
  );
}
