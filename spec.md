# P2P Control & Invoice Processing Agent — Development Specification

**Version:** 1.0  
**Date:** 10 October 2026  
**Audience:** Coding agent, product owner, AP operations, finance controls, IT/security  
**Product type:** Human-in-the-loop web application for Procure-to-Pay (P2P) operations  
**Initial deployment:** Local/dev or controlled cloud environment; manual file uploads; Oracle Fusion integration deferred behind an adapter

## Executive summary

Build a web app that helps an Accounts Payable (AP) team process supplier invoices by extracting invoice data, identifying potential duplicates, matching invoice lines against purchase orders (POs) and goods receipt notes (GRNs), routing exceptions for human review, drafting supplier follow-ups, preparing payment recommendations, and producing audit-ready reports. The app must not autonomously post transactions to Oracle Fusion or release payments. In the MVP, all ERP posting and payment actions are draft/preparation only and require explicit authorized human approval outside or inside the app, with no payment execution capability.

**Primary goal:** reduce manual P2P effort by 70% against a measured baseline, without increasing duplicate payments, incorrect matches, unauthorized actions, or missed controls.

**Important implementation principle:** use OCR/LLM for document extraction and explanation; use deterministic, testable rules for duplicate checks, three-way matching, tolerance evaluation, approvals, and payment eligibility. An AI confidence score is not a control and must never override a failed rule.

## 1. Product definition

### 1.1 Users
- **AP Processor:** uploads invoices and PO/GRN exports, reviews extracted fields, resolves exceptions, prepares invoice records.
- **AP Manager / Reviewer:** reviews low-confidence extraction, mismatches, duplicate warnings, exceptions, and payment batches.
- **Procurement / Receiving:** supplies PO and GRN evidence and responds to price, quantity, or receipt discrepancies.
- **Treasury / Finance Approver:** reviews a payment proposal and exports a payment preparation file; actual release remains in the approved payment portal/bank workflow.
- **System Administrator / Auditor:** manages users and configuration, views immutable audit events, exports reports.
- **IT / Oracle Integration Owner (later phase):** configures and monitors the Oracle Fusion adapter.

### 1.2 Problem
AP work is spread across supplier portals, Excel, email, invoice files, PO documents, payment portals, ERP records, and supplier master data. Manual re-keying and reconciliation delay invoice processing, create duplicate-payment and mismatch risk, generate follow-up work, and reduce visibility into cash commitments and inventory discrepancies.

### 1.3 Core promise
“Turn uploaded invoice, PO, and receipt documents into a reviewed, traceable invoice decision and payment recommendation in minutes—not hours—while keeping a person responsible for approvals and money movement.”

### 1.4 Operating assumptions
- Current invoice volume: approximately 500–2,000 invoices/month.
- Current effort: 15 hours per sprint across 10 people; sprint frequency is weekly. Confirm the precise baseline and what work is included before claiming savings.
- Initial data ingestion is manual upload (PDF, image, CSV/XLSX). Do not assume live access to Oracle Fusion, supplier portal, email, or bank systems.
- Oracle Fusion is the target ERP. Integration details, API access, environments, authentication, and licensing must be confirmed by the customer’s IT team.
- Human approval is mandatory before ERP posting or payment release.
- Initial prototype may use synthetic or masked data until security approval is complete.

## 2. Scope

### 2.1 MVP — must include
1. Secure login and role-based access control (RBAC).
2. Upload and validate invoice PDF/image files and PO/GRN CSV/XLSX exports.
3. OCR/text extraction plus structured invoice field extraction.
4. Review/edit screen for extracted data, with field-level confidence and source evidence where available.
5. Normalize supplier names, invoice numbers, currencies, dates, quantities, tax, and amounts without destroying original values.
6. Duplicate detection using exact and fuzzy keys; show reasons and related records; never silently delete or auto-reject.
7. Deterministic three-way matching of invoice lines to PO lines and GRN/receipt lines.
8. Configurable matching tolerances (amount, unit price, quantity, tax, currency) with default values disabled or conservative until finance configures them.
9. Exception queue with reason codes, owner, status, notes, due date, and resolution history.
10. AI-assisted draft supplier emails for missing PO/receipt, price/quantity variance, missing information, and payment-status inquiries. Human reviews and sends manually in MVP.
11. Payment proposal: list invoices eligible for consideration, due dates, discounts, amounts, and exception/hold flags. Export proposal CSV/PDF only; no payment initiation.
12. ERP posting package/draft export for review. No direct write to Oracle Fusion in MVP.
13. Cash-flow and inventory discrepancy report based only on supplied source data, with data freshness and limitations clearly shown.
14. Audit log for uploads, edits, decisions, approvals, exports, configuration changes, and user actions.
15. Evaluation dashboard or downloadable test report showing extraction, matching, duplicate, and workflow metrics.
16. CSV/XLSX templates and sample data for invoices, POs, GRNs, suppliers, and payment terms.

