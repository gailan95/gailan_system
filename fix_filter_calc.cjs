const fs = require('fs');
let content = fs.readFileSync('src/components/InventoryView.tsx', 'utf8');

const badCalc = `                 modeProducts.filter(p => {
                    if (p.initialStock && p.initialStock > 0) {
                      const sold = sales.reduce((acc, sale) => {
                        if (!sale.items) return acc;
                        const match = sale.items.find(i => i.productId === p.id);
                        return acc + (match?.quantity || 0);
                      }, 0);
                      return Math.max(0, p.initialStock - sold) <= p.minStockAlert;
                    }
                    return p.stock <= p.minStockAlert;
                 }).length`;

const goodCalc = `modeProducts.filter(p => getProductRemainingStock(p) <= p.minStockAlert).length`;

content = content.replace(badCalc, goodCalc);

fs.writeFileSync('src/components/InventoryView.tsx', content);
