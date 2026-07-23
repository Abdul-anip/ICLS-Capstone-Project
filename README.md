# ICLS — Interactive Coding Learning System

> A full-stack interactive platform for learning to code, featuring a live in-browser code editor, structured curriculum, and progress tracking.

[![React](https://img.shields.io/badge/React%2019-0A0A0A?style=flat-square&logo=react&logoColor=white)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0A0A0A?style=flat-square&logo=fastapi&logoColor=white)]()
[![MySQL](https://img.shields.io/badge/MySQL-0A0A0A?style=flat-square&logo=mysql&logoColor=white)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-0A0A0A?style=flat-square)](LICENSE)

---

## About The Project

ICLS (Interactive Coding Learning System) is a capstone project built to solve a common problem: most online coding platforms require complex setups. ICLS provides an all-in-one learning environment where students can:

- Follow structured coding lessons
- Write and execute code directly in the browser (no setup required)
- Track their learning progress through charts and dashboards
- Get immediate feedback on their exercises

---

## Screenshots

**Teacher Dashboard**
![Teacher Dashboard](screenshots/dashboard-teacher.png)

**Student Dashboard**
![Student Dashboard](screenshots/dashboard-student.png)

**In-Browser Code Editor**
![Code Editor](screenshots/code-editor.png)

**Account Management**
![Account Management](screenshots/account-management.png)

---

## Features

- **Live In-Browser Code Editor** — Powered by Monaco Editor (same engine as VS Code)
- **Structured Lesson Modules** — Organized curriculum with chapters and exercises
- **Progress Tracking Dashboard** — Visual charts showing learning completion
- **RESTful API Backend** — Clean, documented FastAPI backend
- **User Authentication** — Secure login and session management
- **Role-Based Access** — Separate views for Teachers and Students
- **Responsive Design** — Works on desktop and mobile

---

## Tech Stack

| Layer | Technology |
|:---|:---|
| Frontend | React 19, Vite, Monaco Editor |
| Backend | FastAPI (Python) |
| ORM | SQLAlchemy |
| Database | MySQL |
| Styling | Tailwind CSS |
| Dev Tools | Git, NPM, pip |

---

## Folder Structure

```
ICLS-Capstone-Project/
├── frontend/               # React 19 + Vite frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page-level components (Dashboard, Editor, etc.)
│   │   ├── hooks/          # Custom React hooks
│   │   └── api/            # API client functions
│   └── public/
├── backend/                # FastAPI Python backend
│   ├── routers/            # API route handlers
│   ├── models/             # SQLAlchemy DB models
│   ├── schemas/            # Pydantic request/response schemas
│   └── main.py             # FastAPI app entry point
└── screenshots/            # Project screenshots
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- MySQL 8.0+

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/Abdul-anip/ICLS-Capstone-Project.git
cd ICLS-Capstone-Project
```

**2. Backend Setup**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

**3. Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

**4. Access the app**

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

## Author

**Abdul Hanif** — D4 Software Engineering Technology, Politeknik Negeri Padang

[![Portfolio](https://img.shields.io/badge/Portfolio-0A0A0A?style=flat-square&logo=vercel&logoColor=white)](https://abdul-anip.github.io/CV/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A0A0A?style=flat-square&logo=linkedin&logoColor=white)](https://linkedin.com/in/abdul-hanif-78649b331)
