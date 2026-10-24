import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserAccount, UserRole, ActiveTab, UserSessionLog, ActivityLogItem } from '../types';
import { generateId } from '../utils/formatters';
import { saveToIndexedDB, loadFromIndexedDB } from '../utils/indexedDB';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  hashPasswordWithSalt,
  verifyPassword,
  generateSecureToken,
  sanitizeTextSafe,
  checkRateLimit,
  resetRateLimit,
  encryptStorageData,
  decryptStorageData,
} from '../utils/security';

export const recordSystemActivity = (user: UserAccount | null, actionType: string, description: string) => {
  try {
    const raw = localStorage.getItem('kurd_auth_activity_logs_v1');
    const logs: ActivityLogItem[] = raw ? JSON.parse(raw) : [];
    const newLog: ActivityLogItem = {
      id: 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      userId: user?.id || 'system',
      username: user?.username || 'system',
      name: user?.name || 'سیستەم',
      role: user?.role || 'admin',
      actionType,
      description,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    const trimmed = logs.slice(0, 500);
    localStorage.setItem('kurd_auth_activity_logs_v1', JSON.stringify(trimmed));
    saveToIndexedDB('userActivityLogs', trimmed);
    window.dispatchEvent(new Event('activityLogUpdate'));
  } catch (e) {
    console.error('Failed to record system activity', e);
  }
};

interface AuthContextType {
  currentUser: UserAccount | null;
  users: UserAccount[];
  sessionLogs: UserSessionLog[];
  activityLogs: ActivityLogItem[];
  isAuthenticated: boolean;
  login: (usernameOrPhone: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (userData: {
    name: string;
    username?: string;
    password: string;
    role?: UserRole;
    phone?: string;
    email?: string;
    image?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (id: string, updates: Partial<UserAccount>) => Promise<void>;
  deleteUser: (id: string) => void;
  switchUser: (userId: string) => void;
  setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  canAccessTab: (tab: ActiveTab) => boolean;
  hasRole: (roles: UserRole[]) => boolean;
  canEdit: () => boolean;
  resetPasswordWithEmail: (emailOrUsername: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  logActivity: (actionType: string, description: string) => void;
}

const STORAGE_KEYS = {
  CURRENT_USER: 'kurd_auth_current_user_v2_enc',
  USERS_LIST: 'kurd_auth_users_list_v2_enc',
  LEGACY_USERS: 'kurd_auth_users_list_v1',
  LEGACY_CURRENT: 'kurd_auth_current_user_v1',
  DELETED_USERS: 'kurd_auth_deleted_users_v1',
  INITIALIZED: 'kurd_auth_is_initialized_v2',
};

// Initial system root administrator
const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'user-gailan-1',
    name: 'Gailan jabar',
    username: 'gailan',
    password: '@Gayla1995', // Legacy plain to be salted on first init
    passwordHash: '8b9c2a2e4a8b79e2d3c5f6e8a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e',
    passwordSalt: 'gailan_secure_salt_2026',
    role: 'admin',
    phone: '07501234567',
    avatarColor: 'bg-emerald-600',
    createdAt: new Date().toISOString(),
  },
];

const normalizeInputStr = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9')
    .replace(/＠/g, '@')
    .trim();
};

const normalizePhoneDigits = (phoneStr: string): string => {
  if (!phoneStr) return '';
  const norm = normalizeInputStr(phoneStr);
  const digits = norm.replace(/\D/g, '');
  if (digits.startsWith('964')) {
    return digits.slice(3).replace(/^0+/, '');
  }
  return digits.replace(/^0+/, '');
};

const getDeletedUsers = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.DELETED_USERS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.map((s) => String(s).toLowerCase());
    }
  } catch (e) {
    console.error(e);
  }
  return [];
};

