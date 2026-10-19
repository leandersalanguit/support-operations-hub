import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InstallersDirectory } from '../InstallersDirectory';
import { ManualsDirectory } from '../ManualsDirectory';
import { MarketingFolders } from '../MarketingFolders';
import { QuickStartGuidesDirectory } from '../QuickStartGuidesDirectory';
import { RecommendedHardwareDirectory } from '../RecommendedHardwareDirectory';
import { INSTALLERS } from '../../data/installers';
import { MANUALS } from '../../data/manuals';
import { MARKETING_FOLDERS } from '../../data/marketingFolders';
import { QUICK_START_GUIDES } from '../../data/quickStartGuides';
import { RECOMMENDED_HARDWARE } from '../../data/recommendedHardware';

const onNavigateToSummary = () => {};

describe('resource directories with configured empty results', () => {
  it.each([
    ['installers', <InstallersDirectory installers={[]} onNavigateToSummary={onNavigateToSummary} />, INSTALLERS[0].name],
    ['manuals', <ManualsDirectory manuals={[]} onNavigateToSummary={onNavigateToSummary} />, MANUALS[0].name],
    ['marketing folders', <MarketingFolders resources={[]} onNavigateToSummary={onNavigateToSummary} />, MARKETING_FOLDERS[0].name],
    ['quick start guides', <QuickStartGuidesDirectory guides={[]} onNavigateToSummary={onNavigateToSummary} />, QUICK_START_GUIDES[0].name],
    ['recommended hardware', <RecommendedHardwareDirectory hardware={[]} onNavigateToSummary={onNavigateToSummary} />, RECOMMENDED_HARDWARE[0].name],
  ])('does not restore sample %s', (_catalog, directory, sampleName) => {
    const html = renderToStaticMarkup(directory);

    expect(html).not.toContain(sampleName);
  });
});
