import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  transformCardToDisplayData,
  transformCardsToDisplayData,
  validateCardCount,
  validateCardDisplayFields,
  validateAllCardsDisplay,
  formatBRL,
  shouldDisplayCreditFields,
  getExpectedDisplayFields,
  createInitialCardFormState,
  prepareCardCreationData,
  validateBankIdPrePopulated,
  simulateCardCreationFlow,
  createCallbackTracker,
  recordCallbackInvocation,
  simulateCardCreate,
  simulateCardUpdate,
  simulateCardDelete,
  validateCallbackInvocation,
  simulateCrudFlowWithCallback,
  validateCrudSequenceCallbacks,
  type NewCardFormState,
  type CrudOperationType,
} from "./cardSectionUtils";
import type { Card } from "@/types";

/**
 * Arbitrary generator for valid Card objects.
 */
const cardArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  type: fc.constantFrom("credit" as const, "debit" as const),
  limit_amount: fc.option(fc.double({ min: 0, max: 1000000, noNaN: true }), { nil: null }),
  due_day: fc.option(fc.integer({ min: 1, max: 31 }), { nil: null }),
  bank_id: fc.integer({ min: 1, max: 10000 }),
  bank_name: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
});

/**
 * Arbitrary generator for credit cards specifically.
 */
const creditCardArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  type: fc.constant("credit" as const),
  limit_amount: fc.option(fc.double({ min: 0, max: 1000000, noNaN: true }), { nil: null }),
  due_day: fc.option(fc.integer({ min: 1, max: 31 }), { nil: null }),
  bank_id: fc.integer({ min: 1, max: 10000 }),
  bank_name: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
});

/**
 * Arbitrary generator for debit cards specifically.
 */
const debitCardArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  type: fc.constant("debit" as const),
  limit_amount: fc.option(fc.double({ min: 0, max: 1000000, noNaN: true }), { nil: null }),
  due_day: fc.option(fc.integer({ min: 1, max: 31 }), { nil: null }),
  bank_id: fc.integer({ min: 1, max: 10000 }),
  bank_name: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
});

/**
 * Arbitrary generator for arrays of cards.
 */
const cardsArrayArbitrary = fc.array(cardArbitrary, { minLength: 0, maxLength: 20 });

/**
 * Feature: navbar-ui-restructure
 * Property 5: CardSection renders all cards with correct fields
 *
 * **Validates: Requirements 4.1, 4.6**
 *
 * Property: For any bank with N associated cards, the CardSection should render
 * exactly N card items, each displaying: name, type (crédito/débito), and for
 * credit cards: limit and due day.
 */
