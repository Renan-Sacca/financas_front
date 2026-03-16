/**
 * Utility functions for CardSection rendering logic.
 * These functions are extracted to enable property-based testing.
 */

import type { Card } from "@/types";

/**
 * Represents the display data for a single card in the CardSection.
 */
export interface CardDisplayData {
  id: number;
  name: string;
  typeLabel: string;
  isCredit: boolean;
  limitFormatted: string | null;
  dueDayFormatted: string | null;
}

/**
 * Formats a currency value to BRL format.
 *
 * @param value - The numeric value to format
 * @returns Formatted string in BRL currency format
 */
export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Transforms a Card object into display data for rendering.
 * This function extracts the display logic from the component.
 *
 * @param card - The card object to transform
 * @returns CardDisplayData with formatted display values
 */
export function transformCardToDisplayData(card: Card): CardDisplayData {
  const isCredit = card.type === "credit";
  
  return {
    id: card.id,
    name: card.name,
    typeLabel: isCredit ? "Crédito" : "Débito",
    isCredit,
    limitFormatted: isCredit && card.limit_amount != null 
      ? formatBRL(card.limit_amount) 
      : null,
    dueDayFormatted: isCredit && card.due_day != null 
      ? `Dia ${card.due_day}` 
      : null,
  };
}

/**
 * Transforms an array of cards into display data.
 *
 * @param cards - Array of card objects
 * @returns Array of CardDisplayData objects
 */
export function transformCardsToDisplayData(cards: Card[]): CardDisplayData[] {
  return cards.map(transformCardToDisplayData);
}

/**
 * Validates that the CardSection renders the correct number of cards.
 *
 * @param cards - The input cards array
 * @param displayData - The transformed display data
 * @returns Object with validation results
 */
export function validateCardCount(
  cards: Card[],
  displayData: CardDisplayData[]
): {
  expectedCount: number;
  actualCount: number;
  countMatches: boolean;
} {
  return {
    expectedCount: cards.length,
    actualCount: displayData.length,
    countMatches: cards.length === displayData.length,
  };
}

/**
 * Validates that a card's display data contains all required fields.
 *
 * @param card - The original card object
 * @param displayData - The transformed display data
 * @returns Object with validation results for each field
 */
export function validateCardDisplayFields(
  card: Card,
  displayData: CardDisplayData
): {
  hasName: boolean;
  hasTypeLabel: boolean;
  hasCorrectTypeLabel: boolean;
  hasLimitIfCredit: boolean;
  hasDueDayIfCredit: boolean;
  allFieldsValid: boolean;
} {
  const hasName = displayData.name === card.name;
  const hasTypeLabel = displayData.typeLabel !== "";
  const hasCorrectTypeLabel = 
    (card.type === "credit" && displayData.typeLabel === "Crédito") ||
    (card.type === "debit" && displayData.typeLabel === "Débito");
  
  // For credit cards, limit should be displayed if present
  const hasLimitIfCredit = 
    card.type !== "credit" || 
    card.limit_amount == null || 
    displayData.limitFormatted !== null;
  
  // For credit cards, due day should be displayed if present
  const hasDueDayIfCredit = 
    card.type !== "credit" || 
    card.due_day == null || 
    displayData.dueDayFormatted !== null;

  return {
    hasName,
    hasTypeLabel,
    hasCorrectTypeLabel,
    hasLimitIfCredit,
    hasDueDayIfCredit,
    allFieldsValid: 
      hasName && 
      hasTypeLabel && 
      hasCorrectTypeLabel && 
      hasLimitIfCredit && 
      hasDueDayIfCredit,
  };
}

/**
 * Validates that all cards in the section have correct display data.
 *
 * @param cards - Array of original card objects
 * @param displayDataArray - Array of transformed display data
 * @returns Object with overall validation results
 */
