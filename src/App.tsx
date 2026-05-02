import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Coins, Play, RotateCcw, Trophy, TrendingUp, Info, AlertCircle, User, Lock, LogIn, Wallet, ArrowDownCircle, ArrowUpCircle, QrCode, Copy, CheckCircle2, XCircle, Gift, Users, Sparkles } from 'lucide-react';
import { SYMBOLS, REEL_COUNT, ROWS_COUNT, PAYLINES, MIN_BET, MAX_BET, MIN_WITHDRAWAL } from './constants';

type SymbolType = typeof SYMBOLS[0];
type UserType = {
  id: number;
  username: string;
  display_name: string;
  profile_pic: string;
  balance: number;
  total_bet: number;
  required_rollover: number;
  spent_for_bonus: number;
  referral_count: number;
  is_admin: number;
};

export default function App() {
  console.log("App component rendering...");
  useEffect(() => {
    console.log("App mounted");
  }, []);
  const [user, setUser] = useState<UserType | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [bet, setBet] = useState(MIN_BET);
  const [reels, setReels] = useState<SymbolType[]>(Array(REEL_COUNT * ROWS_COUNT).fill(SYMBOLS[0]));
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [winningLines, setWinningLines] = useState<number[][]>([]);
  const [showWinModal, setShowWinModal] = useState(false);

  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState<'deposits' | 'users'>('deposits');
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [depositAmount, setDepositAmount] = useState(20);
  const [withdrawAmount, setWithdrawAmount] = useState(500);
  const [pixStep, setPixStep] = useState<'amount' | 'qrcode'>('amount');
  const [withdrawError, setWithdrawError] = useState('');
  const [editName, setEditName] = useState('');
  const [editPic, setEditPic] = useState('');

  const tigerControls = useAnimation();
  const shineControls = useAnimation();

  // Initialize reels
  useEffect(() => {
    const initialReels = Array(REEL_COUNT * ROWS_COUNT).fill(null).map(() => 
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
    );
    setReels(initialReels);
  }, []);

  const refreshUser = async (id: number) => {
    const res = await fetch(`/api/user/${id}`);
    if (res.ok) {
      const data = await res.json();
      setUser(data);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data);
      setEditName(data.display_name || data.username);
      setEditPic(data.profile_pic || '');
    } else {
      setAuthError(data.error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    const res = await fetch('/api/user/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, display_name: editName, profile_pic: editPic }),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      setShowSettings(false);
    }
  };

  const handleDepositRequest = async () => {
    if (!user) return;
    const res = await fetch('/api/deposit/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, amount: depositAmount }),
    });
    if (res.ok) {
      alert("Solicitação de depósito enviada! Chame o suporte para confirmar.");
      setShowDeposit(false);
      setPixStep('amount');
    }
  };

  const fetchPendingDeposits = async () => {
    const res = await fetch('/api/admin/deposits');
    if (res.ok) {
      const data = await res.json();
      setPendingDeposits(data);
    }
  };

  const fetchAllUsers = async () => {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      setAllUsers(data);
    }
  };

  const handleAdminUpdateUser = async (u: UserType) => {
    const res = await fetch('/api/admin/user/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: u.id, 
        balance: u.balance, 
        total_bet: u.total_bet, 
        is_admin: u.is_admin,
        password: (u as any).password
      }),
    });
    if (res.ok) {
      fetchAllUsers();
      setEditingUser(null);
    }
  };

  const confirmDeposit = async (depositId: number) => {
    const res = await fetch('/api/admin/deposit/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depositId }),
    });
    if (res.ok) {
      fetchPendingDeposits();
      if (user) refreshUser(user.id);
    }
  };

  const handleWithdraw = async () => {
    if (!user) return;
    setWithdrawError('');
    const res = await fetch('/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, amount: withdrawAmount }),
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data);
      setShowWithdraw(false);
    } else {
      setWithdrawError(data.error);
    }
  };

  const checkWin = (currentReels: SymbolType[]) => {
    let totalWin = 0;
    const lines: number[][] = [];

    PAYLINES.forEach((line) => {
      const s1 = currentReels[line[0]];
      const s2 = currentReels[line[1]];
      const s3 = currentReels[line[2]];

      if (s1.id === s2.id && s2.id === s3.id) {
        totalWin += s1.value * (bet / MIN_BET);
        lines.push(line);
      }
    });

    return { totalWin, lines };
  };

  const spin = useCallback(async () => {
    if (!user || isSpinning || user.balance < bet) return;

    setIsSpinning(true);
    setLastWin(0);
    setWinningLines([]);
    setShowWinModal(false);

    // Tiger animation on spin
    tigerControls.start({
      scale: [1, 1.2, 1],
      rotate: [0, -10, 10, 0],
      transition: { duration: 0.5, repeat: 2 }
    });

    // Deduct bet and get result from server
    const spinRes = await fetch('/api/game/spin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, bet, symbols: SYMBOLS }),
    });

    if (!spinRes.ok) {
      setIsSpinning(false);
      return;
    }
    
    const spinData = await spinRes.json();
    
    // Simulate spinning delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    setReels(spinData.reels);
    setUser(spinData.user);
    setIsSpinning(false);

    if (spinData.winAmount > 0) {
      setLastWin(spinData.winAmount);
      setWinningLines(spinData.winningLines);
      setShowWinModal(true);
      
      // Happy Tiger & Shine
      tigerControls.start({
        scale: [1, 1.5, 1],
        y: [0, -20, 0],
        transition: { duration: 0.5, repeat: 3 }
      });
      shineControls.start({
        opacity: [0, 1, 0],
        scale: [0.8, 1.2, 0.8],
        transition: { duration: 0.8, repeat: Infinity }
      });
    }
  }, [isSpinning, user, bet, tigerControls, shineControls]);

  const adjustBet = (amount: number) => {
    setBet(prev => {
      const next = prev + amount;
      return Math.max(MIN_BET, Math.min(MAX_BET, next));
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#1a0b0b] text-[#f5d76e] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-black/40 backdrop-blur-xl border border-[#f5d76e]/20 rounded-[2.5rem] p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <motion.div 
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="w-20 h-20 bg-[#ff4d4d] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,77,77,0.4)] border-2 border-[#f5d76e] mb-4"
            >
              <span className="text-4xl">🐯</span>
            </motion.div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[#f5d76e] to-[#c5a02e]">
              Fortune Tiger
            </h1>
            <p className="text-xs uppercase tracking-[0.3em] opacity-60 mt-2">Acesse sua conta</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-2">Usuário</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#f5d76e]/40" size={18} />
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-[#f5d76e]/50 transition-colors"
                  placeholder="Seu nome de usuário"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#f5d76e]/40" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-[#f5d76e]/50 transition-colors"
                  placeholder="Sua senha secreta"
                  required
                />
              </div>
            </div>

            {authError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-red-400 text-xs font-bold bg-red-400/10 p-3 rounded-xl border border-red-400/20"
              >
                <AlertCircle size={14} />
                {authError}
              </motion.div>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-[#ff4d4d] to-[#ff7676] text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl hover:shadow-[0_0_30px_rgba(255,77,77,0.3)] transition-all flex items-center justify-center gap-2"
            >
              <LogIn size={20} />
              {authMode === 'login' ? 'Entrar' : 'Cadastrar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-xs font-bold uppercase tracking-widest text-[#f5d76e]/60 hover:text-[#f5d76e] transition-colors"
            >
              {authMode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const rolloverProgress = Math.min(100, (user.total_bet / user.required_rollover) * 100) || 0;
  const bonusProgress = (user.spent_for_bonus / 50) * 100;
  const referralProgress = (user.referral_count % 5) * 20;

  return (
    <div className="min-h-screen bg-[#1a0b0b] text-[#f5d76e] font-sans flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background Shine Effect */}
      <motion.div 
        animate={shineControls}
        initial={{ opacity: 0 }}
        className="fixed inset-0 pointer-events-none z-0"
      >
        <div className="absolute inset-0 bg-gradient-radial from-[#f5d76e]/20 to-transparent blur-3xl" />
      </motion.div>

      {/* Header with User Info */}
      <header className="w-full max-w-md flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <motion.div 
            animate={tigerControls}
            className="w-12 h-12 bg-[#ff4d4d] rounded-full flex items-center justify-center border-2 border-[#f5d76e] shadow-lg overflow-hidden"
          >
            {user.profile_pic ? (
              <img src={user.profile_pic} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">{lastWin > 0 ? '🤩' : '🐯'}</span>
            )}
          </motion.div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-tighter">{user.display_name || user.username}</h2>
            <div className="flex items-center gap-1 text-[10px] font-bold text-[#f5d76e]/60">
              <Wallet size={10} />
              <span>R$ {user.balance.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {user.is_admin === 1 && (
            <button onClick={() => { setShowAdmin(true); setAdminTab('deposits'); fetchPendingDeposits(); }} className="p-2 bg-blue-500/20 rounded-xl hover:bg-blue-500/30 transition-colors text-blue-400">
              <Lock size={20} />
            </button>
          )}
          <button onClick={() => setShowSettings(true)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors text-white">
            <Info size={20} />
          </button>
          <button onClick={() => setShowDeposit(true)} className="p-2 bg-[#f5d76e]/10 rounded-xl hover:bg-[#f5d76e]/20 transition-colors text-[#f5d76e]"><ArrowDownCircle size={20} /></button>
          <button onClick={() => setShowWithdraw(true)} className="p-2 bg-[#ff4d4d]/10 rounded-xl hover:bg-[#ff4d4d]/20 transition-colors text-[#ff4d4d]"><ArrowUpCircle size={20} /></button>
        </div>
      </header>

      {/* Bonus Area */}
      <div className="w-full max-w-md grid grid-cols-2 gap-2 mb-4 relative z-10">
        <div className="bg-black/40 backdrop-blur-md border border-[#f5d76e]/20 rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Gift size={14} className="text-[#f5d76e]" />
            <span className="text-[9px] font-black uppercase tracking-widest">Bônus Recarga</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
            <motion.div animate={{ width: `${bonusProgress}%` }} className="h-full bg-[#f5d76e]" />
          </div>
          <span className="text-[8px] opacity-60">Gaste R$ 50 e ganhe R$ 10</span>
        </div>
        <div className="bg-black/40 backdrop-blur-md border border-[#ff4d4d]/20 rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-[#ff4d4d]" />
            <span className="text-[9px] font-black uppercase tracking-widest">Indicações</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
            <motion.div animate={{ width: `${referralProgress}%` }} className="h-full bg-[#ff4d4d]" />
          </div>
          <span className="text-[8px] opacity-60">5 amigos (R$ 20+) = R$ 30</span>
        </div>
      </div>

      {/* Main Game Area */}
      <main className="relative z-10 w-full max-w-md">
        {/* Slot Machine Display */}
        <div className="relative bg-gradient-to-b from-[#8b0000] to-[#4a0000] p-4 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-[#c5a02e]">
          {/* Shine Overlay */}
          <motion.div 
            animate={shineControls}
            className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center"
          >
            <Sparkles className="text-[#f5d76e] w-full h-full opacity-20" />
          </motion.div>

          <div className="grid grid-cols-3 gap-2 bg-black/60 p-3 rounded-2xl overflow-hidden relative">
            {reels.map((symbol, idx) => {
              const isWinning = winningLines.some(line => line.includes(idx));
              return (
                <motion.div
                  key={`${idx}-${symbol.id}-${isSpinning}`}
                  initial={isSpinning ? { y: -200, opacity: 0 } : { y: 0, opacity: 1 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25, delay: (idx % 3) * 0.05 }}
                  className={`aspect-square flex items-center justify-center text-5xl md:text-6xl bg-gradient-to-br from-white/5 to-white/10 rounded-xl border border-white/5 relative ${isWinning ? 'ring-4 ring-[#f5d76e] shadow-[0_0_30px_rgba(245,215,110,0.6)] z-20' : ''}`}
                >
                  <motion.span 
                    animate={isSpinning ? { rotateX: [0, 360], filter: ['blur(0px)', 'blur(4px)', 'blur(0px)'] } : { rotateX: 0, filter: 'blur(0px)' }}
                    transition={{ repeat: isSpinning ? Infinity : 0, duration: 0.2 }}
                    className="transition-all duration-300"
                  >
                    {symbol.icon}
                  </motion.span>
                  {isWinning && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="absolute inset-0 bg-[#f5d76e]/20 rounded-xl"
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between bg-black/40 backdrop-blur-md rounded-2xl p-2 border border-[#f5d76e]/10">
            <button onClick={() => adjustBet(-1)} disabled={isSpinning || bet <= MIN_BET} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#ff4d4d]/20 text-[#ff4d4d] disabled:opacity-30 font-black">-</button>
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Aposta</span>
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-[#f5d76e]" />
                <span className="text-xl font-mono font-black">R$ {bet}</span>
              </div>
            </div>
            <button onClick={() => adjustBet(1)} disabled={isSpinning || bet >= MAX_BET} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#f5d76e]/20 text-[#f5d76e] disabled:opacity-30 font-black">+</button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95, y: 4 }}
            onClick={spin}
            disabled={isSpinning || user.balance < bet}
            className={`w-full py-5 rounded-[2rem] font-black text-xl uppercase tracking-widest shadow-2xl flex items-center justify-center gap-4 transition-all duration-300 ${isSpinning || user.balance < bet ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-[#ff4d4d] via-[#ff7676] to-[#ff4d4d] text-white border-b-[6px] border-[#8b0000] active:border-b-0'}`}
          >
            {isSpinning ? <RotateCcw className="animate-spin" size={28} /> : <><Play fill="currentColor" size={28} /> GIRAR AGORA</>}
          </motion.button>
        </div>
      </main>

      {/* Modals (Deposit, Withdraw, Win) - Kept same logic but with minor UI tweaks */}
      {/* ... (Deposit and Withdraw Modals remain largely the same, just ensured they use user state) ... */}
      
      {/* Win Modal with extra shine */}
      <AnimatePresence>
        {showWinModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setShowWinModal(false)}>
            <motion.div initial={{ scale: 0.5, y: 100 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.5, y: 100 }} className="bg-gradient-to-b from-[#ff4d4d] to-[#8b0000] p-10 rounded-[3rem] border-4 border-[#f5d76e] text-center shadow-[0_0_150px_rgba(255,77,77,0.6)] max-w-xs w-full relative overflow-hidden" onClick={e => e.stopPropagation()}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }} className="absolute inset-0 opacity-10 bg-[conic-gradient(from_0deg,#f5d76e,transparent,transparent,#f5d76e)]" />
              <div className="text-7xl mb-4 relative z-10">🤩</div>
              <h2 className="text-3xl font-black text-white uppercase italic mb-2 relative z-10">VITÓRIA ÉPICA!</h2>
              <div className="text-5xl font-mono font-black text-[#f5d76e] mb-6 drop-shadow-[0_0_15px_rgba(245,215,110,0.8)] relative z-10">R$ {lastWin.toFixed(2)}</div>
              <button onClick={() => setShowWinModal(false)} className="w-full py-4 bg-[#f5d76e] text-[#8b0000] rounded-2xl font-black text-xl uppercase tracking-wider shadow-lg relative z-10">RECEBER PRÊMIO</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Re-adding Deposit/Withdraw Modals for completeness */}
      <AnimatePresence>
        {showDeposit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#1a0b0b] border-2 border-[#f5d76e] p-8 rounded-[2.5rem] w-full max-w-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black uppercase italic">Depósito</h2>
                <button onClick={() => setShowDeposit(false)} className="text-[#f5d76e]/40 hover:text-[#f5d76e]">X</button>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-24 h-24 bg-[#ff4d4d] rounded-full flex items-center justify-center border-2 border-[#f5d76e] shadow-lg mb-2">
                  <span className="text-5xl">🐯</span>
                </div>
                <p className="text-sm font-bold text-[#f5d76e]">Para pagamento chame o número do suporte:</p>
                <div className="bg-white/5 p-4 rounded-2xl border border-[#f5d76e]/20 w-full">
                  <p className="text-2xl font-black tracking-widest text-[#f5d76e]">11 91234-5678</p>
                </div>
                <p className="text-xs opacity-60 italic">"Para pagamento chame o numero do suporte"</p>
                
                <div className="w-full space-y-4 pt-4">
                  <div className="flex flex-col items-start gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Valor que deseja depositar</label>
                    <input type="number" value={depositAmount} onChange={e => setDepositAmount(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-center text-2xl font-mono font-bold" />
                  </div>
                  <button onClick={handleDepositRequest} className="w-full py-4 bg-[#f5d76e] text-[#1a0b0b] rounded-2xl font-black uppercase tracking-widest">Informar Pagamento</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#1a0b0b] border-2 border-white/20 p-8 rounded-[2.5rem] w-full max-w-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black uppercase italic">Configurações</h2>
                <button onClick={() => setShowSettings(false)} className="text-white/40 hover:text-white">X</button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Nome de Exibição</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">URL da Foto de Perfil</label>
                  <input type="text" value={editPic} onChange={e => setEditPic(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4" placeholder="https://..." />
                </div>
                <div className="pt-4 space-y-4">
                  <button onClick={handleUpdateProfile} className="w-full py-3 bg-white/10 rounded-xl font-bold uppercase tracking-widest hover:bg-white/20 transition-colors">Salvar Perfil</button>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">Suporte</p>
                    <p className="text-sm">WhatsApp: 11 91234-5678</p>
                  </div>
                  <button onClick={() => setUser(null)} className="w-full py-3 bg-red-500/20 text-red-400 rounded-xl font-bold uppercase tracking-widest hover:bg-red-500/30 transition-colors">Sair da Conta</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Modal */}
      <AnimatePresence>
        {showAdmin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#1a0b0b] border-2 border-blue-500/50 p-8 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black uppercase italic text-blue-400">Painel Admin</h2>
                <button onClick={() => setShowAdmin(false)} className="text-blue-400/40 hover:text-blue-400">X</button>
              </div>

              <div className="flex gap-4 mb-6">
                <button 
                  onClick={() => { setAdminTab('deposits'); fetchPendingDeposits(); }}
                  className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-widest transition-all ${adminTab === 'deposits' ? 'bg-blue-500 text-white' : 'bg-white/5 text-blue-400 border border-blue-500/20'}`}
                >
                  Depósitos
                </button>
                <button 
                  onClick={() => { setAdminTab('users'); fetchAllUsers(); }}
                  className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-widest transition-all ${adminTab === 'users' ? 'bg-blue-500 text-white' : 'bg-white/5 text-blue-400 border border-blue-500/20'}`}
                >
                  Usuários
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {adminTab === 'deposits' ? (
                  <>
                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-60">Depósitos Pendentes</h3>
                    {pendingDeposits.length === 0 ? (
                      <p className="text-center py-8 opacity-40 italic">Nenhum depósito pendente</p>
                    ) : (
                      pendingDeposits.map(dep => (
                        <div key={dep.id} className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between">
                          <div>
                            <p className="font-bold">{dep.username}</p>
                            <p className="text-xl font-black text-[#f5d76e]">R$ {dep.amount.toFixed(2)}</p>
                            <p className="text-[10px] opacity-40">{new Date(dep.created_at).toLocaleString()}</p>
                          </div>
                          <button onClick={() => confirmDeposit(dep.id)} className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg font-bold hover:bg-green-500/30 transition-colors">Confirmar</button>
                        </div>
                      ))
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-60">Lista de Usuários</h3>
                    <div className="space-y-3">
                      {allUsers.map(u => (
                        <div key={u.id} className="bg-white/5 p-4 rounded-xl border border-white/10">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-black text-lg">{u.display_name || u.username}</p>
                              <p className="text-xs opacity-60">ID: {u.id} | Login: {u.username}</p>
                              <p className="text-xs text-blue-400 font-mono">Senha: {(u as any).password}</p>
                            </div>
                            <button 
                              onClick={() => setEditingUser({ ...u })}
                              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                            >
                              Editar
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-widest">
                            <div className="bg-black/20 p-2 rounded-lg">
                              <span className="opacity-40 block">Saldo</span>
                              <span className="text-[#f5d76e]">R$ {u.balance.toFixed(2)}</span>
                            </div>
                            <div className="bg-black/20 p-2 rounded-lg">
                              <span className="opacity-40 block">Total Apostado</span>
                              <span className="text-[#ff4d4d]">R$ {u.total_bet.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#1a0b0b] border-2 border-blue-500 p-8 rounded-[2.5rem] w-full max-w-sm">
              <h2 className="text-2xl font-black uppercase italic text-blue-400 mb-6">Editar Usuário</h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Senha</label>
                  <input 
                    type="text" 
                    value={(editingUser as any).password} 
                    onChange={e => setEditingUser({ ...editingUser, password: e.target.value } as any)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Saldo (R$)</label>
                  <input 
                    type="number" 
                    value={editingUser.balance} 
                    onChange={e => setEditingUser({ ...editingUser, balance: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Total Apostado (R$)</label>
                  <input 
                    type="number" 
                    value={editingUser.total_bet} 
                    onChange={e => setEditingUser({ ...editingUser, total_bet: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4" 
                  />
                </div>
                <div className="flex items-center gap-2 py-2">
                  <input 
                    type="checkbox" 
                    checked={editingUser.is_admin === 1} 
                    onChange={e => setEditingUser({ ...editingUser, is_admin: e.target.checked ? 1 : 0 })}
                    id="is_admin_check"
                  />
                  <label htmlFor="is_admin_check" className="text-xs font-bold uppercase tracking-widest">Administrador</label>
                </div>
                <div className="flex gap-2 pt-4">
                  <button onClick={() => setEditingUser(null)} className="flex-1 py-3 bg-white/5 rounded-xl font-bold uppercase">Cancelar</button>
                  <button onClick={() => handleAdminUpdateUser(editingUser)} className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold uppercase">Salvar</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWithdraw && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#1a0b0b] border-2 border-[#ff4d4d] p-8 rounded-[2.5rem] w-full max-w-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black uppercase italic text-[#ff4d4d]">Saque</h2>
                <button onClick={() => setShowWithdraw(false)} className="text-[#ff4d4d]/40 hover:text-[#ff4d4d]">X</button>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="opacity-60">Rollover</span>
                    <span className={rolloverProgress >= 100 ? 'text-green-400' : 'text-[#ff4d4d]'}>{rolloverProgress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                    <motion.div animate={{ width: `${rolloverProgress}%` }} className={`h-full ${rolloverProgress >= 100 ? 'bg-green-500' : 'bg-[#ff4d4d]'}`} />
                  </div>
                </div>
                <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-center text-2xl font-mono font-bold" />
                {withdrawError && <div className="text-red-400 text-[10px] font-bold bg-red-400/10 p-3 rounded-xl border border-red-400/20">{withdrawError}</div>}
                <button onClick={handleWithdraw} className="w-full py-4 bg-[#ff4d4d] text-white rounded-2xl font-black uppercase tracking-widest">Sacar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
