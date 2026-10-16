import React, { useState, useRef, useEffect } from 'react';
import { useBanking } from '../../context/BankingContext';
import {
  ShieldCheck,
  Users,
  FileText,
  CheckCircle2,
  ArrowLeft,
  X,
  AlertCircle,
  Search,
  Headphones,
  Activity,
  Check,
  Menu,
  ChevronRight,
  Send,
  Paperclip,
  UserCheck,
  CreditCard,
  DollarSign,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { ChatMessage, BankAccount, BankingTransaction, UserProfile } from '../../types/banking';
import { formatCurrency } from '../../utils/currency';
import { fetchRealAdminData, updateAccountBalance } from '../../services/firebase';

interface AdminDashboardProps {
  onBackToApp: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToApp }) => {
  const {
    chatMessages,
    adminSendMessage,
    accounts: contextAccounts,
    transactions: contextTransactions,
    securityEvents,
    currentUser,
  } = useBanking();

  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard' | 'users' | 'deposits' | 'transfers' | 'chat'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Real backend data states
  const [realUsers, setRealUsers] = useState<UserProfile[]>([]);
  const [realAccounts, setRealAccounts] = useState<BankAccount[]>(contextAccounts);
  const [realTransactions, setRealTransactions] = useState<BankingTransaction[]>(contextTransactions);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Selected user for detail view
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Customer care chat selection
  const [selectedThreadId, setSelectedThreadId] = useState<string>('');
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load real records from backend
  const loadAdminData = () => {
    setIsLoadingData(true);
    setQueryError(null);
    fetchRealAdminData()
      .then((data) => {
        setRealUsers(data.users);
        if (data.accounts.length > 0) {
          setRealAccounts(data.accounts);
        } else if (contextAccounts.length > 0) {
          setRealAccounts(contextAccounts);
        }
        if (data.transactions.length > 0) {
          setRealTransactions(data.transactions);
        } else if (contextTransactions.length > 0) {
          setRealTransactions(contextTransactions);
        }
        if (data.queryError && data.users.length === 0) {
          setQueryError(data.queryError);
        }
      })
      .catch((err) => {
        setQueryError(err?.message || 'Database connection error');
      })
      .finally(() => {
        setIsLoadingData(false);
      });
  };

  useEffect(() => {
    loadAdminData();
  }, [contextAccounts, contextTransactions]);

  // Reconcile current authenticated user to prevent 0 users
  useEffect(() => {
    if (currentUser) {
      setRealUsers((prev) => {
        if (!prev.some((u) => u.uid === currentUser.uid)) {
          return [currentUser, ...prev];
        }
        return prev;
      });
    }
  }, [currentUser]);

  // Group messages by threadId
  const threadMap = new Map<string, { threadId: string; senderName: string; messages: ChatMessage[]; lastMessage?: ChatMessage }>();

  if (currentUser) {
    threadMap.set(currentUser.uid, {
      threadId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email,
      messages: [],
    });
  }

  realUsers.forEach((u) => {
    if (!threadMap.has(u.uid)) {
      threadMap.set(u.uid, {
        threadId: u.uid,
        senderName: u.displayName || u.email,
        messages: [],
      });
    }
  });

  chatMessages.forEach((msg) => {
    const existing = threadMap.get(msg.threadId);
    if (existing) {
      existing.messages.push(msg);
      existing.lastMessage = msg;
      if (msg.senderRole === 'customer') {
        existing.senderName = msg.senderName;
      }
    } else {
      threadMap.set(msg.threadId, {
        threadId: msg.threadId,
        senderName: msg.senderRole === 'customer' ? msg.senderName : `Unauthenticated User (${msg.threadId.substring(0, 6)})`,
        messages: [msg],
        lastMessage: msg,
      });
    }
  });

  const threads = Array.from(threadMap.values());
  const activeThread = threads.find((t) => t.threadId === selectedThreadId);
  const activeMessages = activeThread ? activeThread.messages : [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, isSendingReply]);

  const handleSendAdminReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedThreadId || (!replyText.trim() && !replyImage) || isSendingReply) return;

    const textToSend = replyText.trim();
    const imageToSend = replyImage || undefined;

    setReplyText('');
    setReplyImage(null);
    setIsSendingReply(true);

    try {
      await adminSendMessage(selectedThreadId, textToSend, imageToSend);
    } finally {
      setIsSendingReply(false);
    }
  };

  const totalAssetsCents = realAccounts.reduce((acc, a) => acc + a.availableBalanceCents, 0);

  // Filtered users for users view
  const filteredUsers = realUsers.filter(
    (u) =>
      u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.uid?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const depositsList = realTransactions.filter((tx) => tx.type === 'deposit');
  const transfersList = realTransactions.filter((tx) => tx.type === 'external_wire' || tx.type === 'internal_transfer');

  const handleNavClick = (tab: 'dashboard' | 'users' | 'deposits' | 'transfers' | 'chat') => {
    setActiveAdminTab(tab);
    setIsMobileMenuOpen(false);
    setSelectedUser(null);
    if (tab !== 'chat') {
      setSelectedThreadId('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row font-sans">
      {/* Mobile Top Header */}
      <div className="lg:hidden bg-slate-950 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Logo size="sm" light={true} />
          <div>
            <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded uppercase tracking-wider">
              Ops Portal
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white bg-slate-900 rounded border border-slate-800 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-950/60 z-40 backdrop-blur-xs"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation (Desktop & Mobile Drawer) */}
      <aside
        className={`${
          isMobileMenuOpen
            ? 'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl'
            : 'hidden lg:flex lg:static lg:w-64 bg-slate-900 text-slate-300 flex-col'
        }`}
      >
        <div className="p-4 border-b border-slate-800 hidden lg:flex items-center justify-between">
          <div>
            <Logo size="sm" light={true} />
            <span className="text-[10px] font-mono text-amber-400 mt-2 block uppercase tracking-widest">Treasury Ops Portal</span>
          </div>
        </div>

        {/* Mobile Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between lg:hidden">
          <span className="text-sm font-bold text-white">Administration Menu</span>
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Activity },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'deposits', label: 'Deposits', icon: CheckCircle2 },
            { id: 'transfers', label: 'Withdrawals & Transfers', icon: FileText },
            { id: 'chat', label: 'Customer Care', icon: Headphones },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleNavClick(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded text-sm font-semibold transition-colors cursor-pointer ${
                activeAdminTab === tab.id
                  ? 'bg-slate-800 text-white border-l-4 border-amber-500'
                  : 'hover:bg-slate-800 hover:text-white text-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4 text-amber-400" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="text-[11px] text-slate-400 mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Clearance Level 4</span>
          </div>
          <button
            onClick={onBackToApp}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors border border-slate-700 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>Exit to Banking App</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 min-w-0">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 capitalize">
              {activeAdminTab === 'chat' ? 'Customer Care Inbox' : activeAdminTab}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure administrative controls and authoritative database verification
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAdminData()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin text-amber-600' : 'text-emerald-600'}`} />
              <span>{isLoadingData ? 'Syncing...' : 'Sync Backend'}</span>
            </button>
          </div>
        </header>

        {queryError && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Database Sync Notice: {queryError}. Retaining verified cached records.</span>
            </div>
            <button
              onClick={() => loadAdminData()}
              className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 rounded font-semibold text-[11px] cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* 1. DASHBOARD VIEW */}
        {activeAdminTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">Registered Users</div>
                <div className="text-2xl font-bold font-serif text-slate-900 mt-1">
                  {isLoadingData ? '...' : realUsers.length}
                </div>
                <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Synchronized Backend Records
                </div>
              </div>

              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">Total Customer Assets</div>
                <div className="text-2xl font-bold font-serif text-slate-900 mt-1">
                  {isLoadingData ? '...' : formatCurrency(totalAssetsCents)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{realAccounts.length} Active Depository Accounts</div>
              </div>

              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">Compliance & Wires</div>
                <div className="text-2xl font-bold font-serif text-slate-900 mt-1">
                  {isLoadingData ? '...' : realTransactions.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Processed Transactions</div>
              </div>

              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">Support Threads</div>
                <div className="text-2xl font-bold font-serif text-slate-900 mt-1">
                  {threads.length}
                </div>
                <div className="text-[11px] text-amber-600 mt-1">Active Care Channels</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Recent Security & Audit Events</h3>
                <div className="space-y-2">
                  {securityEvents.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No security audit incidents recorded.</p>
                  ) : (
                    securityEvents.slice(0, 5).map((evt) => (
                      <div key={evt.id} className="p-3 bg-slate-50 rounded border border-slate-200 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-800">{evt.actionType}</span>
                          <p className="text-slate-500 text-[11px]">{evt.description}</p>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Recent Registered Profiles</h3>
                <div className="space-y-2">
                  {realUsers.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">
                      {isLoadingData ? 'Loading customer accounts...' : 'No customer records yet.'}
                    </p>
                  ) : (
                    realUsers.slice(0, 5).map((u) => (
                      <div key={u.uid} className="p-3 bg-slate-50 rounded border border-slate-200 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-900">{u.displayName}</span>
                          <p className="text-slate-500 font-mono text-[11px]">{u.email}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 capitalize">
                          {u.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. USERS VIEW */}
        {activeAdminTab === 'users' && (
          <div className="space-y-4">
            {selectedUser ? (
              <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-xs text-amber-600 hover:text-amber-700 font-semibold mb-2 flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Users List
                    </button>
                    <h2 className="text-lg font-bold text-slate-900">{selectedUser.displayName}</h2>
                    <p className="text-xs text-slate-500 font-mono">{selectedUser.email} • UID: {selectedUser.uid}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded capitalize">
                    {selectedUser.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-50 p-4 rounded border border-slate-200">
                    <span className="text-slate-500 block">Phone Number</span>
                    <span className="font-semibold text-slate-900 mt-1 block">{selectedUser.phone || 'Not set'}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded border border-slate-200">
                    <span className="text-slate-500 block">MFA Status</span>
                    <span className="font-semibold text-slate-900 mt-1 block uppercase">{selectedUser.mfaStatus || 'Not enabled'}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded border border-slate-200">
                    <span className="text-slate-500 block">KYC Verification</span>
                    <span className="font-semibold text-slate-900 mt-1 block uppercase">{selectedUser.kycStatus || 'Not started'}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Associated Depository Accounts</h3>
                  <div className="space-y-2">
                    {realAccounts
                      .filter((a) => a.ownerUid === selectedUser.uid)
                      .map((acc) => (
                        <div key={acc.id} className="p-4 bg-slate-50 rounded border border-slate-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-900">{acc.accountName}</span>
                            <span className="font-mono text-slate-500 ml-2">({acc.accountNumberMasked})</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-900 text-sm">{formatCurrency(acc.availableBalanceCents)}</span>
                            <span className="block text-[10px] text-emerald-600 capitalize">{acc.status}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search users by name, email, or UID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{filteredUsers.length} Users Listed</span>
                </div>

                {filteredUsers.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-xs">
                    {isLoadingData ? 'Querying user accounts from database...' : 'No matching user records found.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-3.5">Client Name</th>
                          <th className="p-3.5">Email</th>
                          <th className="p-3.5">MFA Status</th>
                          <th className="p-3.5">KYC Status</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map((user) => (
                          <tr key={user.uid} className="hover:bg-slate-50">
                            <td className="p-3.5 font-semibold text-slate-900">{user.displayName}</td>
                            <td className="p-3.5 font-mono text-slate-600">{user.email}</td>
                            <td className="p-3.5 uppercase text-[10px] font-semibold text-slate-700">{user.mfaStatus || 'Not enabled'}</td>
                            <td className="p-3.5 uppercase text-[10px] font-semibold text-slate-700">{user.kycStatus || 'Not started'}</td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 capitalize">
                                {user.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. DEPOSITS VIEW */}
        {activeAdminTab === 'deposits' && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Deposit & Funding Review Queue</h3>
                <p className="text-xs text-slate-500">Genuine inbound deposit records and settlement status</p>
              </div>
              <span className="text-xs font-mono text-slate-500">{depositsList.length} Records</span>
            </div>

            {depositsList.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No deposit requests found in backend database.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">Reference ID</th>
                      <th className="p-3.5">Description</th>
                      <th className="p-3.5">Account ID</th>
                      <th className="p-3.5">Amount</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {depositsList.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-mono text-slate-600">{tx.referenceNumber}</td>
                        <td className="p-3.5 font-semibold text-slate-900">{tx.description}</td>
                        <td className="p-3.5 font-mono text-slate-500">{tx.sourceAccountId}</td>
                        <td className="p-3.5 font-mono font-bold text-slate-900">{formatCurrency(tx.amountCents)}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 uppercase">
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500 font-mono text-[11px]">{new Date(tx.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4. WITHDRAWALS & TRANSFERS VIEW */}
        {activeAdminTab === 'transfers' && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Commercial Wires & Settlement Log</h3>
                <p className="text-xs text-slate-500">Authoritative outgoing payment records and compliance audit logs</p>
              </div>
              <span className="text-xs font-mono text-slate-500">{transfersList.length} Records</span>
            </div>

            {transfersList.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No transfer or wire requests found in backend database.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">Reference ID</th>
                      <th className="p-3.5">Description</th>
                      <th className="p-3.5">Recipient</th>
                      <th className="p-3.5">Amount</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transfersList.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-mono text-slate-600">{tx.referenceNumber}</td>
                        <td className="p-3.5 font-semibold text-slate-900">{tx.description}</td>
                        <td className="p-3.5 text-slate-700">{tx.recipientIdentifier}</td>
                        <td className="p-3.5 font-mono font-bold text-slate-900">{formatCurrency(tx.amountCents)}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 uppercase">
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500 font-mono text-[11px]">{new Date(tx.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 5. CUSTOMER CARE VIEW (FULL PAGE INBOX / CHAT - NO SPLIT SCREEN) */}
        {activeAdminTab === 'chat' && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            {!selectedThreadId ? (
              /* Full-Width Inbox List (NO SPLIT SCREEN) */
              <div className="flex flex-col min-h-[500px]">
                <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Customer Support Inbox</h3>
                    <p className="text-xs text-slate-500">Live relationship channels and secure customer inquiries</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs font-semibold">
                      {threads.length} Total Conversations
                    </span>
                  </div>
                </div>

                {threads.length === 0 ? (
                  <div className="p-16 text-center text-slate-500">
                    <Headphones className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-700">No active support conversations</p>
                    <p className="text-xs text-slate-400 mt-1">Customer messages from the support widget will appear here in real time.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {threads.map((t) => {
                      const isUnauth = t.senderName.includes('Unauthenticated User');
                      const unreadCount = t.messages.filter((m) => m.senderRole === 'customer').length;
                      return (
                        <div
                          key={t.threadId}
                          onClick={() => setSelectedThreadId(t.threadId)}
                          className="p-4 sm:p-5 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                              {t.senderName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-slate-900 truncate">{t.senderName}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                  isUnauth ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {isUnauth ? 'Unauthenticated User' : 'Authenticated Client'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 truncate mt-1 max-w-xl">
                                {t.lastMessage ? t.lastMessage.text : 'Conversation initiated — awaiting user inquiry'}
                              </p>
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 text-right">
                            {t.lastMessage && (
                              <span className="text-xs text-slate-400 font-mono">
                                {new Date(t.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            <div className="flex items-center gap-2">
                              {unreadCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                                  {unreadCount} {unreadCount === 1 ? 'msg' : 'msgs'}
                                </span>
                              )}
                              <span className="text-xs font-semibold text-slate-900 flex items-center gap-1 hover:text-amber-600">
                                Open Chat <ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Dedicated Full-Page Conversation View (NO SPLIT SCREEN) */
              <div className="flex flex-col h-[calc(100vh-13rem)] min-h-[500px]">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedThreadId('')}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 text-amber-500" />
                      <span>Back to Support Inbox</span>
                    </button>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {threads.find((t) => t.threadId === selectedThreadId)?.senderName || 'Client Thread'}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">Thread Channel: {selectedThreadId}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded uppercase">
                    Active Advisory Channel
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-slate-100/50">
                  {activeMessages.length === 0 ? (
                    <div className="text-center text-xs text-slate-400 py-12">No messages in this thread yet. Send a greeting to begin.</div>
                  ) : (
                    activeMessages.map((msg) => {
                      const isAdmin = msg.senderRole === 'admin';
                      return (
                        <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`max-w-[85%] sm:max-w-[70%] rounded-lg p-3.5 text-xs shadow-xs ${
                              isAdmin ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 border border-slate-200'
                            }`}
                          >
                            <div className="text-[10px] font-bold opacity-75 mb-1 flex items-center justify-between gap-4">
                              <span>{msg.senderName}</span>
                              <span className="font-mono text-[9px] opacity-70">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                            {msg.imageUrl && (
                              <img src={msg.imageUrl} alt="attachment" className="mt-2 rounded max-h-56 object-cover border border-slate-200" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendAdminReply} className="p-3 sm:p-4 border-t border-slate-200 bg-white flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setReplyImage(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      replyImage ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Attach image"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    placeholder="Type official treasury advisory response..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-md text-xs focus:outline-none focus:border-slate-400 bg-slate-50 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={isSendingReply || (!replyText.trim() && !replyImage)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                    <span>Send Advisory</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
