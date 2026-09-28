# GLM Python Lab · Sandbox

A GitHub Pages version of the supplied Python Sandbox. It preserves the browser Python workspace, the Brython and Pyodide engines, GUI and plot previews, and the 50 learning path exercises. Students can run code without signing in. Once configured, they can use their verified `@glm.edu.co` Google account to save or reload each exercise from Cloud Firestore.

## What is stored

The student clicks **Save Draft** or **Evaluate & Save**. The latest record for each exercise is stored at `students/{firebaseUid}/progress/{exerciseId}` with code, output, status, feedback, reflection, score, attempt count, and save time. A student can read and update only their own progress. The browser also keeps unsent editor drafts under keys specific to that signed-in account and exercise; use **Save Draft** to make a draft available on another device.

The automatic exercise checks run in the student's browser and are formative feedback. Scores and statuses are client-generated; they are **not authenticated assessment results**. Review code and reasoning before assigning a grade.

## Enable student accounts

1. Create a Firebase project owned by the school or an approved institutional administrator. Decide the school's retention and data policy before uploading student work.
2. In **Authentication → Sign-in method**, enable the **Google** provider. In **Authentication → Settings → Authorized domains**, add the Pages host `karbian.github.io` (or your custom domain). Google's account picker receives an `hd=glm.edu.co` hint; the app and rules also check the verified email domain. The hint alone is not access control.
3. Create a **Cloud Firestore** database. Publish the complete contents of `firestore.rules` in **Firestore Database → Rules**. Do this before students sign in; do not leave Firestore in test mode. These rules grant access only to the verified Google account's own records.
4. In **Project settings → Your apps**, register a Web app and copy its public config fields into `firebase-config.js`: `apiKey`, `authDomain`, `projectId`, and `appId`. Do not add service account keys, private keys, or admin credentials to this repository. Firebase's web config is public; access depends on the rules.
5. Commit the config update. Visit the Pages URL, sign in with a school test account, save one draft, refresh, and click **Load progress**. Test with a second school account: it must not see the first account's code. An outside Google account must be rejected.

Until steps 1–4 are complete, the sandbox still runs Python but displays **Online accounts need setup**. It does not claim that a browser-only save has been sent to the cloud.

## Publish on GitHub Pages

This project is in `python-lab-sandbox/` of [GLM-STEM-learning-support](https://github.com/Karbian/GLM-STEM-learning-support). In that repository, choose **Settings → Pages → Deploy from a branch → main → /(root)**. Once Pages is active, open `https://karbian.github.io/GLM-STEM-learning-support/python-lab-sandbox/`. You may also copy the folder contents to the root of a dedicated repository and set Pages to `main / (root)`. GitHub Pages hosts the public interface; Firebase Authentication and Firestore provide accounts and private storage.

No build command is required. For local testing, serve the folder over HTTP (for example, `python3 -m http.server 8000` in this directory). Firebase Authentication may require adding `localhost` to the authorized domains for development.

## Existing Apps Script data

The uploaded Apps Script backend appended attempts to a Google Sheet and looked up records by a typed email address. The GitHub version uses verified sign-in and a separate Firestore store. **Existing Sheet rows are not migrated**, and this project does not modify the original Apps Script deployment. Keep the Sheet for historical reporting until an approved migration maps each student email to its Firebase UID. The new Firestore rules provide no teacher dashboard or cross-student reads; a future teacher report needs a separate authorized server-side process.

## Security notes

- Restrict access in `firestore.rules`, not in visible JavaScript. The Firebase project must use those rules as written.
- Students' code is executed in their own browser. Third-party Python packages and the supplied Brython/Pyodide runtimes load from public CDNs; advanced exercises may fetch packages.
- The account selector may create a Firebase Authentication user for a non-school Google account before the app rejects it, but Firestore rules deny that account student-data access. An administrator can clean up such unused Authentication users.
- Local drafts may remain on a shared computer under the account's UID. Students should sign out and use **Save Draft** before switching devices; school devices should clear browser data according to school policy.
