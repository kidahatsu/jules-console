import { useState, useEffect } from "react";
import { ChevronDown, User, Check } from "lucide-react";
import { getAccounts, saveAccounts, type JulesAccount } from "@/lib/jules";
import { cn } from "@/lib/utils";

export function JulesAccountSwitcher() {
    const [accounts, setAccounts] = useState<JulesAccount[]>(() => getAccounts());
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Keep in sync if localStorage changes externally
        const handleStorage = () => setAccounts(getAccounts());
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const activeAccount = accounts.find(a => a.isActive) || accounts[0];

    const handleSwitch = (id: string) => {
        const updated = accounts.map(a => ({
            ...a,
            isActive: a.id === id
        }));
        saveAccounts(updated);
        window.location.reload();
    };

    if (!activeAccount) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all text-left group"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                        <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Jules Account</p>
                        <p className="text-sm font-semibold truncate text-zinc-200">{activeAccount.name}</p>
                    </div>
                </div>
                <ChevronDown className={cn(
                    "w-4 h-4 text-zinc-500 transition-transform duration-200",
                    isOpen && "rotate-180"
                )} />
            </button>

            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsOpen(false)} 
                    />
                    <div className="absolute bottom-full left-0 w-full mb-2 z-20 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="p-2 space-y-1">
                            {accounts.map((account) => (
                                <button
                                    key={account.id}
                                    onClick={() => handleSwitch(account.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                                        account.isActive 
                                            ? "bg-primary/10 text-primary" 
                                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <span className="truncate">{account.name}</span>
                                    {account.isActive && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