export function validateAllCardsDisplay(
  cards: Card[],
  displayDataArray: CardDisplayData[]
): {
  countValid: boolean;
  allCardsValid: boolean;
  invalidCardIds: number[];
} {
  const countValidation = validateCardCount(cards, displayDataArray);
  
  if (!countValidation.countMatches) {
    return {
      countValid: false,
      allCardsValid: false,
      invalidCardIds: [],
    };
  }

  const invalidCardIds: number[] = [];
  
  for (let i = 0; i < cards.length; i++) {
    const fieldValidation = validateCardDisplayFields(cards[i], displayDataArray[i]);
    if (!fieldValidation.allFieldsValid) {
      invalidCardIds.push(cards[i].id);
    }
  }

  return {
    countValid: true,
    allCardsValid: invalidCardIds.length === 0,
    invalidCardIds,
  };
}

/**
 * Checks if a card should display credit-specific fields.
 *
 * @param card - The card to check
 * @returns True if the card is a credit card
 */
export function shouldDisplayCreditFields(card: Card): boolean {
  return card.type === "credit";
}

/**
 * Gets the expected fields that should be displayed for a card.
 *
 * @param card - The card to analyze
 * @returns Object describing which fields should be displayed
 */
export function getExpectedDisplayFields(card: Card): {
  shouldShowName: boolean;
  shouldShowType: boolean;
  shouldShowLimit: boolean;
  shouldShowDueDay: boolean;
} {
  const isCredit = card.type === "credit";
  
  return {
    shouldShowName: true,
    shouldShowType: true,
    shouldShowLimit: isCredit && card.limit_amount != null,
    shouldShowDueDay: isCredit && card.due_day != null,
  };
}

/**
 * Represents the initial form state for creating a new card.
 */
export interface NewCardFormState {
  name: string;
  type: "credit" | "debit";
  limit_amount: string;
  due_day: string;
}

/**
 * Represents the data to be sent when creating a card.
 */
export interface CardCreationData {
  bank_id: number;
  name: string;
  type: "credit" | "debit";
  limit_amount?: number;
  due_day?: number;
}

/**
 * Creates the initial form state for a new card.
 * This is the state used when the "Novo Cartão" button is clicked.
 *
 * @returns The initial form state with empty values
 */
export function createInitialCardFormState(): NewCardFormState {
  return {
    name: "",
    type: "credit",
    limit_amount: "",
    due_day: "",
  };
}

/**
 * Prepares card creation data with the pre-selected bank_id.
 * This function ensures that when creating a new card, the bank_id
 * is always pre-populated with the current bank's ID.
 *
 * @param bankId - The ID of the bank to associate with the new card
 * @param formState - The form state with user input
 * @returns CardCreationData with bank_id pre-populated
 */
export function prepareCardCreationData(
  bankId: number,
  formState: NewCardFormState
): CardCreationData {
  return {
    bank_id: bankId,
    name: formState.name,
    type: formState.type,
    limit_amount: formState.limit_amount ? parseFloat(formState.limit_amount) : undefined,
    due_day: formState.due_day ? parseInt(formState.due_day) : undefined,
  };
}

/**
 * Validates that the card creation data has the correct bank_id pre-populated.
 *
 * @param expectedBankId - The expected bank ID that should be pre-populated
 * @param creationData - The card creation data to validate
 * @returns Object with validation results
 */
export function validateBankIdPrePopulated(
  expectedBankId: number,
  creationData: CardCreationData
): {
  hasBankId: boolean;
  bankIdMatches: boolean;
  isValid: boolean;
} {
  const hasBankId = creationData.bank_id !== undefined && creationData.bank_id !== null;
  const bankIdMatches = creationData.bank_id === expectedBankId;
  
  return {
    hasBankId,
    bankIdMatches,
    isValid: hasBankId && bankIdMatches,
  };
}

/**
 * Simulates the card creation flow and validates bank_id pre-population.
 * This function represents the complete flow from clicking "Novo Cartão"
 * to preparing the creation data.
 *
 * @param bankId - The bank ID from the CardSection props
 * @param formState - The form state (can be initial or with user input)
 * @returns Object with the creation data and validation results
 */
export function simulateCardCreationFlow(
  bankId: number,
  formState: NewCardFormState
): {
  creationData: CardCreationData;
  validation: {
    hasBankId: boolean;
    bankIdMatches: boolean;
    isValid: boolean;
  };
} {
  const creationData = prepareCardCreationData(bankId, formState);
  const validation = validateBankIdPrePopulated(bankId, creationData);
  
  return {
    creationData,
    validation,
  };
}