### 2.2 Later phases
- Oracle Fusion integration using supported REST APIs or another IT-approved interface; initially read-only, then approved write-back only after security and UAT.
- Supplier portal and email connector; controlled inbox ingestion and message threading.
- Receiving/inventory system integration.
- Payment portal integration limited to payment-file preparation or status retrieval; execution remains governed by bank/treasury controls.
- Configurable approval matrix by legal entity, business unit, amount, currency, cost center, and risk.
- Multi-entity, multi-currency, tax jurisdiction, credit memo, PO-less invoice, freight, retainage, and complex service-entry support.
- Analytics for working capital, early-payment discounts, supplier performance, and forecasted cash requirements.
- Automated reminders and SLA escalations, with human-reviewed external communications initially.

### 2.3 Out of scope for MVP
- Automatically releasing bank payments or changing beneficiary/bank details.
- Autonomous Oracle Fusion posting or edits to supplier master data.
- Autonomous approval of invoices, bypassing configured business controls.
- Fraud determinations based solely on AI; system may flag risk signals for investigation.
- Replacing Oracle Fusion, bank portal, supplier portal, or formal approval policies.
- Guaranteeing 70% savings before a baseline and pilot validate it.
- Training a custom foundation model or fine-tuning on confidential financial data.

## 3. Users and screens

### 3.1 Dashboard
- Show invoices uploaded, awaiting review, matched, held, overdue, duplicate candidates, value of open exceptions, and payment proposals.
- Show counts by status and aging buckets (e.g. 0–7, 8–14, 15–30, >30 days).
- Display “last source upload” timestamps and warnings when source files are stale or incomplete.
- Do not label a value “cash forecast” unless the underlying dataset and forecast logic are defined; MVP reports are based on supplied open invoices and due dates.

### 3.2 Upload center
- Upload one or more invoice PDF/JPG/PNG files and PO/GRN/supplier CSV/XLSX files.
- Validate file type, size, workbook sheet/column headers, encoding, required fields, row counts, and duplicate file hashes.
- Show parse errors and downloadable error rows; preserve the original file and its hash.
- Malware scanning and file quarantine should be enabled in a real deployment. Never execute macros.
- Support a preview before import and an idempotent import confirmation.

### 3.3 Invoice workbench
- Display original document beside extracted fields.
- Fields: supplier, supplier ID (if supplied), invoice number, invoice date, due date, currency, subtotal, tax, total, PO number, payment terms, bank details if present (masked; not used to update master data), line descriptions, quantities, unit prices, tax rates, and totals.
- Show extraction confidence, evidence/snippet or page reference where supported, validation errors, and edit history.
- Require human confirmation for low-confidence or missing critical fields.
- Store original extracted value, corrected value, editor, timestamp, and reason for each correction.

### 3.4 Matching and duplicate review
- Show invoice header, PO lines, GRN/receipt lines, computed variances, tolerance settings, and exact reason codes.
- Distinguish `MATCHED`, `MATCHED_WITHIN_TOLERANCE`, `MISMATCH`, `MISSING_PO`, `MISSING_RECEIPT`, `PARTIAL_RECEIPT`, and `NEEDS_REVIEW`.
- Duplicate panel shows candidate invoices, normalized keys, supplier, invoice number, amount, date, file hash, and similarity reasons.
- User actions: confirm duplicate, mark false positive with reason, place on hold, or escalate. All actions audited.
- Do not allow an invoice marked as confirmed duplicate to enter a payment proposal unless an authorized reviewer reverses that decision with a recorded reason.

### 3.5 Exception queue
- Filter by reason, supplier, owner, business unit, due date, amount, age, and severity.
- Assign/reassign owner, add notes, attach evidence, create a follow-up email draft, resolve, or escalate.
- Track SLA and exception history; reopening an exception must be audited.
- Provide reason-specific resolution checklist (e.g. confirm PO amendment, obtain receipt, request corrected invoice).

### 3.6 Supplier communication drafts
- Generate a suggested email from approved templates and structured facts.
- Show recipients and source facts; redact confidential internal notes.
- No email sending in MVP. User copies/downloads draft and sends through approved email client.
- Never include full bank details, credentials, unnecessary personal data, or internal fraud suspicions in a supplier email.

