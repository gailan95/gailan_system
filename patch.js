const fs = require('fs');
const content = fs.readFileSync('src/components/InventoryView.tsx', 'utf8');

const searchInputComp = `

// --- Extracted SearchInput to prevent full re-renders on every keystroke ---
const SearchInput = ({ initialValue, onSearch }: { initialValue: string, onSearch: (val: string) => void }) => {
  const [query, setQuery] = useState(initialValue);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  return (
    <div className="relative flex-1">
      <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
      <input
        id="inventory-search-input"
        type="text"
        placeholder="گەڕان بەپێی ناوی کاڵا یان بارکۆد..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full pr-10 pl-11 py-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all shadow-2xs"
      />
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer flex items-center justify-center p-1" title="سکانی بارکۆد">
        <Camera className="w-4 h-4" />
      </div>
      {query && (
        <button
          onClick={() => {
            setQuery('');
            onSearch('');
          }}
          className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
`;

const newContent = content.replace(
  'const formatNumberWithCommas =',
  searchInputComp + '\nconst formatNumberWithCommas ='
);

fs.writeFileSync('src/components/InventoryView.tsx', newContent);
