import { DocType } from '../doctypes/schema';

/**
 * A safe, restricted expression engine for calculating computed fields.
 * DO NOT USE eval() due to security risks.
 */
export class ComputedEngine {
  /**
   * Applies all computed field logic to a record based on its DocType schema.
   * This should be called by the Repository or Service Layer AFTER validation 
   * and BEFORE saving to storage.
   */
  static applyComputedFields(docType: DocType, record: Record<string, any>): void {
    const computedFields = docType.fields.filter(f => f.computed && f.formula);

    for (const field of computedFields) {
      if (field.formula) {
        try {
          record[field.fieldname] = this.evaluateSafeFormula(field.formula, record);
        } catch (error: any) {
          throw new Error(`Failed to compute field '${field.fieldname}': ${error.message}`);
        }
      }
    }
  }

  /**
   * Extremely simple, safe formula evaluator.
   * Currently only supports basic arithmetic with field references: e.g., "quantity * price"
   * For a production framework, this should use a proper expression parser library (like Jexl or math.js).
   */
  public static evaluateSafeFormula(formula: string, context: Record<string, any>): number | string {
    // 1. Tokenize the formula by spaces
    const tokens = formula.split(' ');
    
    // 2. Resolve variables from context
    const resolvedTokens = tokens.map(token => {
      // If it's a known operator or a number, keep it
      if (['+', '-', '*', '/'].includes(token) || !isNaN(Number(token))) {
        return token;
      }
      // If it's a field name in the context, resolve its value
      if (token in context) {
        return context[token];
      }
      // Otherwise, it's an invalid token or missing variable
      throw new Error(`Unknown variable or operator: ${token}`);
    });

    // 3. Simple left-to-right evaluation (No operator precedence handling in this basic PoC)
    // A real implementation would parse an AST.
    if (resolvedTokens.length === 3) {
      const a = Number(resolvedTokens[0]);
      const operator = resolvedTokens[1];
      const b = Number(resolvedTokens[2]);

      if (isNaN(a) || isNaN(b)) {
        throw new Error(`Cannot perform arithmetic on non-numbers`);
      }

      switch (operator) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
      }
    }

    throw new Error(`Complex formulas are not yet supported in this basic Expression Engine.`);
  }
}
