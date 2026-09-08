/**
 * @file Sidebar.tsx
 * @description Sidebar navigation component for Support Operations Hub.
 * Provides main navigation between Shift Summary, Client Directory, and Product Links (Installers, Marketing Folders, Quick Start Guides, Recommended Hardware, Manuals, Renewal Links).
 * Features expandable sub-menus, active tab indicator, badges, and responsive drawer support.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  ExternalLink,
  Download,
  FolderOpen,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  X,
  BookOpen,
  Cpu,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Sun,
  Moon,
  Users,
} from 'lucide-react';
import { TabKey } from './WorkInProgress';
import { AppLogo } from './AppLogo';
import { useClickOutside } from './common';

interface SubmenuOption {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const PRODUCT_LINKS_SUBITEMS: SubmenuOption[] = [
  { key: 'installer', label: 'Installers', icon: Download },
  { key: 'marketing-folders', label: 'Marketing Folders', icon: FolderOpen },
  { key: 'quick-start-guide', label: 'Quick Start Guides', icon: BookOpen },
  { key: 'recommended-hardware', label: 'Recommended Hardware', icon: Cpu },
  { key: 'manuals', label: 'Manuals', icon: FileText },
  { key: 'renewal-links', label: 'Renewal Links', icon: RefreshCw, badge: 'WIP' },
];


export interface SidebarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  interactionsCount: number;
  clientsCount?: number;
  syncStatus?: 'connected' | 'syncing' | 'offline' | 'error';
  pendingSyncCount?: number;
  onRetrySync?: () => void;
  agentName?: string;
  userRole?: string;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onSignOut?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
  interactionsCount: _interactionsCount,
  clientsCount: _clientsCount = 0,
  syncStatus = 'connected',
  pendingSyncCount = 0,
  onRetrySync,
  agentName,
  userRole,
  theme = 'light',
  onToggleTheme,
  onSignOut,
}) => {
  const isDark = theme === 'dark';
  // Active flyout popover for collapsed sidebar sections
  const [activeFlyout, setActiveFlyout] = useState<'product-links' | null>(null);
  const flyoutContainerRef = useRef<HTMLDivElement | null>(null);

  // Close flyout when collapsed state changes
  useEffect(() => {
    if (!isCollapsed) {
      setActiveFlyout(null);
    }
  }, [isCollapsed]);

  useClickOutside(flyoutContainerRef, () => setActiveFlyout(null), {
    enabled: isCollapsed && activeFlyout !== null,
    closeOnEscape: true,
  });

  // Always expand Product Links submenu if one of its sub-items is active
  const isProductLinksActive =
    activeTab === 'product-links' ||
    PRODUCT_LINKS_SUBITEMS.some((item) => item.key === activeTab);

  const [productLinksOpen, setProductLinksOpen] = useState<boolean>(true);

  const handleProductLinksHeaderClick = () => {
    if (isCollapsed) {
      setActiveFlyout((prev) => (prev === 'product-links' ? null : 'product-links'));
      return;
    }
    setProductLinksOpen((prev) => !prev);
  };

  const handleItemClick = (tab: TabKey) => {
    setActiveFlyout(null);
    onSelectTab(tab);
    // On mobile view, auto-close sidebar after selection
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800/90 flex flex-col transition-all duration-300 ease-in-out shadow-lg lg:shadow-none ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } w-72 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } lg:sticky lg:top-0 lg:h-screen lg:self-start lg:z-40`}
      >
        {/* Sidebar Header: App Logo & Collapse Button */}
        <div
          className={`h-18 flex items-center border-b border-slate-100 dark:border-slate-800 transition-all duration-300 ${
            isCollapsed ? 'justify-center px-0' : 'justify-between px-4'
          }`}
        >
          {/* Support Operations Hub Logo: Gracefully visible when expanded */}
          {!isCollapsed && (
            <div className="flex items-center min-w-0 overflow-hidden pr-2">
              <AppLogo invertedText={isDark} className="h-7 w-auto max-w-[170px] shrink-0" />
            </div>
          )}

          {/* Action buttons: Collapse Toggle & Mobile Close */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Desktop collapse toggle button */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex items-center justify-center p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                ) : (
                  <PanelLeftClose className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                )}
              </button>
            )}

            {/* Close button for mobile drawer */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation items */}
        <div className={`flex-1 ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto'} py-5 space-y-1.5 scrollbar-thin ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Navigation
            </div>
          )}

          {/* Main Tab 1: Shift Summary */}
          <button
            onClick={() => handleItemClick('shift-summary')}
            title="Shift Summary"
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center px-0' : 'justify-between px-3'
            } py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer group ${
              activeTab === 'shift-summary'
                ? 'bg-gradient-to-r from-fotoblue-600 to-fotodeep-600 text-white shadow-xs font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 truncate'}`}>
              <LayoutDashboard
                className={`w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-110 ${
                  activeTab === 'shift-summary'
                    ? 'text-white'
                    : 'text-fotoblue-600 dark:text-fotoblue-400'
                }`}
              />
              {!isCollapsed && <span className="truncate">Shift Summary</span>}
            </div>
          </button>

          {/* Main Tab: Client Directory (Directly below Shift Summary) */}
          <button
            onClick={() => handleItemClick('client-directory')}
            title="Client Directory"
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center px-0' : 'justify-between px-3'
            } py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer group ${
              activeTab === 'client-directory'
                ? 'bg-gradient-to-r from-fotoblue-600 to-fotodeep-600 text-white shadow-xs font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 truncate'}`}>
              <Users
                className={`w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-110 ${
                  activeTab === 'client-directory'
                    ? 'text-white'
                    : 'text-fotoblue-600 dark:text-fotoblue-400'
                }`}
              />
              {!isCollapsed && <span className="truncate">Client Directory</span>}
            </div>
          </button>

          {/* Main Tab 2: Product Links (Expandable parent group) */}
          <div
            className="pt-2 relative"
            ref={activeFlyout === 'product-links' ? flyoutContainerRef : undefined}
          >
            <button
              onClick={handleProductLinksHeaderClick}
              title="Product Links"
              aria-haspopup="menu"
              aria-expanded={isCollapsed ? activeFlyout === 'product-links' : productLinksOpen}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-0' : 'justify-between px-3'
              } py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer group ${
                (isProductLinksActive && (!productLinksOpen || isCollapsed)) || (isCollapsed && activeFlyout === 'product-links')
                  ? 'bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-800 dark:text-fotoblue-300 font-semibold ring-1 ring-fotoblue-500/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 truncate'}`}>
                <ExternalLink
                  className="w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-110 text-fotoblue-600 dark:text-fotoblue-400"
                />
                {!isCollapsed && (
                  <span className="truncate">Product Links</span>
                )}
              </div>

              {!isCollapsed && (
                <div className="flex items-center gap-1.5">
                  {productLinksOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  )}
                </div>
              )}
            </button>

            {/* Collapsed Flyout Popover Menu for Product Links */}
            {isCollapsed && activeFlyout === 'product-links' && (
              <div
                className="absolute left-full top-0 ml-2.5 z-50 w-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl p-2 animate-fadeIn"
                role="menu"
                aria-label="Product Links Subsections"
              >
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <ExternalLink className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
                    Product Links
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                    {PRODUCT_LINKS_SUBITEMS.length} items
                  </span>
                </div>
                <div className="space-y-0.5">
                  {PRODUCT_LINKS_SUBITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleItemClick(item.key)}
                        role="menuitem"
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer group ${
                          isActive
                            ? 'bg-fotoblue-500 text-white font-semibold shadow-2xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Icon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive
                                ? 'text-white'
                                : 'text-fotoblue-600 dark:text-fotoblue-400'
                            }`}
                          />
                          <span className="truncate leading-tight">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submenu items for Product Links (Expanded sidebar mode) */}
            {productLinksOpen && !isCollapsed && (
              <div className="mt-1 pl-4 pr-1 space-y-1 relative before:absolute before:left-5 before:top-1 before:bottom-1 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
                {PRODUCT_LINKS_SUBITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleItemClick(item.key)}
                      className={`w-full flex items-start justify-between gap-2 pl-3.5 pr-2.5 py-2 rounded-lg font-medium text-xs transition-all cursor-pointer text-left group ${
                        isActive
                          ? 'bg-fotoblue-500 text-white font-semibold shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <Icon
                          className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                            isActive
                              ? 'text-white'
                              : 'text-fotoblue-600 dark:text-fotoblue-400'
                          }`}
                        />
                        <span className="leading-snug break-words flex-1">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap self-start mt-0.5 ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>


        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
          {/* Quick theme toggle in sidebar when not collapsed */}
          {onToggleTheme && !isCollapsed && (
            <button
              onClick={onToggleTheme}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-between text-xs font-medium transition-colors cursor-pointer shadow-2xs"
            >
              <span className="flex items-center gap-2">
                {isDark ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                )}
                <span>Theme</span>
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400">
                {isDark ? 'Dark' : 'Light'}
              </span>
            </button>
          )}

          {!isCollapsed ? (
            <button
              onClick={pendingSyncCount > 0 || syncStatus === 'error' ? onRetrySync : undefined}
              className={`w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700/70 shadow-2xs flex items-center justify-between text-left ${
                pendingSyncCount > 0 || syncStatus === 'error' ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    pendingSyncCount > 0
                      ? 'bg-amber-500 animate-pulse'
                      : syncStatus === 'connected'
                      ? 'bg-emerald-500 animate-pulse'
                      : syncStatus === 'syncing'
                      ? 'bg-fotoblue-500 animate-spin'
                      : syncStatus === 'error'
                      ? 'bg-rose-500'
                      : 'bg-amber-500'
                  }`}
                />
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 capitalize">
                  {pendingSyncCount > 0
                    ? `${pendingSyncCount} Pending Sync`
                    : syncStatus === 'connected'
                    ? 'Cloud Active'
                    : syncStatus === 'syncing'
                    ? 'Syncing DB'
                    : syncStatus === 'error'
                    ? 'Sync Issue'
                    : 'Local Mode'}
                </span>
              </div>
              {(pendingSyncCount > 0 || syncStatus === 'error') && (
                <RefreshCw className={`w-3 h-3 text-slate-400 dark:text-slate-500 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              )}
            </button>
          ) : (
            <div className="flex justify-center py-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  pendingSyncCount > 0
                    ? 'bg-amber-500'
                    : syncStatus === 'connected'
                    ? 'bg-emerald-500'
                    : syncStatus === 'syncing'
                    ? 'bg-fotoblue-500'
                    : 'bg-amber-500'
                }`}
                title={pendingSyncCount > 0 ? `${pendingSyncCount} pending syncs` : `Status: ${syncStatus}`}
              />
            </div>
          )}

          {/* Authenticated Agent Card & Sign Out */}
          {agentName && !isCollapsed && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0 ${
                  userRole === 'team_lead' ? 'bg-fotodeep-800 dark:bg-fotodeep-700' : 'bg-fotoblue-600'
                }`}>
                  {agentName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{agentName}</p>
                  <p className="text-[10px] font-medium flex items-center gap-1">
                    {userRole === 'team_lead' ? (
                      <span className="text-fotodeep-900 dark:text-fotodeep-200 font-bold bg-fotodeep-50 dark:bg-fotodeep-950/60 px-1.5 py-0.2 rounded border border-fotodeep-200 dark:border-fotodeep-800 shadow-2xs">
                        Team Lead
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">Support Agent</span>
                    )}
                  </p>
                </div>
              </div>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="p-1.5 text-rose-600 dark:text-rose-400 hover:text-white bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 dark:hover:bg-rose-600 border border-rose-200/80 dark:border-rose-800/60 hover:border-rose-600 dark:hover:border-rose-600 rounded-lg transition-all shadow-2xs cursor-pointer shrink-0"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {agentName && isCollapsed && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex flex-col items-center gap-2" title={`Signed in as ${agentName}`}>
              <div className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0 ${
                userRole === 'team_lead' ? 'bg-fotodeep-800 dark:bg-fotodeep-700' : 'bg-fotoblue-600'
              }`}>
                {agentName.charAt(0).toUpperCase()}
              </div>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="p-1.5 text-rose-600 dark:text-rose-400 hover:text-white bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 dark:hover:bg-rose-600 border border-rose-200/80 dark:border-rose-800/60 hover:border-rose-600 dark:hover:border-rose-600 rounded-lg transition-all shadow-2xs cursor-pointer"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
