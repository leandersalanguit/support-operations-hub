/**
 * @file App.tsx
 * @description Root application orchestrator for Support Operations Hub.
 * Composes domain models, application workflow hooks, and UI presentation components.
 */

import React, { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import {
  useAuthWorkflow,
  useInteractionWorkflow,
  useClientDirectory,
  useTaxonomies,
  TaxonomyProvider,
} from './application';
import { Interaction } from './types';
import { checkInteractionModificationPermission } from './domain';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { WorkInProgress, TabKey } from './components/WorkInProgress';
import { MarketingFolders } from './components/MarketingFolders';
import { InstallersDirectory } from './components/InstallersDirectory';
import { RecommendedHardwareDirectory } from './components/RecommendedHardwareDirectory';
import { ManualsDirectory } from './components/ManualsDirectory';
import { QuickStartGuidesDirectory } from './components/QuickStartGuidesDirectory';
import { ClientDirectory } from './components/ClientDirectory';
import { StatsCards } from './components/StatsCards';
import { InteractionForm } from './components/InteractionForm';
import { InteractionTable } from './components/InteractionTable';
import { EditInteractionModal } from './components/EditInteractionModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { AuthModal } from './components/AuthModal';
import { DemoBanner } from './components/DemoBanner';
import { useTheme } from './utils/theme';
import { useSmoothScrollToElement } from './utils/scroll';

const AppContent: React.FC<{ auth: ReturnType<typeof useAuthWorkflow> }> = ({ auth }) => {
  // ---------------------------------------------------------------------------
  // 1. THEME MANAGEMENT
  // ---------------------------------------------------------------------------
  const { theme, toggleTheme } = useTheme();

  // ---------------------------------------------------------------------------
  // 2. AUTHENTICATION & AGENT PROFILE
  // ---------------------------------------------------------------------------
  const {
    currentUser,
    authLoading,
    isPasswordChangeRequired,
    setIsPasswordChangeRequired,
    userRole,
    currentAgentName,
    currentAgentFullName,
    signOut,
    isDemoMode,
    isDemoAvailable,
    activePersonaId,
    enterDemoMode,
    switchDemoPersona,
    exitDemoMode,
  } = auth;

  // ---------------------------------------------------------------------------
  // 3. TAXONOMIES & DYNAMIC CATALOGS
  // ---------------------------------------------------------------------------
  const taxonomies = useTaxonomies();

  // ---------------------------------------------------------------------------
  // 4. CLIENT CRM DIRECTORY
  // ---------------------------------------------------------------------------
  const { clients, updateClients, recordClientInteraction } = useClientDirectory(
    currentUser,
    isPasswordChangeRequired,
    currentAgentName,
    isDemoMode
  );

  // ---------------------------------------------------------------------------
  // 5. INTERACTION WORKFLOW (Optimistic Local + Realtime Cloud + Sync Queue)
  // ---------------------------------------------------------------------------
  const {
    interactions,
    editingInteraction,
    setEditingInteraction,
    deletingInteraction,
    setDeletingInteraction,
    addInteraction,
    saveEdit,
    confirmDelete,
    resetSampleData,
    clearAllInteractions,
    sync,
  } = useInteractionWorkflow({
    currentUser,
    currentAgentName,
    isPasswordChangeRequired,
    isDemoMode,
    onClientLogged: recordClientInteraction,
  });

  // ---------------------------------------------------------------------------
  // 6. NAVIGATION & UI VIEW STATES
  // ---------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<TabKey>('shift-summary');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Surface sync errors into error banner if any
  const effectiveError = errorMessage || sync.syncErrorMessage;

  // ---------------------------------------------------------------------------
  // 7. SMOOTH SCROLL ANIMATION FOR FORM SUBMISSION
  // ---------------------------------------------------------------------------
  const { targetRef: dataRef, triggerScroll: handleFormSubmit } =
    useSmoothScrollToElement<HTMLDivElement>({ offset: 80, duration: 700 });

  // ---------------------------------------------------------------------------
  // 8. INTERACTION CRUD HANDLERS
  // ---------------------------------------------------------------------------
  const handleEdit = useCallback(
    (item: Interaction) => {
      const authCheck = checkInteractionModificationPermission(
        'edit',
        item.agent,
        currentUser,
        userRole,
        currentAgentName
      );
      if (!authCheck.allowed) {
        setErrorMessage(
          authCheck.errorMessage ||
            'You are only authorized to edit your own entries. Team Leads can edit any entry.'
        );
        return;
      }
      setEditingInteraction(item);
    },
    [currentUser, userRole, currentAgentName, setEditingInteraction]
  );

  const handleDelete = useCallback(
    (item: Interaction) => {
      const authCheck = checkInteractionModificationPermission(
        'delete',
        item.agent,
        currentUser,
        userRole,
        currentAgentName
      );
      if (!authCheck.allowed) {
        setErrorMessage(
          authCheck.errorMessage ||
            'You are only authorized to delete your own entries. Team Leads can delete any entry.'
        );
        return;
      }
      setDeletingInteraction(item);
    },
    [currentUser, userRole, currentAgentName, setDeletingInteraction]
  );

  const handleCloseEditModal = useCallback(() => {
    setEditingInteraction(null);
  }, [setEditingInteraction]);

  const handleCloseDeleteModal = useCallback(() => {
    setDeletingInteraction(null);
  }, [setDeletingInteraction]);

  const handleDismissError = useCallback(() => {
    setErrorMessage(null);
    sync.setSyncErrorMessage(null);
  }, [sync]);

  // ---------------------------------------------------------------------------
  // 9. CONDITIONAL SCREENS (Loading & Authentication)
  // ---------------------------------------------------------------------------
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white select-none">
        <Loader2 className="w-9 h-9 text-fotoblue-400 animate-spin mb-3" />
        <p className="text-sm font-semibold tracking-wide text-slate-300">
          Loading Support Operations Hub...
        </p>
      </div>
    );
  }

  if (!currentUser || isPasswordChangeRequired) {
    return (
      <AuthModal
        user={currentUser}
        isPasswordChangeRequired={isPasswordChangeRequired}
        onAuthSuccess={() => {
          setIsPasswordChangeRequired(false);
        }}
        onEnterDemo={isDemoAvailable ? enterDemoMode : undefined}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // 10. MAIN APP SHELL
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-row selection:bg-fotoblue-500 selection:text-white transition-colors duration-150">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        interactionsCount={interactions.length}
        clientsCount={clients.length}
        syncStatus={sync.syncStatus}
        pendingSyncCount={sync.pendingSyncCount}
        onRetrySync={sync.drainQueue}
        agentName={currentAgentFullName || currentAgentName}
        userRole={userRole}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSignOut={signOut}
      />

      {/* Main Content Area & Top Navbar */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Encapsulated Demo Preview Notice & Switcher */}
        {isDemoMode && (
          <DemoBanner
            activePersonaId={activePersonaId}
            onSwitchPersona={switchDemoPersona}
            onResetDemoData={resetSampleData}
            onExitDemo={exitDemoMode}
          />
        )}

        {/* Top Navigation */}
        <Navbar
          interactions={interactions}
          agentName={currentAgentName}
          userRole={userRole}
          isDemo={isDemoMode}
          syncStatus={sync.syncStatus}
          pendingSyncCount={sync.pendingSyncCount}
          onRetrySync={sync.drainQueue}
          theme={theme}
          onToggleTheme={toggleTheme}
          onResetSampleData={resetSampleData}
          onClearAll={clearAllInteractions}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onSignOut={signOut}
        />

        {/* Cloud Sync / Error Notification Banner */}
        {effectiveError && (
          <div
            className={`border-b px-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
              sync.pendingSyncCount > 0
                ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            <span>{sync.pendingSyncCount > 0 ? '🔄' : '⚠️'}</span>
            <span>{effectiveError}</span>
            {(sync.pendingSyncCount > 0 || sync.syncStatus === 'error') && (
              <button
                onClick={sync.drainQueue}
                className="ml-3 px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer shadow-2xs"
              >
                Retry Now
              </button>
            )}
            {sync.pendingSyncCount > 0 && (
              <button
                onClick={sync.clearQueue}
                className="ml-1.5 px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md transition-colors cursor-pointer shadow-2xs"
                title="Discard stuck pending changes if they were deleted or invalid"
              >
                Discard Pending
              </button>
            )}
            <button
              onClick={handleDismissError}
              className="ml-1.5 px-2 py-0.5 text-xs font-bold opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Content Viewports */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'shift-summary' ? (
            <>
              {/* Quick Shift Summary Cards */}
              <StatsCards interactions={interactions} />

              {/* Interaction Input Form */}
              <InteractionForm
                agentName={currentAgentName}
                userRole={userRole}
                clients={clients}
                interactions={interactions}
                onAddInteraction={addInteraction}
                onSubmitSuccess={handleFormSubmit}
              />

              <div ref={dataRef} className="scroll-mt-24">
                {/* History Log Table */}
                <InteractionTable
                  interactions={interactions}
                  currentUser={currentUser}
                  userRole={userRole}
                  currentAgentName={currentAgentName}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            </>
          ) : activeTab === 'client-directory' ? (
            /* Dedicated Client Directory Management View */
            <ClientDirectory
              clients={clients}
              currentAgentName={currentAgentName}
              onUpdateClients={updateClients}
              onNavigateToSummary={() => setActiveTab('shift-summary')}
            />
          ) : activeTab === 'marketing-folders' ? (
            /* Dedicated Marketing Folders Directory */
            <MarketingFolders
              resources={taxonomies.marketingResources}
              onNavigateToSummary={() => setActiveTab('shift-summary')}
            />
          ) : activeTab === 'installer' ? (
            /* Dedicated Product Installers Directory */
            <InstallersDirectory
              installers={taxonomies.installers}
              onNavigateToSummary={() => setActiveTab('shift-summary')}
            />
          ) : activeTab === 'recommended-hardware' ? (
            /* Dedicated Recommended Hardware Directory */
            <RecommendedHardwareDirectory
              hardware={taxonomies.recommendedHardware}
              onNavigateToSummary={() => setActiveTab('shift-summary')}
            />
          ) : activeTab === 'manuals' ? (
            /* Dedicated Product Manuals Directory */
            <ManualsDirectory
              manuals={taxonomies.manuals}
              onNavigateToSummary={() => setActiveTab('shift-summary')}
            />
          ) : activeTab === 'quick-start-guide' ? (
            /* Dedicated Quick Start Guides Directory */
            <QuickStartGuidesDirectory
              guides={taxonomies.quickStartGuides}
              onNavigateToSummary={() => setActiveTab('shift-summary')}
            />
          ) : (
            /* Work In Progress Tab Content for other Product Links */
            <WorkInProgress
              activeTab={activeTab}
              onNavigateToSummary={() => setActiveTab('shift-summary')}
            />
          )}

        </main>
      </div>

      {/* Modals */}
      <EditInteractionModal
        interaction={editingInteraction}
        currentAgentName={currentAgentName}
        clients={clients}
        interactions={interactions}
        isOpen={!!editingInteraction}
        onClose={handleCloseEditModal}
        onSave={saveEdit}
      />

      <DeleteConfirmModal
        interaction={deletingInteraction}
        isOpen={!!deletingInteraction}
        onClose={handleCloseDeleteModal}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export const App: React.FC = () => {
  const auth = useAuthWorkflow();

  return (
    <TaxonomyProvider user={auth.currentUser}>
      <AppContent auth={auth} />
    </TaxonomyProvider>
  );
};

export default App;