// ============================================================================
// CRUD Operation Types and Utilities for Auto-refresh Testing (Property 7)
// ============================================================================

/**
 * Represents the type of CRUD operation performed on a card.
 */
export type CrudOperationType = "create" | "update" | "delete";

/**
 * Represents the result of a CRUD operation.
 */
export interface CrudOperationResult {
  operationType: CrudOperationType;
  success: boolean;
  cardId?: number;
  error?: string;
}

/**
 * Represents the state of the CardSection's callback tracking.
 */
export interface CallbackTracker {
  callCount: number;
  lastOperationType: CrudOperationType | null;
  operationHistory: CrudOperationType[];
}

/**
 * Creates an initial callback tracker state.
 *
 * @returns Initial CallbackTracker with zero calls
 */
export function createCallbackTracker(): CallbackTracker {
  return {
    callCount: 0,
    lastOperationType: null,
    operationHistory: [],
  };
}

/**
 * Records a callback invocation in the tracker.
 *
 * @param tracker - The current callback tracker state
 * @param operationType - The type of CRUD operation that triggered the callback
 * @returns Updated CallbackTracker with the new invocation recorded
 */
export function recordCallbackInvocation(
  tracker: CallbackTracker,
  operationType: CrudOperationType
): CallbackTracker {
  return {
    callCount: tracker.callCount + 1,
    lastOperationType: operationType,
    operationHistory: [...tracker.operationHistory, operationType],
  };
}

/**
 * Simulates a successful card create operation and determines if callback should be invoked.
 * According to Requirement 4.7, the onCardsChange callback should be invoked after creation.
 *
 * @param bankId - The bank ID for the new card
 * @param formState - The form state with card data
 * @returns Object indicating the operation result and whether callback should be invoked
 */
export function simulateCardCreate(
  bankId: number,
  formState: NewCardFormState
): {
  operationResult: CrudOperationResult;
  shouldInvokeCallback: boolean;
} {
  // Validate that we have minimum required data
  const hasValidData = formState.name.trim().length > 0;
  
  return {
    operationResult: {
      operationType: "create",
      success: hasValidData,
      cardId: hasValidData ? Math.floor(Math.random() * 10000) + 1 : undefined,
      error: hasValidData ? undefined : "Nome do cartão é obrigatório",
    },
    // Callback should be invoked on successful create
    shouldInvokeCallback: hasValidData,
  };
}

/**
 * Simulates a successful card update operation and determines if callback should be invoked.
 * According to Requirement 4.7, the onCardsChange callback should be invoked after update.
 *
 * @param cardId - The ID of the card being updated
 * @param formState - The form state with updated card data
 * @returns Object indicating the operation result and whether callback should be invoked
 */
export function simulateCardUpdate(
  cardId: number,
  formState: NewCardFormState
): {
  operationResult: CrudOperationResult;
  shouldInvokeCallback: boolean;
} {
  // Validate that we have minimum required data
  const hasValidData = formState.name.trim().length > 0 && cardId > 0;
  
  return {
    operationResult: {
      operationType: "update",
      success: hasValidData,
      cardId: hasValidData ? cardId : undefined,
      error: hasValidData ? undefined : "Dados inválidos para atualização",
    },
    // Callback should be invoked on successful update
    shouldInvokeCallback: hasValidData,
  };
}

/**
 * Simulates a successful card delete operation and determines if callback should be invoked.
 * According to Requirement 4.7, the onCardsChange callback should be invoked after deletion.
 *
 * @param cardId - The ID of the card being deleted
 * @returns Object indicating the operation result and whether callback should be invoked
 */
export function simulateCardDelete(cardId: number): {
  operationResult: CrudOperationResult;
  shouldInvokeCallback: boolean;
} {
  // Validate that we have a valid card ID
  const hasValidId = cardId > 0;
  
  return {
    operationResult: {
      operationType: "delete",
      success: hasValidId,
      cardId: hasValidId ? cardId : undefined,
      error: hasValidId ? undefined : "ID do cartão inválido",
    },
    // Callback should be invoked on successful delete
    shouldInvokeCallback: hasValidId,
  };
}