### 3.7 Payment proposal
- List only invoices meeting configured eligibility rules: validated invoice, not a confirmed duplicate, match/exception policy satisfied, not on hold, approved status, due/discount date known where applicable, and supplier identity verified against supplied master data.
- Show invoice amount, currency, due date, payment terms, discount opportunity if determinable, hold reason, and proposed payment date.
- Export a reviewable proposal. Label it **“Proposal only — not a payment instruction.”**
- Require AP Manager and Treasury/authorized approver sign-off before a proposal is marked approved. Approval in the app does not execute a payment.
- Bank details must be masked and must never be changed from invoice content.

### 3.8 ERP posting package
- Build a preview/export containing proposed invoice header, lines, tax, accounting dimensions if supplied, PO/receipt references, match outcome, and supporting document references.
- Validate required fields and totals; clearly list missing accounting data.
- Export CSV/XLSX/JSON with schema version. No live Oracle write in MVP.
- Mark each package `DRAFT`, `REVIEWED`, `EXPORTED`, or `CANCELLED`; retain export audit event and file hash.

### 3.9 Reports and audit
- Reports: invoice throughput, manual touch rate, extraction correction rate, match rate, duplicate candidates, exception aging, payment proposal aging, overdue invoice exposure, and receipt/PO/invoice variance.
- Cash reporting must identify its source and as-of date. Inventory discrepancy reporting is limited to PO vs receipt data supplied.
- Audit search by user, entity, action, object, date, and outcome; CSV export restricted to authorized roles.

### 3.10 Administration
- Manage users, roles, allowed file formats/sizes, currencies, tolerance policy, invoice eligibility rules, reason codes, and retention settings.
- Configuration changes require an authorized admin and are logged with before/after values.
- Maker-checker for critical tolerance and payment eligibility changes is recommended before production.

## 4. Workflow

1. **Create a batch.** AP Processor uploads invoice files and supporting PO/GRN/supplier extracts. App validates file type, size, hash, schema, and import completeness. **AI:** none required. **Human:** confirms import.
2. **Extract invoice fields.** OCR/text parser reads documents; an LLM or structured extraction model returns schema-constrained fields and line items. Preserve source evidence and confidence. **AI:** extraction only. **Human:** confirms low-confidence or critical fields.
3. **Normalize and validate.** Deterministic code normalizes dates, currencies, invoice numbers, supplier keys, decimal precision, tax/total arithmetic, and required fields. Never overwrite raw values.
4. **Detect duplicates.** Deterministic exact keys plus fuzzy candidate scoring compare supplier ID/name, normalized invoice number, currency, total, date, and document hash. **AI:** may explain a candidate, but does not decide payment eligibility. **Human:** resolves uncertain candidates.
5. **Match PO, receipt, and invoice.** Match by supplier, PO number, line references/descriptions, units, quantity, unit price, currency, and receipt quantities. Calculate variances using decimal arithmetic. **AI:** may suggest candidate line mappings where descriptions differ. **Rules:** decide match outcome and tolerances. **Human:** reviews ambiguous mappings and exceptions.
6. **Route exceptions.** Create a reason-coded case for missing data, mismatches, duplicate candidates, tax/total errors, or supplier inconsistency. Assign owner and SLA. **AI:** summarize issue and draft recommended next steps. **Human:** chooses resolution.
7. **Draft supplier follow-up.** Generate a templated message based on verified facts. **AI:** drafts only. **Human:** checks recipient/content and sends outside MVP.
8. **Prepare invoice posting package.** Validate required fields and accounting dimensions; produce preview/export. **Human:** reviews and approves export. No direct ERP write in MVP.
9. **Prepare payment proposal.** Apply hard eligibility rules and due-date ordering; exclude held, unapproved, unmatched per policy, or duplicate-confirmed invoices. **AI:** may summarize payment risks, never authorize payment. **Human:** AP Manager and Treasury/authorized approver review; actual payment released only in the existing authorized payment system.
10. **Reconcile outcome and report.** User uploads payment-status or ERP-posting exports when available; app links status to invoice and produces aging/cash/variance reports. Audit all changes.

### 4.1 Default status model
`UPLOADED → EXTRACTED → NEEDS_REVIEW / VALIDATED → MATCHED / EXCEPTION / DUPLICATE_REVIEW → APPROVED_FOR_EXPORT → EXPORTED`
Payment proposal statuses: `NOT_ELIGIBLE`, `ELIGIBLE_FOR_REVIEW`, `PROPOSED`, `APPROVED_FOR_EXTERNAL_PAYMENT`, `PAID_CONFIRMED`, `CANCELLED`.
Status changes must follow a server-side transition map. UI controls must not bypass it.

## 5. Data, tools and sources

