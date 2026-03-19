import { calculateRecipeCost, convertQuantity, toBaseQuantity } from './costing';

describe('costing conversions', () => {
  it('converts units into the ingredient base unit before applying current cost', () => {
    const context = {
      ingredientMap: new Map([
        ['bean', { id: 'bean', name: 'Frijoles', baseUnit: 'g', currentUnitCost: 0.01 }],
      ]),
      recipeMap: new Map([
        ['recipe-1', {
          id: 'recipe-1',
          name: 'Olla',
          yieldQuantity: 2,
          yieldUnit: 'portion',
          lines: [
            { itemType: 'ingredient', itemId: 'bean', quantity: 0.5, unit: 'kg' },
          ],
        }],
      ]),
    };

    const result = calculateRecipeCost('recipe-1', context);

    expect(result.totalCost).toBe(5);
    expect(result.unitCost).toBe(2.5);
    expect(result.missingItems).toEqual([]);
  });

  it('flags incompatible units instead of costing them with the wrong magnitude', () => {
    const context = {
      ingredientMap: new Map([
        ['milk', { id: 'milk', name: 'Leche', baseUnit: 'ml', currentUnitCost: 0.002 }],
      ]),
      recipeMap: new Map([
        ['recipe-2', {
          id: 'recipe-2',
          name: 'Mezcla',
          yieldQuantity: 1,
          yieldUnit: 'portion',
          lines: [
            { itemType: 'ingredient', itemId: 'milk', quantity: 2, unit: 'unit' },
          ],
        }],
      ]),
    };

    const result = calculateRecipeCost('recipe-2', context);

    expect(result.totalCost).toBe(0);
    expect(result.missingItems).toContain('Unidad incompatible para Leche: unit → ml');
  });

  it('exposes reusable helpers for unit normalization', () => {
    expect(toBaseQuantity(2, 'kg')).toBe(2000);
    expect(convertQuantity(750, 'ml', 'l')).toBe(0.75);
    expect(convertQuantity(3, 'portion', 'portion')).toBe(3);
    expect(convertQuantity(1, 'kg', 'ml')).toBeNull();
  });
});
