Trosyn AI – Product Requirements Document (PRD)

1. Product Overview

Trosyn AI is an offline-first, self-hosted AI productivity system for businesses. It uses on-device AI to provide document understanding, secure knowledge assistance, and automation across departments without relying on the internet. It’s built to run efficiently using Gemma 3.1B, with a future transition to Gemma 3.n for enhanced capabilities once stable.

⸻

2. Key Objectives
	•	Deliver AI-powered document and task assistance fully offline
	•	Maintain strict data security with no cloud dependency
	•	Enforce billing and license compliance even when offline
	•	Support role-based access across HR, Finance, Marketing departments
	•	Run reliably on macOS and Windows systems

⸻

3. Target Users
	•	Department teams in medium-to-large businesses (HR, Finance, Marketing)
	•	Organizations requiring strict data privacy
	•	Businesses with limited or unstable internet access

⸻

4. Core Features

A. Offline AI Capabilities (Powered by Gemma 3.1B)

Feature	Description
Summarization	Summarize internal documents, reports, and notes
Redaction	Detect and redact sensitive information
Spell Check & Grammar	On-device grammar correction and inline suggestions
Document Rewriting	Improve clarity, conciseness, and tone
Local Reasoning	Contextual Q&A, follow-up analysis
Document Comparison	Detect changes between versions
Vector Search	Embedding-based search across local content


⸻

B. Department Modules

Module	Features
HR	Employee document management, onboarding notes, assistant
Marketing	Campaign summaries, email drafting, competitor briefs
Finance	Table parsing, invoice review, monthly summaries

Each module includes:
	•	Custom AI prompts per department
	•	Pre-defined templates
	•	Role-based access and cross-department sharing (admin controlled)

⸻

5. Admin Hub Features

Feature	Description
User Role Management	Assign department access and control inter-team visibility
License Enforcement	Usage caps, offline lockouts, token timers
Local Logs	Encrypted activity and usage logs for audits
System Updates	Push offline updates and internal messages
Payment Monitoring	Track billing, notify when sync is overdue


⸻

6. Offline Usage Enforcement

Mechanisms:

Enforcement Feature	Function
Time-Based Tokens	Track how long system runs offline
Soft Lock Warnings	Notify user before feature lockout
Hard Lock Conditions	Lock non-critical features until sync or payment
Randomized Sync Triggers	Prevent manual date tricking or delay abuse
Device Fingerprinting	Detect unauthorized installations
Local Encrypted Logs	Maintain audit trails and offline usage history
Server Ping Verification	Check-in required for license validation at set intervals


⸻

7. Payment & Licensing System

Modes:
	•	Monthly Subscriptions by department or usage
	•	Bulk Package Licenses for 20+ user deployments
	•	Add-On Licenses for optional advanced modules

Gateway Routing:

Component	Logic
Default: Stripe	Used globally unless country override applies
Fallback: Flutterwave	Used for African users based on BIN/country detection
Admin Overrides	Manual control of fallback logic, pricing, and routing
Geo-Based Pricing	Adjust license pricing per region


⸻

8. Optional Internet-Based Add-ons (MVP 4+)

Module	Functionality
Gmail, Drive	Pull emails, documents, summarize and tag
Slack, Notion	Fetch notes, discussions, and convert into structured summaries
Cloud Boost AI	For advanced questions (via GPT or Med-Gemini API; opt-in only)

Core system stays fully offline. Internet features are clearly separated as opt-in add-ons.

⸻

9. Desktop Architecture

Component	Description
Electron App	Department desktop clients with AI and UI
FastAPI Server	Backend for LAN sync, enforcement, note API
SQLite DB	Department-specific local storage
LAN Sync	Admin-Child sync system with version resolution


⸻

10. Tech Stack

Layer	Stack/Tooling
UI	React (Admin), Vue/Electron (Child apps)
AI Engine	Gemma 3.1B (with future upgrade to 3.n planned)
Data Storage	SQLite + JSON notes
Syncing Layer	Local HTTP or WebSocket
Cloud Add-ons	GPT/Med-Gemini (optional, controlled by admin policy)


⸻

11. Development Notes

Current AI Model: Gemma 3.1B
	•	All AI features (summarization, redaction, grammar, reasoning) are optimized for Gemma 3.1B.
	•	Chosen for efficiency and small size to run fully offline on standard devices.
	•	Allows fully disconnected operations with predictable memory use.

Planned Upgrade: Gemma 3.n
	•	Once Gemma 3.n is stable, it will replace 3.1B in the core system.
	•	Expected improvements:
	•	Longer context handling
	•	Better reasoning across multiple documents
	•	More fluid and accurate generation
	•	Designed to be a drop-in upgrade that doesn’t break existing workflows or offline capability.

⸻

12. Deployment & Packaging

Method	Details
Self-Hosted	Works offline after initial setup
Desktop Bundles	macOS .dmg and Windows .exe builds
Admin Server	One machine per company manages licensing, sync, and enforcement


⸻

13. MVP Roadmap (Updated)

MVP Phase	Features
MVP 1	Core summarization, redaction, Gemma 3.1B engine, HR module
MVP 2	Add Finance & Marketing modules, spell check, table support
MVP 3	Admin dashboard, role management, LAN sync engine
MVP 4	Payment system, Stripe/Flutterwave routing, soft locks, usage logging
MVP 5	Add-on modules (Gmail, Drive, Slack), optional cloud enhancement API
MVP 6	Auto-export to PDF/Markdown, version tracking, analytics dashboard


⸻

14. Security and Privacy
	•	All user data and AI processing remain local
	•	Logs are encrypted; syncing is LAN-based only
	•	Optional cloud access is opt-in and isolated from offline logic
	•	No background network requests unless explicitly allowed by admin

⸻

Let me know if you want it exported in:
	•	Markdown (.md)
	•	Word (.docx)
	•	Notion-compatible format
	•	PDF for sharing