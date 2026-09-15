import React, { useEffect, useMemo, useState } from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import { decodeEventLog, parseEther } from "viem";
import { trpc } from "./lib/trpc";
import { groupPayAbi, groupPayContractAddress } from "./contracts";
import { monadTestnet } from "./wallet";

type IconProps = { size?: number; className?: string };
function AppIcon({ icon, size = 18, className }: IconProps & { icon: string }) {
  return <IconifyIcon icon={icon} width={size} height={size} className={className} aria-hidden="true" />;
}
const ArrowDownToLine = (props: IconProps) => <AppIcon icon="solar:download-minimalistic-bold" {...props} />;
const ArrowLeft = (props: IconProps) => <AppIcon icon="solar:arrow-left-linear" {...props} />;
const Bell = (props: IconProps) => <AppIcon icon="solar:bell-bing-bold" {...props} />;
const Check = (props: IconProps) => <AppIcon icon="solar:check-circle-bold" {...props} />;
const ChevronDown = (props: IconProps) => <AppIcon icon="solar:alt-arrow-down-linear" {...props} />;
const ChevronRight = (props: IconProps) => <AppIcon icon="solar:alt-arrow-right-linear" {...props} />;
const CircleDollarSign = (props: IconProps) => <AppIcon icon="solar:dollar-minimalistic-bold" {...props} />;
const ClipboardList = (props: IconProps) => <AppIcon icon="solar:clipboard-list-bold" {...props} />;
const Copy = (props: IconProps) => <AppIcon icon="solar:copy-bold" {...props} />;
const ReceiptText = (props: IconProps) => <AppIcon icon="solar:document-text-bold" {...props} />;
const Eye = (props: IconProps) => <AppIcon icon="solar:eye-bold" {...props} />;
const Heart = (props: IconProps) => <AppIcon icon="solar:heart-bold" {...props} />;
const Home = (props: IconProps) => <AppIcon icon="solar:home-2-bold" {...props} />;
const Layers = (props: IconProps) => <AppIcon icon="solar:layers-bold" {...props} />;
const LayoutDashboard = (props: IconProps) => <AppIcon icon="solar:widget-4-bold" {...props} />;
const Moon = (props: IconProps) => <AppIcon icon="solar:moon-bold" {...props} />;
const MoreHorizontal = (props: IconProps) => <AppIcon icon="solar:menu-dots-bold" {...props} />;
const Plus = (props: IconProps) => <AppIcon icon="solar:add-circle-bold" {...props} />;
const PlusCircle = (props: IconProps) => <AppIcon icon="solar:add-square-bold" {...props} />;
const Send = (props: IconProps) => <AppIcon icon="solar:plain-2-bold" {...props} />;
const Settings = (props: IconProps) => <AppIcon icon="solar:settings-bold" {...props} />;
const Sun = (props: IconProps) => <AppIcon icon="solar:sun-2-bold" {...props} />;
const Users = (props: IconProps) => <AppIcon icon="solar:users-group-rounded-bold" {...props} />;
const WalletCards = (props: IconProps) => <AppIcon icon="solar:wallet-2-bold" {...props} />;
const Wallet = (props: IconProps) => <AppIcon icon="solar:wallet-money-bold" {...props} />;
const X = (props: IconProps) => <AppIcon icon="solar:close-circle-bold" {...props} />;
const Zap = (props: IconProps) => <AppIcon icon="solar:bolt-bold" {...props} />;

/*
 * GroupPay is intentionally kept in one handwritten app file.
 * The API is typed through tRPC; the CSS lives in the one index.css file.
 * This makes the flow easy to hand off or port into another shell later.
 */

type Tab = "dashboard" | "send" | "batch" | "groups" | "request" | "settings" | "profile" | "detail";
type Theme = "light" | "dark";
type Category = "Trip" | "Friends" | "Couple" | "Team" | "Roommates" | "Custom";
type GroupStatus = "Active" | "Settled";

type Group = {
  id: number | string;
  name: string;
  category: Category;
  membersCount: number;
  balanceCents: number;
  totalContributedCents: number;
  totalSpentCents: number;
  status: GroupStatus;
  currency: string;
  contractGroupId?: number | null;
  contractAddress?: string | null;
  chainId?: string | null;
  creatorAddress?: string | null;
};

type Transaction = {
  id: number | string;
  title: string;
  subtitle: string;
  amountCents: number;
  status: "Active" | "Completed" | "Pending";
};

const FALLBACK_GROUPS: Group[] = [
  {
    id: "dubai-trip",
    name: "Dubai Trip",
    category: "Trip",
    membersCount: 5,
    balanceCents: 123000,
    totalContributedCents: 200000,
    totalSpentCents: 168000,
    status: "Active",
    currency: "USD",
  },
  {
    id: "roommates",
    name: "Roommates",
    category: "Roommates",
    membersCount: 3,
    balanceCents: 42000,
    totalContributedCents: 140000,
    totalSpentCents: 98000,
    status: "Active",
    currency: "USD",
  },
  {
    id: "weekend-crew",
    name: "Weekend Crew",
    category: "Friends",
    membersCount: 4,
    balanceCents: 31000,
    totalContributedCents: 80000,
    totalSpentCents: 49000,
    status: "Active",
    currency: "USD",
  },
];