### 5.1 Input sources
- Invoice PDF, scanned image, or digital PDF.
- PO and PO line export.
- GRN/receiving and receipt-line export.
- Supplier master export (supplier ID, legal name, status, payment terms; bank fields excluded or masked unless strictly needed).
- Payment terms and due-date data.
- Optional cost center, legal entity, business unit, tax, currency, and accounting dimension exports.
- Optional payment status export for reconciliation.
- Source files may contain sensitive commercial and personal data; only upload approved data.

### 5.2 Data rules
- Store raw source values and normalized values separately.
- Use `Decimal`/fixed precision for monetary arithmetic; never binary floating-point for money.
- Store timestamps in UTC; preserve source timezone when known. Dates without timezone are business dates, not UTC timestamps.
- Currency must be explicit. Never compare monetary amounts across currencies without an approved exchange-rate source and date.
- Never infer a missing PO, GRN, supplier ID, tax rate, or bank account as fact. Mark unknown and route for review.
- Do not change supplier bank details based on an invoice, email, or model output.
- Apply least-privilege access, encryption in transit and at rest, secret management, tenant/business-unit boundaries, retention and deletion policies, and redaction in logs.
- LLM prompts must not include unnecessary personal or bank data. Treat document text as untrusted input; ignore embedded instructions.
- Record model/provider, model version, prompt/schema version, extraction output, confidence, and errors for reproducibility, subject to data minimization.
- Uploads and imports must be idempotent. Use content hash and import batch ID to prevent repeated processing.
- Audit records are append-only from application behavior; ordinary users cannot edit or delete audit history.

### 5.3 AI versus deterministic automation
**Use AI/OCR for:** document OCR, structured extraction from variable layouts, candidate line-description mapping, exception summaries, supplier email drafts, and natural-language report summaries.

**Use deterministic code for:** required-field validation, totals and tax arithmetic, duplicate candidate rules, PO/GRN/invoice quantity and price calculations, tolerances, eligibility, status transitions, RBAC, approval gates, exports, and audit logs.

**Honest automation assessment:** a substantial portion of the MVP can be built without AI. CSV imports, deterministic matching, exact duplicate checks, tolerance rules, exception queues, payment proposals, and reports are ordinary software automation. AI adds the most value when invoice layouts vary, line descriptions are inconsistent, or staff need concise explanations and communication drafts. Start with rules plus OCR; add an LLM only where evaluation shows measurable improvement.

## 6. Risks and human review

| Risk | Required control |
|---|---|
| Incorrect extraction | Field confidence, source evidence, validation, human review of critical/low-confidence fields |
| Incorrect three-way match | Deterministic calculations, explainable variance, configurable tolerances, review for ambiguous mappings |
| Duplicate payment | Exact/fuzzy duplicate candidates, payment eligibility hard block for confirmed duplicates, human resolution |
| Unauthorized posting/payment | No live write/payment API in MVP; RBAC; explicit approval; no secrets in client; audit events |
| Supplier bank-detail fraud | Invoice/email bank data never updates supplier master; independent verification in existing approved process |
| Data leakage | Encryption, least privilege, masked sensitive fields, approved storage/LLM provider, retention limits |
| Missed due dates | Due-date validation, aging queue, SLA reminders in app, stale-source warning |
| Poor auditability | Append-only audit events, actor/time/action/object/before-after/reason, export logs |
| Prompt injection in documents | Treat OCR text as untrusted data, schema-constrained extraction, no tool execution from document instructions |
| Model outage or poor output | Retry safely, fallback to manual review, deterministic validations, capture provider errors |
| Bad source files | Schema checks, preview, rejected-row report, idempotent import, batch rollback strategy |
| Overstated ROI | Baseline study, pilot measurement, compare like-for-like work and volumes |

### 6.1 Human approval gates
- AP Processor confirms extracted critical fields when confidence is low or validation fails.
- AP Manager resolves duplicate candidates and material mismatches.
- Authorized approver signs off on invoice export/posting package.
- AP Manager and Treasury/authorized approver review payment proposals.
- Actual ERP posting, supplier-master changes, and bank payment release remain in the existing authorized systems and processes.
- Any exception override requires a reason, named user, timestamp, and evidence attachment where relevant.

### 6.2 Security minimums
- Server-side RBAC on every API route and object; deny by default.
- Strong authentication; production should use organization SSO/MFA where possible.
- HTTPS, encrypted database/storage, managed secrets, dependency scanning, rate limits, secure session cookies, CSRF protections where applicable, and upload scanning.
- No full invoice contents, access tokens, or bank data in application logs.
- Backup and restore test before production.
- Define retention/deletion and data residency with the organization before using real financial data.
- Threat-model cross-entity access and malicious spreadsheet/PDF uploads.

