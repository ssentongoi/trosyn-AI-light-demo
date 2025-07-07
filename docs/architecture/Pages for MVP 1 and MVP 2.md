main pages** for **MVP 1** and **MVP 2

---

## ✅ MVP 1 — Core Infrastructure & Sync (Superadmin + Company Hub)

### 1. **Superadmin Dashboard**

* **Purpose**: Monitor connected companies (not their content)
* **Key Components**:

  * Company list
  * Plan/tier overview
  * Last sync timestamp
  * Token status
  * Soft lock indicators

---

### 2. **Superadmin Login Page**

* **Purpose**: Restricted access to central control
* **Key Components**:

  * Secure login form
  * Optional 2FA
  * Basic branding

---

### 3. **Company Hub Dashboard**

* **Purpose**: Central interface for each company
* **Key Components**:

  * Department status overview
  * Current license & sync info
  * Notices from Superadmin
  * Manual sync trigger

---

### 4. **Licensing & Sync Page (Company Hub)**

* **Purpose**: Manage token, licensing, and online sync
* **Key Components**:

  * Manual “Sync Now” button
  * Token validity status
  * Offline time left
  * Export sync logs

---

### 5. **Device Registration Page**

* **Purpose**: Add/register new machines to a company hub
* **Key Components**:

  * Device ID entry
  * Device name/tag
  * PIN or QR verification

---

---

## 🧩 MVP 2 — Internal Use, Departments, and AI Access

### 6. **Login Page (Company Users)**

* **Purpose**: Login for employees using department tools
* **Key Components**:

  * User ID/password field
  * Device-local authentication

---

### 7. **Department Dashboard**

* **Purpose**: Per-department AI access + oversight
* **Key Components**:

  * Recent activity summary
  * AI usage count
  * Status of requests
  * Access to department tools (e.g. memory, files)

---

### 8. **AI Assistant Page**

* **Purpose**: Interface to chat, summarize, analyze, etc.
* **Key Components**:

  * Prompt input area
  * File upload zone (for local analysis)
  * Results panel
  * Context tracker (history/tags)

---

### 9. **Memory Page**

* **Purpose**: Stores recent topics, assistant interactions, and context per department
* **Key Components**:

  * List of past sessions
  * Summarized memory
  * Clear/reset controls
  * Exportable summaries

---

### 10. **Documents & Files Page**

* **Purpose**: Upload, view, analyze internal documents (offline)
* **Key Components**:

  * File list view
  * Tagging system
  * AI actions (summarize, redact, rewrite)
  * Version control

---

### 11. **Notifications Page**

* **Purpose**: Display assistant suggestions, system alerts, and admin messages
* **Key Components**:

  * AI notifications (e.g. “You forgot to sync yesterday”)
  * Internal messages (e.g. “HR policy updated”)
  * Smart alerts (e.g. lock warnings)

---

### 12. **Department Request Page**

* **Purpose**: Inter-department or user-to-admin request interface
* **Key Components**:

  * Request type selector
  * Optional AI-drafted message
  * Request history view

---

---

## 📌 Summary Table

| Phase | Page Name                  | Role                       |
| ----- | -------------------------- | -------------------------- |
| MVP 1 | Superadmin Dashboard       | Monitor companies          |
| MVP 1 | Superadmin Login Page      | Secure access              |
| MVP 1 | Company Hub Dashboard      | Company-level control      |
| MVP 1 | Licensing & Sync Page      | Token + sync mgmt          |
| MVP 1 | Device Registration Page   | Register offline devices   |
| MVP 2 | Login Page (Company Users) | Staff login                |
| MVP 2 | Department Dashboard       | Dept-level AI access       |
| MVP 2 | AI Assistant Page          | User-AI interaction        |
| MVP 2 | Memory Page                | Store AI session context   |
| MVP 2 | Documents & Files Page     | Upload + analyze docs      |
| MVP 2 | Notifications Page         | Alerts & assistant prompts |
| MVP 2 | Department Request Page    | Cross-role/internal comms  |

