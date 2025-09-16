import React, { useEffect, useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts';

import {
  // Reads
  getAccounts, getPayees, getPayeeAccounts, getDeposits, getTransfers, getPayments,
  // Creates
  createDeposit as apiCreateDeposit,
  createTransfer as apiCreateTransfer,
  createPayment as apiCreatePayment,
  createPayee as apiCreatePayee,
  createPayeeAccount as apiCreatePayeeAccount,
  createAccount as apiCreateAccount,
  // Reports
  getDepositsBySource,
  getCashflowMonthly,
  // Updates (ensure these exist in api.js)
  updateAccount, deleteAccount,
  updateDeposit, deleteDeposit,
  updatePayment, deletePayment,
  updatePayee, deletePayee,
  updatePayeeAccount, deletePayeeAccount
} from './api';

// Simple helpers
const Card = ({ title, right, children }) => (
  <div className="bg-white shadow rounded p-4 mb-4">
    <div className="flex justify-between items-center mb-2">
      <h2 className="font-semibold text-lg">{title}</h2>
      {right}
    </div>
    {children}
  </div>
);

const Labeled = ({ label, children }) => (
  <label className="block text-sm mb-2">
    <span className="text-gray-600">{label}</span>
    {children}
  </label>
);

const formatMoney = (val) => `$${Number(val).toFixed(2)}`;

function App() {
  // Server-backed state
  const [accounts, setAccounts] = useState([]);
  const [payees, setPayees] = useState([]);
  const [payeeAccounts, setPayeeAccounts] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [payments, setPayments] = useState([]);
  const [transfers, setTransfers] = useState([]);

  // Form state (create)
  const [newAccount, setNewAccount] = useState({ user_id: 1, type: 'checking', nickname: '', balance: '' });
  const [depositForm, setDepositForm] = useState({ account_id: null, source: '', amount: '', date: new Date().toISOString().slice(0, 10) });
  const [transferForm, setTransferForm] = useState({ from_account_id: null, to_account_id: null, amount: '', date: new Date().toISOString().slice(0, 10) });
  const [payeeForm, setPayeeForm] = useState({ name: '' });
  const [payeeAccountForm, setPayeeAccountForm] = useState({
    payee_id: null,
    account_label: '',
    account_number: '',
    category: 'credit card',
    interest_type: 'none',
    interest_rate: 0,
    current_balance: 0,
    principal_balance: 0,
    accrued_interest: 0,
    due_date: new Date().toISOString().slice(0, 10)
  });
  const [paymentForm, setPaymentForm] = useState({ checking_account_id: null, payee_account_id: null, amount: '', date: new Date().toISOString().slice(0, 10) });

  // Edit state (per-entity)
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [accountEdits, setAccountEdits] = useState({ nickname: '', type: 'checking', balance: '' });

  const [editingDepositId, setEditingDepositId] = useState(null);
  const [depositEdits, setDepositEdits] = useState({ account_id: null, source: '', amount: '', date: '' });

  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [paymentEdits, setPaymentEdits] = useState({ checking_account_id: null, payee_account_id: null, amount: '', date: '' });

  const [editingPayeeId, setEditingPayeeId] = useState(null);
  const [payeeEdits, setPayeeEdits] = useState({ name: '' });

  const [editingPayeeAccountId, setEditingPayeeAccountId] = useState(null);
  const [payeeAccountEdits, setPayeeAccountEdits] = useState({
    payee_id: null,
    account_label: '',
    account_number: '',
    category: 'credit card',
    interest_type: 'none',
    interest_rate: 0,
    current_balance: 0,
    principal_balance: 0,
    accrued_interest: 0,
    due_date: new Date().toISOString().slice(0, 10)
  });

  // Chart data state
  const [depositsBySource, setDepositsBySource] = useState([]);
  const [cashflowMonthly, setCashflowMonthly] = useState([]);

  // Chart toggles
  const [showDepositsChart, setShowDepositsChart] = useState(true);
  const [showCashflowChart, setShowCashflowChart] = useState(true);

  // Initialization guard
  const [hasInitialized, setHasInitialized] = useState(false);

  // One-time init after data load
  useEffect(() => {
    if (!hasInitialized && accounts.length && payees.length) {
      const firstAccountId = accounts[0].id;
      setDepositForm((f) => ({ ...f, account_id: f.account_id ?? firstAccountId }));

      const firstChecking = accounts.find(a => a.type === 'checking') || accounts[0];
      if (firstChecking) {
        setPaymentForm((f) => ({
          ...f,
          checking_account_id: f.checking_account_id ?? firstChecking.id,
          payee_account_id: f.payee_account_id ?? (payeeAccounts[0]?.id || null)
        }));
        setTransferForm((f) => ({
          ...f,
          from_account_id: f.from_account_id ?? firstChecking.id,
          to_account_id: f.to_account_id ?? (accounts.find(a => a.id !== firstChecking.id)?.id || firstChecking.id)
        }));
      }

      if (payees.length) {
        setPayeeAccountForm((f) => ({ ...f, payee_id: f.payee_id ?? payees[0].id }));
      }

      setHasInitialized(true);
    }
  }, [accounts, payees, payeeAccounts, hasInitialized]);

  // Initial data load
  useEffect(() => {
    (async () => {
      try {
        const [accs, pys, pas, deps, pays, xfers] = await Promise.all([
          getAccounts(), getPayees(), getPayeeAccounts(), getDeposits(), getPayments(), getTransfers()
        ]);
        setAccounts(accs);
        setPayees(pys);
        setPayeeAccounts(pas);
        setDeposits(deps);
        setPayments(pays);
        setTransfers(xfers);

        // Load chart data
        const [depsBySource, cashflow] = await Promise.all([
          getDepositsBySource(),
          getCashflowMonthly()
        ]);
        setDepositsBySource(depsBySource);
        setCashflowMonthly(cashflow);
      } catch (e) {
        console.error('Initial load failed:', e);
        alert('Could not load initial data from the API.');
      }
    })();
  }, []);

  // Derived lookups
  const payeeLookup = useMemo(() => Object.fromEntries(payees.map(p => [p.id, p.name])), [payees]);
  const accountLookup = useMemo(() => Object.fromEntries(accounts.map(a => [a.id, a.nickname])), [accounts]);
  const payeeAccountsEnriched = useMemo(() =>
    payeeAccounts.map(pa => ({ ...pa, payee_name: payeeLookup[pa.payee_id] || 'Unknown' })),
    [payeeAccounts, payeeLookup]
  );

  // Summary calculations
  const totalCash = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalDue = payeeAccountsEnriched.reduce((sum, pa) => sum + Number(pa.current_balance), 0);

  // CREATE handlers with validation
  async function createAccount() {
    // Validation
    if (!newAccount.nickname || newAccount.nickname.trim() === '') {
      alert('Account nickname is required.');
      return;
    }
    if (newAccount.balance === '' || isNaN(parseFloat(newAccount.balance))) {
      alert('Starting balance is required and must be a valid number.');
      return;
    }

    try {
      const payload = { ...newAccount, balance: parseFloat(newAccount.balance), user_id: 1 };
      await apiCreateAccount(payload);
      const accs = await getAccounts();
      setAccounts(accs);
      setNewAccount({ user_id: 1, type: 'checking', nickname: '', balance: '' });
    } catch (error) {
      alert(`Failed to create account: ${error.message}`);
    }
  }

  async function createDeposit() {
    // Validation
    if (!depositForm.account_id) {
      alert('Please select an account.');
      return;
    }
    if (!depositForm.source || depositForm.source.trim() === '') {
      alert('Deposit source is required.');
      return;
    }
    if (depositForm.amount === '' || isNaN(parseFloat(depositForm.amount)) || parseFloat(depositForm.amount) <= 0) {
      alert('Amount is required and must be greater than 0.');
      return;
    }
    if (!depositForm.date) {
      alert('Date is required.');
      return;
    }

    try {
      const payload = { ...depositForm, amount: parseFloat(depositForm.amount) };
      await apiCreateDeposit(payload);
      setDeposits(await getDeposits());
      setDepositForm({ ...depositForm, source: '', amount: '' });
      // charts refresh
      setDepositsBySource(await getDepositsBySource());
      setCashflowMonthly(await getCashflowMonthly());
    } catch (error) {
      alert(`Failed to create deposit: ${error.message}`);
    }
  }

  async function createTransfer() {
    // Validation
    if (!transferForm.from_account_id) {
      alert('Please select a "from" account.');
      return;
    }
    if (!transferForm.to_account_id) {
      alert('Please select a "to" account.');
      return;
    }
    if (transferForm.from_account_id === transferForm.to_account_id) {
      alert('From and To accounts must be different.');
      return;
    }
    if (transferForm.amount === '' || isNaN(parseFloat(transferForm.amount)) || parseFloat(transferForm.amount) <= 0) {
      alert('Amount is required and must be greater than 0.');
      return;
    }
    if (!transferForm.date) {
      alert('Date is required.');
      return;
    }

    try {
      const payload = { ...transferForm, amount: parseFloat(transferForm.amount) };
      await apiCreateTransfer(payload);
      setTransfers(await getTransfers());
      setTransferForm({ ...transferForm, amount: '' });
      // charts refresh
      setCashflowMonthly(await getCashflowMonthly());
    } catch (error) {
      alert(`Failed to create transfer: ${error.message}`);
    }
  }

  async function createPayee() {
    // Validation
    if (!payeeForm.name || payeeForm.name.trim() === '') {
      alert('Payee name is required.');
      return;
    }

    try {
      await apiCreatePayee({ ...payeeForm, user_id: 1 });
      setPayees(await getPayees());
      setPayeeForm({ name: '' });
    } catch (error) {
      alert(`Failed to create payee: ${error.message}`);
    }
  }

  async function createPayeeAccount() {
    // Validation
    if (!payeeAccountForm.payee_id) {
      alert('Please select a payee.');
      return;
    }
    if (!payeeAccountForm.account_label || payeeAccountForm.account_label.trim() === '') {
      alert('Account label is required.');
      return;
    }
    if (!payeeAccountForm.category) {
      alert('Please select a category.');
      return;
    }
    if (!payeeAccountForm.due_date) {
      alert('Due date is required.');
      return;
    }

    try {
      const payload = {
        ...payeeAccountForm,
        interest_rate: payeeAccountForm.interest_rate === '' ? null : parseFloat(payeeAccountForm.interest_rate),
        current_balance: payeeAccountForm.current_balance === '' ? null : parseFloat(payeeAccountForm.current_balance),
        principal_balance: payeeAccountForm.principal_balance === '' ? null : parseFloat(payeeAccountForm.principal_balance),
        accrued_interest: payeeAccountForm.accrued_interest === '' ? null : parseFloat(payeeAccountForm.accrued_interest),
        user_id: 1
      };
      await apiCreatePayeeAccount(payload);
      setPayeeAccounts(await getPayeeAccounts());
      setPayeeAccountForm({
        payee_id: payees[0]?.id ?? null,
        account_label: '',
        account_number: '',
        category: 'credit card',
        interest_type: 'none',
        interest_rate: 0,
        current_balance: 0,
        principal_balance: 0,
        accrued_interest: 0,
        due_date: new Date().toISOString().slice(0, 10)
      });
    } catch (error) {
      alert(`Failed to create payee account: ${error.message}`);
    }
  }

  async function createPayment() {
    // Validation
    if (!paymentForm.checking_account_id) {
      alert('Please select a checking account.');
      return;
    }
    if (!paymentForm.payee_account_id) {
      alert('Please select a payee account.');
      return;
    }
    if (paymentForm.amount === '' || isNaN(parseFloat(paymentForm.amount)) || parseFloat(paymentForm.amount) <= 0) {
      alert('Amount is required and must be greater than 0.');
      return;
    }
    if (!paymentForm.date) {
      alert('Date is required.');
      return;
    }

    try {
      const payload = { ...paymentForm, amount: parseFloat(paymentForm.amount) };
      await apiCreatePayment(payload);
      setPayments(await getPayments());
      setPaymentForm({ ...paymentForm, amount: '' });
      // charts refresh
      setCashflowMonthly(await getCashflowMonthly());
    } catch (error) {
      alert(`Failed to create payment: ${error.message}`);
    }
  }

  // EDIT/DELETE handlers — Accounts (with validation)
  function startEditAccount(a) {
    setEditingAccountId(a.id);
    setAccountEdits({
      nickname: a.nickname || '',
      type: a.type || 'checking',
      balance: a.balance ?? 0
    });
  }
  function cancelEditAccount() {
    setEditingAccountId(null);
    setAccountEdits({ nickname: '', type: 'checking', balance: '' });
  }
  async function saveEditAccount(id) {
    // Validation
    if (!accountEdits.nickname || accountEdits.nickname.trim() === '') {
      alert('Account nickname is required.');
      return;
    }
    if (accountEdits.balance === '' || isNaN(parseFloat(accountEdits.balance))) {
      alert('Balance is required and must be a valid number.');
      return;
    }

    try {
      const payload = {
        nickname: accountEdits.nickname,
        type: accountEdits.type,
        balance: parseFloat(accountEdits.balance)
      };
      await updateAccount(id, payload);
      setAccounts(await getAccounts());
      cancelEditAccount();
    } catch (error) {
      alert(`Failed to update account: ${error.message}`);
    }
  }
  async function removeAccount(id) {
    if (!window.confirm('Delete this account? This cannot be undone.')) return;
    try {
      await deleteAccount(id);
      setAccounts(await getAccounts());
    } catch (error) {
      alert(`Failed to delete account: ${error.message}`);
    }
  }

  // EDIT/DELETE handlers — Deposits (with validation)
  function startEditDeposit(d) {
    setEditingDepositId(d.id);
    setDepositEdits({
      account_id: d.account_id,
      source: d.source || '',
      amount: d.amount ?? 0,
      date: d.date?.slice(0, 10) || new Date().toISOString().slice(0, 10)
    });
  }
  function cancelEditDeposit() {
    setEditingDepositId(null);
    setDepositEdits({ account_id: null, source: '', amount: '', date: '' });
  }
  async function saveEditDeposit(id) {
    // Validation
    if (!depositEdits.account_id) {
      alert('Please select an account.');
      return;
    }
    if (!depositEdits.source || depositEdits.source.trim() === '') {
      alert('Deposit source is required.');
      return;
    }
    if (depositEdits.amount === '' || isNaN(parseFloat(depositEdits.amount)) || parseFloat(depositEdits.amount) <= 0) {
      alert('Amount is required and must be greater than 0.');
      return;
    }
    if (!depositEdits.date) {
      alert('Date is required.');
      return;
    }

    try {
      const payload = {
        account_id: Number(depositEdits.account_id),
        source: depositEdits.source,
        amount: parseFloat(depositEdits.amount),
        date: depositEdits.date
      };
      await updateDeposit(id, payload);
      setDeposits(await getDeposits());
      cancelEditDeposit();
      // charts refresh
      setDepositsBySource(await getDepositsBySource());
      setCashflowMonthly(await getCashflowMonthly());
    } catch (error) {
      alert(`Failed to update deposit: ${error.message}`);
    }
  }
  async function removeDeposit(id) {
    if (!window.confirm('Delete this deposit?')) return;
    try {
      await deleteDeposit(id);
      setDeposits(await getDeposits());
      setDepositsBySource(await getDepositsBySource());
      setCashflowMonthly(await getCashflowMonthly());
    } catch (error) {
      alert(`Failed to delete deposit: ${error.message}`);
    }
  }

  // EDIT/DELETE handlers — Payments (with validation)
  function startEditPayment(p) {
    setEditingPaymentId(p.id);
    setPaymentEdits({
      checking_account_id: p.checking_account_id,
      payee_account_id: p.payee_account_id,
      amount: p.amount ?? 0,
      date: p.date?.slice(0, 10) || new Date().toISOString().slice(0, 10)
    });
  }
  function cancelEditPayment() {
    setEditingPaymentId(null);
    setPaymentEdits({ checking_account_id: null, payee_account_id: null, amount: '', date: '' });
  }
  async function saveEditPayment(id) {
    // Validation
    if (!paymentEdits.checking_account_id) {
      alert('Please select a checking account.');
      return;
    }
    if (!paymentEdits.payee_account_id) {
      alert('Please select a payee account.');
      return;
    }
    if (paymentEdits.amount === '' || isNaN(parseFloat(paymentEdits.amount)) || parseFloat(paymentEdits.amount) <= 0) {
      alert('Amount is required and must be greater than 0.');
      return;
    }
    if (!paymentEdits.date) {
      alert('Date is required.');
      return;
    }

    try {
      const payload = {
        checking_account_id: Number(paymentEdits.checking_account_id),
        payee_account_id: Number(paymentEdits.payee_account_id),
        amount: parseFloat(paymentEdits.amount),
        date: paymentEdits.date
      };
      await updatePayment(id, payload);
      setPayments(await getPayments());
      cancelEditPayment();
      // charts refresh
      setCashflowMonthly(await getCashflowMonthly());
    } catch (error) {
      alert(`Failed to update payment: ${error.message}`);
    }
  }
  async function removePayment(id) {
    if (!window.confirm('Delete this payment?')) return;
    try {
      await deletePayment(id);
      setPayments(await getPayments());
      setCashflowMonthly(await getCashflowMonthly());
    } catch (error) {
      alert(`Failed to delete payment: ${error.message}`);
    }
  }

  // EDIT/DELETE handlers — Payees (with validation)
  function startEditPayee(p) {
    setEditingPayeeId(p.id);
    setPayeeEdits({ name: p.name || '' });
  }
  function cancelEditPayee() {
    setEditingPayeeId(null);
    setPayeeEdits({ name: '' });
  }
  async function saveEditPayee(id) {
    // Validation
    if (!payeeEdits.name || payeeEdits.name.trim() === '') {
      alert('Payee name is required.');
      return;
    }

    try {
      await updatePayee(id, { name: payeeEdits.name });
      setPayees(await getPayees());
      cancelEditPayee();
    } catch (error) {
      alert(`Failed to update payee: ${error.message}`);
    }
  }
  async function removePayee(id) {
    if (!window.confirm('Delete this payee?')) return;
    try {
      await deletePayee(id);
      setPayees(await getPayees());
      setPayeeAccounts(await getPayeeAccounts());
    } catch (error) {
      alert(`Failed to delete payee: ${error.message}`);
    }
  }

  // EDIT/DELETE handlers — Payee Accounts (with validation)
  function startEditPayeeAccount(pa) {
    setEditingPayeeAccountId(pa.id);
    setPayeeAccountEdits({
      payee_id: pa.payee_id,
      account_label: pa.account_label || '',
      account_number: pa.account_number || '',
      category: pa.category || 'credit card',
      interest_type: pa.interest_type || 'none',
      interest_rate: pa.interest_rate ?? null,
      current_balance: pa.current_balance ?? null,
      principal_balance: pa.principal_balance ?? null,
      accrued_interest: pa.accrued_interest ?? null,
      due_date: pa.due_date?.slice(0, 10) || new Date().toISOString().slice(0, 10)
    });
  }
  function cancelEditPayeeAccount() {
    setEditingPayeeAccountId(null);
    setPayeeAccountEdits({
      payee_id: null,
      account_label: '',
      account_number: '',
      category: 'credit card',
      interest_type: 'none',
      interest_rate: 0,
      current_balance: 0,
      principal_balance: 0,
      accrued_interest: 0,
      due_date: new Date().toISOString().slice(0, 10)
    });
  }
  async function saveEditPayeeAccount(id) {
    // Validation
    if (!payeeAccountEdits.payee_id) {
      alert('Please select a payee.');
      return;
    }
    if (!payeeAccountEdits.account_label || payeeAccountEdits.account_label.trim() === '') {
      alert('Account label is required.');
      return;
    }
    if (!payeeAccountEdits.category) {
      alert('Please select a category.');
      return;
    }
    if (!payeeAccountEdits.due_date) {
      alert('Due date is required.');
      return;
    }

    try {
      const payload = {
        ...payeeAccountEdits,
        payee_id: Number(payeeAccountEdits.payee_id),
        interest_rate: payeeAccountEdits.interest_rate === null || payeeAccountEdits.interest_rate === '' ? null : parseFloat(payeeAccountEdits.interest_rate),
        current_balance: payeeAccountEdits.current_balance === null || payeeAccountEdits.current_balance === '' ? null : parseFloat(payeeAccountEdits.current_balance),
        principal_balance: payeeAccountEdits.principal_balance === null || payeeAccountEdits.principal_balance === '' ? null : parseFloat(payeeAccountEdits.principal_balance),
        accrued_interest: payeeAccountEdits.accrued_interest === null || payeeAccountEdits.accrued_interest === '' ? null : parseFloat(payeeAccountEdits.accrued_interest),
      };
      await updatePayeeAccount(id, payload);
      setPayeeAccounts(await getPayeeAccounts());
      cancelEditPayeeAccount();
    } catch (error) {
      alert(`Failed to update payee account: ${error.message}`);
    }
  }
  async function removePayeeAccount(id) {
    if (!window.confirm('Delete this payee account?')) return;
    try {
      await deletePayeeAccount(id);
      setPayeeAccounts(await getPayeeAccounts());
    } catch (error) {
      alert(`Failed to delete payee account: ${error.message}`);
    }
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Finance Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Cash</h3>
          <p className="text-2xl font-bold text-green-600">{formatMoney(totalCash)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Due</h3>
          <p className="text-2xl font-bold text-red-600">{formatMoney(totalDue)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-sm font-medium text-gray-500">Net Worth</h3>
          <p className="text-2xl font-bold text-blue-600">{formatMoney(totalCash - totalDue)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-sm font-medium text-gray-500">Accounts</h3>
          <p className="text-2xl font-bold text-gray-700">{accounts.length}</p>
        </div>
      </div>

      {/* PRIORITY ORDER: Payments first */}
      <Card title="Payments" right={<span className="text-sm text-gray-500">{payments.length} total</span>}>
        <ul className="divide-y mb-4 max-h-56 overflow-y-auto">
          {payments.map(p => (
            <li key={p.id} className="py-2 text-sm">
              {editingPaymentId === p.id ? (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                  <Labeled label="From Account">
                    <select
                      value={paymentEdits.checking_account_id || ''}
                      onChange={e => setPaymentEdits({ ...paymentEdits, checking_account_id: Number(e.target.value) })}
                      className="w-full border rounded p-2"
                      required
                    >
                      {accounts.filter(a => a.type === 'checking').map(a => <option key={a.id} value={a.id}>{a.nickname}</option>)}
                    </select>
                  </Labeled>
                  <Labeled label="To Payee Account">
                    <select
                      value={paymentEdits.payee_account_id || ''}
                      onChange={e => setPaymentEdits({ ...paymentEdits, payee_account_id: Number(e.target.value) })}
                      className="w-full border rounded p-2"
                      required
                    >
                      {payeeAccountsEnriched.map(pa => <option key={pa.id} value={pa.id}>{pa.payee_name} - {pa.account_label}</option>)}
                    </select>
                  </Labeled>
                  <Labeled label="Amount">
                    <input
                      type="number"
                      className="w-full border rounded p-2"
                      value={paymentEdits.amount ?? ""}
                      onChange={e => setPaymentEdits({ ...paymentEdits, amount: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                      required
                      min="0.01"
                      step="0.01"
                    />
                  </Labeled>
                  <Labeled label="Date">
                    <input
                      type="date"
                      className="w-full border rounded p-2"
                      value={paymentEdits.date ?? ""}
                      onChange={e => setPaymentEdits({ ...paymentEdits, date: e.target.value })}
                      required
                    />
                  </Labeled>
                  <div className="flex gap-2">
                    <button type="button" className="px-3 py-2 bg-gray-200 rounded" onClick={cancelEditPayment}>Cancel</button>
                    <button type="button" className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => saveEditPayment(p.id)}>Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span>{accountLookup[p.checking_account_id]} → Payee Account {p.payee_account_id} • {p.date?.slice(0,10)}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatMoney(p.amount)}</span>
                    <button type="button" className="text-blue-600 hover:underline" onClick={() => startEditPayment(p)}>Edit</button>
                    <button type="button" className="text-red-600 hover:underline" onClick={() => removePayment(p.id)}>Delete</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Labeled label="From Account">
            <select
              value={paymentForm.checking_account_id || ''}
              onChange={e => setPaymentForm({ ...paymentForm, checking_account_id: Number(e.target.value) })}
              className="w-full border rounded p-2"
              required
            >
              {accounts.filter(a => a.type === 'checking').map(a => <option key={a.id} value={a.id}>{a.nickname}</option>)}
            </select>
          </Labeled>
          <Labeled label="To Payee Account">
            <select
              value={paymentForm.payee_account_id || ''}
              onChange={e => setPaymentForm({ ...paymentForm, payee_account_id: Number(e.target.value) })}
              className="w-full border rounded p-2"
              required
            >
              {payeeAccountsEnriched.map(pa => <option key={pa.id} value={pa.id}>{pa.payee_name} - {pa.account_label}</option>)}
            </select>
          </Labeled>
          <Labeled label="Amount">
            <input
              type="number"
              className="w-full border rounded p-2"
              value={paymentForm.amount ?? ""}
              onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value === "" ? "" : parseFloat(e.target.value) })}
              required
              min="0.01"
              step="0.01"
            />
          </Labeled>
          <Labeled label="Date">
            <input
              type="date"
              className="w-full border rounded p-2"
              value={paymentForm.date ?? ""}
              onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
              required
            />
          </Labeled>
        </div>
        <button
          type="button"
          onClick={createPayment}
          className="mt-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Add Payment
        </button>
      </Card>

      {/* Rest of the components with similar validation patterns... */}
      {/* I'll continue with the remaining sections in the same pattern */}

      {/* Deposits second */}
      <Card title="Deposits" right={<span className="text-sm text-gray-500">{deposits.length} total</span>}>
        <ul className="divide-y mb-4 max-h-56 overflow-y-auto">
          {deposits.map(d => (
            <li key={d.id} className="py-2 text-sm">
              {editingDepositId === d.id ? (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                  <Labeled label="Account">
                    <select
                      value={depositEdits.account_id || ''}
                      onChange={e => setDepositEdits({ ...depositEdits, account_id: Number(e.target.value) })}
                      className="w-full border rounded p-2"
                      required
                    >
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.nickname}</option>)}
                    </select>
                  </Labeled>
                  <Labeled label="Source">
                    <input
                      className="w-full border rounded p-2"
                      value={depositEdits.source}
                      onChange={e => setDepositEdits({ ...depositEdits, source: e.target.value })}
                      required
                    />
                  </Labeled>
                  <Labeled label="Amount">
                    <input
                      type="number"
                      className="w-full border rounded p-2"
                      value={depositEdits.amount ?? ""}
                      onChange={e => setDepositEdits({ ...depositEdits, amount: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                      required
                      min="0.01"
                      step="0.01"
                    />
                  </Labeled>
                  <Labeled label="Date">
                    <input
                      type="date"
                      className="w-full border rounded p-2"
                      value={depositEdits.date ?? ""}
                      onChange={e => setDepositEdits({ ...depositEdits, date: e.target.value })}
                      required
                    />
                  </Labeled>
                  <div className="flex gap-2">
                    <button type="button" className="px-3 py-2 bg-gray-200 rounded" onClick={cancelEditDeposit}>Cancel</button>
                    <button type="button" className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => saveEditDeposit(d.id)}>Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span>{d.source} → {accountLookup[d.account_id]} • {d.date?.slice(0,10)}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatMoney(d.amount)}</span>
                    <button type="button" className="text-blue-600 hover:underline" onClick={() => startEditDeposit(d)}>Edit</button>
                    <button type="button" className="text-red-600 hover:underline" onClick={() => removeDeposit(d.id)}>Delete</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Labeled label="Account">
            <select
              value={depositForm.account_id || ''}
              onChange={e => setDepositForm({ ...depositForm, account_id: Number(e.target.value) })}
              className="w-full border rounded p-2"
              required
            >
              {accounts.map(a => <option key={a.id} value={a.id}>{a.nickname}</option>)}
            </select>
          </Labeled>
          <Labeled label="Source">
            <input
              className="w-full border rounded p-2"
              value={depositForm.source}
              onChange={e => setDepositForm({ ...depositForm, source: e.target.value })}
              placeholder="e.g., Salary"
              required
            />
          </Labeled>
          <Labeled label="Amount">
            <input
              type="number"
              className="w-full border rounded p-2"
              value={depositForm.amount ?? ""}
              onChange={e => setDepositForm({ ...depositForm, amount: e.target.value === "" ? "" : parseFloat(e.target.value) })}
              required
              min="0.01"
              step="0.01"
            />
          </Labeled>
          <Labeled label="Date">
            <input
              type="date"
              className="w-full border rounded p-2"
              value={depositForm.date ?? ""}
              onChange={e => setDepositForm({ ...depositForm, date: e.target.value })}
              required
            />
          </Labeled>
        </div>
        <button
          type="button"
          onClick={createDeposit}
          className="mt-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Add Deposit
        </button>
      </Card>

      {/* Continue with remaining sections... */}
      {/* I'll include the rest of the components with the same validation pattern */}

      {/* Transfers third */}
      <Card title="Transfers" right={<span className="text-sm text-gray-500">{transfers.length} total</span>}>
        <ul className="divide-y mb-4 max-h-56 overflow-y-auto">
          {transfers.map(t => (
            <li key={t.id} className="py-1 flex justify-between text-sm">
              <span>{accountLookup[t.from_account_id]} → {accountLookup[t.to_account_id]} • {t.date?.slice(0,10)}</span>
              <span className="font-medium">{formatMoney(t.amount)}</span>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Labeled label="From Account">
            <select
              value={transferForm.from_account_id || ''}
              onChange={e => setTransferForm({ ...transferForm, from_account_id: Number(e.target.value) })}
              className="w-full border rounded p-2"
              required
            >
              {accounts.map(a => <option key={a.id} value={a.id}>{a.nickname}</option>)}
            </select>
          </Labeled>
          <Labeled label="To Account">
            <select
              value={transferForm.to_account_id || ''}
              onChange={e => setTransferForm({ ...transferForm, to_account_id: Number(e.target.value) })}
              className="w-full border rounded p-2"
              required
            >
              {accounts.map(a => <option key={a.id} value={a.id}>{a.nickname}</option>)}
            </select>
          </Labeled>
          <Labeled label="Amount">
            <input
              type="number"
              className="w-full border rounded p-2"
              value={transferForm.amount ?? ""}
              onChange={e => setTransferForm({ ...transferForm, amount: e.target.value === "" ? "" : parseFloat(e.target.value) })}
              required
              min="0.01"
              step="0.01"
            />
          </Labeled>
          <Labeled label="Date">
            <input
              type="date"
              className="w-full border rounded p-2"
              value={transferForm.date ?? ""}
              onChange={e => setTransferForm({ ...transferForm, date: e.target.value })}
              required
            />
          </Labeled>
        </div>
        <button
          type="button"
          onClick={createTransfer}
          className="mt-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Transfer
        </button>
      </Card>

      {/* Accounts fourth */}
      <Card title="Accounts" right={<span className="text-sm text-gray-500">{accounts.length} total</span>}>
        <ul className="divide-y mb-4 max-h-64 overflow-y-auto">
          {accounts.map(a => (
            <li key={a.id} className="py-2">
              {editingAccountId === a.id ? (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                  <Labeled label="Nickname">
                    <input
                      className="w-full border rounded p-2"
                      value={accountEdits.nickname}
                      onChange={e => setAccountEdits({ ...accountEdits, nickname: e.target.value })}
                      required
                    />
                  </Labeled>
                  <Labeled label="Type">
                    <select
                      value={accountEdits.type}
                      onChange={e => setAccountEdits({ ...accountEdits, type: e.target.value })}
                      className="w-full border rounded p-2"
                      required
                    >
                      <option value="checking">checking</option>
                      <option value="savings">savings</option>
                    </select>
                  </Labeled>
                  <Labeled label="Balance">
                    <input
                      type="number"
                      className="w-full border rounded p-2"
                      value={accountEdits.balance ?? ""}
                      onChange={e => setAccountEdits({ ...accountEdits, balance: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                      required
                      step="0.01"
                    />
                  </Labeled>
                  <div className="text-xs text-gray-500 self-center">ID {a.id}</div>
                  <div className="flex gap-2">
                    <button type="button" className="px-3 py-2 bg-gray-200 rounded" onClick={cancelEditAccount}>Cancel</button>
                    <button type="button" className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => saveEditAccount(a.id)}>Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{a.nickname} <span className="text-xs text-gray-400">({a.type})</span></div>
                    <div className="text-xs text-gray-500">ID {a.id}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-semibold">{formatMoney(a.balance)}</div>
                    <button type="button" className="text-blue-600 hover:underline" onClick={() => startEditAccount(a)}>Edit</button>
                    <button type="button" className="text-red-600 hover:underline" onClick={() => removeAccount(a.id)}>Delete</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Labeled label="Type">
            <select
              value={newAccount.type}
              onChange={e => setNewAccount({ ...newAccount, type: e.target.value })}
              className="w-full border rounded p-2"
              required
            >
              <option value="checking">checking</option>
              <option value="savings">savings</option>
            </select>
          </Labeled>
          <Labeled label="Nickname">
            <input
              className="w-full border rounded p-2"
              value={newAccount.nickname}
              onChange={e => setNewAccount({ ...newAccount, nickname: e.target.value })}
              placeholder="e.g., Travel Checking"
              required
            />
          </Labeled>
          <Labeled label="Start Balance">
            <input
              type="number"
              className="w-full border rounded p-2"
              value={newAccount.balance ?? ""}
              onChange={e => setNewAccount({ ...newAccount, balance: e.target.value === "" ? "" : parseFloat(e.target.value) })}
              required
              step="0.01"
            />
          </Labeled>
        </div>
        <button
          type="button"
          onClick={createAccount}
          className="mt-2 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Add Account
        </button>
      </Card>

      {/* Payees */}
      <Card title="Payees" right={<span className="text-sm text-gray-500">{payees.length} total</span>}>
        <ul className="divide-y mb-4 max-h-64 overflow-y-auto">
          {payees.map(p => (
            <li key={p.id} className="py-2">
              {editingPayeeId === p.id ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                  <Labeled label="Payee Name">
                    <input
                      className="w-full border rounded p-2"
                      value={payeeEdits.name}
                      onChange={e => setPayeeEdits({ ...payeeEdits, name: e.target.value })}
                      required
                    />
                  </Labeled>
                  <div className="text-xs text-gray-500 self-center">ID {p.id}</div>
                  <div className="flex gap-2">
                    <button type="button" className="px-3 py-2 bg-gray-200 rounded" onClick={cancelEditPayee}>Cancel</button>
                    <button type="button" className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => saveEditPayee(p.id)}>Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">ID {p.id}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" className="text-blue-600 hover:underline" onClick={() => startEditPayee(p)}>Edit</button>
                    <button type="button" className="text-red-600 hover:underline" onClick={() => removePayee(p.id)}>Delete</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-1 gap-2">
          <Labeled label="Payee Name">
            <input
              className="w-full border rounded p-2"
              value={payeeForm.name}
              onChange={e => setPayeeForm({ ...payeeForm, name: e.target.value })}
              placeholder="e.g., Chase Credit Card"
              required
            />
          </Labeled>
        </div>
        <button
          type="button"
          onClick={createPayee}
          className="mt-2 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Add Payee
        </button>
      </Card>

      {/* Payee Accounts */}
      <Card title="Payee Accounts" right={<span className="text-sm text-gray-500">{payeeAccounts.length} total</span>}>
        <ul className="divide-y mb-4 max-h-72 overflow-y-auto">
          {payeeAccountsEnriched.map(pa => (
            <li key={pa.id} className="py-2">
              {editingPayeeAccountId === pa.id ? (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                  <Labeled label="Payee">
                    <select
                      value={payeeAccountEdits.payee_id || ''}
                      onChange={e => setPayeeAccountEdits({ ...payeeAccountEdits, payee_id: Number(e.target.value) })}
                      className="w-full border rounded p-2"
                      required
                    >
                      {payees.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </Labeled>
                  <Labeled label="Account Label">
                    <input
                      className="w-full border rounded p-2"
                      value={payeeAccountEdits.account_label}
                      onChange={e => setPayeeAccountEdits({ ...payeeAccountEdits, account_label: e.target.value })}
                      required
                    />
                  </Labeled>
                  <Labeled label="Category">
                    <select
                      value={payeeAccountEdits.category}
                      onChange={e => setPayeeAccountEdits({ ...payeeAccountEdits, category: e.target.value })}
                      className="w-full border rounded p-2"
                      required
                    >
                      <option value="credit card">Credit Card</option>
                      <option value="loan">Loan</option>
                      <option value="mortgage">Mortgage</option>
                      <option value="utility">Utility</option>
                    </select>
                  </Labeled>
                  <Labeled label="Interest Type">
                    <select
                      value={payeeAccountEdits.interest_type}
                      onChange={e =>
                        setPayeeAccountEdits({
                          ...payeeAccountEdits,
                          interest_type: e.target.value
                        })
                      }
                      className="w-full border rounded p-2"
                      required
                    >
                      <option value="none">None</option>
                      <option value="pif">Pay In Full (pif)</option>
                      <option value="compound">Compound</option>
                      <option value="loan">Loan</option>
                    </select>
                  </Labeled>
                  <div className="flex gap-2">
                    <button type="button" className="px-3 py-2 bg-gray-200 rounded" onClick={cancelEditPayeeAccount}>Cancel</button>
                    <button type="button" className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => saveEditPayeeAccount(pa.id)}>Save</button>
                  </div>

                  <Labeled label="Interest Rate (%)">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full border rounded p-2"
                      value={payeeAccountEdits.interest_rate ?? ""}
                      onChange={e =>
                        setPayeeAccountEdits({
                          ...payeeAccountEdits,
                          interest_rate: e.target.value === "" ? null : parseFloat(e.target.value)
                        })
                      }
                    />
                  </Labeled>
                  <Labeled label="Current Balance">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full border rounded p-2"
                      value={payeeAccountEdits.current_balance ?? ""}
                      onChange={e =>
                        setPayeeAccountEdits({
                          ...payeeAccountEdits,
                          current_balance: e.target.value === "" ? null : parseFloat(e.target.value)
                        })
                      }
                    />
                  </Labeled>
                  <Labeled label="Principal Balance">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full border rounded p-2"
                      value={payeeAccountEdits.principal_balance ?? ""}
                      onChange={e =>
                        setPayeeAccountEdits({
                          ...payeeAccountEdits,
                          principal_balance: e.target.value === "" ? null : parseFloat(e.target.value)
                        })
                      }
                    />
                  </Labeled>
                  <Labeled label="Accrued Interest">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full border rounded p-2"
                      value={payeeAccountEdits.accrued_interest ?? ""}
                      onChange={e =>
                        setPayeeAccountEdits({
                          ...payeeAccountEdits,
                          accrued_interest: e.target.value === "" ? null : parseFloat(e.target.value)
                        })
                      }
                    />
                  </Labeled>
                  <Labeled label="Due Date">
                    <input
                      type="date"
                      className="w-full border rounded p-2"
                      value={payeeAccountEdits.due_date ?? ""}
                      onChange={e => setPayeeAccountEdits({ ...payeeAccountEdits, due_date: e.target.value })}
                      required
                    />
                  </Labeled>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{pa.payee_name} - {pa.account_label}</div>
                    <div className="text-xs text-gray-500">{pa.category} | {pa.interest_type} | Due {pa.due_date}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold">{formatMoney(pa.current_balance)}</div>
                      <div className="text-xs text-gray-500">ID {pa.id}</div>
                    </div>
                    <button type="button" className="text-blue-600 hover:underline" onClick={() => startEditPayeeAccount(pa)}>Edit</button>
                    <button type="button" className="text-red-600 hover:underline" onClick={() => removePayeeAccount(pa.id)}>Delete</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* Ensure the "Add Payee Account" button and form exist */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Labeled label="Payee">
            <select
              value={payeeAccountForm.payee_id || ''}
              onChange={e => setPayeeAccountForm({ ...payeeAccountForm, payee_id: Number(e.target.value) })}
              className="w-full border rounded p-2"
              required
            >
              {payees.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Labeled>
          <Labeled label="Account Label">
            <input
              className="w-full border rounded p-2"
              value={payeeAccountForm.account_label}
              onChange={e => setPayeeAccountForm({ ...payeeAccountForm, account_label: e.target.value })}
              placeholder="e.g., Visa Card"
              required
            />
          </Labeled>
          <Labeled label="Category">
            <select
              value={payeeAccountForm.category}
              onChange={e => setPayeeAccountForm({ ...payeeAccountForm, category: e.target.value })}
              className="w-full border rounded p-2"
              required
            >
              <option value="credit card">Credit Card</option>
              <option value="loan">Loan</option>
              <option value="mortgage">Mortgage</option>
              <option value="utility">Utility</option>
            </select>
          </Labeled>
        </div>
        <button
          type="button"
          onClick={createPayeeAccount}
          className="mt-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Add Payee Account
        </button>
      </Card>

      {/* Chart toggles */}
      <div className="flex gap-4 mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={showDepositsChart}
            onChange={() => setShowDepositsChart(!showDepositsChart)}
            className="mr-2"
          />
        <span>Show Deposits by Source</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={showCashflowChart}
            onChange={() => setShowCashflowChart(!showCashflowChart)}
            className="mr-2"
          />
          <span>Show Monthly Cashflow</span>
        </label>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {showDepositsChart && (
          <Card title="Deposits by Source">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={depositsBySource}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${formatMoney(value)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {depositsBySource.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatMoney(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        {showCashflowChart && (
          <Card title="Monthly Cash Flow">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cashflowMonthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatMoney(value)} />
                <Legend />
                <Bar dataKey="deposits" fill="#82ca9d" name="Deposits" />
                <Bar dataKey="payments" fill="#8884d8" name="Payments" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </div>
  );
}

export default App;