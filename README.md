# Corporate Smart Attendance System

A comprehensive, full-stack Attendance Management Solution designed for modern corporates. This project seamlessly integrates a React Native Mobile App for employees to mark their attendance using Biometric Authentication (Fingerprint/Face ID) and GPS, a React Web Portal for Admins/HR to monitor everything, and a robust Express/MongoDB backend to tie it all together in real-time.

---

## 🚀 Key Features

### 📱 Employee Mobile App (React Native + Expo)
- **Biometric App Unlock**: Returning users can instantly unlock the app using device biometrics (Fingerprint/FaceID) instead of passwords.
- **Biometric Check-In & Smart Punch**: Securely punch attendance using the device's native biometric hardware. A single smart button detects current status and checks the user in or out accordingly.
- **Attendance History & Admin Reporting**: View past 30 days of attendance records. Admins can view a comprehensive **Monthly Breakdown Grid** directly on mobile, including daily status (Present, Late, Half-Day, Absent).
- **Export to CSV**: Mobile Admins can export the entire monthly report to a `.csv` file and instantly share it via the phone's native Share/Save menu.
- **Dynamic Time-Based UI**: The dashboard and profile pages dynamically shift their color palettes and greetings based on the time of day (Morning, Afternoon, Evening, Night).
- **Geolocation Validation**: GPS coordinates are recorded during check-in/check-out.
- **Leave & WFH Management**: Apply for Sick, Casual, Earned leaves, or request WFH directly from the app.
- **Profile Management**: View and edit personal details with a stunning, modern glassmorphism aesthetic.

### 💻 Admin Web Portal (React + Vite + Tailwind CSS)
- **Live Dashboard**: Real-time overview of present/absent employees, late arrivals, and department statistics (powered by Recharts).
- **Detailed Monthly Breakdown**: A robust Reports page featuring an expandable accordion for every employee, displaying a highly detailed, calendar-style breakdown of their entire month.
- **One-Click Export**: Easily export any generated monthly report directly to `.csv` for Excel or payroll software.
- **Employee Directory**: Manage the entire workforce, view individual profiles, and adjust designations.
- **Leave Approvals**: One-click Approve or Reject functionality for employee leave requests.
- **Role Segregation**: Smart login logic restricts the Mobile App to Employees only and the Web Portal to Admins.

### ⚙️ Backend API (Node.js + Express + MongoDB)
- **Secure Authentication**: JWT-based stateless authentication with password hashing (bcrypt).
- **Real-Time Updates**: Socket.io integration pushes live check-ins directly to the Admin dashboard.
- **Cloud Media**: Cloudinary integration for handling profile pictures and face scan data.
- **Comprehensive Logging**: Morgan for request tracing and structured Error handling middlewares.

---

## 🏗️ Project Architecture

The project is structured into three main directories:

1. **`/backend`** - Node.js Express server and MongoDB models.
2. **`/admin`** - React (Vite) web portal for HR/Admin management.
3. **`/mobile`** - React Native (Expo) mobile application for employees.

---

## 🛠️ Tech Stack

- **Database**: MongoDB & Mongoose
- **Backend**: Node.js, Express.js, JWT, Socket.io, Cloudinary
- **Frontend (Web)**: React, Vite, Tailwind CSS, Redux Toolkit, Recharts, Lucide Icons
- **Frontend (Mobile)**: React Native, Expo, React Navigation, AsyncStorage, expo-local-authentication, HeroIcons

---

## 💻 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [MongoDB](https://www.mongodb.com/) (Local instance on `localhost:27017` or MongoDB Atlas URL)
- Expo CLI (`npm install -g expo-cli`)

### 1. Start the Backend
```bash
cd backend
npm install
# Ensure you have a .env file configured based on the .env.example
npm start
# The backend will run on http://localhost:5000
```

### 2. Start the Admin Web Portal
```bash
cd admin
npm install
npm run dev
# The admin portal will run on http://localhost:3000 (or the port specified by Vite)
```

### 3. Start the Mobile App
```bash
cd mobile
npm install
npm start -c
# Scan the QR code with the Expo Go app on your phone, or press 'a' for Android emulator
```

---

## 🔐 Default Credentials

### Admin (Web Portal)
- **Email:** `admin@smartattend.com`
- **Password:** `admin123`

### Employee (Mobile App)
- **Email:** `virajsomani@gmail.com`
- **Password:** `employee123`

---

## 📝 License
This project is proprietary and built for corporate attendance management.
