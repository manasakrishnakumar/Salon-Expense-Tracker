// Store expenses in localStorage
let expenses = JSON.parse(localStorage.getItem('salonExpenses')) || [];

// DOM Elements
const expenseForm = document.getElementById('expenseForm');
const expensesList = document.getElementById('expensesList');
const totalExpensesEl = document.getElementById('totalExpenses');
const monthlyExpensesEl = document.getElementById('monthlyExpenses');
const totalEntriesEl = document.getElementById('totalEntries');
const logoutBtn = document.getElementById('logoutBtn');

// Redundancy authentication check
if (localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'login.html';
}

// Logout functionality
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
});

// Set today's date as default
document.getElementById('date').valueAsDate = new Date();

// Initialize
renderExpenses();
updateSummary();

// Form submission
expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const expense = {
        id: Date.now(),
        name: document.getElementById('expenseName').value,
        category: document.getElementById('category').value,
        amount: parseFloat(document.getElementById('amount').value),
        date: document.getElementById('date').value
    };

    expenses.unshift(expense);
    saveExpenses();
    renderExpenses();
    updateSummary();
    expenseForm.reset();
    document.getElementById('date').valueAsDate = new Date();
});

// Save to localStorage
function saveExpenses() {
    localStorage.setItem('salonExpenses', JSON.stringify(expenses));
}

// Render expenses list
function renderExpenses() {
    if (expenses.length === 0) {
        expensesList.innerHTML = '<p class="empty-state">No expenses added yet. Add your first expense above!</p>';
        return;
    }

    expensesList.innerHTML = expenses.map(expense => `
        <div class="expense-item">
            <div class="expense-info">
                <div class="expense-name">${expense.name}</div>
                <div class="expense-meta">
                    <span class="expense-category">${expense.category}</span>
                    <span>${formatDate(expense.date)}</span>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span class="expense-amount">₹${expense.amount.toFixed(2)}</span>
                <button class="btn btn-delete" onclick="deleteExpense(${expense.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// Update summary statistics
function updateSummary() {
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyTotal = expenses
        .filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

    totalExpensesEl.textContent = `₹${total.toFixed(2)}`;
    monthlyExpensesEl.textContent = `₹${monthlyTotal.toFixed(2)}`;
    totalEntriesEl.textContent = expenses.length;
}

// Delete expense
function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        expenses = expenses.filter(exp => exp.id !== id);
        saveExpenses();
        renderExpenses();
        updateSummary();
    }
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}
