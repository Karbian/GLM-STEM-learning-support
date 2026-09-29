# GLM Python Lab · Sandbox

The 50-exercise Python workspace runs on GitHub Pages for practice. A domain-restricted **Google Apps Script web app** provides school sign-in and saves progress to Google Sheets. No Firebase project, student password form, or student access to the results Sheet is needed.

## How student sign-in works

Students open the Apps Script `/exec` URL while signed into their `@glm.edu.co` Google Workspace account. The web app is restricted to the deployer's domain and runs with the school deployer's authority. Each save and load operation gets the active student's email from `Session.getActiveUser().getEmail()` on the server. A typed browser email is never used to identify a student. If Google does not provide the email, the operation fails without saving.

Google documents that the active email can be blank for web apps running as the deployer, while the same Workspace domain is generally an exception. **Test this with two real student accounts before assigning work.** Deploy from an `@glm.edu.co` account, not a personal Gmail account.

The GitHub Pages copy cannot authenticate or save progress: use it for practice and share the Apps Script URL for saved work. The two copies use the same `index.html` source.

## Deploy from the school account

1. Open an existing Apps Script project associated with the school's Python Lab results Sheet, or create a new Apps Script project while signed in as an `@glm.edu.co` account. Back up existing script files before replacing them.
2. Replace the project's `Code.gs` with this folder's `Code.gs`. Create an HTML file named **Index** and paste the contents of `index.html` into it. In **Project Settings**, enable viewing the `appsscript.json` manifest and replace it with the included `appsscript.json`.
3. If reusing a results spreadsheet, set `CONFIG.SPREADSHEET_ID` in `Code.gs` to its ID. Leave it blank to use a bound Sheet or let the script create a new one. The columns match the earlier `Python Lab Results` sheet. Run `setupTeacherSheet_` from the Apps Script editor as the school deployer and authorize the requested scopes. The returned Sheet URL is for the teacher; do not share it with students.
4. Choose **Deploy → New deployment → Web app**. Set **Execute as: Me** (the school deployer) and **Who has access: Anyone within the domain**. Confirm the manifest uses `USER_DEPLOYING` and `DOMAIN`. Copy the deployed `/exec` URL.
5. Open that URL with a test student account. The verified email should appear automatically. Enter the student's name, write a small program, click **Save Draft**, then reload and click **Load progress**. Repeat with a second student account and confirm it cannot load the first student's code. Also verify that an outside account cannot open the app.
6. Share the `/exec` URL in Schoology. Redeploy a new version after code changes. The GitHub Pages copy at `https://karbian.github.io/GLM-STEM-learning-support/python-lab-sandbox/` remains a practice-only workspace.

If the school does not offer the domain access option or the active student email is blank, stop rollout. The app deliberately refuses to save in that state. An administrator can review Workspace deployment settings, or the project can move to a different verified backend.

## Data and assessment

The backend appends an attempt to `Python Lab Results` for each **Save Draft** or **Evaluate & Save** action. It stores code, output, status, feedback, reflection, score, and the authenticated school email. Load progress returns the latest attempt for each exercise for that same email. The teacher's Sheet is not shared with students.

All 50 exercises open with an empty editor. The former worked examples and exact-answer feedback were removed. Automatic checks still live in public browser code and generate formative feedback only; review the student's code and reasoning before grading. The GitHub repository is the source archive for the school-hosted web app, not the private data store.
