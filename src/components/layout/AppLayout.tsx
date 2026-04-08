import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { CommandPalette } from '../CommandPalette';
import { AnnouncementWatcher } from './AnnouncementWatcher';
import { PresenceTracker } from './PresenceTracker';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <CommandPalette />
      <AnnouncementWatcher />
      <PresenceTracker />
      <main className="flex-1 overflow-x-hidden overflow-y-auto max-h-screen">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
