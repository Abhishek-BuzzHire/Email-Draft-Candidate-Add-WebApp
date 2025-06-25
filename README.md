# Email-Draft-Candidate-Add-WebApp ✉️ Candidate Email Draft Automation Web App

A productivity tool built to help HR teams streamline and **automate the process of creating candidate email drafts**. Instead of writing structured candidate emails from scratch, employees can now generate a clean, formatted draft in seconds based on database-driven inputs.

---

## 🎯 Goal

The goal of this app is to **eliminate the manual, repetitive effort** involved in writing candidate introduction emails. HR employees can input candidate details once, select what to include, arrange the fields as needed, and **instantly generate a copy-ready email draft**.

---

## 🚀 How It Works

1. **Add Candidate Data**
   - Employee clicks on **"Add Candidate"**.
   - Fills out a form with candidate details (name, email, position, etc.).
   - On submit:
     - Data is saved in **two tables**:
       - `Candidate` table
       - `Recipients` table

2. **Select Fields for Email**
   - After submission, the user is redirected to a **field selection page**.
   - Here, the employee:
     - Selects which fields to include via checkboxes.
     - Uses **drag-and-drop** to set the display order of fields.

3. **Email Draft Generation**
   - On clicking **"Save Changes"**, the user is taken to the **final draft page**.
   - A full **email draft** is generated using selected fields in a **tabular format**.
   - A **"Copy Draft"** button allows the employee to copy the content for emailing.

---

## 🧰 Tech Stack

| Layer        | Technology           |
|--------------|-----------------------|
| Frontend     | React.js, Tailwind CSS |
| Backend      | Python (Flask)        |
| Database     | MySQL                 |
| Hosting      | Apache Server         |

---

## ⚙️ Features

- ✅ Easy candidate form submission.
- ✅ Dual-table data insertion: Candidate & Recipients.
- ✅ Dynamic field selection with checkboxes.
- ✅ **Drag-and-drop reordering** of email fields.
- ✅ Auto-generated email draft in table format.
- ✅ One-click copy for fast pasting into an email.

---

## 🛠️ How to Run Locally

### Prerequisites
- Node.js & npm
- Python 3.x with Flask
- MySQL server
- Apache or local development server (e.g., XAMPP, WAMP)


## 🙌 Why This Matters
This tool helps your HR team:

Save valuable time every day.

Maintain a consistent email format.

Reduce human error in email creation.

Focus more on hiring, less on formatting.

### 1. Clone the Repository

```bash
git clone https://github.com/Abhishek-BuzzHire/Email-Draft-Candidate-Add-WebApp.git
cd your-repo-name
cd frontend
npm install
npm run dev
cd backend
python -m venv venv
source venv/bin/activate  # Or `call venv\\Scripts\\activate` on Windows
python app.py




