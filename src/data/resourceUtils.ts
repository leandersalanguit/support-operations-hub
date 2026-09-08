/**
 * @file resourceUtils.ts
 * @description Shared resource interfaces and utility helpers for product data catalogs
 * (marketing folders, installers, recommended hardware, manuals, quick start guides).
 * Eliminates duplicate category counting, search filtering, and Supabase data normalization.
 */

export interface BaseResourceItem<TCategory extends string = string> {
  id: string;
  name: string;
  categories: TCategory[];
  url: string;
  description?: string;
  [key: string]: any;
}

/**
 * Calculates item counts per category including the special 'All' category.
 * Used across resource directories to render dynamic filter pill badges.
 *
 * @param items List of resource items
 * @param allCategories List of known categories for the domain
 * @returns Map of category name to count of matching items
 */
export function calculateCategoryCounts<T extends { categories: readonly string[] | string[] }>(
  items: readonly T[],
  allCategories: readonly string[]
): Record<string, number> {
  const counts: Record<string, number> = { All: items.length };

  allCategories.forEach((cat) => {
    counts[cat] = items.filter((item) => (item.categories as string[]).includes(cat)).length;
  });

  return counts;
}

/**
 * Dynamically extracts all unique category strings from a list of resource items.
 * Falls back to a default categories array if the items list is empty or items have no categories.
 *
 * @param items List of resource items
 * @param fallbackCategories Optional fallback category list
 * @returns Array of unique category strings
 */
export function extractUniqueCategories<T extends { categories: readonly string[] | string[] }>(
  items: readonly T[],
  fallbackCategories?: readonly string[]
): string[] {
  const set = new Set<string>();

  items.forEach((item) => {
    if (Array.isArray(item.categories)) {
      item.categories.forEach((cat) => {
        if (cat && typeof cat === 'string' && cat.trim()) {
          set.add(cat.trim());
        }
      });
    }
  });

  const list = Array.from(set);
  if (list.length > 0) return list;
  return fallbackCategories ? [...fallbackCategories] : [];
}


/**
 * Options for customizing search and category filtering.
 */
export interface FilterResourceOptions<T> {
  /** Additional text fields to search against (e.g. 'version', 'specifications') */
  searchFields?: (keyof T | string)[];
  /** Custom matcher function if complex predicate logic is required */
  customMatcher?: (item: T, query: string) => boolean;
}

/**
 * Generic search and category filter for resource catalog items.
 * Matches category selections and performs case-insensitive text search across
 * title, category tags, description, and optional metadata fields.
 *
 * @param items Array of resource items
 * @param searchQuery User-entered search string
 * @param selectedCategory Current active category filter ('All' or specific category)
 * @param options Optional custom search fields or matchers
 * @returns Filtered array of items
 */
export function filterResources<
  T extends { name: string; categories: readonly string[] | string[]; description?: string; [key: string]: any }
>(
  items: readonly T[],
  searchQuery: string,
  selectedCategory: string,
  options?: FilterResourceOptions<T>
): T[] {
  const query = searchQuery.trim().toLowerCase();

  return items.filter((item) => {
    // 1. Category filter
    const matchesCategory =
      selectedCategory === 'All' || (item.categories as string[]).includes(selectedCategory);

    if (!matchesCategory) return false;

    // 2. Search query filter
    if (!query) return true;

    // Default search against name and category tags
    const nameMatch = item.name.toLowerCase().includes(query);
    const categoryMatch = (item.categories as string[]).some((cat) =>
      cat.toLowerCase().includes(query)
    );
    const descriptionMatch = item.description
      ? item.description.toLowerCase().includes(query)
      : false;

    if (nameMatch || categoryMatch || descriptionMatch) return true;

    // Compatible products array search (if present on item)
    if (Array.isArray(item.compatibleProducts)) {
      const compatibleMatch = item.compatibleProducts.some((p: string) =>
        p.toLowerCase().includes(query)
      );
      if (compatibleMatch) return true;
    }

    // Additional search fields check
    if (options?.searchFields) {
      for (const field of options.searchFields) {
        const val = item[field as string];
        if (typeof val === 'string' && val.toLowerCase().includes(query)) {
          return true;
        }
      }
    }

    // Custom matcher
    if (options?.customMatcher) {
      return options.customMatcher(item, query);
    }

    return false;
  });
}

/**
 * Normalizes remote Supabase records into typed resource items,
 * falling back gracefully to static mock data if offline, empty, or unconfigured.
 * Matches the Supabase schema pattern established by marketing_resources.
 *
 * @param remoteResources Dynamic rows fetched from Supabase
 * @param fallbackItems Static mock items
 * @param customMapper Optional transformation mapping raw database columns to target interface
 * @returns Normalized array of items
 */
export function mapSupabaseResources<T extends BaseResourceItem>(
  remoteResources: any[] | undefined | null,
  fallbackItems: readonly T[],
  customMapper?: (remote: any) => T
): T[] {
  if (remoteResources && remoteResources.length > 0) {
    return remoteResources.map((record) => {
      if (customMapper) {
        return customMapper(record);
      }

      return {
        id: record.id || `remote-${Math.random().toString(36).substring(2, 9)}`,
        name: record.name || record.title || 'Untitled Resource',
        url: record.url || record.download_url || record.drive_url || '#',
        categories: (Array.isArray(record.categories)
          ? record.categories
          : record.category
            ? [record.category]
            : ['General']) as T['categories'],
        description: record.description || '',
        ...record,
      } as T;
    });
  }

  return [...fallbackItems];
}
