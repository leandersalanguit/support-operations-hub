/**
 * @file useTaxonomies.ts
 * @description Context and application hook for dynamically loading taxonomies
 * (products, case classifications, marketing resources, installers, recommended hardware,
 * manuals, quick start guides, and commercial support tiers) from PostgreSQL via configRepo.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  configRepo,
  MarketingResource,
  MARKETING_FALLBACK_RESOURCES,
  SupportTier,
  DEFAULT_SUPPORT_TIERS,
} from '../infrastructure/supabase/configRepo';
import { isSupabaseConfigured } from '../infrastructure/supabase/client';
import { CLIENT_PRODUCTS, CASE_CLASSIFICATIONS } from '../domain/interaction/types';
import {
  InstallerItem,
  INSTALLERS,
  RecommendedHardwareItem,
  RECOMMENDED_HARDWARE,
  ManualItem,
  MANUALS,
  QuickStartGuideItem,
  QUICK_START_GUIDES,
} from '../data';

export interface TaxonomyContextValue {
  products: string[];
  classifications: string[];
  marketingResources: MarketingResource[];
  installers: InstallerItem[];
  recommendedHardware: RecommendedHardwareItem[];
  manuals: ManualItem[];
  quickStartGuides: QuickStartGuideItem[];
  supportTiers: SupportTier[];
  isLoading: boolean;
  refreshTaxonomies: () => Promise<void>;
}

export const TaxonomyContext = createContext<TaxonomyContextValue | null>(null);

export interface TaxonomyProviderProps {
  children: React.ReactNode;
  user?: any;
}

export const TaxonomyProvider: React.FC<TaxonomyProviderProps> = ({ children, user }) => {
  const [products, setProducts] = useState<string[]>(() => (isSupabaseConfigured ? [] : [...CLIENT_PRODUCTS]));
  const [classifications, setClassifications] = useState<string[]>(() => (isSupabaseConfigured ? [] : [...CASE_CLASSIFICATIONS]));
  const [marketingResources, setMarketingResources] = useState<MarketingResource[]>([...MARKETING_FALLBACK_RESOURCES]);
  const [installers, setInstallers] = useState<InstallerItem[]>([...INSTALLERS]);
  const [recommendedHardware, setRecommendedHardware] = useState<RecommendedHardwareItem[]>([...RECOMMENDED_HARDWARE]);
  const [manuals, setManuals] = useState<ManualItem[]>([...MANUALS]);
  const [quickStartGuides, setQuickStartGuides] = useState<QuickStartGuideItem[]>([...QUICK_START_GUIDES]);
  const [supportTiers, setSupportTiers] = useState<SupportTier[]>([...DEFAULT_SUPPORT_TIERS]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const userId = user?.id || null;

  const loadTaxonomies = useCallback(async () => {
    try {
      const [
        prodList,
        classList,
        resources,
        installerList,
        hardwareList,
        manualList,
        guideList,
        tiers,
      ] = await Promise.all([
        configRepo.getProducts(),
        configRepo.getClassifications(),
        configRepo.getMarketingResources(),
        configRepo.getInstallers(),
        configRepo.getRecommendedHardware(),
        configRepo.getManuals(),
        configRepo.getQuickStartGuides(),
        configRepo.getSupportTiers(),
      ]);

      if (prodList && prodList.length > 0) setProducts(prodList);
      if (classList && classList.length > 0) setClassifications(classList);
      if (resources && resources.length > 0) setMarketingResources(resources);
      if (installerList && installerList.length > 0) setInstallers(installerList);
      if (hardwareList && hardwareList.length > 0) setRecommendedHardware(hardwareList);
      if (manualList && manualList.length > 0) setManuals(manualList);
      if (guideList && guideList.length > 0) setQuickStartGuides(guideList);
      if (tiers && tiers.length > 0) setSupportTiers(tiers);
    } catch (err) {
      console.warn('[useTaxonomies] Notice: Failed to fetch dynamic taxonomies from cloud, using cached defaults:', err);
      setProducts((prev) => (prev.length > 0 ? prev : [...CLIENT_PRODUCTS]));
      setClassifications((prev) => (prev.length > 0 ? prev : [...CASE_CLASSIFICATIONS]));
      setMarketingResources((prev) => (prev.length > 0 ? prev : [...MARKETING_FALLBACK_RESOURCES]));
      setInstallers((prev) => (prev.length > 0 ? prev : [...INSTALLERS]));
      setRecommendedHardware((prev) => (prev.length > 0 ? prev : [...RECOMMENDED_HARDWARE]));
      setManuals((prev) => (prev.length > 0 ? prev : [...MANUALS]));
      setQuickStartGuides((prev) => (prev.length > 0 ? prev : [...QUICK_START_GUIDES]));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTaxonomies();
  }, [loadTaxonomies, userId]);

  const value = useMemo<TaxonomyContextValue>(
    () => ({
      products,
      classifications,
      marketingResources,
      installers,
      recommendedHardware,
      manuals,
      quickStartGuides,
      supportTiers,
      isLoading,
      refreshTaxonomies: loadTaxonomies,
    }),
    [
      products,
      classifications,
      marketingResources,
      installers,
      recommendedHardware,
      manuals,
      quickStartGuides,
      supportTiers,
      isLoading,
      loadTaxonomies,
    ]
  );

  return React.createElement(TaxonomyContext.Provider, { value }, children);
};

/**
 * Access dynamic application taxonomies (products, case classifications, marketing resources,
 * installers, recommended hardware, manuals, quick start guides, support tiers).
 * Safe to use either inside <TaxonomyProvider> or standalone with fallback defaults.
 */
export function useTaxonomies(): TaxonomyContextValue {
  const context = useContext(TaxonomyContext);
  if (!context) {
    return {
      products: [...CLIENT_PRODUCTS],
      classifications: [...CASE_CLASSIFICATIONS],
      marketingResources: [...MARKETING_FALLBACK_RESOURCES],
      installers: [...INSTALLERS],
      recommendedHardware: [...RECOMMENDED_HARDWARE],
      manuals: [...MANUALS],
      quickStartGuides: [...QUICK_START_GUIDES],
      supportTiers: [...DEFAULT_SUPPORT_TIERS],
      isLoading: false,
      refreshTaxonomies: async () => {},
    };
  }
  return context;
}
