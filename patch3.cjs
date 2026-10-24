const fs = require('fs');
let content = fs.readFileSync('src/components/InventoryView.tsx', 'utf8');

const oldFilter = `  const filteredProducts = useMemo(() => {
    return modeProducts.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        p.barcode.includes(debouncedSearchQuery);
      const matchesCategory =
        selectedCategory === 'all' || p.category === selectedCategory;
      const remaining = getProductRemainingStock(p);
      const matchesLowStock = !onlyLowStock || remaining <= p.minStockAlert;
      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [modeProducts, debouncedSearchQuery, selectedCategory, onlyLowStock, sales, getProductRemainingStock]);`;

const newFilter = `  const filteredProducts = useMemo(() => {
    const queryLower = debouncedSearchQuery.toLowerCase();
    return modeProducts.filter((p) => {
      // 1. Fast category check first
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      
      // 2. Fast search check
      const matchesSearch =
        p.barcode.includes(queryLower) || 
        p.name.toLowerCase().includes(queryLower);
      if (!matchesSearch) return false;

      // 3. Expensive stock check last
      if (onlyLowStock) {
        const remaining = getProductRemainingStock(p);
        if (remaining > p.minStockAlert) return false;
      }
      
      return true;
    });
  }, [modeProducts, debouncedSearchQuery, selectedCategory, onlyLowStock, getProductRemainingStock]);`;

content = content.replace(oldFilter, newFilter);
fs.writeFileSync('src/components/InventoryView.tsx', content);
