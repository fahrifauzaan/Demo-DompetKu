import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  name: string;
  email: string;
  photoURL: string;
  sheetUrl?: string;
  spreadsheetId?: string;
}

export interface RegisteredUser {
  email: string;
  /**
   * LEGACY: kata sandi polos dari versi lama. Hanya dipakai SEKALI untuk migrasi ke `passwordHash`
   * saat login berhasil, lalu dihapus. Jangan pernah menulis field ini lagi.
   */
  password?: string;
  /** SHA-256(salt + ":" + password) — kata sandi tak lagi bisa dibaca dari penyimpanan browser. */
  passwordHash?: string;
  salt?: string;
  name: string;
  photoURL: string;
  sheetUrl?: string;
  spreadsheetId?: string;
}

/** Salt acak per pengguna (hex 16 byte) — mencegah dua kata sandi sama menghasilkan hash identik. */
const randomSalt = (): string => {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
};

/** SHA-256 via Web Crypto → hex. Async, karena itulah `login`/`signup` kini mengembalikan Promise. */
async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, '0')).join('');
}

interface AuthState {
  user: AuthUser | null;
  registeredUsers: RegisteredUser[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (email: string) => { success: boolean; error?: string };
  signup: (email: string, password: string, name: string, photoURL?: string, sheetUrl?: string, spreadsheetId?: string) => Promise<void>;
  /** Verifikasi kata sandi tanpa login (dipakai lock screen). */
  verifyPassword: (email: string, password: string) => Promise<boolean>;
  /** Ubah kata sandi (hash saja, tak pernah menyimpan versi polos). */
  changePassword: (email: string, newPassword: string) => Promise<boolean>;
  /** Perbarui profil TANPA menyentuh kata sandi (dulu memakai signup + kata sandi polos dari sheet). */
  updateUserProfile: (email: string, patch: { name?: string; photoURL?: string; sheetUrl?: string; spreadsheetId?: string }) => void;
  updateUserSheetUrl: (email: string, sheetUrl: string) => void;
  updateUserSpreadsheetId: (email: string, spreadsheetId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      registeredUsers: [
        {
          email: 'demo@dompetku.com',
          password: 'password123',
          name: 'Demo Admin',
          photoURL: 'https://ui-avatars.com/api/?name=Demo+Admin&background=0D8ABC&color=fff'
          // sheetUrl deliberately omitted so they see the warning banner
        }
      ],
      login: async (email, password) => {
        const cleanedEmail = email.trim().toLowerCase();
        const found = get().registeredUsers.find(u => u.email.toLowerCase() === cleanedEmail);
        if (!found) {
          return { success: false, error: 'Email tidak terdaftar' };
        }
        // Verifikasi: utamakan hash. Bila akun masih menyimpan kata sandi polos (data lama), verifikasi
        // sekali dengan cara lama lalu LANGSUNG MIGRASI ke hash + hapus versi polosnya.
        let ok = false;
        if (found.passwordHash && found.salt) {
          ok = (await hashPassword(password, found.salt)) === found.passwordHash;
        } else if (typeof found.password === 'string') {
          ok = found.password === password;
          if (ok) {
            const salt = randomSalt();
            const passwordHash = await hashPassword(password, salt);
            set({ registeredUsers: get().registeredUsers.map(u => u.email.toLowerCase() === cleanedEmail
              ? { ...u, passwordHash, salt, password: undefined } : u) });
            console.log('[Auth] Kata sandi dimigrasi ke hash (versi polos dihapus).');
          }
        }
        if (!ok) {
          return { success: false, error: 'Password salah' };
        }
        set({ user: { name: found.name, email: found.email, photoURL: found.photoURL, sheetUrl: found.sheetUrl, spreadsheetId: found.spreadsheetId } });
        
        try {
          import('./useFinanceStore').then(module => {
            if (cleanedEmail === 'demo@dompetku.com') {
              module.useFinanceStore.getState().resetFinance();
            } else {
              if (found.sheetUrl) {
                module.useFinanceStore.getState().setGoogleSheetUrl(found.sheetUrl);
              }
              if (found.spreadsheetId) {
                module.useFinanceStore.getState().setSpreadsheetId(found.spreadsheetId);
              }
            }
            // Trigger sync immediately
            module.useFinanceStore.getState().syncFromGoogleSheets();
          });
        } catch (e) { console.error(e); }
        
        return { success: true };
      },
      loginWithGoogle: (email) => {
        const cleanedEmail = email.trim().toLowerCase();
        const found = get().registeredUsers.find(u => u.email.toLowerCase() === cleanedEmail);
        if (!found) {
          return { success: false, error: 'Email tidak terdaftar' };
        }
        set({ user: { name: found.name, email: found.email, photoURL: found.photoURL, sheetUrl: found.sheetUrl, spreadsheetId: found.spreadsheetId } });
        
        try {
          import('./useFinanceStore').then(module => {
            if (cleanedEmail === 'demo@dompetku.com') {
              module.useFinanceStore.getState().resetFinance();
            } else {
              if (found.sheetUrl) {
                module.useFinanceStore.getState().setGoogleSheetUrl(found.sheetUrl);
              }
              if (found.spreadsheetId) {
                module.useFinanceStore.getState().setSpreadsheetId(found.spreadsheetId);
              }
            }
            module.useFinanceStore.getState().syncFromGoogleSheets();
          });
        } catch (e) { console.error(e); }
        
        return { success: true };
      },
      signup: async (email, password, name, photoURL, sheetUrl, spreadsheetId) => {
        const cleanedEmail = email.trim().toLowerCase();
        const defaultPhoto = photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;
        
        // Find existing to preserve data if not provided
        const existing = get().registeredUsers.find(u => u.email.toLowerCase() === cleanedEmail);
        const resolvedSheetUrl = sheetUrl !== undefined ? sheetUrl : (existing?.sheetUrl || '');
        const resolvedSpreadsheetId = spreadsheetId !== undefined ? spreadsheetId : (existing?.spreadsheetId || '');

        // Kata sandi HANYA disimpan sebagai hash+salt. Bila `password` kosong (mis. pembaruan profil),
        // kredensial yang sudah ada dipertahankan — jangan sampai profil menimpanya jadi kosong.
        const salt = password ? randomSalt() : existing?.salt;
        const passwordHash = password ? await hashPassword(password, salt as string) : existing?.passwordHash;

        const newUser: RegisteredUser = {
          email: cleanedEmail,
          passwordHash,
          salt,
          name,
          photoURL: defaultPhoto,
          sheetUrl: resolvedSheetUrl,
          spreadsheetId: resolvedSpreadsheetId
        };
        set(state => {
          const exists = state.registeredUsers.some(u => u.email.toLowerCase() === cleanedEmail);
          const updatedUsers = exists
            ? state.registeredUsers.map(u => u.email.toLowerCase() === cleanedEmail ? newUser : u)
            : [...state.registeredUsers, newUser];
          return {
            registeredUsers: updatedUsers,
            user: { name: newUser.name, email: newUser.email, photoURL: newUser.photoURL, sheetUrl: newUser.sheetUrl, spreadsheetId: newUser.spreadsheetId }
          };
        });
        
        try {
          import('./useFinanceStore').then(module => {
            const finStore = module.useFinanceStore.getState();
            const urlChanged = resolvedSheetUrl && finStore.googleSheetUrl !== resolvedSheetUrl;
            const idChanged = resolvedSpreadsheetId && finStore.spreadsheetId !== resolvedSpreadsheetId;
            
            if (urlChanged) {
              finStore.setGoogleSheetUrl(resolvedSheetUrl);
            }
            if (idChanged) {
              finStore.setSpreadsheetId(resolvedSpreadsheetId);
            }
            
            // Only trigger a new sync if the database settings actually changed or if there is no active sync
            if ((urlChanged || idChanged) && !finStore.isSyncing) {
              finStore.syncFromGoogleSheets();
            }
          });
        } catch (e) { console.error(e); }
      },
      updateUserSheetUrl: (email, sheetUrl) => {
        const cleanedEmail = email.trim().toLowerCase();
        set(state => {
          const updatedUsers = state.registeredUsers.map(u => 
            u.email.toLowerCase() === cleanedEmail ? { ...u, sheetUrl } : u
          );
          const updatedUser = state.user && state.user.email.toLowerCase() === cleanedEmail
            ? { ...state.user, sheetUrl }
            : state.user;
          return {
            registeredUsers: updatedUsers,
            user: updatedUser
          };
        });
      },
      updateUserSpreadsheetId: (email, spreadsheetId) => {
        const cleanedEmail = email.trim().toLowerCase();
        set(state => {
          const updatedUsers = state.registeredUsers.map(u => 
            u.email.toLowerCase() === cleanedEmail ? { ...u, spreadsheetId } : u
          );
          const updatedUser = state.user && state.user.email.toLowerCase() === cleanedEmail
            ? { ...state.user, spreadsheetId }
            : state.user;
          return {
            registeredUsers: updatedUsers,
            user: updatedUser
          };
        });
      },
      // Verifikasi kata sandi TANPA login (lock screen). Ikut memigrasi data lama ke hash bila cocok.
      verifyPassword: async (email, password) => {
        const cleaned = email.trim().toLowerCase();
        const found = get().registeredUsers.find(u => u.email.toLowerCase() === cleaned);
        if (!found) return false;
        if (found.passwordHash && found.salt) {
          return (await hashPassword(password, found.salt)) === found.passwordHash;
        }
        if (typeof found.password === 'string' && found.password === password) {
          const salt = randomSalt();
          const passwordHash = await hashPassword(password, salt);
          set({ registeredUsers: get().registeredUsers.map(u => u.email.toLowerCase() === cleaned
            ? { ...u, passwordHash, salt, password: undefined } : u) });
          return true;
        }
        return false;
      },

      // Ubah kata sandi → hash baru (versi polos tak pernah ditulis, termasuk tidak ke Google Sheet).
      changePassword: async (email, newPassword) => {
        const cleaned = email.trim().toLowerCase();
        if (!newPassword) return false;
        const exists = get().registeredUsers.some(u => u.email.toLowerCase() === cleaned);
        if (!exists) return false;
        const salt = randomSalt();
        const passwordHash = await hashPassword(newPassword, salt);
        set({ registeredUsers: get().registeredUsers.map(u => u.email.toLowerCase() === cleaned
          ? { ...u, passwordHash, salt, password: undefined } : u) });
        return true;
      },

      // Perbarui profil TANPA menyentuh kredensial. Dulu pembaruan profil/rekoneksi memanggil `signup`
      // dengan kata sandi polos (diambil dari baris sheet `last_password`) — begitu penyimpanan itu
      // dihentikan, pola lama akan MENIMPA kata sandi dengan string kosong.
      updateUserProfile: (email, patch) => {
        const cleaned = email.trim().toLowerCase();
        set(state => ({
          registeredUsers: state.registeredUsers.map(u => u.email.toLowerCase() === cleaned ? { ...u, ...patch } : u),
          user: state.user && state.user.email.toLowerCase() === cleaned ? { ...state.user, ...patch } : state.user,
        }));
      },

      logout: () => {
        set({ user: null });
        try {
          // Dynamic import or require is not strictly needed if we import it at the top,
          // but importing it at the top might cause circular dependency if useFinanceStore imports useAuthStore.
          // Since it's a module, let's just import it inside the function, or import it at the top.
          // Actually, we can just use window / module import dynamically:
          import('./useFinanceStore').then(module => {
            module.useFinanceStore.getState().resetFinance();
          });
        } catch (e) {
          console.error('Failed to reset finance store on logout', e);
        }
      }
    }),
    {
      name: `${import.meta.env.VITE_APP_NAME ? import.meta.env.VITE_APP_NAME.toLowerCase().replace(/\s+/g, '-') : 'dompetku'}-auth-storage`,
      version: 1, // Bump version to clear old demo account cache
    }
  )
);
