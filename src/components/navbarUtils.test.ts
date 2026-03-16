import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  getNavbarOpacityClass,
  isNavbarDimmed,
  EXPECTED_NAV_LINKS,
  REMOVED_NAV_LINKS,
  validateNavLinksComposition,
} from "./navbarUtils";

/**
 * Feature: navbar-ui-restructure
 * Property 1: Navbar CSS classes follow isScrolled/isHovered state logic
 *
 * **Validates: Requirements 1.1, 1.2**
 *
 * Property: For any combination of `isScrolled` and `isHovered` states,
 * the navbar CSS classes applied should follow the rule:
 * - when `isScrolled && !isHovered`, apply scrolled (dimmed) classes
 * - when `!isScrolled || isHovered`, apply normal (bright) classes
 */
describe("Navbar CSS State Logic", () => {
  describe("Property 1: Navbar CSS classes follow isScrolled/isHovered state logic", () => {
    it("should apply dimmed classes (opacity-50) when isScrolled && !isHovered", () => {
      fc.assert(
        fc.property(fc.boolean(), fc.boolean(), (isScrolled, isHovered) => {
          const opacityClass = getNavbarOpacityClass(isScrolled, isHovered);

          if (isScrolled && !isHovered) {
            // When scrolled and not hovered, should be dimmed
            expect(opacityClass).toBe("opacity-50");
          } else {
            // When not scrolled OR hovered, should be normal (bright)
            expect(opacityClass).toBe("opacity-100");
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should return true for isNavbarDimmed only when isScrolled && !isHovered", () => {
      fc.assert(
        fc.property(fc.boolean(), fc.boolean(), (isScrolled, isHovered) => {
          const dimmed = isNavbarDimmed(isScrolled, isHovered);

          // The navbar should be dimmed if and only if scrolled AND not hovered
          const expectedDimmed = isScrolled && !isHovered;
          expect(dimmed).toBe(expectedDimmed);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should always show normal appearance when hovered, regardless of scroll state", () => {
      fc.assert(
        fc.property(fc.boolean(), (isScrolled) => {
          // When hovered is true, should always be normal (bright)
          const opacityClass = getNavbarOpacityClass(isScrolled, true);
          expect(opacityClass).toBe("opacity-100");

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should always show normal appearance when not scrolled, regardless of hover state", () => {
      fc.assert(
        fc.property(fc.boolean(), (isHovered) => {
          // When not scrolled, should always be normal (bright)
          const opacityClass = getNavbarOpacityClass(false, isHovered);
          expect(opacityClass).toBe("opacity-100");

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should only show dimmed appearance when scrolled AND not hovered", () => {
      // This is the only case where dimmed should be applied
      const opacityClass = getNavbarOpacityClass(true, false);
      expect(opacityClass).toBe("opacity-50");
    });

    it("should satisfy the logical equivalence: dimmed ⟺ (isScrolled ∧ ¬isHovered)", () => {
      fc.assert(
        fc.property(fc.boolean(), fc.boolean(), (isScrolled, isHovered) => {
          const isDimmed = getNavbarOpacityClass(isScrolled, isHovered) === "opacity-50";
          const expectedDimmed = isScrolled && !isHovered;

          // The logical equivalence must hold
          expect(isDimmed).toBe(expectedDimmed);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Feature: navbar-ui-restructure
 * Property 2: navLinks contains exactly Dashboard, Bancos, Compras, Depósitos
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
 *
 * Property: For any render of the GlassNavbar component, the `navLinks` array
 * should contain exactly 4 items: Dashboard, Bancos, Compras, and Depósitos,
 * and should NOT contain "Cartões" or "Categorias".
 */
describe("Navbar Links Composition", () => {
  describe("Property 2: navLinks contains exactly Dashboard, Bancos, Compras, Depósitos", () => {
    it("should have exactly 4 expected navigation links", () => {
      expect(EXPECTED_NAV_LINKS).toHaveLength(4);
      expect(EXPECTED_NAV_LINKS).toContain("Dashboard");
      expect(EXPECTED_NAV_LINKS).toContain("Bancos");
      expect(EXPECTED_NAV_LINKS).toContain("Compras");
      expect(EXPECTED_NAV_LINKS).toContain("Depósitos");
    });

    it("should identify Cartões and Categorias as removed links", () => {
      expect(REMOVED_NAV_LINKS).toContain("Cartões");
      expect(REMOVED_NAV_LINKS).toContain("Categorias");
    });

    it("should validate correct link composition returns valid", () => {
      fc.assert(
        fc.property(
          fc.constant([...EXPECTED_NAV_LINKS] as string[]),
          (linkLabels) => {
            const result = validateNavLinksComposition(linkLabels);

            expect(result.hasExactlyExpectedLinks).toBe(true);
            expect(result.containsRemovedLinks).toBe(false);
            expect(result.missingLinks).toHaveLength(0);
            expect(result.unexpectedLinks).toHaveLength(0);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should detect when removed links (Cartões, Categorias) are present", () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(...REMOVED_NAV_LINKS), { minLength: 1, maxLength: 2 }),
          (removedLinks) => {
            const linksWithRemoved = [...EXPECTED_NAV_LINKS, ...removedLinks];
            const result = validateNavLinksComposition(linksWithRemoved);

            // Should detect that removed links are present
            expect(result.containsRemovedLinks).toBe(true);
            // Should have unexpected links (the removed ones)
            expect(result.unexpectedLinks.length).toBeGreaterThan(0);
            expect(result.hasExactlyExpectedLinks).toBe(false);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should detect missing expected links", () => {
      fc.assert(
        fc.property(
          fc.subarray([...EXPECTED_NAV_LINKS], { minLength: 0, maxLength: 3 }),
          (partialLinks) => {
            // Only test when we have fewer than all expected links
            if (partialLinks.length < EXPECTED_NAV_LINKS.length) {
              const result = validateNavLinksComposition(partialLinks);

              expect(result.hasExactlyExpectedLinks).toBe(false);
              expect(result.missingLinks.length).toBeGreaterThan(0);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should detect unexpected links that are not in expected or removed lists", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
          (randomLinks) => {
            // Filter out any that happen to match expected or removed links
            const unexpectedOnly = randomLinks.filter(
              (link) =>
                !EXPECTED_NAV_LINKS.includes(link as typeof EXPECTED_NAV_LINKS[number]) &&
                !REMOVED_NAV_LINKS.includes(link as typeof REMOVED_NAV_LINKS[number])
            );

            if (unexpectedOnly.length > 0) {
              const linksWithUnexpected = [...EXPECTED_NAV_LINKS, ...unexpectedOnly];
              const result = validateNavLinksComposition(linksWithUnexpected);

              expect(result.hasExactlyExpectedLinks).toBe(false);
              expect(result.unexpectedLinks.length).toBeGreaterThan(0);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should validate that any permutation of expected links is valid", () => {
      fc.assert(
        fc.property(
          fc.shuffledSubarray([...EXPECTED_NAV_LINKS], { minLength: 4, maxLength: 4 }),
          (shuffledLinks) => {
            const result = validateNavLinksComposition(shuffledLinks);

            // Any permutation of the expected links should be valid
            expect(result.hasExactlyExpectedLinks).toBe(true);
            expect(result.containsRemovedLinks).toBe(false);
            expect(result.missingLinks).toHaveLength(0);
            expect(result.unexpectedLinks).toHaveLength(0);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should never accept Cartões regardless of other links present", () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(...EXPECTED_NAV_LINKS), { minLength: 0, maxLength: 4 }),
          (baseLinks) => {
            const linksWithCartoes = [...baseLinks, "Cartões"];
            const result = validateNavLinksComposition(linksWithCartoes);

            expect(result.containsRemovedLinks).toBe(true);
            expect(result.unexpectedLinks).toContain("Cartões");

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should never accept Categorias regardless of other links present", () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(...EXPECTED_NAV_LINKS), { minLength: 0, maxLength: 4 }),
          (baseLinks) => {
            const linksWithCategorias = [...baseLinks, "Categorias"];
            const result = validateNavLinksComposition(linksWithCategorias);

            expect(result.containsRemovedLinks).toBe(true);
            expect(result.unexpectedLinks).toContain("Categorias");

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
