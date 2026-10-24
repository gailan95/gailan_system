const fs = require('fs');
let content = fs.readFileSync('src/components/InventoryView.tsx', 'utf8');

// 1. Remove searchQuery state
content = content.replace(
  "  const [searchQuery, setSearchQuery] = useState('');\n",
  ""
);

// 2. Remove the debounce effect
content = content.replace(
  `  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);`,
  ""
);

// 3. Replace the actual input with the new SearchInput
const oldInput = `<div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="inventory-search-input"
              type="text"
              placeholder="گەڕان بەپێی ناوی کاڵا یان بارکۆد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-11 py-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all shadow-2xs"
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer flex items-center justify-center p-1" title="سکانی بارکۆد">
              <Camera className="w-4 h-4" />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>`;

const newInput = `<SearchInput initialValue={debouncedSearchQuery} onSearch={setDebouncedSearchQuery} />`;

content = content.replace(oldInput, newInput);

fs.writeFileSync('src/components/InventoryView.tsx', content);