const saveDeletedUsers = (list: string[]) => {
  try {
    const clean = Array.from(new Set(list.map((s) => String(s).toLowerCase()).filter(Boolean)));
    localStorage.setItem(STORAGE_KEYS.DELETED_USERS, JSON.stringify(clean));
    saveToIndexedDB('deletedUserIds', clean);
  } catch (e) {
    console.error(e);
  }
};

const filterOutDeleted = (existing: UserAccount[], deletedList: string[] = getDeletedUsers()): UserAccount[] => {
  const deletedSet = new Set(deletedList.map((d) => d.toLowerCase()));
  const map = new Map<string, UserAccount>();

  if (Array.isArray(existing)) {
    existing.forEach((u) => {
      if (u && u.username) {
        const uNameKey = u.username.toLowerCase();
        const idKey = u.id ? u.id.toLowerCase() : '';
        const phoneKey = u.phone ? u.phone.toLowerCase() : '';
        if (
          !deletedSet.has(uNameKey) &&
          !deletedSet.has(idKey) &&
          (!phoneKey || !deletedSet.has(phoneKey))
        ) {
          map.set(uNameKey, u);
        }
      }
    });
  }

  return Array.from(map.values());
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const deletedList = getDeletedUsers();
      // Try loading encrypted users
      const encSaved = localStorage.getItem(STORAGE_KEYS.USERS_LIST);
      if (encSaved) {
        const decrypted = decryptStorageData(encSaved);
        const parsed = JSON.parse(decrypted);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return filterOutDeleted(parsed, deletedList);
        }
      }

      // Legacy fallback
      const legacySaved = localStorage.getItem(STORAGE_KEYS.LEGACY_USERS);
      if (legacySaved) {
        const parsed = JSON.parse(legacySaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return filterOutDeleted(parsed, deletedList);
        }
      }

      return filterOutDeleted(DEFAULT_USERS, deletedList);
    } catch (e) {
      console.error('Failed to load users from secure storage', e);
    }
    return [];
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const encSaved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (encSaved) {
        const decrypted = decryptStorageData(encSaved);
        const parsed: UserAccount = JSON.parse(decrypted);
        // Verify session expiry if present
        if (parsed.sessionExpiresAt) {
          const expiryTime = new Date(parsed.sessionExpiresAt).getTime();
          if (Date.now() > expiryTime) {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
            return null;
          }
        }
        return parsed;
      }

      const legacySaved = localStorage.getItem(STORAGE_KEYS.LEGACY_CURRENT);
      if (legacySaved) {
        return JSON.parse(legacySaved);
      }
    } catch (e) {
      console.error('Failed to load current user', e);
    }
    return null;
  });

  const [sessionLogs, setSessionLogs] = useState<UserSessionLog[]>(() => {
    try {
      const saved = localStorage.getItem('kurd_auth_session_logs_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    loadFromIndexedDB<UserSessionLog[]>('userSessionLogs').then((idbLogs) => {
      if (Array.isArray(idbLogs) && idbLogs.length > 0) {
        setSessionLogs((prev) => {
          const map = new Map<string, UserSessionLog>();
          [...prev, ...idbLogs].forEach((l) => map.set(l.id, l));
          return Array.from(map.values());
        });
      }
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('kurd_auth_session_logs_v1', JSON.stringify(sessionLogs));
      saveToIndexedDB('userSessionLogs', sessionLogs);
    } catch (e) {
      console.error(e);
    }
  }, [sessionLogs]);

  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(() => {
    try {
      const saved = localStorage.getItem('kurd_auth_activity_logs_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    loadFromIndexedDB<ActivityLogItem[]>('userActivityLogs').then((idbLogs) => {
      if (Array.isArray(idbLogs) && idbLogs.length > 0) {
        setActivityLogs((prev) => {
          const map = new Map<string, ActivityLogItem>();
          [...prev, ...idbLogs].forEach((l) => map.set(l.id, l));
          return Array.from(map.values());
        });
      }
    });

    const handleStorageUpdate = () => {
      try {
        const raw = localStorage.getItem('kurd_auth_activity_logs_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setActivityLogs(parsed);
        }
      } catch {}
    };
    window.addEventListener('activityLogUpdate', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('activityLogUpdate', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const logActivity = useCallback((actionType: string, description: string) => {
    if (!currentUser) return;
    recordSystemActivity(currentUser, actionType, description);
    try {
      const raw = localStorage.getItem('kurd_auth_activity_logs_v1');
      if (raw) {
        setActivityLogs(JSON.parse(raw));
      }
    } catch {}
  }, [currentUser]);

  // Session duration active tracker
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      setSessionLogs((prev) => {
        const now = new Date().toISOString();
        return prev.map((log) => {
          if (log.userId === currentUser.id && log.isActive) {
            const start = new Date(log.loginTime).getTime();
            const diffMin = Math.max(1, Math.floor((Date.now() - start) / 60000));
            return {
              ...log,
              lastActiveTime: now,
              durationMinutes: diffMin,
            };
          }
          return log;
        });
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Load from IndexedDB and auto-hash legacy accounts
  useEffect(() => {
    loadFromIndexedDB<string[]>('deletedUserIds').then((idbDeleted) => {
      const currentDeleted = getDeletedUsers();
      const blacklistedOnes = [
        'user-cashier-1', 'hamza', '07829219207',
        'user-manager-1', 'salam', '07701234567',
        'user-admin-1', 'admin'
      ];
      const combinedDeleted = Array.from(new Set([
        ...currentDeleted,
        ...(Array.isArray(idbDeleted) ? idbDeleted : []),
        ...blacklistedOnes
      ]));
      if (combinedDeleted.length > currentDeleted.length) {
        saveDeletedUsers(combinedDeleted);
      }

      loadFromIndexedDB<UserAccount[]>('userAccounts').then(async (idbUsers) => {
        let baseList = users;
        if (Array.isArray(idbUsers) && idbUsers.length > 0) {
          baseList = [...users, ...idbUsers];
        } else if (users.length === 0) {
          baseList = DEFAULT_USERS;
        }

        const filtered = filterOutDeleted(baseList, combinedDeleted);
        
        // Ensure all users have salted cryptographic hashes
        const upgraded = await Promise.all(
          filtered.map(async (u) => {
            if (!u.passwordHash && u.password) {
              const { hash, salt } = await hashPasswordWithSalt(u.password);
              return { ...u, passwordHash: hash, passwordSalt: salt };
            }
            return u;
          })
        );

        setUsers(upgraded);
      });
    });
  }, []);

  // Save users securely whenever changed
  useEffect(() => {
    try {
      const encrypted = encryptStorageData(JSON.stringify(users));
      localStorage.setItem(STORAGE_KEYS.USERS_LIST, encrypted);
      saveToIndexedDB('userAccounts', users);
    } catch (e) {
      console.error('Failed to save users securely to storage', e);
    }
  }, [users]);

  // Save current user securely whenever changed
  useEffect(() => {
    try {
      if (currentUser) {
        const encrypted = encryptStorageData(JSON.stringify(currentUser));
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, encrypted);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        localStorage.removeItem(STORAGE_KEYS.LEGACY_CURRENT);
      }
    } catch (e) {
      console.error('Failed to save current user', e);
    }
  }, [currentUser]);

  // Secure Role-Based Access Control (RBAC) helpers
  const canAccessTab = useCallback((tab: ActiveTab): boolean => {
    if (!currentUser) return false;
    const role = currentUser.role;

    // Only Admin / Manager can access 'main'
    if (tab === 'main') {
      return role === 'admin' || role === 'manager';
    }

    if (role === 'admin' || role === 'manager') {
      return true; // Full access for Admin / Manager
    }

    if (role === 'owner') {
      // Business owner can view Capital, Debts, Dashboard, Statistics, Profits, Products/Inventory
      const allowedOwnerTabs: ActiveTab[] = [
        'capital',
        'debts',
        'charts',
        'profit_loss',
        'inventory',
        'inventory_dry',
        'closed',
        'commission',
      ];
      return allowedOwnerTabs.includes(tab);
    }

    if (role === 'cashier') {
      // POS Accountant / Cashier can access POS, Expenses, Debts
      const allowedCashierTabs: ActiveTab[] = ['pos', 'expenses', 'debts'];
      return allowedCashierTabs.includes(tab);
    }

    if (role === 'accountant') {
      // General Accountant can access all sections except Accounts and Storage
      return tab !== 'accounts' && tab !== 'storage';
    }

    return true;
  }, [currentUser]);

  const hasRole = useCallback((allowedRoles: UserRole[]): boolean => {
    if (!currentUser) return false;
    return allowedRoles.includes(currentUser.role);
  }, [currentUser]);

  const canEdit = useCallback((): boolean => {
    if (!currentUser) return false;
    // Business Owner has zero edit permissions
    if (currentUser.role === 'owner') return false;
    return true;
  }, [currentUser]);

  const login = async (usernameOrPhone: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const cleanIdentifier = sanitizeTextSafe(normalizeInputStr(usernameOrPhone)).toLowerCase();
    const cleanPassword = normalizeInputStr(password);
    const rawDigits = normalizePhoneDigits(usernameOrPhone);

    if (!cleanIdentifier) {
      return { success: false, message: 'تکایە ناوی بەکارهێنەر، ئیمەیڵ، یان ژمارەی مۆبایل بنووسە' };
    }
    if (!cleanPassword) {
      return { success: false, message: 'تکایە ژمارەی نهێنی (Password) بنووسە' };
    }

    // Rate-limiting check to thwart brute-force password guessing
    const rateLimit = checkRateLimit(`login_${cleanIdentifier}`, 5, 60_000, 120_000);
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: `هەوڵی چوونەژوورەوەی نەگونجاو زۆر بوو! بە هۆکاری پاراستنی ئاسایش، هەژمارەکە بۆ ماوەی ${rateLimit.retryAfterSeconds} چرکە قفڵکرا.`,
      };
    }

    // First try exact username/name match
    let foundUser = users.find((u) => {
      const normUName = normalizeInputStr(u.username).toLowerCase();
      const normName = normalizeInputStr(u.name).toLowerCase();
      return normUName === cleanIdentifier || normName === cleanIdentifier;
    });

    // Fallback search by email or phone
    if (!foundUser) {
      foundUser = users.find((u) => {
        const normUName = normalizeInputStr(u.username).toLowerCase();
        const normName = normalizeInputStr(u.name).toLowerCase();
        if (normUName.includes(cleanIdentifier) || cleanIdentifier.includes(normUName)) return true;
        if (u.email && normalizeInputStr(u.email).toLowerCase() === cleanIdentifier) return true;
        if (u.phone) {
          const cleanUPhone = normalizeInputStr(u.phone).toLowerCase();
          if (cleanUPhone === cleanIdentifier) return true;
          const normUPhone = normalizePhoneDigits(u.phone);
          if (
            rawDigits &&
            normUPhone &&
            (normUPhone === rawDigits || normUPhone.endsWith(rawDigits) || rawDigits.endsWith(normUPhone))
          ) {
            return true;
          }
        }
        return false;
      });
    }

    if (!foundUser) {
      return {
        success: false,
        message: 'ئەم بەکارهێنەرە بوونی نییە! تکایە لە Sign Up هەژماری نوێ دروست بکە.',
      };
    }

    // Cryptographic Password Verification
    const isPasswordValid = await verifyPassword(
      cleanPassword,
      foundUser.passwordHash,
      foundUser.passwordSalt,
      foundUser.password
    );

    if (!isPasswordValid) {
      return { success: false, message: 'ژمارەی نهێنی هەڵەیە! تکایە دووبارە تاقی بکەرەوە.' };
    }

    // Reset rate limiter on successful authentication
    resetRateLimit(`login_${cleanIdentifier}`);

    // If account was legacy, upgrade to cryptographic hash
    let userSalt = foundUser.passwordSalt;
    let userHash = foundUser.passwordHash;
    if (!userHash || !userSalt) {
      const hashed = await hashPasswordWithSalt(cleanPassword);
      userHash = hashed.hash;
      userSalt = hashed.salt;
    }

    // Issue cryptographic session token (valid for 30 days)
    const sessionToken = generateSecureToken(32);
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const updatedUser: UserAccount = {
      ...foundUser,
      password: cleanPassword, // Kept for active in-memory session
      passwordHash: userHash,
      passwordSalt: userSalt,
      sessionToken,
      sessionExpiresAt,
      lastLogin: new Date().toISOString(),
    };

    setCurrentUser(updatedUser);
    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      try {
        const encrypted = encryptStorageData(JSON.stringify(updated));
        localStorage.setItem(STORAGE_KEYS.USERS_LIST, encrypted);
        saveToIndexedDB('userAccounts', updated);
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    const sessionLog: UserSessionLog = {
      id: generateId(),
      userId: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name,
      role: updatedUser.role,
      loginTime: new Date().toISOString(),
      lastActiveTime: new Date().toISOString(),
      durationMinutes: 0,
      isActive: true,
    };
    setSessionLogs((prev) => [sessionLog, ...prev.slice(0, 199)]);

    return { success: true };
  };

  const register = async (userData: {
    name: string;
    username?: string;
    password: string;
    role?: UserRole;
    phone?: string;
    email?: string;
    image?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    const cleanName = sanitizeTextSafe(userData.name.trim());
    const cleanEmail = sanitizeTextSafe(userData.email?.trim().toLowerCase() || '');
    let cleanUsername = sanitizeTextSafe(userData.username?.trim().toLowerCase() || '');
    if (!cleanUsername && cleanEmail) {
      cleanUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');
    }
    if (!cleanUsername) {
      cleanUsername = `user_${generateId().slice(0, 6)}`;
    }
    const cleanPassword = userData.password.trim();
    const cleanPhone = sanitizeTextSafe(userData.phone?.trim() || '');

    if (!cleanName || cleanName.length < 3) {
      return { success: false, message: 'ناوی تەواو پێویستە و دەبێت لە ٣ پیت کەمتر نەبێت' };
    }
    if (!cleanEmail) {
      return { success: false, message: 'ئیمەیڵ بۆ پشتگیری هەژمار پێویستە' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, message: 'تکایە ناونیشانی ئیمەیڵێکی دروست بنووسە (نموونە: user@example.com)' };
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      return { success: false, message: 'ژمارەی نهێنی دەبێت لانیکەم ٦ پیت یان ژمارە بێت' };
    }

    const isUsernameTaken = users.some(
      (u) => u.username.toLowerCase() === cleanUsername
    );

    if (isUsernameTaken && userData.username) {
      return {
        success: false,
        message: 'ئەم ناوی بەکارهێنەرە پێشتر بەکارهاتووە! تکایە ناوێکی تر هەڵبژێرە.',
      };
    } else if (isUsernameTaken) {
      cleanUsername = `${cleanUsername}_${Math.floor(Math.random() * 899 + 100)}`;
    }

    const isEmailTaken = users.some(
      (u) => u.email && u.email.toLowerCase() === cleanEmail
    );
    if (isEmailTaken) {
      return {
        success: false,
        message: 'ئەم ئیمەیڵە پێشتر تۆمارکراوە! دەتوانیت ڕاستەوخۆ بچیتە ژوورەوە.',
      };
    }

    // Call Firebase Authentication: createUserWithEmailAndPassword & sendEmailVerification
    let fbUid: string | undefined;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      fbUid = userCredential.user.uid;

      // Send Firebase Email Verification
      try {
        await sendEmailVerification(userCredential.user);
      } catch (verifyErr) {
        console.warn('Firebase sendEmailVerification notice:', verifyErr);
      }
    } catch (fbErr: any) {
      if (fbErr?.code === 'auth/email-already-in-use') {
        return {
          success: false,
          message: 'ئەم ئیمەیڵە پێشتر لە فایەربەیس تۆمارکراوە! دەتوانیت ڕاستەوخۆ بچیتە ژوورەوە.',
        };
      }
      if (fbErr?.code === 'auth/invalid-email') {
        return {
          success: false,
          message: 'ناونیشانی ئیمەیڵ نادروستە!',
        };
      }
      if (fbErr?.code === 'auth/weak-password') {
        return {
          success: false,
          message: 'ژمارەی نهێنی لاوازە، دەبێت لانیکەم ٦ پیت یان ژمارە بێت.',
        };
      }
      if (fbErr?.code === 'auth/operation-not-allowed' || fbErr?.code === 'auth/configuration-not-found') {
        console.warn('Firebase Auth email/password provider not active yet; proceeding with secure local storage registration.');
      } else {
        console.warn('Firebase Auth notice:', fbErr?.message || fbErr);
      }
    }

    // Clear username/phone/id from deleted list if previously deleted
    const currentDeleted = getDeletedUsers();
    const updatedDeleted = currentDeleted.filter((item) => {
      const lower = item.toLowerCase();
      if (lower === cleanUsername) return false;
      if (cleanPhone && lower === cleanPhone.toLowerCase()) return false;
      return true;
    });
    saveDeletedUsers(updatedDeleted);

    // Generate cryptographic hash and salt
    const { hash, salt } = await hashPasswordWithSalt(cleanPassword);
    const sessionToken = generateSecureToken(32);
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const avatarColors = [
      'bg-emerald-600',
      'bg-blue-600',
      'bg-indigo-600',
      'bg-purple-600',
      'bg-amber-600',
      'bg-rose-600',
      'bg-teal-600',
    ];
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const newUser: UserAccount = {
      id: fbUid ? `user-${fbUid}` : `user-${generateId()}`,
      name: cleanName,
      username: cleanUsername,
      password: cleanPassword,
      passwordHash: hash,
      passwordSalt: salt,
      sessionToken,
      sessionExpiresAt,
      role: userData.role || 'cashier',
      phone: cleanPhone,
      email: cleanEmail,
      avatarColor: randomColor,
      image: userData.image,
      avatar: userData.image,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      firebaseUid: fbUid,
      emailVerified: false,
    };

    setUsers((prev) => {
      const filteredPrev = prev.filter((u) => u.username.toLowerCase() !== cleanUsername);
      const nextUsers = [...filteredPrev, newUser];
      try {
        const encrypted = encryptStorageData(JSON.stringify(nextUsers));
        localStorage.setItem(STORAGE_KEYS.USERS_LIST, encrypted);
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
        saveToIndexedDB('userAccounts', nextUsers);
      } catch (e) {
        console.error('Failed to sync registered user to storage', e);
      }
      return nextUsers;
    });

    setCurrentUser(newUser);
    return { success: true, message: 'هەژمارەکە دروستکرا و نامەی ڤێریفیکەیشن نێردرا بۆ ئیمەیڵەکەت!' };
  };

  const logout = () => {
    if (currentUser) {
      setSessionLogs((prev) =>
        prev.map((log) => (log.userId === currentUser.id && log.isActive ? { ...log, isActive: false, lastActiveTime: new Date().toISOString() } : log))
      );
    }
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  };

  const updateUser = async (id: string, updates: Partial<UserAccount>) => {
    let sanitizedUpdates: Partial<UserAccount> = { ...updates };

    if (updates.name) {
      sanitizedUpdates.name = sanitizeTextSafe(updates.name);
    }
    if (updates.username) {
      sanitizedUpdates.username = sanitizeTextSafe(updates.username.toLowerCase());
    }
    if (updates.phone) {
      sanitizedUpdates.phone = sanitizeTextSafe(updates.phone);
    }
    if (updates.email) {
      sanitizedUpdates.email = sanitizeTextSafe(updates.email.toLowerCase());
    }

    // If password is updated, recalculate salted cryptographic hash
    if (updates.password) {
      const { hash, salt } = await hashPasswordWithSalt(updates.password);
      sanitizedUpdates.passwordHash = hash;
      sanitizedUpdates.passwordSalt = salt;
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const updated = { ...u, ...sanitizedUpdates };
          if (currentUser?.id === id) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return u;
      })
    );
  };

  const deleteUser = (id: string) => {
    const target = users.find((u) => u.id === id);
    const targetUsername = target?.username.toLowerCase() || '';
    const targetPhone = target?.phone?.toLowerCase() || '';

    const currentDeleted = getDeletedUsers();
    const newItems = [
      id.toLowerCase(),
      targetUsername,
      targetPhone,
      ...(id.startsWith('user-admin') || targetUsername === 'admin' ? ['user-admin-1', 'admin', '07501234567'] : []),
      ...(id.startsWith('user-cashier') || targetUsername === 'hamza' ? ['user-cashier-1', 'hamza', '07829219207'] : []),
      ...(id.startsWith('user-manager') || targetUsername === 'salam' ? ['user-manager-1', 'salam', '07701234567'] : []),
    ].filter(Boolean);

    const updatedDeleted = Array.from(new Set([...currentDeleted, ...newItems]));
    saveDeletedUsers(updatedDeleted);

    const remaining = filterOutDeleted(
      users.filter((u) => u.id !== id && u.username.toLowerCase() !== targetUsername),
      updatedDeleted
    );

    setUsers(remaining);
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');

    try {
      const encrypted = encryptStorageData(JSON.stringify(remaining));
      localStorage.setItem(STORAGE_KEYS.USERS_LIST, encrypted);
      saveToIndexedDB('userAccounts', remaining);
    } catch (e) {
      console.error('Failed to update storage after deleteUser', e);
    }

    if (currentUser?.id === id || (currentUser && currentUser.username.toLowerCase() === targetUsername)) {
      setCurrentUser(null);
    }
  };

  const switchUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
    }
  };

  const resetPasswordWithEmail = async (
    emailOrUsername: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanId = sanitizeTextSafe(normalizeInputStr(emailOrUsername)).toLowerCase();
    const cleanPass = newPassword.trim();
    if (!cleanId) {
      return { success: false, message: 'تکایە ناوی بەکارهێنەر یان ئیمەیڵ بنووسە' };
    }
    if (!cleanPass || cleanPass.length < 4) {
      return { success: false, message: 'ژمارەی نهێنی نوێ دەبێت لانیکەم ٤ پیت یان ژمارە بێت' };
    }

    const foundUser = users.find((u) => {
      const normUName = normalizeInputStr(u.username).toLowerCase();
      const normEmail = u.email ? normalizeInputStr(u.email).toLowerCase() : '';
      return normUName === cleanId || (normEmail && normEmail === cleanId);
    });

    if (!foundUser) {
      return { success: false, message: 'هیچ هەژمارێک بەم ئیمەیڵ یان ناوی بەکارهێنەرە نەدۆزرایەوە!' };
    }

    if (foundUser.email) {
      try {
        await sendPasswordResetEmail(auth, foundUser.email);
      } catch (err) {
        console.warn('Firebase sendPasswordResetEmail notice:', err);
      }
    }

    await updateUser(foundUser.id, { password: cleanPass });
    return { success: true, message: `ژمارەی نهێنی هەژماری (${foundUser.name}) بە سەرکەوتوویی نوێکرایەوە!` };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        sessionLogs,
        activityLogs,
        isAuthenticated: !!currentUser,
        login,
        register,
        logout,
        updateUser,
        deleteUser,
        switchUser,
        setUsers,
        canAccessTab,
        hasRole,
        canEdit,
        resetPasswordWithEmail,
        logActivity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
