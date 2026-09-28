import { firebaseConfig } from './firebase-config.js';

const VERSION = '12.19.0';
const EMAIL_LINK_KEY = 'pythonLabEmailForSignIn';
const account = {
  configured: Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain &&
    firebaseConfig.projectId && firebaseConfig.appId),
  ready: false,
  emailLinkPending: false
};
window.pythonLabAccount = account;

function institutionalEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@glm\.edu\.co$/i.test(email);
}

function announce(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

if (!account.configured) {
  announce('pythonlab-ready');
} else {
  initializeAccounts().catch((error) => {
    account.ready = false;
    announce('pythonlab-error', error.message || String(error));
  });
}

async function initializeAccounts() {
  const [appApi, authApi, storeApi] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-firestore.js`)
  ]);

  const app = appApi.initializeApp(firebaseConfig);
  const auth = authApi.getAuth(app);
  const db = storeApi.getFirestore(app);
  const provider = new authApi.GoogleAuthProvider();
  provider.setCustomParameters({ hd: 'glm.edu.co', prompt: 'select_account' });

  account.emailLinkPending = authApi.isSignInWithEmailLink(auth, window.location.href);

  account.sendEmailLink = async (email) => {
    const schoolEmail = String(email || '').trim().toLowerCase();
    if (!institutionalEmail(schoolEmail)) {
      throw new Error('Enter your @glm.edu.co email address.');
    }
    await authApi.sendSignInLinkToEmail(auth, schoolEmail, {
      url: window.location.origin + window.location.pathname,
      handleCodeInApp: true
    });
    localStorage.setItem(EMAIL_LINK_KEY, schoolEmail);
  };

  account.completeEmailLink = async (email) => {
    if (!account.emailLinkPending) throw new Error('Open the sign-in link sent to your email first.');
    const schoolEmail = String(email || '').trim().toLowerCase();
    if (!institutionalEmail(schoolEmail)) {
      throw new Error('Enter the @glm.edu.co email address that received the link.');
    }
    const result = await authApi.signInWithEmailLink(auth, schoolEmail, window.location.href);
    if (!result.user.emailVerified || !institutionalEmail(result.user.email)) {
      await authApi.signOut(auth);
      throw new Error('This email address is not a verified GLM account.');
    }
    localStorage.removeItem(EMAIL_LINK_KEY);
    window.history.replaceState({}, document.title, window.location.pathname);
    account.emailLinkPending = false;
    announce('pythonlab-ready');
  };

  function signedInUser() {
    const user = auth.currentUser;
    if (!user || !user.emailVerified || !institutionalEmail(user.email)) {
      throw new Error('Sign in with your verified @glm.edu.co school email.');
    }
    return user;
  }

  account.signIn = async () => {
    const result = await authApi.signInWithPopup(auth, provider);
    if (!result.user.emailVerified || !institutionalEmail(result.user.email)) {
      await authApi.signOut(auth);
      throw new Error('This account is not a verified @glm.edu.co account.');
    }
  };

  account.signOut = () => authApi.signOut(auth);

  account.save = async (payload) => {
    const user = signedInUser();
    if (payload.exerciseId.length > 40 || !/^[A-Z0-9-]+$/.test(payload.exerciseId) ||
        payload.code.length > 50000 || payload.output.length > 20000 ||
        payload.reflection.length > 1500 || payload.feedback.length > 1000) {
      throw new Error('This submission exceeds the storage limit. Download your .py file and shorten the output.');
    }
    const reference = storeApi.doc(db, 'students', user.uid, 'progress', payload.exerciseId);
    const attemptNumber = await storeApi.runTransaction(db, async (transaction) => {
      const previous = await transaction.get(reference);
      const next = (previous.exists() ? previous.data().attemptNumber || 0 : 0) + 1;
      transaction.set(reference, {
        ...payload,
        studentEmail: user.email,
        attemptNumber: next,
        updatedAt: storeApi.serverTimestamp()
      });
      return next;
    });
    return { attemptNumber, savedAt: new Date().toLocaleString() };
  };

  account.load = async () => {
    const user = signedInUser();
    const progress = await storeApi.getDocs(storeApi.collection(db, 'students', user.uid, 'progress'));
    return progress.docs.map((snapshot) => {
      const item = snapshot.data();
      return {
        ...item,
        savedAt: item.updatedAt && item.updatedAt.toDate
          ? item.updatedAt.toDate().toLocaleString() : ''
      };
    });
  };

  authApi.onAuthStateChanged(auth, async (user) => {
    if (user && (!user.emailVerified || !institutionalEmail(user.email))) {
      await authApi.signOut(auth);
      return;
    }
    announce('pythonlab-auth', user ? {
      uid: user.uid,
      email: user.email.toLowerCase(),
      name: user.displayName || ''
    } : null);
  }, (error) => announce('pythonlab-error', error.message || String(error)));

  account.ready = true;
  announce('pythonlab-ready');
  if (account.emailLinkPending) {
    const savedEmail = localStorage.getItem(EMAIL_LINK_KEY);
    if (savedEmail) {
      try {
        await account.completeEmailLink(savedEmail);
      } catch (error) {
        announce('pythonlab-error', 'Could not finish email sign-in: ' + (error.message || String(error)));
      }
    } else {
      announce('pythonlab-email-link-pending');
    }
  }
}
