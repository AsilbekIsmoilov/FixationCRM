import { create } from 'zustand';
import { searchAll, suspends, fixeds } from './api';

type FetchArgs = {
  q: string;
  page?: number;
  page_size?: number;
  ordering?: string;
  fields?: string[]; 
};

type RecordsState = {
  records: any[];
  total: number;
  loading: boolean;
  visibleColumns: string[];
  setVisibleColumns: (cols: string[]) => void;
  fetchActives: (args: FetchArgs) => Promise<void>;
};

export const useRecordsStore = create<RecordsState>((set) => ({
  records: [],
  total: 0,
  loading: false,
  visibleColumns: [],
  setVisibleColumns: (cols) => set({ visibleColumns: cols }),

  async fetchActives({
    q,
    page = 1,
    page_size = 50,
    ordering = '-created_at',
    fields = ['client', 'account', 'msisdn', 'phone'],
  }) {
    set({ loading: true });
    try {
      const params: any = { q, page, page_size, ordering };
      if (fields?.length) params.fields = fields.join(',');

      try {
        const resp = await searchAll.list(params);
        const results = (resp as any)?.results ?? resp ?? [];
        const count = (resp as any)?.count ?? (Array.isArray(results) ? results.length : 0);
        set({ records: results, total: count, loading: false });
        return;
      } catch (e: any) {
        if (e?.status !== 404 && e?.status !== 500) throw e;
      }

      const [r1, r2] = await Promise.all([
        suspends.list(params),
        fixeds.list(params),
      ]);

      const list1 = (r1 as any)?.results ?? r1 ?? [];
      const list2 = (r2 as any)?.results ?? r2 ?? [];

      for (const it of list1) (it as any).source = 'suspends';
      for (const it of list2) (it as any).source = 'fixeds';

      const merged = [...list1, ...list2];

      const key = ordering.startsWith('-') ? ordering.slice(1) : ordering;
      const rev = ordering.startsWith('-');
      merged.sort((a: any, b: any) => {
        const va = a?.[key] ?? '';
        const vb = b?.[key] ?? '';
        if (va === vb) return 0;
        return (va > vb ? 1 : -1) * (rev ? -1 : 1);
      });

      const count = ((r1 as any)?.count ?? list1.length) + ((r2 as any)?.count ?? list2.length);

      set({ records: merged, total: count, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
}));
