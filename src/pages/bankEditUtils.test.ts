import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  initializeBankFormState,
  updateBankName,
  updateBankBalance,
  validateBankDataDisplay,
  validateFormStateUpdate,
  prepareBankUpdateData,
  validateBankId,
  type BankFormState,
} from "./bankEditUtils";
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
 * Feature: navbar-ui-restructure
 * Property 4: Bank data displayed and editable
 *
 * **Validates: Requirements 3.3, 3.4, 3.5**
 *
 * Property: For any valid bank loaded in BankEditPage, the page should display
 * the bank's name and balance in editable form fields, and changes to these
 * fields should update the component state.
 */
describe("Bank Edit Page Data Display and Editing", () => {
  describe("Property 4: Bank data displayed and editable", () => {
    /**
     * Test that bank data is correctly displayed in form fields.
     * Validates: Requirement 3.3 - THE Bank_Edit_Page SHALL exibir os dados do banco selecionado (nome e saldo)
     */
    it("should display bank name and balance in form fields for any valid bank", () => {
      fc.assert(
        fc.property(bankArbitrary, (bank: Bank) => {
          const formState = initializeBankFormState(bank);
          const validation = validateBankDataDisplay(bank, formState);

          // The form should display the bank's name
          expect(validation.nameDisplayed).toBe(true);
          // The form should display the bank's balance
          expect(validation.balanceDisplayed).toBe(true);
          // All data should be displayed correctly
          expect(validation.allDataDisplayed).toBe(true);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that name field is editable and updates state correctly.
     * Validates: Requirement 3.4 - THE Bank_Edit_Page SHALL permitir editar o nome do banco
     */
    it("should allow editing the bank name and update state correctly", () => {
      fc.assert(
        fc.property(
          bankArbitrary,
          fc.string({ minLength: 0, maxLength: 100 }),
          (bank: Bank, newName: string) => {
            const initialState = initializeBankFormState(bank);
            const updatedState = updateBankName(initialState, newName);
            const validation = validateFormStateUpdate(
              initialState,
              updatedState,
              "name",
              newName
            );

            // The name field should be updated to the new value
            expect(validation.fieldUpdated).toBe(true);
            // The balance field should remain unchanged
            expect(validation.otherFieldPreserved).toBe(true);
            // The update should be correct overall
            expect(validation.updateCorrect).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test that balance field is editable and updates state correctly.
     * Validates: Requirement 3.5 - THE Bank_Edit_Page SHALL permitir editar o saldo atual do banco
     */
    it("should allow editing the bank balance and update state correctly", () => {
      fc.assert(
        fc.property(
          bankArbitrary,
          fc.string({ minLength: 0, maxLength: 20 }),
          (bank: Bank, newBalance: string) => {
            const initialState = initializeBankFormState(bank);
            const updatedState = updateBankBalance(initialState, newBalance);
            const validation = validateFormStateUpdate(
              initialState,
              updatedState,
              "balance",
              newBalance
            );

            // The balance field should be updated to the new value
            expect(validation.fieldUpdated).toBe(true);
            // The name field should remain unchanged
            expect(validation.otherFieldPreserved).toBe(true);
            // The update should be correct overall
            expect(validation.updateCorrect).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test that form state initialization preserves bank data exactly.
     */
    it("should initialize form state with exact bank data for any bank", () => {
      fc.assert(
        fc.property(bankArbitrary, (bank: Bank) => {
          const formState = initializeBankFormState(bank);

          // Name should be exactly the bank's name
          expect(formState.name).toBe(bank.name);
          // Balance should be the string representation of current_balance
          expect(formState.balance).toBe(String(bank.current_balance));

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that multiple sequential edits are correctly applied.
     */
    it("should correctly apply multiple sequential edits to form state", () => {
      fc.assert(
        fc.property(
          bankArbitrary,
          fc.array(
            fc.oneof(
              fc.record({
                field: fc.constant("name" as const),
                value: fc.string({ minLength: 0, maxLength: 100 }),
              }),
              fc.record({
                field: fc.constant("balance" as const),
                value: fc.string({ minLength: 0, maxLength: 20 }),
              })
            ),
            { minLength: 1, maxLength: 10 }
          ),
          (bank: Bank, edits) => {
            let currentState = initializeBankFormState(bank);

            for (const edit of edits) {
              const previousState = { ...currentState };

              if (edit.field === "name") {
                currentState = updateBankName(currentState, edit.value);
                expect(currentState.name).toBe(edit.value);
                expect(currentState.balance).toBe(previousState.balance);
              } else {
                currentState = updateBankBalance(currentState, edit.value);
                expect(currentState.balance).toBe(edit.value);
                expect(currentState.name).toBe(previousState.name);
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test that form state can be converted back to API format.
     */
    it("should prepare correct update data from form state", () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            balance: fc.oneof(
              fc.double({ min: -1000000, max: 1000000, noNaN: true }).map(String),
              fc.constant(""),
              fc.constant("invalid")
            ),
          }),
          (formState: BankFormState) => {
            const updateData = prepareBankUpdateData(formState);

            // Name should be preserved exactly
            expect(updateData.name).toBe(formState.name);
            // Balance should be parsed as number, defaulting to 0 for invalid values
            const expectedBalance = parseFloat(formState.balance) || 0;
            expect(updateData.current_balance).toBe(expectedBalance);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test bank ID validation for valid IDs.
     */
    it("should validate valid bank IDs correctly", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }).map(String),
          (idString: string) => {
            const result = validateBankId(idString);

            expect(result.isValid).toBe(true);
            expect(result.parsedId).toBe(parseInt(idString, 10));

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test bank ID validation for invalid IDs.
     */
    it("should reject invalid bank IDs", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(undefined),
            fc.constant(""),
            fc.constant("abc"),
            fc.constant("-1"),
            fc.constant("0"),
            fc.constant("1.5"),
            fc.constant("NaN")
          ),
          (id: string | undefined) => {
            const result = validateBankId(id);

            expect(result.isValid).toBe(false);
            expect(result.parsedId).toBeNull();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test that editing name doesn't affect balance display.
     */
    it("should preserve balance when editing name for any bank and any new name", () => {
      fc.assert(
        fc.property(
          bankArbitrary,
          fc.string({ minLength: 0, maxLength: 100 }),
          (bank: Bank, newName: string) => {
            const initialState = initializeBankFormState(bank);
            const updatedState = updateBankName(initialState, newName);

            // Balance should remain exactly the same
            expect(updatedState.balance).toBe(initialState.balance);
            expect(updatedState.balance).toBe(String(bank.current_balance));

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test that editing balance doesn't affect name display.
     */
    it("should preserve name when editing balance for any bank and any new balance", () => {
      fc.assert(
        fc.property(
          bankArbitrary,
          fc.string({ minLength: 0, maxLength: 20 }),
          (bank: Bank, newBalance: string) => {
            const initialState = initializeBankFormState(bank);
            const updatedState = updateBankBalance(initialState, newBalance);

            // Name should remain exactly the same
            expect(updatedState.name).toBe(initialState.name);
            expect(updatedState.name).toBe(bank.name);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
