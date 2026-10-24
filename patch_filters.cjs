const fs = require('fs');
let content = fs.readFileSync('src/components/InventoryView.tsx', 'utf8');

const oldSection = `        {/* Filters and Tags */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 ml-1">پۆلێنەکان:</span>
            <button
              onClick={() => setSelectedCategory('all')}
              className={\`px-3 py-1 rounded-lg text-xs font-semibold transition-colors \${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }\`}
            >
              هەمووی ({modeProducts.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={\`px-3 py-1 rounded-lg text-xs font-semibold transition-colors \${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }\`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Active vs Closed Status Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedCategory('all') || setProductStatusFilter('active')}
                className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all \${
                  productStatusFilter === 'active'
                    ? 'bg-white text-emerald-700 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }\`}
              >
                <Package className="w-4 h-4" />
                <span>چالاکەکان ({activeCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('all') || setProductStatusFilter('closed')}
                className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all \${
                  productStatusFilter === 'closed'
                    ? 'bg-rose-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }\`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>داخراوەکان / تەواوبووەکان ({closedCount})</span>
              </button>
            </div>

            {/* Low Stock Toggle */}
            <button
              id="toggle-low-stock-btn"
              onClick={() => setOnlyLowStock(!onlyLowStock)}
              className={\`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors \${
                onlyLowStock
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }\`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>تەنها کەمبووەوەکان</span>
            </button>
          </div>
        </div>`;

const newSection = `        {/* Filters and Tags */}
        <div className="flex flex-col gap-4 pt-4 border-t border-slate-100 w-full">
          {/* Top Row: Categories */}
          <div className="flex flex-wrap items-center justify-end gap-3 w-full">
            <span className="text-sm font-semibold text-slate-500 ml-2 order-last sm:order-first">پۆلێنەکان:</span>
            
            <button
              onClick={() => setSelectedCategory('all')}
              className={\`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all shadow-sm \${
                selectedCategory === 'all'
                  ? 'bg-[#0f766e] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }\`}
            >
              <Globe className="w-4 h-4" />
              <span>هەمووی ({modeProducts.length})</span>
            </button>
            
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={\`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all shadow-sm \${
                  selectedCategory === cat
                    ? 'bg-[#0f766e] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }\`}
              >
                <Tag className="w-4 h-4" />
                <span>{cat}</span>
              </button>
            ))}
          </div>

          {/* Secondary Row: Stats and Alerts */}
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Active Products */}
              <button
                type="button"
                onClick={() => setSelectedCategory('all') || setProductStatusFilter('active')}
                className={\`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all \${
                  productStatusFilter === 'active'
                    ? 'bg-slate-100 border-slate-300 text-slate-800 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }\`}
              >
                <Package className={\`w-4 h-4 \${productStatusFilter === 'active' ? 'text-emerald-600' : 'text-emerald-500/70'}\`} />
                <span className="text-sm font-bold">چالاکەکان ({activeCount})</span>
              </button>
              
              {/* Closed Products */}
              <button
                type="button"
                onClick={() => setSelectedCategory('all') || setProductStatusFilter('closed')}
                className={\`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all \${
                  productStatusFilter === 'closed'
                    ? 'bg-slate-100 border-slate-300 text-slate-800 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }\`}
              >
                <FileCheck className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-bold">داخراوەکان / تەواوبووەکان ({closedCount})</span>
              </button>
            </div>

            {/* Low Stock Toggle */}
            <button
              id="toggle-low-stock-btn"
              onClick={() => setOnlyLowStock(!onlyLowStock)}
              className={\`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all shadow-sm \${
                onlyLowStock
                  ? 'bg-rose-100 border-rose-400 text-rose-800 shadow-md'
                  : 'bg-[#fff1f2] border-[#fda4af] text-[#be123c] hover:bg-[#ffe4e6]'
              }\`}
            >
              <AlertTriangle className={\`w-4 h-4 \${onlyLowStock ? 'text-rose-600' : 'text-rose-500'}\`} />
              <span className="text-sm font-bold">تەنها کەمبووەوەکان ({
                 modeProducts.filter(p => {
                    if (p.initialStock && p.initialStock > 0) {
                      const sold = sales.reduce((acc, sale) => {
                        if (!sale.items) return acc;
                        const match = sale.items.find(i => i.productId === p.id);
                        return acc + (match?.quantity || 0);
                      }, 0);
                      return Math.max(0, p.initialStock - sold) <= p.minStockAlert;
                    }
                    return p.stock <= p.minStockAlert;
                 }).length
              })</span>
            </button>
          </div>
        </div>`;

content = content.replace(oldSection, newSection);

fs.writeFileSync('src/components/InventoryView.tsx', content);
