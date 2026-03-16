import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  generateBankEditPath,
  validateBankEditPath,
  extractBankIdFromPath,
  validateBankCardNavigation,
  simulateBankCardClick,
  validatePathFormat,
} from "./banksPageUtils";
import type { Bank } from "@/types";

/**
 * Arbitrary generator for valid Bank objects.
 */
const bankArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  current_balance: fc.double({ min: -1000000, max: 1000000, noNaN: true }),
  user_id: fc.integer({ min: 1, max: 10000 }),
});

/**
 * Arbitrary generator for valid bank IDs.
 */
const bankIdArbitrary = fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER });

/**
 * Feature: navbar-ui-restructure
 * Property 3: Bank card click navigates to /banks/{id}/edit
 *
 * **Validates: Requirements 3.1**
 *
 * Property: For any bank card clicked in BanksPage, the navigation should be
 * called with the path `/banks/{bank.id}/edit`.
 */
describe("Bank Card Navigation", () => {
  describe("Property 3: Bank card click navigates to /banks/{id}/edit", () => {
    /**
     * Test that clicking any bank card generates the correct navigation path.
     * Validates: Requirement 3.1 - WHEN o usuário clica em um card de banco na BanksPage,
     * THE Sistema SHALL navegar para a Bank_Edit_Page correspondente
     */
    it("should navigate to /banks/{bank.id}/edit for any bank card clicked", () => {
      fc.assert(
        fc.property(bankArbitrary, (bank: Bank) => {
          const navigationPath = simulateBankCardClick(bank);
          const expectedPath = `/banks/${bank.id}/edit`;

          // The navigation path should exactly match the expected format
          expect(navigationPath).toBe(expectedPath);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that the generated path always starts with /banks/.
     */
    it("should always generate a path starting with /banks/", () => {
      fc.assert(
        fc.property(bankArbitrary, (bank: Bank) => {
          const path = generateBankEditPath(bank.id);

          expect(path.startsWith("/banks/")).toBe(true);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that the generated path always ends with /edit.
     */
    it("should always generate a path ending with /edit", () => {
      fc.assert(
        fc.property(bankArbitrary, (bank: Bank) => {
          const path = generateBankEditPath(bank.id);

          expect(path.endsWith("/edit")).toBe(true);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that the generated path contains the bank ID.
     */
    it("should always include the bank ID in the path", () => {
      fc.assert(
        fc.property(bankArbitrary, (bank: Bank) => {
          const path = generateBankEditPath(bank.id);

          expect(path).toContain(`/${bank.id}/`);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that the path format is valid for any bank ID.
     */
    it("should generate valid path format for any bank ID", () => {
      fc.assert(
        fc.property(bankIdArbitrary, (bankId: number) => {
          const validation = validatePathFormat(bankId);

          expect(validation.startsWithBanks).toBe(true);
          expect(validation.endsWithEdit).toBe(true);
          expect(validation.containsBankId).toBe(true);
          expect(validation.isValidFormat).toBe(true);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that validateBankCardNavigation returns correct results for any bank.
     */
    it("should validate bank card navigation correctly for any bank", () => {
      fc.assert(
        fc.property(bankArbitrary, (bank: Bank) => {
          const result = validateBankCardNavigation(bank);

          // Navigation should always be correct
          expect(result.isCorrect).toBe(true);
          // Generated path should match expected path
          expect(result.generatedPath).toBe(result.expectedPath);
          // Bank ID should be preserved
          expect(result.bankId).toBe(bank.id);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that extractBankIdFromPath correctly extracts the bank ID.
     */
    it("should extract bank ID from generated path correctly", () => {
      fc.assert(
        fc.property(bankIdArbitrary, (bankId: number) => {
          const path = generateBankEditPath(bankId);
          const extractedId = extractBankIdFromPath(path);

          // The extracted ID should match the original bank ID
          expect(extractedId).toBe(bankId);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that validateBankEditPath returns true for correctly generated paths.
     */
    it("should validate generated paths as correct", () => {
      fc.assert(
        fc.property(bankIdArbitrary, (bankId: number) => {
          const path = generateBankEditPath(bankId);
          const isValid = validateBankEditPath(path, bankId);

          expect(isValid).toBe(true);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that validateBankEditPath returns false for incorrect bank IDs.
     */
    it("should reject paths with mismatched bank IDs", () => {
      fc.assert(
        fc.property(
          bankIdArbitrary,
          bankIdArbitrary.filter((id) => id > 1),
          (bankId1: number, bankId2: number) => {
            // Only test when IDs are different
            if (bankId1 !== bankId2) {
              const path = generateBankEditPath(bankId1);
              const isValid = validateBankEditPath(path, bankId2);

              expect(isValid).toBe(false);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test that the path is deterministic - same bank always produces same path.
     */
    it("should generate deterministic paths for the same bank", () => {
      fc.assert(
        fc.property(bankArbitrary, (bank: Bank) => {
          const path1 = simulateBankCardClick(bank);
          const path2 = simulateBankCardClick(bank);
          const path3 = generateBankEditPath(bank.id);

          // All paths should be identical
          expect(path1).toBe(path2);
          expect(path2).toBe(path3);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that different banks produce different paths.
     */
    it("should generate different paths for different bank IDs", () => {
      fc.assert(
        fc.property(
          bankIdArbitrary,
          bankIdArbitrary,
          (bankId1: number, bankId2: number) => {
            // Only test when IDs are different
            if (bankId1 !== bankId2) {
              const path1 = generateBankEditPath(bankId1);
              const path2 = generateBankEditPath(bankId2);

              expect(path1).not.toBe(path2);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test the complete navigation flow for any bank.
     */
    it("should complete the full navigation flow correctly for any bank", () => {
      fc.assert(
        fc.property(bankArbitrary, (bank: Bank) => {
          // Step 1: Simulate clicking the bank card
          const navigationPath = simulateBankCardClick(bank);

          // Step 2: Validate the path format
          const formatValidation = validatePathFormat(bank.id);
          expect(formatValidation.isValidFormat).toBe(true);

          // Step 3: Validate the path matches expected
          const isValidPath = validateBankEditPath(navigationPath, bank.id);
          expect(isValidPath).toBe(true);

          // Step 4: Extract bank ID from path and verify
          const extractedId = extractBankIdFromPath(navigationPath);
          expect(extractedId).toBe(bank.id);

          // Step 5: Full validation
          const fullValidation = validateBankCardNavigation(bank);
          expect(fullValidation.isCorrect).toBe(true);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
