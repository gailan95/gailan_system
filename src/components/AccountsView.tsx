import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  UserPlus,
  Shield,
  Phone,
  Key,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  UserCog,
  X,
  Search,
  Lock,
  Save,
  Mail,
  Home,
  ArrowLeft,
  Upload,
  History,
} from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useDatabase } from '../context/DatabaseContext';
import { compressImage } from '../utils/imageCompressor';
import { UserAccount, UserRole } from '../types';

const ROLE_LABELS: Record<UserRole, { label: string; color: string }> = {
  accountant: { label: 'ژمێریاری گشتی', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  cashier: { label: 'ژمێریار /بێژەری خاڵی فرۆشتن', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  owner: { label: 'خاوەنی کار', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  admin: { label: 'بەڕێوەبەری گشتی سیستەم', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  manager: { label: 'بەڕێوەبەری گشتی سیستەم', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
};

export const AccountsView: React.FC<{ onBackToMain?: () => void }> = ({ onBackToMain }) => {
  const { currentUser, users, sessionLogs, activityLogs, register, updateUser, deleteUser, switchUser } = useAuth();
  const { t } = useLanguage();
  const { forceSaveToDisk, settings, updateSettings } = useDatabase();

  const [activeAccountTab, setActiveAccountTab] = useState<'users' | 'activity'>('users');

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserAccount | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [storeNameInput, setStoreNameInput] = useState(settings.storeName ?? '');
  const [isStoreNameSaving, setIsStoreNameSaving] = useState(false);
  const [storeNameSaved, setStoreNameSaved] = useState(false);

  useEffect(() => {
    if (settings.storeName !== undefined) {
      setStoreNameInput(settings.storeName);
    }
  }, [settings.storeName]);

  const handleSaveStoreTitle = async () => {
    setIsStoreNameSaving(true);
    const updatedSettings = { ...settings, storeName: storeNameInput };
    updateSettings({ storeName: storeNameInput });
    await forceSaveToDisk({ settings: updatedSettings });
    setIsStoreNameSaving(false);
    setStoreNameSaved(true);
    setTimeout(() => setStoreNameSaved(false), 3000);
  };

  // Form State for Adding New User
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('cashier');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newImage, setNewImage] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Form State for Editing User
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('cashier');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const handleNewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 500, maxHeight: 500, quality: 0.8 });
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setNewImage(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setNewImage(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 500, maxHeight: 500, quality: 0.8 });
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setEditImage(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setEditImage(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredUsers = useMemo(() => {
    const term = debouncedSearchTerm.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => {
      return (
        u.name.toLowerCase().includes(term) ||
        u.username.toLowerCase().includes(term) ||
        (u.phone && u.phone.includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term))
      );
    });
  }, [users, debouncedSearchTerm]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) {
      setFormError('تکایە سەرجەم بڕگە پێویستەکان پڕبکەرەوە.');
      return;
    }

    const res = await register({
      name: newName.trim(),
      username: newUsername.trim(),
      password: newPassword.trim(),
      role: newRole,
      phone: newPhone.trim() || undefined,
      email: newEmail.trim() || undefined,
      image: newImage.trim() || undefined,
    });

    if (res.success) {
      setFormSuccess(`هەژماری (${newName}) بە سەرکەوتوویی دروستکرا و پاشەکەوت کرا.`);
      setTimeout(() => {
        setShowAddModal(false);
        setNewName('');
        setNewUsername('');
        setNewPassword('');
        setNewPhone('');
        setNewEmail('');
        setNewImage('');
        setNewRole('cashier');
        setFormSuccess('');
      }, 1200);
    } else {
      setFormError(res.message || 'خەڵەتێک ڕوویدا لە دروستکردنی هەژمار.');
    }
  };

  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditUsername(user.username);
    setEditPassword(user.password || '');
    setEditRole(user.role);
    setEditPhone(user.phone || '');
    setEditEmail(user.email || '');
    setEditImage(user.image || user.avatar || '');
    setEditError('');
    setEditSuccess('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError('');
    setEditSuccess('');

    if (!editName.trim() || !editUsername.trim()) {
      setEditError('تکایە ناوی تەواو و ناوی بەکارهێنەر پڕبکەرەوە.');
      return;
    }

    // Check username collision if username changed
    if (editUsername.toLowerCase() !== editingUser.username.toLowerCase()) {
      const exists = users.some(
        (u) => u.id !== editingUser.id && u.username.toLowerCase() === editUsername.toLowerCase()
      );
      if (exists) {
        setEditError('ئەم ناوی بەکارهێنەرە پێشتر بەکارهاتووە. ناواخنی تر هەڵبژێرە.');
        return;
      }
    }

    await updateUser(editingUser.id, {
      name: editName.trim(),
      username: editUsername.trim(),
      password: editPassword.trim() || undefined,
      role: editRole,
      phone: editPhone.trim() || undefined,
      email: editEmail.trim() || undefined,
      image: editImage.trim() || undefined,
      avatar: editImage.trim() || undefined,
    });

    setEditSuccess('زانیارییەکان بە سەرکەوتوویی نوێکرانەوە.');
    setTimeout(() => {
      setEditingUser(null);
      setEditSuccess('');
    }, 1000);
  };

  const handleDeleteConfirm = (id: string) => {
    deleteUser(id);
    setDeletingUser(null);
  };

  return (
    <div className="space-y-3 animate-fadeIn pb-8 relative">
      {/* Subtle warm amber ambient glow at bottom center */}
      <div className="fixed inset-x-0 bottom-0 h-64 bg-gradient-to-t from-amber-500/5 via-amber-500/2 to-transparent pointer-events-none z-0" />

      {/* Page Title Header (Outside Black Box) */}
      <div className="flex flex-col gap-2.5 px-0.5 relative z-10" dir="rtl">
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-900/80 border border-white/15 text-emerald-400 flex items-center justify-center shrink-0 shadow-md">
              <UserCog className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <h1 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight drop-shadow-xs">
                بەشی بەڕێوەبردنی هەژمارەکان
              </h1>
              <span className="text-[10px] sm:text-xs bg-slate-800/90 text-white font-bold px-2.5 py-0.5 rounded-full border border-white/15 whitespace-nowrap shrink-0 shadow-xs">
                {users.length} هەژمار
              </span>
            </div>
          </div>
          {onBackToMain && (
            <button
              onClick={onBackToMain}
              className="flex items-center justify-center gap-2 px-3.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer border border-white/20 shadow-md whitespace-nowrap shrink-0"
              title="گەڕانەوە بۆ پەڕەی سەرەکی"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span className="text-white font-bold">سەرەکی</span>
            </button>
          )}
        </div>

        {/* Sub-Tabs for General Manager: Users vs Activity Log */}
        {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
          <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-white/10 relative z-10 w-fit">
            <button
              type="button"
              onClick={() => setActiveAccountTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeAccountTab === 'users'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              بەڕێوەبردنی هەژمارەکان
            </button>
            <button
              type="button"
              onClick={() => setActiveAccountTab('activity')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeAccountTab === 'activity'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              لۆگی چالاکییەکان (Activity Log)
            </button>
          </div>
        )}

        {/* Deep-jade to teal solid-fill gradient button */}
        {activeAccountTab === 'users' && (
          <button
            type="button"
            onClick={() => {
              setShowAddModal(true);
              setFormError('');
              setFormSuccess('');
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm px-4 h-10 rounded-xl shadow-lg border border-emerald-400/30 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4.5 h-4.5 text-white" />
            <span className="tracking-wide text-white">زیادکردنی هەژماری نوێ</span>
          </button>
        )}
      </div>

      {activeAccountTab === 'activity' ? (
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-white/10 shadow-xl space-y-4 relative z-10" dir="rtl">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <History className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-white">لۆگی چالاکییەکان و کارەکانی سیستەم (Activity Log)</h2>
                <p className="text-xs text-slate-300">چاودێریکردنی کاتژمێر، بەروار و چالاکییە سەرەکییەکانی هەژمارەکان بەپێی کاتژمێری سیستەم</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-slate-800 text-emerald-300 rounded-full border border-emerald-500/30">
              {activityLogs.length} چالاکی
            </span>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-300">
                  <th className="py-2.5 px-3 font-black">بەکاربەر / هەژمار</th>
                  <th className="py-2.5 px-3 font-black">ڕۆڵ</th>
                  <th className="py-2.5 px-3 font-black">جۆری چالاکی</th>
                  <th className="py-2.5 px-3 font-black">وردەکاری چالاکی</th>
                  <th className="py-2.5 px-3 font-black">کات و بەروار (کاتژمێری سیستەم)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activityLogs.map((log) => {
                  const logDate = new Date(log.timestamp);
                  const timeStr = logDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const dateStr = logDate.toLocaleDateString('en-GB');

                  return (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-bold text-white">
                        <div>{log.name}</div>
                        <div className="text-[10px] text-slate-300 font-mono">@{log.username}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-emerald-300 text-[10px] font-bold border border-emerald-500/20">
                          {ROLE_LABELS[log.role]?.label || log.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-cyan-300">
                        {log.actionType}
                      </td>
                      <td className="py-3 px-3 text-slate-200">
                        {log.description}
                      </td>
                      <td className="py-3 px-3 font-mono text-amber-300 font-bold">
                        <div>{timeStr}</div>
                        <div className="text-[10px] text-slate-300">{dateStr}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {activityLogs.length === 0 && (
              <div className="text-center py-8 text-slate-300 text-xs">
                هیچ چالاکییەک تۆمار نەکراوە هێشتا لە سیستەمدا.
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Search Bar */}
          <div className="relative z-10">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="گەڕان بەپێی ناوی بەکارهێنەر، ناو یان ژمارەی مۆبایل..."
              className="w-full bg-slate-900/80 backdrop-blur-md border border-slate-700/90 focus:border-emerald-400 rounded-xl pr-14 pl-3 h-10 text-xs sm:text-sm text-white placeholder-slate-400 shadow-md outline-none transition-all text-center"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          </div>

          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 relative z-10">
        {filteredUsers.map((user) => {
          const isCurrent = currentUser?.id === user.id;
          const roleConfig = ROLE_LABELS[user.role] || {
            label: user.role,
            color: 'bg-slate-800 text-slate-200 border-slate-700',
          };

          return (
            <div
              key={user.id}
              className={`bg-slate-900/80 backdrop-blur-md text-white rounded-2xl p-3.5 border transition-all shadow-lg flex flex-col justify-between gap-3 ${
                isCurrent ? 'border-emerald-500/80 ring-1 ring-emerald-500/30' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border border-white/20 text-cyan-300 font-black text-sm flex items-center justify-center shadow-inner shrink-0"
                    >
                      <span>{user.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 className="font-black text-white text-xs sm:text-sm leading-tight flex items-center gap-1.5">
                        <span>{user.name}</span>
                        {isCurrent && (
                          <span className="relative flex h-2 w-2" title="ئێستا بەکاری دێنیت">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-300 font-mono">@{user.username}</p>
                      {user.email && (
                        <p className="text-[10px] text-slate-300 font-mono flex items-center gap-1 mt-0.5" dir="ltr">
                          <Mail className="w-3 h-3 text-teal-400 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-slate-800/90 text-white border-white/20 shrink-0"
                  >
                    {roleConfig.label.split(' ')[0]}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                {!isCurrent && (
                  <button
                    type="button"
                    onClick={() => switchUser(user.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-100 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>چونەژوورەوە</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenEdit(user)}
                  className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white border border-white/10 transition-colors cursor-pointer"
                  title="دەستکاریکردنی زانیارییەکان"
                >
                  <Edit2 className="w-3.5 h-3.5 text-white" />
                </button>

                <button
                  type="button"
                  onClick={() => setDeletingUser(user)}
                  className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                  title="سڕینەوەی هەژمار"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="bg-slate-900 rounded-2xl p-10 text-center border border-slate-800 space-y-2.5 relative z-10 shadow-md">
          <User className="w-10 h-10 text-slate-900 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">هیچ هەژمارێک نەدۆزرایەوە</h3>
          <p className="text-xs text-slate-900">ناوی بەکارهێنەر یان زانیاری تر تاقی بکەرەوە</p>
        </div>
      )}

      {/* Session Logs & Usage Time Section */}
      <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-white/10 shadow-xl space-y-4 relative z-10 mt-6" dir="rtl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white">مێژووی چوونەژوورەوە و کاتژمێرەکانی بەکارهێنانی هەژمارەکان</h2>
              <p className="text-xs text-slate-300">چاودێریکردنی کاتژمێری چوونەژوورەوە و ماوەی بەکارهێنانی بەرنامە لەلایەن هەژمارەکانەوە</p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-800 text-teal-300 rounded-full border border-teal-500/30">
            {sessionLogs.length} تۆمار
          </span>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-300">
                <th className="py-2.5 px-3 font-black">ناو و ناوی بەکارهێنەر</th>
                <th className="py-2.5 px-3 font-black">ڕۆڵ</th>
                <th className="py-2.5 px-3 font-black">کاتی چوونەژوورەوە</th>
                <th className="py-2.5 px-3 font-black">دوایین چالاکی</th>
                <th className="py-2.5 px-3 font-black">ماوەی بەکارهێنان</th>
                <th className="py-2.5 px-3 font-black">دۆخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sessionLogs.map((log) => {
                const loginDate = new Date(log.loginTime);
                const timeStr = loginDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dateStr = loginDate.toLocaleDateString('en-GB');
                const lastActiveDate = new Date(log.lastActiveTime);
                const lastActiveStr = lastActiveDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

                return (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-bold text-white">
                      <div>{log.name}</div>
                      <div className="text-[10px] text-slate-300 font-mono">@{log.username}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-teal-300 text-[10px] font-bold border border-teal-500/20">
                        {ROLE_LABELS[log.role]?.label || log.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-400 font-bold">
                      <div>{timeStr}</div>
                      <div className="text-[10px] text-slate-300">{dateStr}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-cyan-300">
                      {lastActiveStr}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-300">
                      {log.durationMinutes < 60 ? `${log.durationMinutes} خولەک` : `${(log.durationMinutes / 60).toFixed(1)} کاتژمێر`}
                    </td>
                    <td className="py-3 px-3">
                      {log.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          ئۆنلاین / کارا
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                          دەرچووە
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sessionLogs.length === 0 && (
            <div className="text-center py-8 text-slate-300 text-xs">
              هیچ مێژوویەکی چوونەژوورەوە تۆمار نەکراوە هێشتا.
            </div>
          )}
        </div>
      </div>
        </>
      )}

      {/* MODAL 1: ADD NEW USER */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex justify-center items-start p-3 sm:p-4 pt-6 sm:pt-10 pb-24 sm:pb-16 bg-slate-950/80 backdrop-blur-md animate-fadeIn no-pull-refresh" dir="rtl">
          <div className="bg-slate-900/95 backdrop-blur-xl text-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-white/15 space-y-5 animate-scaleUp mb-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-black text-base text-white">تۆمارکردنی هەژماری نوێ</h2>
                  <p className="text-xs text-slate-900">بۆ هەمیشە خەزن دەبێت لە سیستەم</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white transition-colors cursor-pointer border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white mb-1">ناوی تەواو:</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="نموونە: هێمن ئەحمەد"
                  className="w-full bg-slate-950/80 border border-slate-700 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1">ناوی بەکارهێنەر (Username):</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="hemn123"
                  className="w-full bg-slate-950/80 border border-slate-700 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder-slate-400 outline-none text-right"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1">ژمارەی مۆبایل (ئارەزوومەندانە):</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="0750XXXXXXX"
                  className="w-full bg-slate-950/80 border border-slate-700 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder-slate-400 outline-none text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1">ئیمەیڵ (بۆ پاراستنی هەژمار و گەڕاندنەوەی وشەی نهێنی):</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full bg-slate-950/80 border border-slate-700 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder-slate-400 outline-none text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1">ژمارەی نهێنی (Password):</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-700 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder-slate-400 outline-none text-right"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1">دەسەڵاتی هەژمار لە سیستم:</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950/80 border border-slate-700 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="accountant">ژمێریاری گشتی</option>
                  <option value="cashier">ژمێریار /بێژەری خاڵی فرۆشتن</option>
                  <option value="owner">خاوەنی کار</option>
                  <option value="admin">بەڕێوەبەری گشتی سیستەم</option>
                </select>
              </div>

              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  تۆمارکردن و خەزنکردن
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-3 px-4 bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer border border-white/10"
                >
                  پاشگەزبوونەوە
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex justify-center items-start p-3 sm:p-4 pt-6 sm:pt-10 pb-24 sm:pb-16 bg-slate-950/80 backdrop-blur-md animate-fadeIn no-pull-refresh" dir="rtl">
          <div className="bg-slate-900/95 backdrop-blur-xl text-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-white/15 space-y-5 animate-scaleUp mb-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                  <Edit2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-black text-base text-white">دەستکاریکردنی هەژمار</h2>
                  <p className="text-xs text-slate-900">نوێکردنەوەی زانیارییەکانی ({editingUser.name})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white transition-colors cursor-pointer border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white mb-1">ناوی تەواو:</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 focus:border-blue-400 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1">ناوی بەکارهێنەر (Username):</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 focus:border-blue-400 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none text-right"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1">ژمارەی مۆبایل:</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 focus:border-blue-400 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1">ئیمەیڵ (بۆ پاراستنی هەژمار و گەڕاندنەوەی وشەی نهێنی):</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full bg-slate-950/80 border border-slate-700 focus:border-blue-400 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1">ژمارەی نهێنی (Password):</label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 focus:border-blue-400 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none text-right"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1">دەسەڵاتی هەژمار لە سیستم:</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950/80 border border-slate-700 focus:border-blue-400 rounded-xl px-4 py-2.5 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="accountant">ژمێریاری گشتی</option>
                  <option value="cashier">ژمێریار /بێژەری خاڵی فرۆشتن</option>
                  <option value="owner">خاوەنی کار</option>
                  <option value="admin">بەڕێوەبەری گشتی سیستەم</option>
                </select>
              </div>

              {editError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {editSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{editSuccess}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  نوێکردنەوە و پاشەکەوت
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="py-3 px-4 bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer border border-white/10"
                >
                  داخستن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex justify-center items-start p-3 sm:p-4 pt-10 sm:pt-16 pb-24 sm:pb-16 bg-slate-950/80 backdrop-blur-md animate-fadeIn no-pull-refresh" dir="rtl">
          <div className="bg-slate-900/95 backdrop-blur-xl text-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-white/15 text-center space-y-4 animate-scaleUp mb-8">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-300 border border-rose-500/30 mx-auto flex items-center justify-center">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">سڕینەوەی هەژمار</h3>
              <p className="text-xs text-slate-900">
                ئایا دڵنیایت لە سڕینەوەی هەژماری (<span className="text-rose-300 font-bold">{deletingUser.name}</span>)؟
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleDeleteConfirm(deletingUser.id)}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
              >
                بەڵێ، بسڕەوە
              </button>
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer border border-white/10"
              >
                پاشگەزبوونەوە
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
