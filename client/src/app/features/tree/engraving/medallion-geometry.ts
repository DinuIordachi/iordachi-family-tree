import { PORTRAIT_RX, PORTRAIT_RY } from '@app/shared/components/avatar-crop/avatar-crop-geometry';

/**
 * One member's medallion on the engraved tree, measured from its centre. Everything that keeps
 * clear of a medallion (leaves, ornaments, branches, neighbouring people) reads these, so the
 * portrait can be resized in one place.
 */

/** How much larger the portrait is drawn than the avatar crop's oval (same proportions). */
export const MEDALLION_SCALE = 2;
export const MEDALLION_RX = PORTRAIT_RX * MEDALLION_SCALE;
export const MEDALLION_RY = PORTRAIT_RY * MEDALLION_SCALE;
/** Laurel ring: how far outside the rim its leaves sit, and how large they are. */
export const LAUREL_OFFSET = 9;
export const LAUREL_LEAF = { rx: 3.6, ry: 8.5 };
/** How far the medallion reaches sideways from its centre: rim plus laurel. */
export const MEDALLION_REACH = MEDALLION_RX + LAUREL_OFFSET + 6;
/** Top of the medallion above its centre, laurel included. */
export const MEDALLION_TOP = MEDALLION_RY + LAUREL_OFFSET + 11;
/** How much larger the name ribbon (band, tails and lettering) is drawn than its own units. */
export const BANNER_SCALE = 1.6;
/** Where the name banner hangs below the centre. */
export const BANNER_Y = MEDALLION_RY + 16 * BANNER_SCALE;
/** The banner's band and the years under it occupy BANNER_TOP … BANNER_BOTTOM below the centre. */
export const BANNER_TOP = BANNER_Y - 14 * BANNER_SCALE;
export const BANNER_BOTTOM = BANNER_Y + 36 * BANNER_SCALE;
/** Height of the band alone (the years line hangs below it). */
export const BANNER_BAND = 28 * BANNER_SCALE;
/** A limb growing out of a household climbs this far before spreading: above the portraits and laurel. */
export const CLEAR_RISE = MEDALLION_RY + 16;
