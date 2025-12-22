// --- Replace the top of dashboard.js with this ---
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js"

// Elements
const qrScannerBtn = document.getElementById('qrScannerBtn');
const qrModal = document.getElementById('qrModal');
const qrModalOverlay = document.getElementById('qrModalOverlay');
const closeQrModal = document.getElementById('closeQrModal');
const qrCodeContainer = document.getElementById('userQrCode');

// Utility: Fetch user data from Firestore (v9 syntax)
async function fetchUserData(uid) {
    if (!uid) return null;
    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        return userSnap.exists() ? userSnap.data() : null;
    } catch (error) {
        console.error("Error fetching user:", error);
        return null;
    }
}

async function displayUserName(uid) {
    const userData = await fetchUserData(uid);
    const welcomeSpan = document.getElementById('welcomeUserName');
    if (userData && userData.fullname && welcomeSpan) {
        welcomeSpan.textContent = " " + userData.fullname;
    } else if (welcomeSpan) {
        welcomeSpan.textContent = "";
    }
}

// Utility: Open modal and generate QR code
async function openQrModal(uid) {
    if (!uid) return;
    const userData = await fetchUserData(uid);
    if (!userData) {
        alert("Failed to load user data for QR code.");
        return;
    }
    qrCodeContainer.innerHTML = ""; // clear old QR
    // Generate QR with JSON data
    new QRCode(qrCodeContainer, {
        text: JSON.stringify(userData),
        width: 180,
        height: 180
    });
    qrModal.classList.remove('hidden');
}

// Always set up close listeners once!
closeQrModal.addEventListener('click', () => qrModal.classList.add('hidden'));
qrModalOverlay.addEventListener('click', () => qrModal.classList.add('hidden'));

// Central auth state handling
let currentUser = null;
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Step 1: User is logged in. Get their ID.
        const uid = user.uid;

        // Step 2: THE DISTINCTION
        // Check if this ID exists in the 'admins' database collection
        const adminSnap = await getDoc(doc(db, 'admins', uid));

        if (adminSnap.exists()) {
            // ✅ SUCCESS: User is an Admin. Let them stay.
            console.log("Welcome Admin");
        } else {
            // ❌ FAIL: User is logged in, BUT not an Admin.
            // Kick them out immediately.
            alert("You are not an admin!");
            window.location.href = "index.html";
        }
    } else {
        // User not logged in at all
        window.location.href = "index.html";
    }
});
    console.log("Logged in UID:", user.uid);

    // Borrowed books listener (update stats panel)
    const borrowedRef = query(
        collection(db, "borrowedBooks"),
        where("userId", "==", user.uid)
    );
    onSnapshot(borrowedRef, (snapshot) => {
        let borrowedCount = 0;
        let dueSoonCount = 0;
        let overdueCount = 0;
        const today = new Date();
        const dueSoonThreshold = new Date();
        dueSoonThreshold.setDate(today.getDate() + 3);

        snapshot.forEach(docSnap => {
            borrowedCount++;
            const data = docSnap.data();
            if (data.dueDate) {
                const dueDate = new Date(data.dueDate);
                if (dueDate < today) overdueCount++;
                else if (dueDate <= dueSoonThreshold) dueSoonCount++;
            }
        });

        document.getElementById("booksBorrowedCount").textContent = borrowedCount;
        document.getElementById("booksDueSoonCount").textContent = dueSoonCount;
        document.getElementById("overdueBooksCount").textContent = overdueCount;
    });
    displayUserName(user.uid);
});

// QR button event listener—outside auth observer, to avoid duplicate events
qrScannerBtn.addEventListener('click', () => {
    if (!currentUser) {
        window.location.href = "index.html";
        return;
    }
    openQrModal(currentUser.uid);
});

// Display user's name in header





