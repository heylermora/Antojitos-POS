const round = (value, digits = 2) => Number((Number(value) || 0).toFixed(digits));

export const UNIT_OPTIONS = ['g', 'kg', 'ml', 'l', 'unit', 'portion'];

const UNIT_CONVERSIONS = {
  g: { dimension: 'mass', factor: 1 },
  kg: { dimension: 'mass', factor: 1000 },
  ml: { dimension: 'volume', factor: 1 },
  l: { dimension: 'volume', factor: 1000 },
  unit: { dimension: 'count', factor: 1 },
  portion: { dimension: 'portion', factor: 1 },
};

export const toBaseQuantity = (quantity, unit) => {
  const qty = Number(quantity) || 0;
  const conversion = UNIT_CONVERSIONS[unit];
  return conversion ? qty * conversion.factor : qty;
};

export const convertQuantity = (quantity, fromUnit, toUnit) => {
  const qty = Number(quantity) || 0;

  if (!fromUnit || !toUnit || fromUnit === toUnit) {
    return qty;
  }

  const source = UNIT_CONVERSIONS[fromUnit];
  const target = UNIT_CONVERSIONS[toUnit];

  if (!source || !target || source.dimension !== target.dimension) {
    return null;
  }

  return toBaseQuantity(qty, fromUnit) / target.factor;
};

export const buildCostContext = ({ ingredients = [], recipes = [], categories = [] }) => {
  const ingredientMap = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const productList = categories.flatMap((category) =>
    (category.products || []).map((product) => ({
      ...product,
      categoryId: category.id,
      categoryName: category.name,
    }))
  );
  const productMap = new Map(productList.map((product) => [product.id, product]));

  return { ingredientMap, recipeMap, productMap, productList };
};

export const calculateRecipeCost = (recipeId, context, stack = new Set()) => {
  if (!recipeId) {
    return { totalCost: 0, unitCost: 0, yieldQuantity: 1, missingItems: [] };
  }

  if (stack.has(recipeId)) {
    return {
      totalCost: 0,
      unitCost: 0,
      yieldQuantity: 1,
      missingItems: [`Referencia circular detectada en receta ${recipeId}`],
    };
  }

  const recipe = context.recipeMap.get(recipeId);
  if (!recipe) {
    return {
      totalCost: 0,
      unitCost: 0,
      yieldQuantity: 1,
      missingItems: [`Receta no encontrada: ${recipeId}`],
    };
  }

  stack.add(recipeId);
  const breakdown = [];
  const missingItems = [];

  let totalCost = 0;

  (recipe.lines || []).forEach((line) => {
    if (line.itemType === 'ingredient') {
      const ingredient = context.ingredientMap.get(line.itemId);
      if (!ingredient) {
        missingItems.push(`Insumo faltante: ${line.itemName || line.itemId}`);
        return;
      }

      const normalizedQuantity = convertQuantity(
        line.quantity,
        line.unit || ingredient.baseUnit,
        ingredient.baseUnit
      );

      if (normalizedQuantity === null) {
        missingItems.push(`Unidad incompatible para ${ingredient.name}: ${line.unit || 'sin unidad'} → ${ingredient.baseUnit}`);
        return;
      }

      const lineCost = normalizedQuantity * (Number(ingredient.currentUnitCost) || 0);
      totalCost += lineCost;
      breakdown.push({
        name: ingredient.name,
        type: 'ingredient',
        quantity: Number(line.quantity) || 0,
        unit: line.unit || ingredient.baseUnit,
        lineCost: round(lineCost),
      });
      return;
    }

    const nested = calculateRecipeCost(line.itemId, context, new Set(stack));
    const normalizedQuantity = convertQuantity(
      line.quantity,
      line.unit || nested.yieldUnit || 'portion',
      nested.yieldUnit || 'portion'
    );

    if (normalizedQuantity === null) {
      missingItems.push(`Unidad incompatible para ${line.itemName || context.recipeMap.get(line.itemId)?.name || 'Subreceta'}: ${line.unit || 'sin unidad'} → ${nested.yieldUnit || 'portion'}`);
      missingItems.push(...nested.missingItems);
      return;
    }

    const lineCost = normalizedQuantity * (Number(nested.unitCost) || 0);
    totalCost += lineCost;
    breakdown.push({
      name: line.itemName || context.recipeMap.get(line.itemId)?.name || 'Subreceta',
      type: 'subrecipe',
      quantity: Number(line.quantity) || 0,
      unit: line.unit || nested.yieldUnit || 'portion',
      lineCost: round(lineCost),
    });
    missingItems.push(...nested.missingItems);
  });

  const yieldQuantity = Number(recipe.yieldQuantity) || 1;
  const unitCost = yieldQuantity > 0 ? totalCost / yieldQuantity : totalCost;

  return {
    ...recipe,
    totalCost: round(totalCost),
    unitCost: round(unitCost),
    yieldQuantity,
    yieldUnit: recipe.yieldUnit || 'portion',
    breakdown,
    missingItems,
  };
};

