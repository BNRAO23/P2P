# P2P Control Tower MVP

A local, browser-based demo of the invoice workbench described in [spec.md](./spec.md). The app starts with synthetic invoice data so you can explore the workflow without uploading finance data.

## Run locally

1. Add your provider keys to the `.env` file in the project root:

   ```dotenv
   DEEPSEEK_API_KEY=your_deepseek_api_key
   DEEPSEEK_MODEL=deepseek-chat
   SERPER_API_KEY=your_serper_api_key
   PORT=4173
   ```

   `.env` is ignored by Git. Never paste keys into frontend code or commit them.

2. Start the app with Node.js 20 or later:

   ```powershell
   node server.js
   ```

3. Open <http://127.0.0.1:4173>.

No package installation is needed. The local server reads `.env` directly and keeps both keys on the server. Use the help button in the app to check provider configuration.

## MVP walkthrough

- **Overview:** dashboard with sample invoice, match, and exception metrics.
- **Invoice queue:** search and filter invoices; open the workbench to review extracted fields, duplicate candidates, and deterministic PO/receipt match outcomes.
- **AI extraction:** paste invoice text or choose a local `.txt` file. DeepSeek returns structured fields, which are always marked for human review. The source text is sent to DeepSeek when extraction is requested; do not include bank details or unapproved sensitive data.
- **Supplier follow-up:** DeepSeek drafts a message from structured invoice facts and the current exception. Nothing is sent.
- **Supplier web search:** Serper returns public Google Search results. These are unverified signals, not approval evidence.
- **Exceptions:** inspect the sample missing-receipt, duplicate-candidate, and quantity-variance cases.
- **Payment proposal:** only matched, non-held, non-duplicate invoices are eligible. Export a review-only CSV; no payment is initiated.

## Demo boundaries

This is a local prototype, not a production P2P system. It uses in-memory synthetic sample data and does not persist reviews across reloads. It has no authentication, OCR for PDF/image scans, CSV/Excel PO or GRN imports, malware scanning, database, ERP integration, email sending, or payment execution. The example tolerance/match outcomes are demo data, not finance-approved policy. Do not upload real financial or personal data.

The API server binds to `127.0.0.1`; API keys are never returned to the browser. API calls fail clearly when a key is missing or the provider returns an error. The server does not log request bodies or credentials.