## 7. Recommended low-cost tech stack

| Layer | Recommendation | Why |
|---|---|---|
| Frontend | Next.js + TypeScript | Mature web UI, type safety, quick admin/workbench screens |
| UI | Tailwind CSS + accessible component library | Fast consistent screens; accessible controls |
| Backend | Python FastAPI + Pydantic | Strong OCR/AI ecosystem, schema validation, typed API |
| Database | PostgreSQL | Reliable relational model, constraints, audit-friendly transactions |
| ORM/migrations | SQLAlchemy + Alembic | Maintainable schema and controlled migrations |
| Background jobs | Start with a database-backed job table; add Redis/Celery only when needed | Low-cost MVP, avoids unnecessary infrastructure |
| File storage | Local encrypted dev storage; production object storage with private buckets | Separates documents from database; access control and retention |
| OCR | Start with a replaceable OCR adapter; evaluate Tesseract/PaddleOCR and a managed OCR service on representative samples | Cost/accuracy depends on scans and layouts |
| LLM | Provider abstraction; use a cost-effective structured-output model only for extraction/explanations where needed | Avoid provider lock-in; measure accuracy and token cost |
| Auth | Secure session-based auth for prototype; organization SSO/OIDC for production | Role enforcement and centralized identity |
| Testing | Pytest, API integration tests, Playwright | Rules, workflows, and UI regression coverage |
| Deployment | Docker Compose for local/first demo; approved managed hosting for pilot | Reproducible setup and low initial overhead |
| Observability | Structured logs, metrics, error tracking with PII redaction | Diagnose failures without exposing finance data |

Do not put API keys in the browser. Add Oracle Fusion access only after IT supplies an approved integration method, credentials/secrets process, test environment, and supported API contract.

## 8. Data model and API outline

### 8.1 Core entities
- `users`: id, email, display_name, role, active, created_at.
- `suppliers`: id, external_supplier_id, legal_name, normalized_name, status, payment_terms, source_batch_id. Do not store bank details unless a documented requirement and controls are approved.
- `import_batches`: id, uploaded_by, source_type, filename, file_hash, status, row_count, error_count, created_at, completed_at.
- `source_documents`: id, batch_id, document_type, storage_key, file_hash, mime_type, page_count, created_at, retention_until.
- `invoices`: id, supplier_id, supplier_name_raw, invoice_number_raw, invoice_number_normalized, invoice_date, due_date, currency, subtotal, tax_total, invoice_total, po_number, status, extraction_confidence, source_document_id, created_at, updated_at.
- `invoice_lines`: id, invoice_id, line_number, description_raw, normalized_description, quantity, unit_of_measure, unit_price, tax_rate, line_total, po_line_reference, receipt_reference.
- `purchase_orders`: id, external_po_id, supplier_id, currency, status, order_date, business_unit, source_batch_id.
- `purchase_order_lines`: id, purchase_order_id, line_number, item_code, description, ordered_quantity, unit_of_measure, unit_price, line_amount, received_quantity.
- `receipts`: id, external_receipt_id, po_id, receipt_date, status, source_batch_id.
- `receipt_lines`: id, receipt_id, po_line_id, received_quantity, accepted_quantity, rejected_quantity, unit_of_measure.
- `duplicate_candidates`: id, invoice_id, candidate_invoice_id, score, signals_json, status, reviewed_by, reviewed_at, resolution_reason.
- `match_results`: id, invoice_id, invoice_line_id, po_line_id, receipt_line_id, outcome, quantity_variance, price_variance, amount_variance, tolerance_policy_version, reasons_json, computed_at.
- `exceptions`: id, invoice_id, type, severity, status, owner_id, due_at, description, resolution, created_at, resolved_at.
- `supplier_message_drafts`: id, exception_id, recipient, subject, body, template_key, generated_by, reviewed_by, reviewed_at, status.
- `posting_packages`: id, invoice_id, schema_version, payload_json, status, created_by, reviewed_by, exported_file_hash, created_at.
- `payment_proposals`: id, proposal_date, currency, status, total_amount, created_by, reviewed_by, reviewed_at.
- `payment_proposal_items`: id, proposal_id, invoice_id, proposed_amount, proposed_date, eligibility_status, hold_reasons_json.
- `audit_events`: id, actor_user_id, action, object_type, object_id, before_json, after_json, reason, correlation_id, occurred_at. Append-only.
- `configuration_versions`: id, key, value_json, version, changed_by, approved_by, changed_at.

Add foreign keys, indexes on normalized supplier/invoice keys and status/due date, unique constraints where business rules support them, and tenant/legal-entity boundaries if needed. Avoid making invoice number globally unique; uniqueness usually depends on supplier and entity.

