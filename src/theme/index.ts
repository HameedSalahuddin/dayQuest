/**
 * dayQuest theme — re-exports all design tokens as a unified object.
 * Import `theme` or individual token groups from this file.
 */

import {
  palette,
  colors,
  spacing,
  radii,
  borders,
  typography,
  iconSizes,
  shadows,
  durations,
} from './tokens';

export {
  palette,
  colors,
  spacing,
  radii,
  borders,
  typography,
  iconSizes,
  shadows,
  durations,
} from './tokens';

const theme = {
  palette,
  colors,
  spacing,
  radii,
  borders,
  typography,
  iconSizes,
  shadows,
  durations,
} as const;

export default theme;
