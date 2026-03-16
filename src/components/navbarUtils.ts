/**
 * Determines the CSS opacity class for the navbar based on scroll and hover states.
 *
 * Logic:
 * - When `isScrolled && !isHovered`: apply scrolled (dimmed) classes → "opacity-50"
 * - When `!isScrolled || isHovered`: apply normal (bright) classes → "opacity-100"
 *
 * @param isScrolled - Whether the page has been scrolled
 * @param isHovered - Whether the navbar is being hovered
 * @returns The opacity class to apply ("opacity-50" for dimmed, "opacity-100" for normal)
 */
export function getNavbarOpacityClass(
  isScrolled: boolean,
  isHovered: boolean
): "opacity-50" | "opacity-100" {
  if (isScrolled && !isHovered) {
    return "opacity-50";
  }
  return "opacity-100";
}

/**
 * Determines if the navbar should be in dimmed state.
 *
 * @param isScrolled - Whether the page has been scrolled
 * @param isHovered - Whether the navbar is being hovered
 * @returns true if navbar should be dimmed, false otherwise
 */
export function isNavbarDimmed(isScrolled: boolean, isHovered: boolean): boolean {
  return isScrolled && !isHovered;
}

/**
 * The expected navigation links for the navbar.
 * These are the only links that should appear in the navbar.
 */
export const EXPECTED_NAV_LINKS = ["Dashboard", "Bancos", "Compras", "Depósitos"] as const;

/**
 * Links that should NOT appear in the navbar (removed links).
 */
export const REMOVED_NAV_LINKS = ["Cartões", "Categorias"] as const;

/**
 * Validates that a given array of nav link labels matches the expected composition.
 * 
 * @param linkLabels - Array of link labels to validate
 * @returns Object with validation results
 */
export function validateNavLinksComposition(linkLabels: string[]): {
  hasExactlyExpectedLinks: boolean;
  containsRemovedLinks: boolean;
  missingLinks: string[];
  unexpectedLinks: string[];
} {
  const expectedSet = new Set(EXPECTED_NAV_LINKS);
  const removedSet = new Set(REMOVED_NAV_LINKS);
  const actualSet = new Set(linkLabels);

  const missingLinks = EXPECTED_NAV_LINKS.filter(link => !actualSet.has(link));
  const unexpectedLinks = linkLabels.filter(link => !expectedSet.has(link));
  const containsRemovedLinks = linkLabels.some(link => removedSet.has(link));

  return {
    hasExactlyExpectedLinks: missingLinks.length === 0 && unexpectedLinks.length === 0,
    containsRemovedLinks,
    missingLinks,
    unexpectedLinks,
  };
}