const FALLBACK_TRANSACTIONS: Transaction[] = [
  { id: "tx-1", title: "Dubai Trip", subtitle: "5 members · Trip", amountCents: 123000, status: "Active" },
  { id: "tx-2", title: "Roommates", subtitle: "3 members · Household", amountCents: 42000, status: "Active" },
  { id: "tx-3", title: "Weekend Crew", subtitle: "4 members · Friends", amountCents: 31000, status: "Active" },
  { id: "tx-4", title: "Weekend Crew", subtitle: "4 members · Friends", amountCents: 31000, status: "Active" },
];

const categoryOptions: Array<{ id: Category; label: string; description: string; icon: React.ElementType }> = [
  { id: "Trip", label: "Trip", description: "Travel & vacation", icon: Zap },
  { id: "Friends", label: "Friends", description: "Social & events", icon: Heart },
  { id: "Couple", label: "Couple", description: "Shared expenses", icon: Users },
  { id: "Team", label: "Team", description: "Work & projects", icon: BriefcaseIcon },
  { id: "Roommates", label: "Roommates", description: "Rent & bills", icon: Home },
  { id: "Custom", label: "Custom", description: "Your own rules", icon: MoreHorizontal },
];

function BriefcaseIcon(props: IconProps) {
  return <AppIcon icon="solar:case-round-bold" {...props} />;
}

function money(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function readTab(): Tab {
  const value = window.location.hash.replace("#", "");
  return (["dashboard", "send", "batch", "groups", "request", "settings", "profile", "detail"] as string[]).includes(value)
    ? (value as Tab)
    : "dashboard";
}

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = window.localStorage.getItem("grouppay-theme") as Theme | null;
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("grouppay-theme", theme);
  }, [theme]);

  return { theme, toggleTheme: () => setTheme((value) => (value === "dark" ? "light" : "dark")) };
}

function mapGroup(row: {
  id: number;
  name: string;
  category: Category;
  membersCount: number;
  balanceCents: number;
  totalContributedCents: number;
  totalSpentCents: number;
  status: GroupStatus;
  currency: string;
  contractGroupId?: number | null;
  contractAddress?: string | null;
  chainId?: string | null;
  creatorAddress?: string | null;
}): Group {
  return row;
}

function mapTransaction(row: {
  id: number;
  title: string;
  subtitle: string;
  amountCents: number;
  status: "Active" | "Completed" | "Pending";
}): Transaction {
  return row;
}

