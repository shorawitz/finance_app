// frontend/src/api.js

const BASE_URL =
  process.env.REACT_APP_API_URL?.replace(/\/+$/, '') || 'http://localhost:8000';

async function fetchJSON(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const opts = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };
  if (opts.body && typeof opts.body !== 'string') {
    opts.body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, opts);
  const isJSON = res.headers.get('content-type')?.includes('application/json');
  const data = isJSON ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const msg =
      (data && (data.detail || data.message)) ||
      `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data;
}

// -------- Accounts --------
export async function getAccounts() {
  return fetchJSON('/accounts');
}
export async function createAccount(payload) {
  return fetchJSON('/accounts', { method: 'POST', body: payload });
}
export async function updateAccount(id, payload) {
  return fetchJSON(`/accounts/${id}`, { method: 'PUT', body: payload });
}
export async function deleteAccount(id) {
  return fetchJSON(`/accounts/${id}`, { method: 'DELETE' });
}

// -------- Deposits --------
export async function getDeposits() {
  return fetchJSON('/deposits');
}
export async function createDeposit(payload) {
  return fetchJSON('/deposits', { method: 'POST', body: payload });
}
export async function updateDeposit(id, payload) {
  return fetchJSON(`/deposits/${id}`, { method: 'PUT', body: payload });
}
export async function deleteDeposit(id) {
  return fetchJSON(`/deposits/${id}`, { method: 'DELETE' });
}

// -------- Payments --------
export async function getPayments() {
  return fetchJSON('/payments');
}
export async function createPayment(payload) {
  return fetchJSON('/payments', { method: 'POST', body: payload });
}
export async function updatePayment(id, payload) {
  return fetchJSON(`/payments/${id}`, { method: 'PUT', body: payload });
}
export async function deletePayment(id) {
  return fetchJSON(`/payments/${id}`, { method: 'DELETE' });
}

// -------- Transfers --------
export async function getTransfers() {
  return fetchJSON('/transfers');
}
export async function createTransfer(payload) {
  return fetchJSON('/transfers', { method: 'POST', body: payload });
}
// (No update/delete for transfers in the UI right now)

// -------- Payees --------
export async function getPayees() {
  return fetchJSON('/payees');
}
export async function createPayee(payload) {
  return fetchJSON('/payees', { method: 'POST', body: payload });
}
export async function updatePayee(id, payload) {
  return fetchJSON(`/payees/${id}`, { method: 'PUT', body: payload });
}
export async function deletePayee(id) {
  return fetchJSON(`/payees/${id}`, { method: 'DELETE' });
}

// -------- Payee Accounts --------
export async function getPayeeAccounts() {
  return fetchJSON('/payee-accounts');
}
export async function createPayeeAccount(payload) {
  return fetchJSON('/payee-accounts', { method: 'POST', body: payload });
}
export async function updatePayeeAccount(id, payload) {
  return fetchJSON(`/payee-accounts/${id}`, { method: 'PUT', body: payload });
}
export async function deletePayeeAccount(id) {
  return fetchJSON(`/payee-accounts/${id}`, { method: 'DELETE' });
}

// -------- Reports --------
export async function getDepositsBySource() {
  return fetchJSON('/reports/deposits-by-source');
}
export async function getCashflowMonthly() {
  return fetchJSON('/reports/cashflow-monthly');
}

// Optional grouped export if you were importing { api } somewhere
export const api = {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,

  getDeposits,
  createDeposit,
  updateDeposit,
  deleteDeposit,

  getPayments,
  createPayment,
  updatePayment,
  deletePayment,

  getTransfers,
  createTransfer,

  getPayees,
  createPayee,
  updatePayee,
  deletePayee,

  getPayeeAccounts,
  createPayeeAccount,
  updatePayeeAccount,
  deletePayeeAccount,

  getDepositsBySource,
  getCashflowMonthly,
};

export default api;