import type { Bank } from "@/types";

/**
 * Generates the navigation path for editing a bank.
 *
 * @param bankId - The ID of the bank to edit
 * @returns The navigation path in the format `/banks/{bankId}/edit`
 */
export function generateBankEditPath(bankId: number): string {
  return `/banks/${bankId}/edit`;
}

/**
 * Validates that a navigation path matches the expected bank edit path format.
 *
 * @param path - The navigation path to validate
 * @param bankId - The expected bank ID
 * @returns True if the path matches `/banks/{bankId}/edit`
 */
export function validateBankEditPath(path: string, bankId: number): boolean {
  const expectedPath = `/banks/${bankId}/edit`;
  return path === expectedPath;
}

/**
 * Extracts the bank ID from a bank edit path.
 *
 * @param path - The navigation path
 * @returns The bank ID if valid, null otherwise
 */
export function extractBankIdFromPath(path: string): number | null {
  const match = path.match(/^\/banks\/(\d+)\/edit$/);
  if (!match) {
    return null;
  }
  const id = parseInt(match[1], 10);
  return isNaN(id) ? null : id;
}

/**
 * Result of validating bank card navigation.
 */
export interface BankCardNavigationResult {
  /** Whether the navigation path is correct */
  isCorrect: boolean;
  /** The generated navigation path */
  generatedPath: string;
  /** The expected navigation path */
  expectedPath: string;
  /** The bank ID used */
  bankId: number;
}

/**
 * Validates that clicking a bank card generates the correct navigation path.
 *
 * @param bank - The bank that was clicked
 * @returns Validation result with path details
 */
export function validateBankCardNavigation(bank: Bank): BankCardNavigationResult {
  const generatedPath = generateBankEditPath(bank.id);
  const expectedPath = `/banks/${bank.id}/edit`;

  return {
    isCorrect: generatedPath === expectedPath,
    generatedPath,
    expectedPath,
    bankId: bank.id,
  };
}

/**
 * Simulates the navigation action when a bank card is clicked.
 * Returns the path that would be navigated to.
 *
 * @param bank - The bank whose card was clicked
 * @returns The navigation path
 */
export function simulateBankCardClick(bank: Bank): string {
  return generateBankEditPath(bank.id);
}

/**
 * Validates that the path follows the correct format for any bank ID.
 *
 * @param bankId - The bank ID to validate
 * @returns Object with validation details
 */
export function validatePathFormat(bankId: number): {
  path: string;
  startsWithBanks: boolean;
  endsWithEdit: boolean;
  containsBankId: boolean;
  isValidFormat: boolean;
} {
  const path = generateBankEditPath(bankId);

  return {
    path,
    startsWithBanks: path.startsWith("/banks/"),
    endsWithEdit: path.endsWith("/edit"),
    containsBankId: path.includes(`/${bankId}/`),
    isValidFormat:
      path.startsWith("/banks/") &&
      path.endsWith("/edit") &&
      path.includes(`/${bankId}/`),
  };
}