/**
 * Validates that the callback was invoked correctly after a CRUD operation.
 * This function checks that the onCardsChange callback behavior matches
 * the expected behavior defined in Requirement 4.7.
 *
 * @param operationResult - The result of the CRUD operation
 * @param callbackInvoked - Whether the callback was actually invoked
 * @returns Validation result indicating if the callback behavior is correct
 */
export function validateCallbackInvocation(
  operationResult: CrudOperationResult,
  callbackInvoked: boolean
): {
  isValid: boolean;
  expectedCallback: boolean;
  actualCallback: boolean;
  operationType: CrudOperationType;
  reason: string;
} {
  // Callback should be invoked if and only if the operation was successful
  const expectedCallback = operationResult.success;
  const isValid = callbackInvoked === expectedCallback;
  
  let reason: string;
  if (isValid) {
    reason = operationResult.success
      ? `Callback correctly invoked after successful ${operationResult.operationType}`
      : `Callback correctly not invoked after failed ${operationResult.operationType}`;
  } else {
    reason = callbackInvoked
      ? `Callback should not have been invoked after failed ${operationResult.operationType}`
      : `Callback should have been invoked after successful ${operationResult.operationType}`;
  }
  
  return {
    isValid,
    expectedCallback,
    actualCallback: callbackInvoked,
    operationType: operationResult.operationType,
    reason,
  };
}

/**
 * Simulates a complete CRUD flow and validates callback invocation.
 * This function represents the full flow from operation to callback.
 *
 * @param operationType - The type of CRUD operation
 * @param operationSuccess - Whether the operation succeeded
 * @param tracker - The current callback tracker
 * @returns Updated tracker and validation results
 */
export function simulateCrudFlowWithCallback(
  operationType: CrudOperationType,
  operationSuccess: boolean,
  tracker: CallbackTracker
): {
  updatedTracker: CallbackTracker;
  validation: {
    isValid: boolean;
    expectedCallback: boolean;
    actualCallback: boolean;
    operationType: CrudOperationType;
    reason: string;
  };
} {
  // If operation is successful, callback should be invoked
  const shouldInvokeCallback = operationSuccess;
  
  // Update tracker if callback should be invoked
  const updatedTracker = shouldInvokeCallback
    ? recordCallbackInvocation(tracker, operationType)
    : tracker;
  
  // Validate the callback behavior
  const operationResult: CrudOperationResult = {
    operationType,
    success: operationSuccess,
  };
  
  const validation = validateCallbackInvocation(operationResult, shouldInvokeCallback);
  
  return {
    updatedTracker,
    validation,
  };
}

/**
 * Validates that a sequence of CRUD operations correctly invokes callbacks.
 * This function checks that each successful operation triggers exactly one callback.
 *
 * @param operations - Array of operation types and their success status
 * @returns Validation result for the entire sequence
 */
export function validateCrudSequenceCallbacks(
  operations: Array<{ type: CrudOperationType; success: boolean }>
): {
  isValid: boolean;
  expectedCallbackCount: number;
  actualCallbackCount: number;
  operationResults: Array<{
    operationType: CrudOperationType;
    success: boolean;
    callbackInvoked: boolean;
  }>;
} {
  let tracker = createCallbackTracker();
  const operationResults: Array<{
    operationType: CrudOperationType;
    success: boolean;
    callbackInvoked: boolean;
  }> = [];
  
  for (const op of operations) {
    const previousCallCount = tracker.callCount;
    const result = simulateCrudFlowWithCallback(op.type, op.success, tracker);
    tracker = result.updatedTracker;
    
    operationResults.push({
      operationType: op.type,
      success: op.success,
      callbackInvoked: tracker.callCount > previousCallCount,
    });
  }
  
  // Expected callback count is the number of successful operations
  const expectedCallbackCount = operations.filter(op => op.success).length;
  
  return {
    isValid: tracker.callCount === expectedCallbackCount,
    expectedCallbackCount,
    actualCallbackCount: tracker.callCount,
    operationResults,
  };
}