### 8.2 Suggested API endpoints
All endpoints require authentication and server-side authorization. Use versioned `/api/v1` routes and standard error responses.

- `POST /api/v1/import-batches` — create upload/import batch; validate file metadata.
- `POST /api/v1/import-batches/{id}/confirm` — confirm preview and process import.
- `GET /api/v1/import-batches/{id}` — status and row-level errors.
- `GET /api/v1/invoices` — paginated/filterable invoice list.
- `GET /api/v1/invoices/{id}` — invoice, extracted fields, source references, status history.
- `PATCH /api/v1/invoices/{id}/fields` — correct extracted fields; requires reason and audit event.
- `POST /api/v1/invoices/{id}/run-duplicate-check` — calculate duplicate candidates.
- `POST /api/v1/invoices/{id}/run-match` — deterministic matching and variance calculation.
- `GET /api/v1/exceptions` — filterable exception queue.
- `POST /api/v1/exceptions/{id}/assign` — assign owner.
- `POST /api/v1/exceptions/{id}/resolve` — resolve with reason/evidence; role-gated.
- `POST /api/v1/exceptions/{id}/draft-message` — generate supplier email draft.
- `POST /api/v1/posting-packages` — create posting draft from eligible invoice.
- `POST /api/v1/posting-packages/{id}/approve-export` — approve and export package; no ERP write.
- `POST /api/v1/payment-proposals` — create proposal from eligible invoices.
- `POST /api/v1/payment-proposals/{id}/submit-review` — route for human approval.
- `POST /api/v1/payment-proposals/{id}/approve` — record approval only; never release funds.
- `GET /api/v1/reports/operations` — operational KPIs.
- `GET /api/v1/reports/aging` — invoice and exception aging.
- `GET /api/v1/audit-events` — restricted audit search/export.
- `GET /api/v1/configuration` / `PATCH /api/v1/configuration/{key}` — role-gated settings; critical changes require maker-checker.

Use idempotency keys for import, export, and retryable job creation. Apply pagination, file-size limits, schema validation, optimistic concurrency for edits, and consistent audit correlation IDs. Never expose internal storage paths or secrets through API responses.

### 8.3 Matching logic requirements
- Exact invoice duplicate key: legal entity (if known) + supplier ID (or reviewed normalized supplier identity) + normalized invoice number + currency. Also compare amount and date as signals.
- Fuzzy duplicate signals: normalized invoice-number similarity, supplier similarity, amount equality/near equality, date proximity, and document hash. Thresholds are configurable and candidates require review.
- PO/GRN matching preference: explicit PO number and PO line reference; then item code; then candidate description matching for human review. Do not silently bind ambiguous lines.
- Quantity check: invoiced quantity must be supported by accepted receipt quantity, accounting for prior invoices/receipts and configured partial-invoice rules.
- Price check: compare invoice unit price with PO unit price and approved tolerance.
- Amount/tax check: recalculate line totals and header totals with currency precision and configured rounding rules.
- Outcome is a deterministic function of evidence + versioned tolerance policy. Record the rule version and each variance.
- No global default tolerance should be assumed. Finance must approve values by entity/category/currency before live use.

## 9. Evaluation

### 9.1 Success measures
Measure baseline for at least two representative weeks and compare a controlled pilot with similar volume and invoice complexity.

- **Manual effort:** target 70% reduction in measured AP touch time per invoice or per defined batch. Clearly define included work; do not infer savings from elapsed wall-clock time alone.
- **Extraction:** field-level exact-match rate for supplier, invoice number, date, currency, subtotal, tax, total, PO number; report per field and by document quality.
- **Matching:** precision and recall on labeled PO/GRN/invoice test set; zero silent auto-approval of known mismatches in the test corpus.
- **Duplicate detection:** recall on known duplicates and false-positive rate; every candidate remains reviewable.
- **Control safety:** zero payment executions and zero live ERP writes in MVP; 100% of critical actions have audit events.
- **Workflow:** exception aging, time to resolution, on-time payment proposal readiness, and rate of missing/stale source data.
- **Human factors:** correction rate, reviewer override rate, minutes per exception, and user-reported usefulness.
- **Reliability:** import success rate, failed-job recovery, and reproducible rule results.

Do not claim the target is achieved until the pilot data supports it. Establish acceptance thresholds with AP leadership; a suggested pilot gate is 98%+ exact accuracy on critical fields after human review, 100% audit coverage for protected actions, and no false clearance of labeled critical mismatches.

