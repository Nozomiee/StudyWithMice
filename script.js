import firebaseConfig from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import Filter from 'https://cdn.skypack.dev/bad-words@3.0.4';

// ✅ Initialize Firebase globally
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Make Firebase use the device/browser language
auth.useDeviceLanguage();

// ✅ Configure Google provider
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: "select_account",        // always show account chooser
  redirect_uri: window.location.origin // ensure GitHub Pages origin is used
});

// ✅ DOM Elements
const reviewInput = document.getElementById("reviewInput");
const charCount = document.getElementById("charCount");
const reviewList = document.getElementById("reviewList");
const submitBtn = document.getElementById("submitReview");
const googleSignInBtn = document.getElementById('googleSignInBtn');
const signOutBtn = document.getElementById('signOutBtn');

// ✅ Profanity Filter
const filter = new Filter();

// Character Counter
reviewInput.addEventListener("input", () => {
  charCount.textContent = `${reviewInput.value.length} / 200`;
});

// Submit Review
submitBtn.addEventListener("click", () => {
  const reviewText = reviewInput.value.trim();
  const recaptchaResponse = grecaptcha.getResponse();

  if (!reviewText) {
    alert("Please leave your thoughts here. (˶ˆᗜˆ˵)🌱");
    return;
  }
  if (reviewText.length > 200) {
    alert("Sorry! You cannot exceed the 200 character limit.");
    return;
  }
  if (!recaptchaResponse) {
    alert("Please verify you are human.");
    return;
  }
  if (filter.isProfane(reviewText)) {
    alert("Hold up! That review’s got words we don’t allow here. Be kind.");
    return;
  }

  push(ref(db, 'reviews'), {
    text: reviewText,
    timestamp: Date.now(),
    user: auth.currentUser ? auth.currentUser.displayName : "Anonymous"
  });

  reviewInput.value = "";
  charCount.textContent = "0 / 200";
  grecaptcha.reset();
});

// Display Reviews
onValue(ref(db, 'reviews'), (snapshot) => {
  const data = snapshot.val();
  reviewList.innerHTML = "";
  if (!data) return;

  const sorted = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
  sorted.forEach((r) => {
    const bubble = document.createElement("div");
    bubble.className = "review-bubble";
    bubble.textContent = `${r.user}: ${r.text}`;
    reviewList.appendChild(bubble);
  });
});

// ✅ Google Sign-In (Popup → Redirect fallback)
googleSignInBtn.addEventListener('click', async () => {
  try {
    console.log("Origin:", window.location.origin);
    const result = await signInWithPopup(auth, provider);

    console.log("Full sign-in result:", result);
    if (result.user) {
      alert(`Welcome ${result.user.displayName || "User"}!`);
    }
  } catch (error) {
    console.error("Google Sign-In error details:", {
      code: error.code,
      message: error.message,
      customData: error.customData
    });

    // If popup blocked or invalid redirect, fallback to redirect method
    if (error.code === "auth/popup-blocked" || error.code === "auth/popup-closed-by-user") {
      console.log("Falling back to redirect sign-in...");
      await signInWithRedirect(auth, provider);
    } else {
      alert(`Error: ${error.message} (Code: ${error.code})`);
    }
  }
});

// ✅ Handle redirect results (if fallback was used)
getRedirectResult(auth)
  .then((result) => {
    if (result && result.user) {
      console.log("Redirect sign-in result:", result);
      alert(`Welcome ${result.user.displayName || "User"}!`);
    }
  })
  .catch((error) => {
    if (error) {
      console.error("Redirect sign-in error:", error);
    }
  });

// ✅ Google Sign-Out
signOutBtn.addEventListener('click', () => {
  signOut(auth);
});

// ✅ Update UI on Auth State Change
onAuthStateChanged(auth, user => {
  if (user) {
    googleSignInBtn.style.display = 'none';
    signOutBtn.style.display = 'inline-block';
  } else {
    googleSignInBtn.style.display = 'inline-block';
    signOutBtn.style.display = 'none';
  }
});

