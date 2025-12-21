// admin-dashboard.js (Final: Merged bookTransactions & borrowedBooks)
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

/* ------------- Safe DOM helpers ------------- */
const $ = (id) => document.getElementById(id);
const safeText = (id, text) => { 
    const el = $(id); 
    if (el) el.textContent = text; 
};

/* ------------- State Management ------------- */
let currentTab = 'today'; 
let gateLogs = [];        // Gate Entry/Exit
let bookLogs = [];        // Merged Book Transactions
let userCache = {};       // Cache for user profiles to minimize reads

/* ------------- Initialization ------------- */
console.log('Admin Dashboard loaded.');
const dateDisplay = $('currentDateDisplay');
if(dateDisplay) {
    dateDisplay.textContent = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
}

/* ------------- Utility: User Data Fetching ------------- */
// Fetches user details if we only have a userId (common in borrowedBooks)
async function resolveUser(uid) {
    if (!uid) return { name: 'Unknown', enrollment: '—' };
    if (userCache[uid]) return userCache[uid]; // Return cached

    try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
            const d = snap.data();
            const data = { 
                name: d.fullName || d.name || 'Unknown', 
                enrollment: d.enrollment || '—',
                sem: d.sem || '-',
                branch: d.branch || d.department || '-'
            };
            userCache[uid] = data;
            return data;
        }
    } catch (e) { console.error(e); }
    return { name: 'Unknown', enrollment: '—' };
}

/* ------------- UI Render Helpers ------------- */
function renderUsers(users) {
  const container = $('adminUsersList');
  if (!container) return; 
  container.innerHTML = users.map(u => `
    <div class="user-row flex justify-between items-center p-2 hover:bg-gray-50 border-b" data-uid="${u.id}">
      <div>
        <strong>${u.fullName || '—'}</strong> 
        <span class="text-xs text-gray-500">(${u.enrollment || ''})</span>
      </div>
      <button class="show-qr text-blue-600 text-xs border border-blue-600 px-2 py-1 rounded hover:bg-blue-600 hover:text-white transition" data-uid="${u.id}">QR</button>
    </div>
  `).join('');
  
  container.querySelectorAll('.show-qr').forEach(btn => {
    btn.addEventListener('click', () => openQrModal(btn.dataset.uid));
  });
}

function renderBorrowed(borrowedDocs) {
  const container = $('borrowedListContainer');
  if (!container) return;
  container.innerHTML = borrowedDocs.map(d => {
    const mm = d.data;
    // Handle multiple date formats
    const rawDue = mm.dueDate || mm.dueAt;
    let due = 'N/A';
    if(rawDue && rawDue.toDate) due = rawDue.toDate().toLocaleDateString();
    
    return `
      <div class="borrow-row p-2 border-b text-sm">
        <div class="font-medium text-gray-800">${mm.title || mm.bookTitle || 'Book'}</div>
        <div class="text-xs text-gray-500">User: ${mm.userId || 'Unknown'} • Due: <span class="text-red-500">${due}</span></div>
      </div>`;
  }).join('');
}

/* ------------- CORE LOGIC: Logs Table ------------- */
async function renderLogsTable() {
    const tbody = $('logsTableBody');
    if(!tbody) return;

    let filteredData = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    // Date Helper
    const getDate = (item) => {
        // Support all your DB formats: issueDate, issuedAt, returnDate, timestamp
        const t = item.issueDate || item.issuedAt || item.timestamp || item.returnDate;
        return (t && t.toDate) ? t.toDate() : new Date();
    };

    if (currentTab === 'today') {
        filteredData = gateLogs.filter(log => getDate(log) >= today);
        toggleTransactionColumn(false);
    } 
    else if (currentTab === 'history') {
        filteredData = gateLogs.filter(log => getDate(log) < today);
        toggleTransactionColumn(false);
    } 
    else if (currentTab === 'books') {
        filteredData = bookLogs; // Contains merged data from both collections
        toggleTransactionColumn(true);
    }

    if (filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-8 text-center text-gray-400 italic">No records found.</td></tr>`;
        return;
    }

    // Render Rows
    // Note: We use async/await inside map, so we need Promise.all to resolve user lookups
    const rows = await Promise.all(filteredData.map(async (log) => {
        const dateObj = getDate(log);
        const dateStr = dateObj.toLocaleDateString();
        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // --- RESOLVE USER DATA ---
        let enrollment = log.enrollment || '—';
        let name = log.userName || log.name || 'Unknown';
        let sem = log.sem || '-';
        let branch = log.branch || log.userDepartment || log.department || '-';

        // If we have a userId but no name (common in borrowedBooks), fetch it!
        if (log.userId && name === 'Unknown') {
            const u = await resolveUser(log.userId);
            name = u.name;
            enrollment = u.enrollment;
            if(u.branch !== '-') branch = u.branch;
        }

        let timeIn = '-';
        let timeOut = '-';
        let transactionBadge = '';

        if (currentTab === 'books') {
            // --- BOOK LOGIC ---
            // Determine type from various fields
            const rawType = log.transactionType || (log.returned ? 'returned' : 'borrow');
            const type = rawType.toLowerCase();
            const isBorrow = type.includes('borrow') || type.includes('issue');
            
            // Badge
            const color = isBorrow ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800';
            transactionBadge = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${color}">${type.toUpperCase()}</span>`;

            // Time Columns
            if (isBorrow) {
                timeIn = timeStr;
            } else {
                // If it's a return, try to find the specific return time
                const retTime = log.returnDate || log.returnedAt;
                timeOut = (retTime && retTime.toDate) ? retTime.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : timeStr;
                // Optional: Show issue time in TimeIn if available
                const issueTime = log.issueDate || log.issuedAt;
                if(issueTime && issueTime.toDate) timeIn = issueTime.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
            }
            
            // Book Name override
            const bookTitle = log.title || log.bookName;
            if(bookTitle) name += ` <br><span class="text-xs text-blue-600 italic">${bookTitle}</span>`;

        } else {
            // --- GATE LOGIC ---
            const type = (log.type || '').toLowerCase();
            if (type === 'entry' || log.timeIn) timeIn = log.timeIn || timeStr;
            if (type === 'exit' || log.timeOut) timeOut = log.timeOut || timeStr;
        }

        return `
            <tr class="hover:bg-gray-50 transition-colors border-b border-gray-100">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${enrollment}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${sem}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${branch}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${dateStr}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">${timeIn}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">${timeOut}</td>
                ${currentTab === 'books' ? `<td class="px-6 py-4 whitespace-nowrap text-sm">${transactionBadge}</td>` : ''}
            </tr>
        `;
    }));

    tbody.innerHTML = rows.join('');
}

