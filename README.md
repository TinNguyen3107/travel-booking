# 🌍 Travel Booking Application

A modern web application for booking travel experiences, built with React, TypeScript, and powered by Google Gemini AI.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Build & Deployment](#build--deployment)
- [Project Structure](#project-structure)

## ✨ Features

- Browse and book travel experiences
- User authentication and login
- Admin panel for managing bookings
- FAQ section
- Experience details modal
- Booking confirmation
- Responsive design with Tailwind CSS

## 🛠️ Tech Stack

**Frontend:**
- React 19
- TypeScript
- Vite (build tool)
- Tailwind CSS
- Lucide React (icons)
- Motion (animations)

**Backend:**
- Express.js
- Node.js (tsx for TypeScript execution)

**Database:**
- MySQL

## 📦 Prerequisites

- Node.js (v16 or higher)
- MySQL database server
- Google Gemini API key

## 🚀 Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd TravelBooking
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` file and configure environment variables:
   ```` file and configure environment variables:
   ```
   APP_URL=http://localhost:3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_DATABAS

## 💻 Running the Application

**Development mode:**
```bash
npm run dev
```
The application will start on `http://localhost:5173`

**Build for production:**
```bash
npm run build
```

**Start production server:**
```bash
npm start
```

**Clean build artifacts:**
```bash
npm run clean
```

**Lint TypeScript:**
```bash
npm run lint
```

## 📁 Project Structure

```
TravelBooking/
├── src/
│   ├── components/          # React components
│   │   ├── AdminPanel.tsx
│   │   ├── FAQSection.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── ModalBooking.tsx
│   │   ├── ModalConfirm.tsx
│   │   ├── ModalExperienceDetail.tsx
│   │   └── ModalLogin.tsx
│   ├── App.tsx              # Main App component
│   ├── main.tsx             # React entry point
│   ├── index.css            # Global styles
│   ├── types.ts             # TypeScript type definitions
│   └── vite-env.d.ts        # Vite environment types
├── server.ts                # Express server setup
├── server_db.ts             # Database configuration
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
├── package.json             # Project dependencies
├── index.html               # HTML entry point
└── README.md                # This file
```

## 📝 Notes

- Make sure your MySQL database is running before starting the application
- The database schema should be initialized before running the app
- Check `server_db.ts` for database configuration details

## 🔐 Security

- Keep your `GEMINI_API_KEY` and database credentials secure
- Never commit `.env.local` to version control
- Add `.env.local` to `.gitignore`

## 📄 License

This project is part of an internship training program.
