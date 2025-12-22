// app.js (Final Version)
import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  setDoc,
  doc,
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
// Helper: safe element getter
function $id(id) {
  return document.getElementById(id);
}

// --- 1. SIGNUP LOGIC
const signupForm = $id('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = $id('signupEmail')?.value.trim();
    const password = $id('signupPassword')?.value;
    const confirmPassword = $id('signupConfirmPassword')?.value;
    const fullName = $id('signupName')?.value.trim();
    const enrollment = $id('signupEnrollment')?.value.trim();
    const semester = $id('signupSemester')?.value?.trim();
    const department = $id('signupdepartment')?.value?.trim();

    if (!email || !password || !fullName || !enrollment) {
      alert('Please fill required fields.');
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    // Basic Validation
    // 1. Format Check (Keeps your '014' logic strict)
function isValidEnrollment(enroll) {
  return (
    enroll.length === 12 &&
    enroll.slice(2, 5) === '014' && // Keeps strict college code
    /^[0-9]+$/.test(enroll)
  );
}

// 2. Uniqueness Check (Ensures it is different for every user)
async function isEnrollmentTaken(enroll) {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("enrollment", "==", enroll));
  const snap = await getDocs(q);
  return !snap.empty; // Returns true if it already exists
}

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Save user details with default role 'user'
      await setDoc(doc(db, 'users', user.uid), {
        fullName,
        email,
        enrollment,
        semester,
        department,
        role: "user", 
        createdAt: serverTimestamp()
      });
      
      alert('Signup successful! Please login.');
      // Optional: Auto-login redirect could go here, but let's send them to login view
      window.location.href = 'index.html'; 
    } catch (error) {
      alert(error.message);
    }
  });
}

// --- 2. LOGIN LOGIC (UPDATED)
const loginForm = $id('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $id('loginEmail')?.value.trim();
    const password = $id('loginPassword')?.value;
    const btn = loginForm.querySelector('button');
    
    // UI Feedback
    const originalText = btn.innerText;
    btn.innerText = "Logging in...";
    btn.disabled = true;

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      // CHECK ROLE in 'users' collection
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      let isAdmin = false;
      if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === 'admin') {
              isAdmin = true;
          }
      }
      
      // Fallback: Check if email indicates admin (optional)
      if (email.includes('admin')) isAdmin = true;

      // REDIRECT based on role
      if (isAdmin) {
        window.location.href = "admin-dashboard.html";
      } else {
        window.location.href = "dashboard.html";
      }

    } catch (error) {
      console.error(error);
      alert("Login Failed: " + error.message);
      btn.innerText = originalText;
      btn.disabled = false;
    }
  });
}

// --- 3. LOGOUT LOGIC
const logoutBtn = $id('logout-btn'); // Ensure your logout button has this ID
// Also check for links inside sidebar
const sidebarLogout = document.querySelector('a[href="index.html"]'); 

if (logoutBtn || sidebarLogout) {
    const handleLogout = async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (err) {
            console.error(err);
        }
    };

    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (sidebarLogout) sidebarLogout.addEventListener('click', handleLogout);
}

// --- 4. UI TOGGLES (Login/Signup Switch)
const showSignupBtn = $id('show-signup');
const showLoginBtn = $id('show-login');
const loginFormBlock = $id('login-form');
const signupFormBlock = $id('signup-form');
const resetBlock = $id('resetPassword');

if (showSignupBtn && loginFormBlock && signupFormBlock) {
  showSignupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginFormBlock.style.display = 'none';
    signupFormBlock.style.display = 'block';
    if (resetBlock) resetBlock.style.display = 'none';
  });
}
if (showLoginBtn && loginFormBlock && signupFormBlock) {
  showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signupFormBlock.style.display = 'none';
    loginFormBlock.style.display = 'block';
    if (resetBlock) resetBlock.style.display = 'none';
  });
}

// --- 5. PASSWORD RESET
const resetForm = $id('resetForm');
if (resetForm) {
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $id('email')?.value.trim();
    const msg = $id('message');
    if (!email) {
      if (msg) { msg.textContent = "Please enter your email."; msg.style.color = "red"; }
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      if (msg) { msg.textContent = "Reset link sent to your email."; msg.style.color = "green"; }
    } catch (error) {
      if (msg) { msg.textContent = "Error: " + error.message; msg.style.color = "red"; }
    }
  });

}

