// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA2-ZSnxGhMSbpxR9lWipQ-JX4s8Fz3j8Q",
  authDomain: "librarymanagement-80741.firebaseapp.com",
  projectId: "librarymanagement-80741",
  storageBucket: "librarymanagement-80741.firebasestorage.app",
  messagingSenderId: "7076696675",
  appId: "1:7076696675:web:ff0f1965ca544627ab1e56"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
  const barcodeModal = document.getElementById("barcodeModal");
  const overlay = document.getElementById("barcodeModalOverlay");
  const closeBtn = document.getElementById("closeBarcodeModal");
  const scannerContainer = document.getElementById("scannerContainer");

  // --- UI Setup ---
  let actionPanel = document.getElementById("scannerActionPanel");
  if (!actionPanel) {
    actionPanel = document.createElement("div");
    actionPanel.id = "scannerActionPanel";
    actionPanel.className = "mt-4 text-center";
    actionPanel.style.display = "none";
    // Append to the modal content
    scannerContainer.parentElement.parentElement.appendChild(actionPanel);
  }

  actionPanel.innerHTML = `
    <div id="scanInfo" class="mb-4 text-left bg-gray-50 p-3 rounded text-sm text-gray-700"></div>
    <div class="flex flex-col gap-2">
        <button id="confirmActionBtn" class="bg-primary hover:bg-primary-600 text-white py-3 rounded-lg shadow w-full font-bold hidden">Confirm</button>
        <button id="scanAnotherBtn" class="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded shadow transition-colors w-full hidden">Scan Another</button>
        <button id="cancelActionBtn" class="text-gray-500 text-sm mt-2 hover:underline">Cancel</button>
    </div>
  `;

  const infoDiv = document.getElementById("scanInfo");
  const confirmBtn = document.getElementById("confirmActionBtn");
  const scanAnotherBtn = document.getElementById("scanAnotherBtn");
  const cancelActionBtn = document.getElementById("cancelActionBtn");

  let html5QrCode = null;
  let isScannerRunning = false;
  let currentUser = null;
  let isAdmin = false;

  // --- Auth Check ---
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
                isAdmin = true;
            } else if (user.email && user.email.includes('admin')) {
                isAdmin = true;
            }
        } catch(e) { console.warn("Scanner Role check failed", e); }
    }
  });

  // --- Scanner Functions ---
  async function openBarcodeScanner() {
    if (!currentUser) return;
    barcodeModal.classList.remove("hidden");
    actionPanel.style.display = "none";
    
    if (html5QrCode) { try { await html5QrCode.clear(); } catch(e){} }
    html5QrCode = new Html5Qrcode("scannerContainer");
    
    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        console.log("✅ Scanned:", decodedText); 
        await stopBarcodeScanner(false); 
        await handleScannedBook(decodedText);
      },
      () => {}
    ).then(() => { isScannerRunning = true; })
     .catch(err => { console.error(err); alert("Camera error."); });
  }

  async function stopBarcodeScanner(closeModal = true) {
    if (html5QrCode) {
      try { await html5QrCode.stop(); html5QrCode.clear(); } catch (err) {}
      isScannerRunning = false;
    }
    if (closeModal) {
      barcodeModal.classList.add("hidden");
      actionPanel.style.display = "none";
    }
  }

  // --- Logic Handler ---
  async function handleScannedBook(barcode) {
    try {
      infoDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking database...';
      actionPanel.style.display = "block";
      confirmBtn.style.display = "none";
      scanAnotherBtn.style.display = "none";

      const bookRef = doc(db, "books", barcode);
      const bookSnap = await getDoc(bookRef);
      const bookExists = bookSnap.exists();

      // 1. Admin Add Book
      if (isAdmin && !bookExists) {
        barcodeModal.classList.add("hidden");
        if (window.openAddBookModalWithISBN) window.openAddBookModalWithISBN(barcode);
        else alert("Add Book UI missing.");
        return;
      }

      // 2. Book Not Found
      if (!bookExists) {
        infoDiv.innerHTML = `<p class="text-red-500 font-bold">❌ Book not found.</p><p class="text-xs">ISBN: ${barcode}</p>`;
        scanAnotherBtn.style.display = "block";
        return;
      }

      const bookData = bookSnap.data();
      const borrowRef = doc(db, "borrowedBooks", `${currentUser.uid}_${barcode}`);
      
      // 3. Check Borrow Status (Safe Check)
      let borrowSnap;
      try {
          borrowSnap = await getDoc(borrowRef);
      } catch (err) {
          // Permission denied means doc doesn't exist for this user -> Not borrowed
          console.log("Status check permission caught:", err.code);
          borrowSnap = { exists: () => false };
      }
      
      const isReturn = borrowSnap.exists() && (borrowSnap.data()?.returned === false);
      const actionType = isReturn ? "return" : "issue";

      // 4. Stock Check
      if (actionType === "issue" && (bookData.available <= 0)) {
        infoDiv.innerHTML = `
            <p class="font-bold text-red-600">Out of Stock</p>
            <p>${bookData.title}</p>
            <p class="text-xs text-gray-500">Available: 0 / ${bookData.quantity}</p>
        `;
        scanAnotherBtn.style.display = "block";
        return;
      }

      // 5. Show Action UI
      infoDiv.innerHTML = `
        <p><strong>📖</strong> ${bookData.title}</p>
        <p class="text-xs text-gray-500">ISBN: ${barcode}</p>
        <div class="mt-2 p-3 rounded ${isReturn ? 'bg-orange-100' : 'bg-green-100'}">
            <p class="font-bold ${isReturn ? 'text-orange-700' : 'text-green-700'} text-lg text-center">
                ${isReturn ? 'Return Book' : 'Borrow Book'}
            </p>
        </div>
      `;
      
      confirmBtn.textContent = isReturn ? "Confirm Return" : "Confirm Borrow";
      confirmBtn.className = isReturn 
        ? "bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg shadow w-full font-bold mt-2 block"
        : "bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg shadow w-full font-bold mt-2 block";
      
      confirmBtn.style.display = "block";
      
      // 6. Transaction
      confirmBtn.onclick = async () => {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
          await runTransaction(db, async (transaction) => {
            const freshBookSnap = await transaction.get(bookRef);
            if (!freshBookSnap.exists()) throw "Book missing!";
            
            const freshBookData = freshBookSnap.data();
            const currentAvailable = parseInt(freshBookData.available) || 0;
            const totalQuantity = parseInt(freshBookData.quantity) || 0;

            if (actionType === "issue") {
               if (currentAvailable <= 0) throw "Book went out of stock!";
               transaction.update(bookRef, { available: currentAvailable - 1 });
               transaction.set(borrowRef, {
                 userId: currentUser.uid,
                 bookId: barcode,
                 issuedAt: new Date(),
                 returned: false,
                 title: freshBookData.title,
                 author: freshBookData.author,
                 department: freshBookData.department || 'General'
               });
            } else {
               const newAvailable = Math.min(currentAvailable + 1, totalQuantity);
               transaction.update(bookRef, { available: newAvailable });
               // Note: Rules must allow 'returnedAt' key update!
               transaction.update(borrowRef, { returned: true, returnedAt: new Date() });
            }
          });

          infoDiv.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-check-circle text-5xl text-green-500 mb-2"></i>
                <p class="font-bold text-gray-800 text-xl">Success!</p>
                <p class="text-gray-600">Book ${isReturn ? 'returned' : 'borrowed'} successfully.</p>
            </div>
          `;
          confirmBtn.style.display = "none";
          scanAnotherBtn.style.display = "block";

        } catch (e) {
            console.error(e);
            alert("Action Failed: " + e.message || e);
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Retry";
        }
      };

    } catch (err) {
      console.error("Logic Error:", err);
      infoDiv.innerHTML = `<p class="text-red-500">System Error: ${err.message}</p>`;
      scanAnotherBtn.style.display = "block";
    }
  }

  // --- Listeners ---
  scanAnotherBtn.addEventListener("click", () => {
    actionPanel.style.display = "none";
    openBarcodeScanner();
  });
  cancelActionBtn.addEventListener("click", () => {
    actionPanel.style.display = "none";
    barcodeModal.classList.add("hidden");
  });
  overlay.addEventListener("click", () => stopBarcodeScanner(true));
  closeBtn.addEventListener("click", () => stopBarcodeScanner(true));
  document.getElementById("openScannerBtn")?.addEventListener("click", openBarcodeScanner);
});