### 9.2 Ten test cases (input → expected result)
1. **Clean invoice:** invoice total and lines agree with PO and accepted GRN within configured tolerances → `MATCHED` or `MATCHED_WITHIN_TOLERANCE`; eligible for human review, not auto-paid.
2. **Invoice price exceeds PO tolerance:** same supplier/PO/line but price variance above policy → `MISMATCH`; exception created; excluded from payment proposal.
3. **Invoice quantity exceeds accepted receipt:** invoice quantity 12, accepted quantity 10, no permitted partial rule → `MISMATCH` or `PARTIAL_RECEIPT`; payment hold for unsupported quantity.
4. **Exact duplicate:** same supplier, normalized invoice number, currency, and amount as an existing invoice → high-priority duplicate candidate; cannot enter payment proposal until reviewed.
5. **Near duplicate:** invoice number differs only by spacing/punctuation and supplier/amount/date are similar → fuzzy candidate displayed with signals; human decides.
6. **Missing GRN:** invoice and PO exist but no receipt evidence is supplied → `MISSING_RECEIPT`; no eligibility unless an approved service/receipt policy explicitly applies.
7. **Low-quality scan:** invoice number or total has low extraction confidence or fails arithmetic → `NEEDS_REVIEW`; field evidence displayed; no posting export approval until corrected.
8. **Supplier bank change request embedded in invoice/email:** new bank details appear in source → never update supplier master; mask sensitive data; raise review warning and direct user to independent verification process.
9. **Unauthorized user attempts payment approval or configuration change:** role lacks permission → HTTP 403; no state change; denied action logged without sensitive payload.
10. **Stale or malformed PO export:** missing required columns or source is older than configured freshness window → import rejected or warning/hold; no misleading “matched” outcome; downloadable error report.

### 9.3 Test approach
- Unit tests for normalization, monetary arithmetic, tolerance rules, duplicate signals, status transitions, eligibility, and RBAC.
- Golden dataset of labeled invoices/POs/GRNs, including poor scans, partial receipts, credit notes if later supported, and edge cases.
- Integration tests for import idempotency, database transactions, exports, and audit completeness.
- Playwright tests for upload, review/correction, exception resolution, and payment proposal approval.
- Security tests for authorization bypass, file upload validation, prompt injection, secrets exposure, and cross-user data access.
- Every rule change must rerun the golden test set and record policy version.

## 10. Estimated monthly cost

Indicative estimates in USD for a small pilot, excluding existing Oracle Fusion licensing, employee time, and any paid supplier/bank systems. Actual cost depends on hosting, OCR provider, document size, model choice, retention, and region. Confirm vendor pricing before procurement.

| Item | Pilot estimate/month | Notes |
|---|---:|---|
| App hosting / small container service | $20–$80 | May be $0–$30 during local development |
| Managed PostgreSQL | $0–$50 | Local Docker for development; managed DB for shared pilot |
| Private object storage and backups | $5–$25 | Depends on document retention and volume |
| OCR | $0–$100+ | Open-source can reduce usage fees but costs engineering time; managed OCR priced by pages |
| LLM extraction and draft generation | $10–$100+ | Use only on necessary pages/fields; cache/retry carefully |
| Monitoring, email and miscellaneous | $0–$40 | Can start with free tiers |
| **Indicative total** | **$35–$395+/month** | Excludes implementation and existing enterprise licenses |

For 500–2,000 invoices/month, measure average pages per invoice and OCR/LLM cost per invoice in a 100-invoice pilot. Set a monthly spend cap and a fallback-to-manual mode. A rules-only MVP can be cheaper; OCR/LLM usage should be justified by accuracy and touch-time improvement.

## 11. Delivery plan — what to build first this weekend

### Friday evening / preparation
- Confirm data owner, permitted sample files, invoice fields, currency/rounding rules, and baseline measurement method.
- Create a small masked/synthetic dataset: 20–50 invoices, related POs/GRNs, known duplicates, price/quantity mismatches, missing receipts, and low-quality scans.
- Define import templates and a first-pass tolerance policy in configuration, explicitly marked **test only** until finance approves.

### Saturday — reliable core
1. Scaffold repository: `frontend/` Next.js, `backend/` FastAPI, `migrations/`, `tests/`, `sample_data/`, `docs/`.
2. Implement PostgreSQL schema and Alembic migrations.
3. Implement login/RBAC and audit-event middleware before building privileged actions.
4. Build CSV/XLSX import preview, validation, batch status, and idempotency.
5. Build invoice/PO/GRN list and detail screens.
6. Implement deterministic totals validation, exact duplicate detection, and three-way matching with explicit reason codes.
7. Write unit tests for all rules before adding LLM functionality.

