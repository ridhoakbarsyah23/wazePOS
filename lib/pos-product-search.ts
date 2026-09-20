export type SearchablePosProduct = {
  id: string;
  name: string;
  sku: string | null;
  categoryName: string | null;
  stock: number;
  trackStock: boolean;
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("id-ID");
}

export function filterPosProducts<T extends SearchablePosProduct>(
  products: T[],
  query: string,
  category: string,
) {
  const normalizedQuery = normalize(query);

  return products.filter((product) => {
    const matchesSearch =
      !normalizedQuery ||
      normalize(product.name).includes(normalizedQuery) ||
      normalize(product.sku ?? "").includes(normalizedQuery);
    const matchesCategory = category === "Semua" || (product.categoryName ?? "Umum") === category;
    return matchesSearch && matchesCategory;
  });
}

export function resolveProductEntry<T extends SearchablePosProduct>(products: T[], rawValue: string) {
  const query = normalize(rawValue);
  if (!query) return null;

  const exactCodeMatch = products.find(
    (product) => normalize(product.sku ?? "") === query || normalize(product.id) === query,
  );
  if (exactCodeMatch) return { product: exactCodeMatch, match: "code" as const };

  const searchMatches = filterPosProducts(products, rawValue, "Semua");
  if (searchMatches.length === 1) {
    return { product: searchMatches[0], match: "search" as const };
  }

  return null;
}

export function getProductStockIssue(product: SearchablePosProduct, quantityInCart: number) {
  if (!product.trackStock) return null;
  if (product.stock < 1) return "out-of-stock" as const;
  if (quantityInCart >= product.stock) return "stock-limit" as const;
  return null;
}