function Sidebar({ activeTab, onNavigate, theme, onToggleTheme, address }: { activeTab: Tab; onNavigate: (tab: Tab) => void; theme: Theme; onToggleTheme: () => void; address?: string }) {
  const items: Array<{ tab: Tab; label: string; icon: React.ElementType }> = [
    { tab: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { tab: "send", label: "Send", icon: Send },
    { tab: "request", label: "Requests", icon: ClipboardList },
    { tab: "batch", label: "Batch Send", icon: Layers },
    { tab: "groups", label: "My Groups", icon: WalletCards },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <button className="sidebar-brand" onClick={() => onNavigate("dashboard")} aria-label="Go to dashboard">
          <span className="brand-mark"><Wallet size={16} /></span>
          <span>GroupPay</span>
        </button>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {items.map(({ tab, label, icon: Icon }) => (
            <button
              key={tab}
              onClick={() => onNavigate(tab)}
              className={`sidebar-link ${activeTab === tab ? "is-active" : ""}`}
              aria-current={activeTab === tab ? "page" : undefined}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

      </div>

      <div className="sidebar-footer">
        <div className={`sidebar-wallet ${address ? "is-connected" : ""}`}>{!address && <ConnectButton showBalance={false} />}</div>
        <button className={`sidebar-link muted-link ${activeTab === "settings" ? "is-active" : ""}`} onClick={() => onNavigate("settings")}><Settings size={16} /><span>Settings</span></button>
        <div className="sidebar-profile-row">
          <button className={`sidebar-user profile-trigger ${activeTab === "profile" ? "is-active" : ""}`} onClick={() => onNavigate("profile")}><span className="avatar avatar-violet">E</span><span>@emmanuel</span></button>
          <button className="sidebar-theme-toggle" onClick={onToggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title="Toggle theme">
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </aside>
  );
}

function MetricCard({ label, value, change }: { label: string; value: string; change?: string }) {
  return <article className="metric-card"><span className="eyebrow">{label}</span><strong>{value}</strong>{change && <span className="positive">{change}</span>}</article>;
}

function TransactionList({ transactions, onOpenDetail, title = "Transaction History" }: { transactions: Transaction[]; onOpenDetail: () => void; title?: string }) {
  return (
    <section className="transaction-section">
      <div className="section-heading"><h3>{title}</h3><span className="section-count">{transactions.length} records</span></div>
      <div className="transaction-list">
        {transactions.map((transaction) => (
          <button key={transaction.id} className="transaction-row" onClick={onOpenDetail}>
            <span className="transaction-main"><span className="group-avatar"><span /></span><span><b>{transaction.title}</b><small>{transaction.subtitle}</small></span></span>
            <span className="transaction-meta"><b>{money(transaction.amountCents)}</b><em>{transaction.status}</em></span>
          </button>
        ))}
      </div>
    </section>
  );
}

function DashboardView({ groups, transactions, onNavigate, onOpenGroup }: { groups: Group[]; transactions: Transaction[]; onNavigate: (tab: Tab) => void; onOpenGroup: (group: Group) => void }) {
  const actions: Array<{ label: string; icon: React.ElementType; tab: Tab }> = [
    { label: "Send Money", icon: Send, tab: "send" },
    { label: "Batch Send", icon: Layers, tab: "batch" },
    { label: "Create Group", icon: PlusCircle, tab: "groups" },
    { label: "Add Funds", icon: ArrowDownToLine, tab: "send" },
  ];

  return (
    <div className="content-pane">
      <div className="page-heading"><div><h1>Good morning, Emmanuel</h1><p className="dashboard-subtitle">Here's what's happening with your money.</p></div><div className="header-profile"><button className="icon-button"><Bell size={16} /></button><span className="avatar avatar-soft">E</span></div></div>

      <div className="metric-grid"><MetricCard label="Total Balance" value="$2,845.50" change="+12.5%" /><MetricCard label="Sent this month" value="$1,240.00" /><MetricCard label="Received this month" value="$2,320.00" /></div>

      <section className="content-section"><div className="section-heading"><h3>Quick Actions</h3></div><div className="action-grid">{actions.map(({ label, icon: Icon, tab }) => <button className="action-card" key={label} onClick={() => onNavigate(tab)}><span className="action-icon"><Icon size={17} /></span><b>{label}</b></button>)}</div></section>

      <section className="content-section"><div className="section-heading"><h3>Your Groups</h3><button className="text-button" onClick={() => onNavigate("groups")}>View all</button></div><div className="group-grid">{groups.map((group) => <button className="group-card" key={group.id} onClick={() => onOpenGroup(group)}><span className="group-avatar large"><span /></span><b>{group.name}</b><small>{group.membersCount} members</small><div className="group-card-footer"><strong>{money(group.balanceCents)}</strong><em>{group.status}</em></div></button>)}</div></section>

      <TransactionList transactions={transactions} onOpenDetail={() => onNavigate("detail")} />
    </div>
  );
}

function SendView({ transactions, onNavigate, onSend }: { transactions: Transaction[]; onNavigate: (tab: Tab) => void; onSend: (data: { recipient: string; amountCents: number; note: string }) => Promise<void> }) {
  const [method, setMethod] = useState<"username" | "wallet">("username");
  const [recipient, setRecipient] = useState("@sarah");
  const [amount, setAmount] = useState("50");
  const [note, setNote] = useState("For lunch");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await onSend({ recipient, amountCents: Math.round(Number(amount) * 100), note });
    setMessage(`Transfer intent saved for ${recipient}.`);
    window.setTimeout(() => setMessage(null), 3200);
  }

  return (
    <div className="content-pane send-page">
      <div className="page-heading page-heading-spacious">
        <div><span className="page-kicker">Move money</span><h1>Send money</h1><p>Choose a recipient, add a note, and review before sending.</p></div>
        <button className="secondary-button" onClick={() => onNavigate("request")}><ReceiptText size={15} /> Request instead</button>
      </div>
      <div className="send-hero">
        <div><span className="eyebrow">Available balance</span><strong>$2,845.50</strong><small>Ready to send from your GroupPay balance</small></div>
        <div className="send-hero-badge"><span className="live-dot" /> Instant transfer</div>
      </div>
      <div className="send-layout send-layout-redesigned">
        <form className="panel send-panel send-form-card" onSubmit={submit}>
          <div className="form-card-heading"><span className="step-badge">01</span><div><h2>Transfer details</h2><p className="panel-copy">Send to a GroupPay member or any EVM wallet.</p></div></div>
          <div className="segmented segmented-large"><button type="button" className={method === "username" ? "active" : ""} onClick={() => setMethod("username")}>By username</button><button type="button" className={method === "wallet" ? "active" : ""} onClick={() => setMethod("wallet")}>By wallet address</button></div>
          <label>Recipient<input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder={method === "username" ? "@username" : "0x…"} /></label>
          <div className="form-two-up"><label>Amount<div className="input-with-suffix"><input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /><span>MON <ChevronDown size={13} /></span></div></label><label>Network<select defaultValue="monad-testnet"><option value="monad-testnet">Monad Testnet</option></select></label></div>
          <label>Note<input className="note-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note or emoji…" /></label>
          {message && <div className="success-message"><Check size={15} />{message}</div>}
          <button className="primary-button form-submit" type="submit"><Send size={15} /> Review transfer <ChevronRight size={15} /></button>
        </form>
        <aside className="panel send-side-card"><div className="form-card-heading"><span className="step-badge soft-step">02</span><div><h2>Quick recipients</h2><p className="panel-copy">Pick someone you send to often.</p></div></div>{[{ name: "@sarah", detail: "Online · last sent today", letter: "S" }, { name: "@david", detail: "Online · last sent Monday", letter: "D" }, { name: "@josh", detail: "Offline · last sent Apr 10", letter: "J" }].map((user) => <button className="recipient-card" key={user.name} onClick={() => setRecipient(user.name)}><span className="avatar avatar-lilac">{user.letter}</span><span><b>{user.name}</b><small>{user.detail}</small></span><ChevronRight size={14} /></button>)}<div className="security-note"><Check size={14} /><span>Transactions are reviewed in your connected wallet before signing.</span></div></aside>
      </div>
      <TransactionList transactions={transactions} onOpenDetail={() => onNavigate("detail")} title="Recent sends" />
    </div>
  );
}

function RequestView({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const [recipient, setRecipient] = useState("@sarah");
  const [amount, setAmount] = useState("80");
  const [note, setNote] = useState("Dinner split");
  const [message, setMessage] = useState<string | null>(null);
  const [requests, setRequests] = useState([{ name: "@sarah", note: "Hotel deposit", amount: "$240.00", status: "Pending" }, { name: "@david", note: "Weekend groceries", amount: "$46.50", status: "Pending" }, { name: "@mike", note: "Dubai Trip contribution", amount: "$180.00", status: "Paid" }]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setRequests((items) => [{ name: recipient, note, amount: `$${Number(amount || 0).toFixed(2)}`, status: "Pending" }, ...items]);
    setMessage(`Request sent to ${recipient}.`);
    window.setTimeout(() => setMessage(null), 3200);
  }

  return <div className="content-pane request-page"><div className="page-heading page-heading-spacious"><div><span className="page-kicker">Collect together</span><h1>Request money</h1><p>Ask friends to contribute to a group expense or shared wallet.</p></div><button className="secondary-button" onClick={() => onNavigate("send")}><Send size={15} /> Send money instead</button></div><div className="request-layout"><form className="panel request-form-card" onSubmit={submit}><div className="request-art"><ReceiptText size={22} /><span>New request</span></div><label>Request from<input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="@username or 0x…" /></label><label>Amount<div className="input-with-suffix"><input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} /><span>USDC</span></div></label><label>What is it for?<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. Airbnb deposit" /></label>{message && <div className="success-message"><Check size={15} />{message}</div>}<button className="primary-button form-submit" type="submit"><ReceiptText size={15} /> Send request</button></form><section className="panel request-list-card"><div className="section-heading"><div><h2>Request activity</h2><p className="panel-copy">Keep track of money you are collecting.</p></div><span className="request-count">{requests.filter((item) => item.status === "Pending").length} pending</span></div><div className="request-list">{requests.map((item, index) => <div className="request-row" key={`${item.name}-${item.note}-${index}`}><span className="avatar avatar-lilac">{item.name.replace("@", "").slice(0, 1).toUpperCase()}</span><span className="request-row-copy"><b>{item.name}</b><small>{item.note}</small></span><span className="request-row-amount"><strong>{item.amount}</strong><em className={item.status === "Paid" ? "paid" : "pending"}>{item.status}</em></span></div>)}</div></section></div></div>;
}

function BatchView({ transactions, onNavigate }: { transactions: Transaction[]; onNavigate: (tab: Tab) => void }) {
  const [recipients, setRecipients] = useState([{ id: 1, username: "@sarah", amount: 50 }, { id: 2, username: "@david", amount: 100 }, { id: 3, username: "@josh", amount: 75 }, { id: 4, username: "@mike", amount: 50 }]);
  const [step, setStep] = useState<"recipients" | "summary">("recipients");
  const [message, setMessage] = useState<string | null>(null);
  const total = recipients.reduce((sum, recipient) => sum + recipient.amount, 0);
  function updateAmount(id: number, amount: string) { setRecipients((items) => items.map((item) => item.id === id ? { ...item, amount: Number(amount) || 0 } : item)); }
  function addRecipient() { setRecipients((items) => [...items, { id: Date.now(), username: "@new-user", amount: 50 }]); }

  if (step === "summary") return <div className="content-pane batch-page"><div className="page-heading page-heading-spacious"><div><button className="text-button batch-back-button" onClick={() => setStep("recipients")}><ArrowLeft size={15} /> Edit recipients</button><span className="page-kicker">Final review</span><h1>Batch summary</h1><p>Check the full payout before sending it to your group.</p></div><div className="batch-total-badge"><span>Total payout</span><strong>${total.toFixed(2)}</strong></div></div><section className="panel batch-summary-page"><div className="batch-summary-list"><div><span>Recipients</span><strong>{recipients.length}</strong></div><div><span>Total payout</span><strong>${total.toFixed(2)}</strong></div><div><span>Average transfer</span><strong>${(total / Math.max(recipients.length, 1)).toFixed(2)}</strong></div><div><span>Currency</span><strong>USDC</strong></div></div><div className="summary-recipient-list"><h2>Recipient breakdown</h2>{recipients.map((recipient) => <div key={recipient.id}><span><b>{recipient.username}</b><small>USDC recipient</small></span><strong>${recipient.amount.toFixed(2)}</strong></div>)}</div><div className="batch-summary-note"><b>Ready to send</b><small>Each recipient will receive the amount shown above.</small></div><button className="primary-button form-submit" onClick={() => setMessage(`Batch ready for ${recipients.length} recipients.`)}>Send batch</button>{message && <div className="success-message"><Check size={15} />{message}</div>}</section><TransactionList transactions={transactions} onOpenDetail={() => onNavigate("detail")} title="Recent batch activity" /></div>;

  return <div className="content-pane batch-page"><div className="page-heading page-heading-spacious"><div><span className="page-kicker">Step 1 of 2</span><h1>Batch send</h1><p>Add recipients and set the exact amount for each person.</p></div><div className="batch-total-badge"><span>Total payout</span><strong>${total.toFixed(2)}</strong></div></div><section className="panel batch-recipients-page"><div className="panel-header"><div><h2>Recipients</h2><p className="panel-copy">Adjust each amount before moving to the summary.</p></div><button className="text-button" onClick={() => setRecipients([])}>Clear all</button></div><div className="batch-list batch-list-tall">{recipients.map((recipient) => <div className="batch-row batch-row-redesigned" key={recipient.id}><span className="transaction-main"><span className="avatar avatar-lilac">{recipient.username.replace("@", "").slice(0, 1).toUpperCase()}</span><span><b>{recipient.username}</b><small>USDC recipient</small></span></span><span className="batch-amount"><span>$</span><input type="number" min="0" value={recipient.amount} onChange={(event) => updateAmount(recipient.id, event.target.value)} /><button aria-label={`Remove ${recipient.username}`} onClick={() => setRecipients((items) => items.filter((item) => item.id !== recipient.id))}><X size={14} /></button></span></div>)}</div><button className="add-row" onClick={addRecipient}><Plus size={14} /> Add recipient</button><button className="primary-button form-submit" disabled={!recipients.length} onClick={() => setStep("summary")}>Continue to summary <ChevronRight size={15} /></button></section><TransactionList transactions={transactions} onOpenDetail={() => onNavigate("detail")} title="Recent batch activity" /></div>;
}

function GroupsView({ groups, onCreate, onOpenGroup }: { groups: Group[]; onCreate: (name: string, category: Category) => Promise<void>; onOpenGroup: (group: Group) => void }) {
  const [category, setCategory] = useState<Category>("Trip");
  const [name, setName] = useState("Dubai Trip");
  const [message, setMessage] = useState<string | null>(null);
  const dubaiTrip = groups.find((group) => group.name === "Dubai Trip") ?? groups[0];

  async function createGroup() {
    await onCreate(name, category);
    setMessage(`Group wallet “${name}” saved.`);
    window.setTimeout(() => setMessage(null), 3200);
  }

  return <div className="content-pane groups-page"><div className="page-heading page-heading-spacious"><div><span className="page-kicker">Shared wallets</span><h1>My groups</h1><p>Create templates and manage the wallets you own.</p></div><span className="group-count-badge">{groups.length} active wallets</span></div><section className="my-groups-section groups-feature-section"><div className="section-heading"><div><h2>Your templates</h2><p className="panel-copy">Start from a repeatable group setup.</p></div><button className="text-button" onClick={() => onOpenGroup(dubaiTrip)}>Open Dubai Trip</button></div><button className="featured-group-card featured-group-card-large" onClick={() => onOpenGroup(dubaiTrip)}><span className="featured-group-copy"><b>{dubaiTrip?.name ?? "Dubai Trip"}</b><small>{dubaiTrip?.membersCount ?? 5} members · Trip template · {money(dubaiTrip?.balanceCents ?? 123000)} available</small><em>Open group workspace</em></span></button></section><div className="groups-workspace"><section className="panel create-group-card"><div className="form-card-heading"><div><h2>Create a new group</h2><p className="panel-copy">Choose a template category to get started.</p></div></div><div className="category-grid">{categoryOptions.map(({ id, label, description, icon: Icon }) => <button key={id} className={`category-card ${category === id ? "selected" : ""}`} onClick={() => setCategory(id)}><span className="category-icon"><Icon size={17} /></span><b>{label}</b><small>{description}</small></button>)}</div><label className="form-field">Group name<input value={name} onChange={(event) => setName(event.target.value)} /></label><button className="primary-button form-submit" onClick={createGroup}>Create group</button>{message && <div className="success-message"><Check size={15} />{message}</div>}</section></div><section className="content-section active-groups-section"><div className="section-heading"><div><h2>All active wallets</h2><p className="panel-copy">Your current shared balances.</p></div><span className="section-count">{groups.length} wallets</span></div><div className="group-grid">{groups.map((group) => <button className="group-card" key={group.id} onClick={() => onOpenGroup(group)}><div className="group-card-top"><span className="tag">{group.category}</span><em>{group.status}</em></div><b>{group.name}</b><small>{group.membersCount} members · Admin wallet</small><strong>{money(group.balanceCents)}</strong></button>)}</div></section></div>;
}

function SettingsView({ theme, onToggleTheme, onNavigate, address }: { theme: Theme; onToggleTheme: () => void; onNavigate: (tab: Tab) => void; address?: string }) {
  const [saved, setSaved] = useState(false);
  function save() { setSaved(true); window.setTimeout(() => setSaved(false), 2600); }
  return <div className="content-pane account-page"><div className="page-heading page-heading-spacious"><div><span className="page-kicker">Workspace controls</span><h1>Settings</h1><p>Manage your appearance, notifications, and wallet preferences.</p></div><button className="secondary-button" onClick={() => onNavigate("profile")}><Users size={15} /> View profile</button></div><div className="account-grid"><section className="panel settings-panel"><div className="account-section-heading"><span className="account-icon"><Settings size={18} /></span><div><h2>Preferences</h2><p className="panel-copy">Make GroupPay feel right for you.</p></div></div><button className="setting-row" onClick={onToggleTheme}><span><b>Appearance</b><small>Switch between light and dark mode</small></span><span className="setting-value">{theme === "dark" ? "Dark" : "Light"}<ChevronRight size={14} /></span></button><label className="setting-row setting-toggle"><span><b>Transfer notifications</b><small>Get updates when requests and sends change</small></span><input type="checkbox" defaultChecked /><span className="toggle-track" /></label><label className="setting-row setting-toggle"><span><b>Weekly wallet summary</b><small>Receive a compact activity recap</small></span><input type="checkbox" /><span className="toggle-track" /></label><button className="primary-button form-submit" onClick={save}><Check size={15} /> {saved ? "Preferences saved" : "Save preferences"}</button></section><section className="panel settings-panel"><div className="account-section-heading"><span className="account-icon soft-account-icon"><Wallet size={18} /></span><div><h2>Wallet connection</h2><p className="panel-copy">Your signing account for GroupPay transfers.</p></div></div><div className={`connection-card ${address ? "connected" : ""}`}><span className="connection-status-dot" /><div><b>{address ? "Wallet connected" : "No wallet connected"}</b><small>{address ? shortAddress(address) : "Connect a wallet to sign transfers"}</small></div></div>{!address && <div className="settings-connect"><ConnectButton showBalance={false} /></div>}<button className="text-button settings-link" onClick={() => onNavigate("profile")}>Open profile & wallet details <ChevronRight size={14} /></button></section></div></div>;
}

function ProfileView({ address, onNavigate }: { address?: string; onNavigate: (tab: Tab) => void }) {
  return <div className="content-pane account-page"><div className="page-heading page-heading-spacious"><div><span className="page-kicker">Personal account</span><h1>Your profile</h1><p>Keep your GroupPay identity and wallet details in one place.</p></div><button className="secondary-button" onClick={() => onNavigate("settings")}><Settings size={15} /> Settings</button></div><section className="profile-hero panel"><span className="profile-large-avatar">E</span><div className="profile-identity"><h2>Emmanuel</h2><p>@emmanuel</p><span className="profile-status"><span className="live-dot" /> Active GroupPay member</span></div><button className="secondary-button profile-edit" onClick={() => window.alert("Profile editing is ready to connect to your account API.")}>Edit profile</button></section><div className="account-grid profile-grid"><section className="panel"><div className="account-section-heading"><span className="account-icon"><Users size={18} /></span><div><h2>Profile details</h2><p className="panel-copy">How other GroupPay members see you.</p></div></div><label className="form-field">Display name<input defaultValue="Emmanuel" /></label><label className="form-field">Username<input defaultValue="@emmanuel" /></label><label className="form-field">Email<input defaultValue="emmanuel@example.com" type="email" /></label></section><section className="panel"><div className="account-section-heading"><span className="account-icon soft-account-icon"><Wallet size={18} /></span><div><h2>Wallet identity</h2><p className="panel-copy">Connected wallets can sign GroupPay activity.</p></div></div><div className={`connection-card ${address ? "connected" : ""}`}><span className="connection-status-dot" /><div><b>{address ? "Primary wallet" : "Connect your primary wallet"}</b><small>{address ? shortAddress(address) : "No wallet linked yet"}</small></div></div>{!address && <div className="settings-connect"><ConnectButton showBalance={false} /></div>}</section></div></div>;
}

function DetailView({ group, transactions, onBack, onDeposit }: { group: Group; transactions: Transaction[]; onBack: () => void; onDeposit: (amountCents: number, note: string) => Promise<void> }) {
  const [section, setSection] = useState("Overview");
  const contributionRows = ["@emmanuel", "@josh", "@david", "@sarah", "@mike"];
  const breakdown = [{ label: "Hotel", percent: "41%", color: "#6a5df5" }, { label: "Transport", percent: "14%", color: "#a59bfb" }, { label: "Food", percent: "26%", color: "#f59e0b" }, { label: "Activities", percent: "18%", color: "#fcd34d" }, { label: "Other", percent: "1%", color: "#e8e5f2" }];

  return <div className="detail-pane"><div className="detail-cover"><button className="cover-button" onClick={onBack}><ArrowLeft size={16} /></button><button className="cover-settings"><Settings size={14} /> Settings</button><div><h1>{group.name}</h1><p>{group.membersCount} members · {group.category}</p></div></div><div className="detail-content"><div className="balance-row"><div><span className="eyebrow">Current balance</span><strong>{money(group.balanceCents)}</strong></div><div className="contributed-total"><span className="eyebrow">Total contributed</span><strong>{money(group.totalContributedCents)}</strong></div><button className="primary-button" style={{marginLeft: "auto"}} onClick={() => { const amt = window.prompt("Enter amount to deposit (MON):", "10"); if (amt && !isNaN(Number(amt))) onDeposit(Number(amt) * 100, "Deposit from UI").catch(console.error); }}>Deposit Funds</button></div><div className="detail-tabs">{["Overview", "Expenses", "Members", "Activity"].map((tab) => <button key={tab} className={section === tab ? "active" : ""} onClick={() => setSection(tab)}>{tab}</button>)}</div>{section === "Overview" ? <div className="detail-grid"><section className="panel"><div className="section-heading"><h3>Contributions</h3><button className="text-button">See all</button></div><div className="contributions">{contributionRows.map((name) => <div key={name}><span>{name}</span><b>$400.00</b></div>)}</div></section><section className="panel spending-panel"><h3>Spending Breakdown</h3><div className="spending-content"><div className="donut"><div>$1,680</div></div><div className="legend">{breakdown.map((item) => <div key={item.label}><span><i style={{ background: item.color }} />{item.label}</span><b>{item.percent}</b></div>)}</div></div></section></div> : <section className="panel empty-panel"><CircleDollarSign size={24} /><h3>{section}</h3><p>This wallet section is ready for your next API resource.</p></section>}<TransactionList transactions={transactions} onOpenDetail={() => undefined} title="Recent Group Transactions" /></div></div>;
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>(readTab);
  const [selectedGroup, setSelectedGroup] = useState<Group>(FALLBACK_GROUPS[0]);
  const { address, connector } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: monadTestnet.id });
  const { writeContractAsync } = useWriteContract();

  const utils = trpc.useUtils();
  const snapshotQuery = trpc.groupPay.snapshot.useQuery();
  const createGroupMutation = trpc.groupPay.createGroup.useMutation({ onSuccess: () => utils.groupPay.snapshot.invalidate() });
  const sendMoneyMutation = trpc.groupPay.sendMoney.useMutation({ onSuccess: () => utils.groupPay.snapshot.invalidate() });
  const prepareSendMutation = trpc.groupPay.prepareSend.useMutation();
  const prepareDepositMutation = trpc.groupPay.prepareDeposit.useMutation();
  const recordSubmittedMutation = trpc.groupPay.recordSubmittedTransaction.useMutation();
  const confirmTransactionMutation = trpc.groupPay.confirmTransaction.useMutation({ onSuccess: () => utils.groupPay.snapshot.invalidate() });
  const connectWalletMutation = trpc.groupPay.connectWallet.useMutation();

  const groups = useMemo(() => {
    const serverGroups = (snapshotQuery.data?.wallets ?? []).map(mapGroup);
    if (serverGroups.length === 0) return FALLBACK_GROUPS;
    const merged = [...FALLBACK_GROUPS];
    serverGroups.forEach((serverGroup) => {
      const index = merged.findIndex((group) => group.name === serverGroup.name);
      if (index >= 0) merged[index] = serverGroup;
      else merged.unshift(serverGroup);
    });
    return merged;
  }, [snapshotQuery.data?.wallets]);

  const transactions = useMemo(() => {
    const serverTransactions = (snapshotQuery.data?.transactions ?? []).map(mapTransaction);
    return serverTransactions.length ? serverTransactions : FALLBACK_TRANSACTIONS;
  }, [snapshotQuery.data?.transactions]);

  function navigate(tab: Tab) {
    setActiveTab(tab);
    window.location.hash = tab;
  }

  useEffect(() => {
    const onHashChange = () => setActiveTab(readTab());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  async function createGroup(name: string, category: Category) {
    if (groupPayContractAddress && address && chainId === monadTestnet.id) {
      const hash = await writeContractAsync({
        address: groupPayContractAddress,
        abi: groupPayAbi,
        functionName: "createGroup",
        args: [name],
      });
      const receipt = publicClient ? await publicClient.waitForTransactionReceipt({ hash }) : undefined;
      let contractGroupId: number | undefined;
      const log = receipt?.logs.find((entry) => entry.address.toLowerCase() === groupPayContractAddress.toLowerCase());
      if (log) {
        try {
          const decoded = decodeEventLog({ abi: groupPayAbi, data: log.data, topics: log.topics });
          if (decoded.eventName === "GroupCreated") contractGroupId = Number(decoded.args.groupId);
        } catch {
          // The receipt is still valid even if a wallet/provider omits decodable logs.
        }
      }
      await createGroupMutation.mutateAsync({ name, category, contractGroupId, contractAddress: groupPayContractAddress, chainId: "10143", creatorAddress: address });
      return;
    }
    await createGroupMutation.mutateAsync({ name, category });
  }

  async function sendMoney(data: { recipient: string; amountCents: number; note: string }) {
    const selectedGroupId = typeof selectedGroup.id === "number" ? selectedGroup.id : undefined;
    const recipientIsAddress = /^0x[a-fA-F0-9]{40}$/.test(data.recipient);
    if (groupPayContractAddress && address && chainId === monadTestnet.id && selectedGroupId && selectedGroup.contractGroupId !== null && selectedGroup.contractGroupId !== undefined && recipientIsAddress) {
      const amountBaseUnits = parseEther((data.amountCents / 100).toFixed(2));
      const intent = await prepareSendMutation.mutateAsync({ groupId: selectedGroupId, fromAddress: address, recipientAddress: data.recipient, amountBaseUnits: amountBaseUnits.toString(), amountCents: data.amountCents, note: data.note, chainId: "10143" });
      const hash = await writeContractAsync({ address: groupPayContractAddress, abi: groupPayAbi, functionName: "send", args: [BigInt(selectedGroup.contractGroupId), data.recipient as `0x${string}`, amountBaseUnits, data.note] });
      await recordSubmittedMutation.mutateAsync({ transactionId: intent.id, txHash: hash });
      const receipt = publicClient ? await publicClient.waitForTransactionReceipt({ hash }) : undefined;
      await confirmTransactionMutation.mutateAsync({ transactionId: intent.id, txHash: hash, blockNumber: receipt?.blockNumber.toString() });
      return;
    }
    await sendMoneyMutation.mutateAsync(data);
  }

  async function depositFunds(amountCents: number, note: string) {
    const selectedGroupId = typeof selectedGroup.id === "number" ? selectedGroup.id : undefined;
    if (groupPayContractAddress && address && chainId === monadTestnet.id && selectedGroupId && selectedGroup.contractGroupId !== null && selectedGroup.contractGroupId !== undefined) {
      const amountBaseUnits = parseEther((amountCents / 100).toFixed(2));
      const intent = await prepareDepositMutation.mutateAsync({
        groupId: selectedGroupId,
        fromAddress: address,
        amountBaseUnits: amountBaseUnits.toString(),
        amountCents,
        note,
        chainId: "10143"
      });
      const hash = await writeContractAsync({
        address: groupPayContractAddress,
        abi: groupPayAbi,
        functionName: "deposit",
        args: [BigInt(selectedGroup.contractGroupId), note],
        value: amountBaseUnits
      });
      await recordSubmittedMutation.mutateAsync({ transactionId: intent.id, txHash: hash });
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        await confirmTransactionMutation.mutateAsync({ transactionId: intent.id, txHash: hash, blockNumber: receipt.blockNumber.toString() });
      }
      alert("Deposit transaction submitted successfully!");
    } else {
      alert("Please connect to Monad Testnet and ensure the group is fully created onchain first.");
    }
  }

  // RainbowKit owns connection UX; GroupPay only registers the public address.
  useEffect(() => {
    if (!address) return;
    const provider = connector?.name?.toLowerCase().includes("meta") ? "metamask" : "walletconnect";
    void connectWalletMutation.mutateAsync({ provider, address, chainId: `0x${chainId.toString(16)}` });
  }, [address, chainId, connector?.name]);

  const content = activeTab === "dashboard"
    ? <DashboardView groups={groups} transactions={transactions} onNavigate={navigate} onOpenGroup={(group) => { setSelectedGroup(group); navigate("detail"); }} />
    : activeTab === "send"
      ? <SendView transactions={transactions} onNavigate={navigate} onSend={sendMoney} />
      : activeTab === "batch"
        ? <BatchView transactions={transactions} onNavigate={navigate} />
        : activeTab === "groups"
          ? <GroupsView groups={groups} onCreate={createGroup} onOpenGroup={(group) => { setSelectedGroup(group); navigate("detail"); }} />
          : activeTab === "request"
            ? <RequestView onNavigate={navigate} />
            : activeTab === "settings"
              ? <SettingsView theme={theme} onToggleTheme={toggleTheme} onNavigate={navigate} address={address} />
              : activeTab === "profile"
                ? <ProfileView address={address} onNavigate={navigate} />
                : <DetailView group={selectedGroup} transactions={transactions} onBack={() => navigate("dashboard")} onDeposit={depositFunds} />;

  return <div className="app-frame"><main className={`app-window ${activeTab === "detail" ? "detail-window" : ""}`}><Sidebar activeTab={activeTab} onNavigate={navigate} theme={theme} onToggleTheme={toggleTheme} address={address} />{content}</main><footer className="app-footer"><span>GroupPay · linked wallet workspace</span><span>{snapshotQuery.isFetching ? "Syncing API…" : "API ready"}</span></footer></div>;
}