export const getProductCostSummary = (product, context) => {
  const recipe = Array.from(context.recipeMap.values()).find(
    (item) => item.type === 'product' && item.productId === product.id
  );

  if (!recipe) {
    return {
      recipeStatus: 'Sin receta',
      costCurrent: 0,
      profitCurrent: Number(product.price) || 0,
      marginCurrent: 100,
      missingItems: ['Producto sin receta'],
      recipeId: null,
      breakdown: [],
    };
  }

  const computed = calculateRecipeCost(recipe.id, context);
  const price = Number(product.price) || 0;
  const costCurrent = computed.unitCost;
  const profitCurrent = round(price - costCurrent);
  const marginCurrent = price > 0 ? round((profitCurrent / price) * 100) : 0;

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    recipeStatus: computed.missingItems.length ? 'Receta incompleta' : 'Costeado',
    costCurrent,
    profitCurrent,
    marginCurrent,
    missingItems: computed.missingItems,
    breakdown: computed.breakdown,
  };
};

export const enrichCategoriesWithCosting = (categories, context) =>
  categories.map((category) => ({
    ...category,
    products: (category.products || []).map((product) => ({
      ...product,
      ...getProductCostSummary(product, context),
    })),
  }));

export const computeProfitabilityFromOrders = (orders = [], context) => {
  const productByName = new Map(context.productList.map((product) => [product.name, product]));
  const itemsMap = new Map();

  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const baseProduct = productByName.get(item.name);
      const pricing = baseProduct ? getProductCostSummary(baseProduct, context) : null;
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const revenue = quantity * price;
      const cost = quantity * (pricing?.costCurrent || 0);
      const profit = revenue - cost;
      const existing = itemsMap.get(item.name) || {
        name: item.name,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        margin: 0,
      };

      existing.quantity += quantity;
      existing.revenue += revenue;
      existing.cost += cost;
      existing.profit += profit;
      existing.margin = existing.revenue > 0 ? round((existing.profit / existing.revenue) * 100) : 0;
      itemsMap.set(item.name, existing);
    });
  });

  const items = Array.from(itemsMap.values()).map((item) => ({
    ...item,
    revenue: round(item.revenue),
    cost: round(item.cost),
    profit: round(item.profit),
    margin: round(item.margin),
  }));

  const totals = items.reduce(
    (acc, item) => ({
      revenue: acc.revenue + item.revenue,
      cost: acc.cost + item.cost,
      profit: acc.profit + item.profit,
      quantity: acc.quantity + item.quantity,
    }),
    { revenue: 0, cost: 0, profit: 0, quantity: 0 }
  );

  return {
    totals: {
      ...totals,
      revenue: round(totals.revenue),
      cost: round(totals.cost),
      profit: round(totals.profit),
      margin: totals.revenue > 0 ? round((totals.profit / totals.revenue) * 100) : 0,
    },
    items: items.sort((a, b) => b.profit - a.profit),
  };
};