function toggleTransactionColumn(show) {
    const col = $('colTransaction');
    if(col) show ? col.classList.remove('hidden') : col.classList.add('hidden');
}

/* ------------- Tab Switching ------------- */
const tabToday = $('tabToday');
const tabHistory = $('tabHistory');
const tabBooks = $('tabBooks');

function setActiveTab(selectedBtn, mode) {
    [tabToday, tabHistory, tabBooks].forEach(btn => {
        if(btn) {
            btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
            btn.classList.add('text-gray-500', 'hover:text-gray-700');
        }
    });

    if(selectedBtn) {
        selectedBtn.classList.remove('text-gray-500', 'hover:text-gray-700');
        selectedBtn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
    }
    currentTab = mode;
    renderLogsTable();
}

if(tabToday) tabToday.addEventListener('click', () => setActiveTab(tabToday, 'today'));
if(tabHistory) tabHistory.addEventListener('click', () => setActiveTab(tabHistory, 'history'));
if(tabBooks) tabBooks.addEventListener('click', () => setActiveTab(tabBooks, 'books'));

/* ------------- Real-time Listeners ------------- */
let unsubscribes = [];

function startRealtimeListeners() {
  unsubscribes.forEach(u => u());
  unsubscribes = [];

  // 1. Borrowed Books & Overdue
  const borrowedRef = collection(db, 'borrowedBooks');
  unsubscribes.push(onSnapshot(borrowedRef, (snap) => {
    let total = 0, overdue = 0;
    const now = Date.now();
    const borrowedForList = [];
    const borrowedForHistory = []; // We will also add these to book logs!

    snap.forEach(s => {
      const data = s.data();
      
      // Metric Logic
      if (!data.returned) { // Only count active borrows
          total++;
          let dueVal = null;
          const dVal = data.dueDate || data.dueAt;
          if (dVal) dueVal = (dVal.toDate) ? dVal.toDate().getTime() : new Date(dVal).getTime();
          if (dueVal && dueVal < now) overdue++;
          borrowedForList.push({ id: s.id, data });
      }

      // History Logic: Add ALL items (active or returned) to the main log
      borrowedForHistory.push({ id: s.id, ...data, source: 'borrowedBooks' });
    });

    safeText('totalBorrowedCount', String(total));
    safeText('overdueCount', String(overdue));
    renderBorrowed(borrowedForList);

    // Merge into bookLogs
    mergeBookLogs(borrowedForHistory, 'borrowedBooks');
  }));

  // 2. Book Transactions (Original History)
  const bookTransRef = collection(db, 'bookTransactions');
  const bookTransQuery = query(bookTransRef, orderBy('issueDate', 'desc'), limit(100));
  
  unsubscribes.push(onSnapshot(bookTransQuery, (snap) => {
      const logs = [];
      snap.forEach(d => logs.push({ id: d.id, ...d.data(), source: 'bookTransactions' }));
      mergeBookLogs(logs, 'bookTransactions');
  }, (err) => {
      console.warn("Indexing error on bookTransactions, fetching unordered.");
      onSnapshot(query(bookTransRef, limit(100)), (s) => {
          const logs = [];
          s.forEach(d => logs.push({ id: d.id, ...d.data(), source: 'bookTransactions' }));
          mergeBookLogs(logs, 'bookTransactions');
      });
  }));

  // 3. Activity Logs (Gate)
  const logsRef = collection(db, 'activityLogs');
  unsubscribes.push(onSnapshot(query(logsRef, orderBy('timestamp', 'desc'), limit(200)), (snap) => {
    gateLogs = [];
    snap.forEach(doc => gateLogs.push({ id: doc.id, ...doc.data() }));
    if(currentTab === 'today' || currentTab === 'history') renderLogsTable();
  }));
}

// Helper to merge data from multiple collections without duplicates
let rawBookData = { borrowedBooks: [], bookTransactions: [] };

function mergeBookLogs(newData, source) {
    rawBookData[source] = newData;
    // Combine arrays
    bookLogs = [...rawBookData.bookTransactions, ...rawBookData.borrowedBooks];
    
    // Sort by date (newest first)
    bookLogs.sort((a, b) => {
        const dateA = a.issueDate || a.issuedAt || a.timestamp || 0;
        const dateB = b.issueDate || b.issuedAt || b.timestamp || 0;
        return (dateB.toDate ? dateB.toDate() : dateB) - (dateA.toDate ? dateA.toDate() : dateA);
    });

    if(currentTab === 'books') renderLogsTable();
}

/* ------------- Auth ------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  startRealtimeListeners();
});

const logoutBtn = $('logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));