const fs = require('fs');
const filePath = 'src/store/useFinanceStore.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Promo interface
if (!content.includes('export interface Promo')) {
  content = content.replace(
    '// ===================== STORE STATE =====================',
    `export interface Promo {
  id: string;
  title: string;
  message: string;
  date: string;
  url: string;
  icon: string;
  isActive: boolean | string;
}

// ===================== STORE STATE =====================`
  );
}

// 2. Add to FinanceState
if (!content.includes('promos: Promo[]')) {
  content = content.replace(
    '  settings: Setting[];',
    `  settings: Setting[];
  promos: Promo[];
  unreadPromos: string[];
  fetchPromos: (url: string) => Promise<void>;
  markPromoRead: (id: string) => void;
  markAllPromosRead: () => void;`
  );
}

// 3. Add to initial state
if (!content.includes('promos: [],')) {
  content = content.replace(
    '      settings: DEFAULT_SETTINGS,',
    `      settings: DEFAULT_SETTINGS,
      promos: [],
      unreadPromos: [],`
  );
}

// 4. Add fetchPromos action
if (!content.includes('fetchPromos: async')) {
  content = content.replace(
    '      // ---- URL Management ----',
    `      // ---- Promos ----
      fetchPromos: async (url) => {
        try {
          const res = await fetch(url);
          const data = await res.json();
          const currentUnread = get().unreadPromos;
          const newPromos = data || [];
          
          // Identify unread promos
          // A promo is unread if it is in newPromos but its ID is not yet in read memory
          // Wait, actually we store unread. A better approach is storing readPromos, 
          // or storing unread. Let's just put all fetched promos.
          set({ promos: newPromos });
        } catch (e) {
          console.error('[FinanceStore] Gagal fetch promo:', e);
        }
      },
      markPromoRead: (id) => {
        set((state) => {
           // We will store read promo IDs in localStorage directly or just rely on Zustand persist
           // Let's use unreadPromos to track what's unseen
           return { unreadPromos: state.unreadPromos.filter(pId => pId !== id) };
        });
      },
      markAllPromosRead: () => {
        set({ unreadPromos: [] });
      },

      // ---- URL Management ----`
  );
}

// Re-write fetchPromos logic for unread calculation
// If new promos arrive, we should add them to unreadPromos if they aren't already there AND not previously read.
// Actually, let's track readPromos instead. It's much safer.
content = content.replace('unreadPromos: string[];', 'readPromos: string[];');
content = content.replace('unreadPromos: [],', 'readPromos: [],');
content = content.replace(/unreadPromos: state\.unreadPromos\.filter[^\n]+/g, 'readPromos: [...state.readPromos, id] };');
content = content.replace(/unreadPromos: \[\]/g, 'readPromos: get().promos.map(p => p.id)');
content = content.replace(/const currentUnread = get\(\)\.unreadPromos;/g, 'const currentRead = get().readPromos;');

fs.writeFileSync(filePath, content);
console.log('Store updated with Promo logic');