### Sunday — human review and demo
8. Add OCR adapter and schema-constrained extraction; preserve evidence and confidence. If time is short, begin with text-based PDFs and CSV imports, then add scanned-image OCR.
9. Build invoice review, duplicate review, and exception queue screens.
10. Add supplier email draft templates; no automatic sending.
11. Add payment proposal and ERP posting-package export, clearly labeled “proposal/draft only.”
12. Add aging/variance reports, seed demo data, Playwright smoke tests, README, `.env.example`, and Docker Compose.
13. Run the 10 acceptance tests and demo clean invoice, mismatch, duplicate, and unauthorized approval scenarios.

### Weekend deliverables
- Working local demo with seeded sample data.
- Database migrations and documented schema.
- Import templates and sample dataset.
- Invoice workbench, matching/duplicate engine, exception queue.
- Draft email, payment proposal, and posting export.
- Audit trail, automated tests, setup guide, known limitations, and Oracle integration plan.

### Definition of done for weekend
- A developer can start the app from documented instructions.
- Sample files import idempotently and invalid files produce useful errors.
- Matching and duplicate outcomes are explainable and tested.
- No live ERP write or bank payment function exists.
- Every protected action is server-authorized and audited.
- The demo uses synthetic/masked data only.

## 12. How this differs from typing the request into ChatGPT or Claude

A general-purpose chat can summarize an invoice or suggest whether values match, but it does not by itself provide a controlled, repeatable AP operating system. This app provides:

- **Structured, repeatable processing:** every invoice follows the same validation and matching rules.
- **Persistent records:** documents, extracted fields, corrections, match results, exceptions, and decisions are stored and linked.
- **Deterministic controls:** tolerance checks, duplicate blocks, eligibility, and permissions run in application code, not informal prose.
- **Evidence and auditability:** users can trace decisions to source files, field corrections, rule versions, and approvals.
- **Workflow and ownership:** exceptions have owners, status, due dates, and resolution history.
- **Integration path:** standardized imports and exports now, a governed Oracle Fusion adapter later.
- **Human approval gates:** the agent prepares recommendations but cannot release money or write to ERP in the MVP.
- **Evaluation:** measured accuracy, false positives, touch time, cost, and regression tests.

A chat model may still be used behind the application for extraction, explanations, and drafts, but it is not the system of record and cannot override business rules.

## Implementation instructions for the coding agent

Build a secure, working MVP—not just mockups. Follow the scope and safety boundaries above. Use TypeScript/Next.js, Python/FastAPI, PostgreSQL, SQLAlchemy/Alembic, and Docker Compose. Keep OCR and LLM providers behind interfaces so they can be replaced. Implement database constraints, RBAC, audit events, deterministic matching, duplicate detection, exception workflow, posting-package export, and payment-proposal export before polishing the UI.

### Required repository structure
```text
p2p-agent/
  frontend/
  backend/
    app/
      api/v1/
      core/
      models/
      schemas/
      services/
        extraction/
        matching/
        duplicates/
        eligibility/
        exports/
        audit/
      tests/
    alembic/
  sample_data/
  docs/
  docker-compose.yml
  .env.example
  README.md
```

### Required coding standards
- Validate every request and import with typed schemas.
- Use migrations; do not rely on auto-creating production tables at startup.
- Use decimal arithmetic for money and explicit rounding rules.
- Enforce authorization on the server, not only in the UI.
- Add tests for each business rule and status transition.
- Use transactions for multi-record imports and state changes.
- Keep source documents private and serve them only through authorized routes or short-lived signed URLs.
- Redact sensitive values in logs and error responses.
- Never expose secrets to the frontend or commit `.env` files.
- Use a mock Oracle adapter interface only; no production credentials or write operations in MVP.
- Do not implement any API endpoint that executes or releases a payment.
- Document all assumptions and label unconfigured tolerances as test defaults, not production policy.

### Environment variables (names only)
`DATABASE_URL`, `APP_SECRET_KEY`, `STORAGE_BACKEND`, `STORAGE_BUCKET`, `OCR_PROVIDER`, `OCR_API_KEY`, `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `MAX_UPLOAD_MB`, `RETENTION_DAYS`, `APP_ENV`.

Never place real secrets in source control. Provide a safe `.env.example` with placeholder values.

## Final recommendation

Start with **document upload + deterministic duplicate detection + three-way matching + exception workflow + human-reviewed exports**. Add AI extraction and email drafting behind measurable evaluations. Do not connect live Oracle writes or payment execution until the MVP passes the test suite, finance approves tolerance/eligibility rules, IT approves the integration design, and a controlled pilot demonstrates the expected savings and control effectiveness.
