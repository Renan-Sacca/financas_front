/**
 * Utility functions for BankEditPage data display and editing logic.
 * These functions are extracted to enable property-based testing.
 */

import type { Bank } from "@/types";

/**
 * Represents the form state for editing a bank.
 */
export interface BankFormState {
  name: string;
  balance: string;
}

/**
 * Initializes the form state from a bank object.
 * This is used when loading a bank for editing.
 *
 * @param bank - The bank object to initialize from
 * @returns The initial form state with name and balance as strings
 */
export function initializeBankFormState(bank: Bank): BankFormState {
  return {
    name: bank.name,
    balance: String(bank.current_balance),
  };
}

/**
 * Updates the name field in the form state.
 *
 * @param currentState - The current form state
 * @param newName - The new name value
 * @returns Updated form state with the new name
 */
export function updateBankName(
  currentState: BankFormState,
  newName: string
): BankFormState {
  return {
    ...currentState,
    name: newName,
  };
}

/**
 * Updates the balance field in the form state.
 *
 * @param currentState - The current form state
 * @param newBalance - The new balance value as string
 * @returns Updated form state with the new balance
 */
export function updateBankBalance(
  currentState: BankFormState,
  newBalance: string
): BankFormState {
  return {
    ...currentState,
    balance: newBalance,
  };
}

/**
 * Validates that the form state correctly displays the bank data.
 * The form should display the bank's name and balance.
 *
 * @param bank - The original bank object
 * @param formState - The current form state
 * @returns Object with validation results
 */
export function validateBankDataDisplay(
  bank: Bank,
  formState: BankFormState
): {
  nameDisplayed: boolean;
  balanceDisplayed: boolean;
  allDataDisplayed: boolean;
} {
  const nameDisplayed = formState.name === bank.name;
  const balanceDisplayed = formState.balance === String(bank.current_balance);

  return {
    nameDisplayed,
    balanceDisplayed,
    allDataDisplayed: nameDisplayed && balanceDisplayed,
  };
}

/**
 * Validates that form state changes are correctly reflected.
 * When a field is edited, the form state should update accordingly.
 *
 * @param originalState - The original form state before editing
 * @param updatedState - The form state after editing
 * @param fieldEdited - Which field was edited ('name' or 'balance')
 * @param newValue - The new value that was set
 * @returns Object with validation results
 */
export function validateFormStateUpdate(
  originalState: BankFormState,
  updatedState: BankFormState,
  fieldEdited: "name" | "balance",
  newValue: string
): {
  fieldUpdated: boolean;
  otherFieldPreserved: boolean;
  updateCorrect: boolean;
} {
  if (fieldEdited === "name") {
    const fieldUpdated = updatedState.name === newValue;
    const otherFieldPreserved = updatedState.balance === originalState.balance;
    return {
      fieldUpdated,
      otherFieldPreserved,
      updateCorrect: fieldUpdated && otherFieldPreserved,
    };
  } else {
    const fieldUpdated = updatedState.balance === newValue;
    const otherFieldPreserved = updatedState.name === originalState.name;
    return {
      fieldUpdated,
      otherFieldPreserved,
      updateCorrect: fieldUpdated && otherFieldPreserved,
    };
  }
}

/**
 * Prepares the data for saving to the API.
 * Converts form state back to the format expected by the API.
 *
 * @param formState - The current form state
 * @returns Object with name and current_balance ready for API
 */
export function prepareBankUpdateData(formState: BankFormState): {
  name: string;
  current_balance: number;
} {
  return {
    name: formState.name,
    current_balance: parseFloat(formState.balance) || 0,
  };
}

/**
 * Validates that a bank ID is valid for editing.
 * A valid bank ID must be a positive integer string (no decimals).
 *
 * @param id - The bank ID (can be string from URL params or undefined)
 * @returns Object with validation results
 */
export function validateBankId(id: string | undefined): {
  isValid: boolean;
  parsedId: number | null;
} {
  if (!id) {
    return { isValid: false, parsedId: null };
  }

  // Check if the string represents a valid positive integer (no decimals)
  if (!/^\d+$/.test(id)) {
    return { isValid: false, parsedId: null };
  }

  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId) || parsedId <= 0) {
    return { isValid: false, parsedId: null };
  }

  return { isValid: true, parsedId };
}