describe("CardSection Rendering", () => {
  describe("Property 5: Card Section Rendering", () => {
    /**
     * Test that CardSection renders exactly N cards for N input cards.
     * Validates: Requirement 4.1 - THE Bank_Edit_Page SHALL exibir uma Card_Section listando todos os cartões associados ao banco
     */
    it("should render exactly N card items for N input cards", () => {
      fc.assert(
        fc.property(cardsArrayArbitrary, (cards: Card[]) => {
          const displayData = transformCardsToDisplayData(cards);
          const validation = validateCardCount(cards, displayData);

          // The number of rendered cards should match the input count
          expect(validation.countMatches).toBe(true);
          expect(validation.actualCount).toBe(cards.length);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that each card displays its name correctly.
     * Validates: Requirement 4.6 - THE Card_Section SHALL exibir para cada cartão: nome
     */
    it("should display the name for each card", () => {
      fc.assert(
        fc.property(cardArbitrary, (card: Card) => {
          const displayData = transformCardToDisplayData(card);

          // The card name should be displayed exactly as provided
          expect(displayData.name).toBe(card.name);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that each card displays its type correctly (crédito/débito).
     * Validates: Requirement 4.6 - THE Card_Section SHALL exibir para cada cartão: tipo (crédito/débito)
     */
    it("should display the correct type label (Crédito/Débito) for each card", () => {
      fc.assert(
        fc.property(cardArbitrary, (card: Card) => {
          const displayData = transformCardToDisplayData(card);

          // Credit cards should show "Crédito", debit cards should show "Débito"
          if (card.type === "credit") {
            expect(displayData.typeLabel).toBe("Crédito");
          } else {
            expect(displayData.typeLabel).toBe("Débito");
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that credit cards display limit when available.
     * Validates: Requirement 4.6 - THE Card_Section SHALL exibir para cada cartão: limite (se crédito)
     */
    it("should display limit for credit cards when limit_amount is present", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constant("credit" as const),
            limit_amount: fc.double({ min: 0, max: 1000000, noNaN: true }),
            due_day: fc.option(fc.integer({ min: 1, max: 31 }), { nil: null }),
            bank_id: fc.integer({ min: 1, max: 10000 }),
          }),
          (card: Card) => {
            const displayData = transformCardToDisplayData(card);

            // Credit cards with limit should display the formatted limit
            expect(displayData.limitFormatted).not.toBeNull();
            expect(displayData.limitFormatted).toBe(formatBRL(card.limit_amount!));

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test that credit cards display due day when available.
     * Validates: Requirement 4.6 - THE Card_Section SHALL exibir para cada cartão: dia de vencimento (se crédito)
     */
    it("should display due day for credit cards when due_day is present", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constant("credit" as const),
            limit_amount: fc.option(fc.double({ min: 0, max: 1000000, noNaN: true }), { nil: null }),
            due_day: fc.integer({ min: 1, max: 31 }),
            bank_id: fc.integer({ min: 1, max: 10000 }),
          }),
          (card: Card) => {
            const displayData = transformCardToDisplayData(card);

            // Credit cards with due_day should display the formatted due day
            expect(displayData.dueDayFormatted).not.toBeNull();
            expect(displayData.dueDayFormatted).toBe(`Dia ${card.due_day}`);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test that debit cards do not display limit or due day.
     * Validates: Requirement 4.6 - limit and due day are only for credit cards
     */
    it("should not display limit or due day for debit cards", () => {
      fc.assert(
        fc.property(debitCardArbitrary, (card: Card) => {
          const displayData = transformCardToDisplayData(card);

          // Debit cards should not display limit or due day
          expect(displayData.limitFormatted).toBeNull();
          expect(displayData.dueDayFormatted).toBeNull();
          expect(displayData.isCredit).toBe(false);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that all cards in an array have valid display data.
     * Validates: Requirements 4.1, 4.6 - all cards should be rendered with correct fields
     */
    it("should render all cards with all required fields correctly", () => {
      fc.assert(
        fc.property(cardsArrayArbitrary, (cards: Card[]) => {
          const displayData = transformCardsToDisplayData(cards);
          const validation = validateAllCardsDisplay(cards, displayData);

          // All cards should be valid
          expect(validation.countValid).toBe(true);
          expect(validation.allCardsValid).toBe(true);
          expect(validation.invalidCardIds).toHaveLength(0);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that card display fields are validated correctly for each card.
     */
    it("should validate all display fields correctly for any card", () => {
      fc.assert(
        fc.property(cardArbitrary, (card: Card) => {
          const displayData = transformCardToDisplayData(card);
          const validation = validateCardDisplayFields(card, displayData);

          // All field validations should pass
          expect(validation.hasName).toBe(true);
          expect(validation.hasTypeLabel).toBe(true);
          expect(validation.hasCorrectTypeLabel).toBe(true);
          expect(validation.hasLimitIfCredit).toBe(true);
          expect(validation.hasDueDayIfCredit).toBe(true);
          expect(validation.allFieldsValid).toBe(true);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that shouldDisplayCreditFields correctly identifies credit cards.
     */
    it("should correctly identify when to display credit-specific fields", () => {
      fc.assert(
        fc.property(cardArbitrary, (card: Card) => {
          const shouldDisplay = shouldDisplayCreditFields(card);

          // Should return true only for credit cards
          expect(shouldDisplay).toBe(card.type === "credit");

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that getExpectedDisplayFields returns correct expectations.
     */
    it("should return correct expected display fields for any card", () => {
      fc.assert(
        fc.property(cardArbitrary, (card: Card) => {
          const expected = getExpectedDisplayFields(card);

          // Name and type should always be shown
          expect(expected.shouldShowName).toBe(true);
          expect(expected.shouldShowType).toBe(true);

          // Limit and due day only for credit cards with values
          if (card.type === "credit") {
            expect(expected.shouldShowLimit).toBe(card.limit_amount != null);
            expect(expected.shouldShowDueDay).toBe(card.due_day != null);
          } else {
            expect(expected.shouldShowLimit).toBe(false);
            expect(expected.shouldShowDueDay).toBe(false);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that empty cards array results in empty display data.
     */
    it("should handle empty cards array correctly", () => {
      const cards: Card[] = [];
      const displayData = transformCardsToDisplayData(cards);
      const validation = validateCardCount(cards, displayData);

      expect(displayData).toHaveLength(0);
      expect(validation.countMatches).toBe(true);
      expect(validation.expectedCount).toBe(0);
      expect(validation.actualCount).toBe(0);
    });

    /**
     * Test that card IDs are preserved in display data.
     */
    it("should preserve card IDs in display data", () => {
      fc.assert(
        fc.property(cardsArrayArbitrary, (cards: Card[]) => {
          const displayData = transformCardsToDisplayData(cards);

          // Each card's ID should be preserved
          for (let i = 0; i < cards.length; i++) {
            expect(displayData[i].id).toBe(cards[i].id);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that bank_id is correctly associated with cards (implicit through input).
     */
    it("should correctly process cards regardless of bank_id", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.array(cardArbitrary, { minLength: 1, maxLength: 10 }),
          (bankId: number, cards: Card[]) => {
            // Simulate cards belonging to a specific bank
            const bankCards = cards.map(card => ({ ...card, bank_id: bankId }));
            const displayData = transformCardsToDisplayData(bankCards);

            // All cards should be processed correctly
            expect(displayData).toHaveLength(bankCards.length);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Feature: navbar-ui-restructure
 * Property 6: Card Creation with Pre-selected Bank
 *
 * **Validates: Requirements 4.3**
 *
 * Property: For any bank being edited, when the "Novo Cartão" button is clicked,
 * the card creation form should have the `bank_id` field pre-populated with the
 * current bank's ID.
 */
describe("Card Creation with Pre-selected Bank", () => {
  describe("Property 6: Card Creation with Pre-selected Bank", () => {
    /**
     * Arbitrary generator for valid bank IDs.
     */
    const bankIdArbitrary = fc.integer({ min: 1, max: 100000 });

    /**
     * Arbitrary generator for card form state with user input.
     */
    const cardFormStateArbitrary: fc.Arbitrary<NewCardFormState> = fc.record({
      name: fc.string({ minLength: 0, maxLength: 100 }),
      type: fc.constantFrom("credit" as const, "debit" as const),
      limit_amount: fc.oneof(
        fc.constant(""),
        fc.double({ min: 0, max: 1000000, noNaN: true }).map(n => n.toString())
      ),
      due_day: fc.oneof(
        fc.constant(""),
        fc.integer({ min: 1, max: 31 }).map(n => n.toString())
      ),
    });

    /**
     * Test that the initial form state is created correctly when "Novo Cartão" is clicked.
     * Validates: Requirement 4.3 - WHEN o usuário clica em "Novo Cartão"
     */
    it("should create initial form state with default values when Novo Cartão is clicked", () => {
      const initialState = createInitialCardFormState();

      expect(initialState.name).toBe("");
      expect(initialState.type).toBe("credit");
      expect(initialState.limit_amount).toBe("");
      expect(initialState.due_day).toBe("");
    });

    /**
     * Test that bank_id is always pre-populated in card creation data for any bank.
     * Validates: Requirement 4.3 - THE Sistema SHALL exibir formulário para criar cartão com bank_id pré-selecionado
     */
    it("should always pre-populate bank_id in card creation data for any bank", () => {
      fc.assert(
        fc.property(bankIdArbitrary, (bankId: number) => {
          const initialFormState = createInitialCardFormState();
          const creationData = prepareCardCreationData(bankId, initialFormState);

          // The bank_id should always be pre-populated with the current bank's ID
          expect(creationData.bank_id).toBe(bankId);
          expect(creationData.bank_id).toBeDefined();
          expect(creationData.bank_id).not.toBeNull();

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that bank_id remains correct regardless of form state changes.
     * Validates: Requirement 4.3 - bank_id should stay pre-selected even as user fills form
     */
    it("should maintain correct bank_id regardless of form state changes", () => {
      fc.assert(
        fc.property(
          bankIdArbitrary,
          cardFormStateArbitrary,
          (bankId: number, formState: NewCardFormState) => {
            const creationData = prepareCardCreationData(bankId, formState);

            // The bank_id should always match the provided bankId, regardless of form state
            expect(creationData.bank_id).toBe(bankId);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test that validateBankIdPrePopulated correctly validates bank_id.
     * Validates: Requirement 4.3 - validation of pre-selected bank_id
     */
    it("should validate bank_id pre-population correctly", () => {
      fc.assert(
        fc.property(bankIdArbitrary, (bankId: number) => {
          const formState = createInitialCardFormState();
          const creationData = prepareCardCreationData(bankId, formState);
          const validation = validateBankIdPrePopulated(bankId, creationData);

          // Validation should pass for correctly pre-populated bank_id
          expect(validation.hasBankId).toBe(true);
          expect(validation.bankIdMatches).toBe(true);
          expect(validation.isValid).toBe(true);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that the complete card creation flow has bank_id pre-populated.
     * Validates: Requirement 4.3 - complete flow from button click to form submission
     */
    it("should have bank_id pre-populated throughout the complete card creation flow", () => {
      fc.assert(
        fc.property(
          bankIdArbitrary,
          cardFormStateArbitrary,
          (bankId: number, formState: NewCardFormState) => {
            const result = simulateCardCreationFlow(bankId, formState);

            // The creation data should have the correct bank_id
            expect(result.creationData.bank_id).toBe(bankId);

            // The validation should confirm bank_id is correctly pre-populated
            expect(result.validation.isValid).toBe(true);
            expect(result.validation.hasBankId).toBe(true);
            expect(result.validation.bankIdMatches).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test that bank_id is correctly pre-populated for different bank IDs.
     * Validates: Requirement 4.3 - works for any bank being edited
     */
    it("should correctly pre-populate bank_id for any valid bank ID", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
          (bankId: number) => {
            const formState = createInitialCardFormState();
            const creationData = prepareCardCreationData(bankId, formState);

            // Bank ID should be exactly the one provided
            expect(creationData.bank_id).toStrictEqual(bankId);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test that form data is correctly combined with pre-populated bank_id.
     * Validates: Requirement 4.3 - form data should work alongside pre-selected bank_id
     */
    it("should correctly combine form data with pre-populated bank_id", () => {
      fc.assert(
        fc.property(
          bankIdArbitrary,
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom("credit" as const, "debit" as const),
          (bankId: number, cardName: string, cardType: "credit" | "debit") => {
            const formState: NewCardFormState = {
              name: cardName,
              type: cardType,
              limit_amount: "1000",
              due_day: "15",
            };

            const creationData = prepareCardCreationData(bankId, formState);

            // Bank ID should be pre-populated
            expect(creationData.bank_id).toBe(bankId);

            // Form data should be correctly included
            expect(creationData.name).toBe(cardName);
            expect(creationData.type).toBe(cardType);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test that bank_id pre-population works with empty form (initial state).
     * Validates: Requirement 4.3 - initial form state should have bank_id ready
     */
    it("should have bank_id pre-populated even with empty initial form state", () => {
      fc.assert(
        fc.property(bankIdArbitrary, (bankId: number) => {
          // Simulate clicking "Novo Cartão" - creates initial empty form
          const initialFormState = createInitialCardFormState();
          
          // Prepare creation data (what would be sent to API)
          const creationData = prepareCardCreationData(bankId, initialFormState);

          // Bank ID must be present and correct from the start
          expect(creationData.bank_id).toBe(bankId);
          expect(typeof creationData.bank_id).toBe("number");

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Feature: navbar-ui-restructure
 * Property 7: Card Section Auto-refresh
 *
 * **Validates: Requirements 4.7**
 *
 * Property: For any card CRUD operation (create, update, delete) in CardSection,
 * the `onCardsChange` callback should be invoked to trigger a list refresh.
 */
describe("Card Section Auto-refresh", () => {
  describe("Property 7: CRUD operations trigger onCardsChange callback", () => {
    /**
     * Arbitrary generator for CRUD operation types.
     */
    const crudOperationTypeArbitrary = fc.constantFrom(
      "create" as CrudOperationType,
      "update" as CrudOperationType,
      "delete" as CrudOperationType
    );

    /**
     * Arbitrary generator for valid card names (non-empty strings with at least one non-whitespace character).
     * The implementation validates that names have non-whitespace content via name.trim().length > 0.
     */
    const validCardNameArbitrary = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);

    /**
     * Arbitrary generator for valid card IDs.
     */
    const validCardIdArbitrary = fc.integer({ min: 1, max: 100000 });

    /**
     * Arbitrary generator for valid bank IDs.
     */
    const validBankIdArbitrary = fc.integer({ min: 1, max: 100000 });

    /**
     * Arbitrary generator for valid form state (with non-empty name).
     */
    const validFormStateArbitrary: fc.Arbitrary<NewCardFormState> = fc.record({
      name: validCardNameArbitrary,
      type: fc.constantFrom("credit" as const, "debit" as const),
      limit_amount: fc.oneof(
        fc.constant(""),
        fc.double({ min: 0, max: 1000000, noNaN: true }).map((n) => n.toString())
      ),
      due_day: fc.oneof(
        fc.constant(""),
        fc.integer({ min: 1, max: 31 }).map((n) => n.toString())
      ),
    });

    /**
     * Arbitrary generator for a sequence of CRUD operations.
     */
    const crudOperationSequenceArbitrary = fc.array(
      fc.record({
        type: crudOperationTypeArbitrary,
        success: fc.boolean(),
      }),
      { minLength: 1, maxLength: 20 }
    );

    /**
     * Test that callback tracker is initialized correctly.
     */
    it("should initialize callback tracker with zero calls", () => {
      const tracker = createCallbackTracker();

      expect(tracker.callCount).toBe(0);
      expect(tracker.lastOperationType).toBeNull();
      expect(tracker.operationHistory).toHaveLength(0);
    });

    /**
     * Test that callback invocation is recorded correctly.
     */
    it("should record callback invocation correctly for any operation type", () => {
      fc.assert(
        fc.property(crudOperationTypeArbitrary, (operationType) => {
          const tracker = createCallbackTracker();
          const updatedTracker = recordCallbackInvocation(tracker, operationType);

          expect(updatedTracker.callCount).toBe(1);
          expect(updatedTracker.lastOperationType).toBe(operationType);
          expect(updatedTracker.operationHistory).toContain(operationType);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that successful card CREATE operation triggers onCardsChange callback.
     * Validates: Requirement 4.7 - WHEN um cartão é criado, THE Card_Section SHALL atualizar a lista automaticamente
     */
    it("should trigger onCardsChange callback after successful card creation", () => {
      fc.assert(
        fc.property(
          validBankIdArbitrary,
          validFormStateArbitrary,
          (bankId, formState) => {
            const result = simulateCardCreate(bankId, formState);

            // Successful create should trigger callback
            expect(result.operationResult.operationType).toBe("create");
            expect(result.operationResult.success).toBe(true);
            expect(result.shouldInvokeCallback).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test that successful card UPDATE operation triggers onCardsChange callback.
     * Validates: Requirement 4.7 - WHEN um cartão é editado, THE Card_Section SHALL atualizar a lista automaticamente
     */
    it("should trigger onCardsChange callback after successful card update", () => {
      fc.assert(
        fc.property(
          validCardIdArbitrary,
          validFormStateArbitrary,
          (cardId, formState) => {
            const result = simulateCardUpdate(cardId, formState);

            // Successful update should trigger callback
            expect(result.operationResult.operationType).toBe("update");
            expect(result.operationResult.success).toBe(true);
            expect(result.shouldInvokeCallback).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test that successful card DELETE operation triggers onCardsChange callback.
     * Validates: Requirement 4.7 - WHEN um cartão é excluído, THE Card_Section SHALL atualizar a lista automaticamente
     */
    it("should trigger onCardsChange callback after successful card deletion", () => {
      fc.assert(
        fc.property(validCardIdArbitrary, (cardId) => {
          const result = simulateCardDelete(cardId);

          // Successful delete should trigger callback
          expect(result.operationResult.operationType).toBe("delete");
          expect(result.operationResult.success).toBe(true);
          expect(result.shouldInvokeCallback).toBe(true);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that callback validation correctly identifies valid callback behavior.
     * Validates: Requirement 4.7 - callback should be invoked for all successful CRUD operations
     */
    it("should validate callback invocation correctly for any CRUD operation", () => {
      fc.assert(
        fc.property(
          crudOperationTypeArbitrary,
          fc.boolean(),
          (operationType, success) => {
            const operationResult = {
              operationType,
              success,
            };

            // Callback should be invoked if and only if operation was successful
            const validation = validateCallbackInvocation(operationResult, success);

            expect(validation.isValid).toBe(true);
            expect(validation.expectedCallback).toBe(success);
            expect(validation.actualCallback).toBe(success);
            expect(validation.operationType).toBe(operationType);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test that the complete CRUD flow correctly invokes callback on success.
     * Validates: Requirement 4.7 - complete flow from operation to callback
     */
    it("should correctly invoke callback in complete CRUD flow for successful operations", () => {
      fc.assert(
        fc.property(crudOperationTypeArbitrary, (operationType) => {
          const tracker = createCallbackTracker();
          const result = simulateCrudFlowWithCallback(operationType, true, tracker);

          // Successful operation should invoke callback
          expect(result.validation.isValid).toBe(true);
          expect(result.validation.expectedCallback).toBe(true);
          expect(result.validation.actualCallback).toBe(true);
          expect(result.updatedTracker.callCount).toBe(1);
          expect(result.updatedTracker.lastOperationType).toBe(operationType);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that failed operations do not invoke callback.
     * Validates: Requirement 4.7 - callback should only be invoked on successful operations
     */
    it("should not invoke callback for failed CRUD operations", () => {
      fc.assert(
        fc.property(crudOperationTypeArbitrary, (operationType) => {
          const tracker = createCallbackTracker();
          const result = simulateCrudFlowWithCallback(operationType, false, tracker);

          // Failed operation should not invoke callback
          expect(result.validation.isValid).toBe(true);
          expect(result.validation.expectedCallback).toBe(false);
          expect(result.validation.actualCallback).toBe(false);
          expect(result.updatedTracker.callCount).toBe(0);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that a sequence of CRUD operations invokes callback the correct number of times.
     * Validates: Requirement 4.7 - each successful operation should trigger exactly one callback
     */
    it("should invoke callback exactly once per successful CRUD operation in a sequence", () => {
      fc.assert(
        fc.property(crudOperationSequenceArbitrary, (operations) => {
          const result = validateCrudSequenceCallbacks(operations);

          // Callback count should equal number of successful operations
          const expectedCount = operations.filter((op) => op.success).length;
          expect(result.isValid).toBe(true);
          expect(result.actualCallbackCount).toBe(expectedCount);
          expect(result.expectedCallbackCount).toBe(expectedCount);

          // Each operation result should have correct callback status
          for (let i = 0; i < operations.length; i++) {
            expect(result.operationResults[i].callbackInvoked).toBe(
              operations[i].success
            );
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that callback is invoked for all three CRUD operation types.
     * Validates: Requirement 4.7 - create, update, and delete all trigger callback
     */
    it("should invoke callback for create, update, and delete operations", () => {
      const operations: Array<{ type: CrudOperationType; success: boolean }> = [
        { type: "create", success: true },
        { type: "update", success: true },
        { type: "delete", success: true },
      ];

      const result = validateCrudSequenceCallbacks(operations);

      // All three operations should trigger callbacks
      expect(result.isValid).toBe(true);
      expect(result.actualCallbackCount).toBe(3);
      expect(result.operationResults[0].callbackInvoked).toBe(true);
      expect(result.operationResults[1].callbackInvoked).toBe(true);
      expect(result.operationResults[2].callbackInvoked).toBe(true);
    });

    /**
     * Test that callback tracker correctly accumulates multiple invocations.
     */
    it("should correctly accumulate callback invocations for multiple operations", () => {
      fc.assert(
        fc.property(
          fc.array(crudOperationTypeArbitrary, { minLength: 1, maxLength: 10 }),
          (operationTypes) => {
            let tracker = createCallbackTracker();

            for (const opType of operationTypes) {
              tracker = recordCallbackInvocation(tracker, opType);
            }

            // Call count should match number of operations
            expect(tracker.callCount).toBe(operationTypes.length);
            expect(tracker.operationHistory).toHaveLength(operationTypes.length);
            expect(tracker.lastOperationType).toBe(
              operationTypes[operationTypes.length - 1]
            );

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test that operation history is preserved in correct order.
     */
    it("should preserve operation history in correct order", () => {
      fc.assert(
        fc.property(
          fc.array(crudOperationTypeArbitrary, { minLength: 1, maxLength: 10 }),
          (operationTypes) => {
            let tracker = createCallbackTracker();

            for (const opType of operationTypes) {
              tracker = recordCallbackInvocation(tracker, opType);
            }

            // Operation history should match input order
            for (let i = 0; i < operationTypes.length; i++) {
              expect(tracker.operationHistory[i]).toBe(operationTypes[i]);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
