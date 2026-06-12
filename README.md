# Corporate Smart Attendance System

A comprehensive, full-stack Attendance Management Solution designed for modern corporates. This project seamlessly integrates a React Native Mobile App for employees to mark their attendance using Face Scanning and GPS, a React Web Portal for Admins/HR to monitor everything, and a robust Express/MongoDB backend to tie it all together in real-time.

---

## 🚀 Key Features

### 📱 Employee Mobile App (React Native + Expo)
- **Face Scan Check-In**: Uses the device camera for identity verification.
- **Geolocation Validation**: GPS coordinates are recorded during check-in/check-out.
- **Personal Dashboard**: Real-time stats on hours worked, weekly attendance percentage, and status.
- **Leave Management**: Apply for Sick, Casual, or Earned leaves directly from the app.
- **Profile Management**: View and edit personal details and contact information.

### 💻 Admin Web Portal (React + Vite + Tailwind CSS)
- **Live Dashboard**: Real-time overview of present/absent employees, late arrivals, and department statistics (powered by Recharts).
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
- **Frontend (Mobile)**: React Native, Expo, React Navigation, AsyncStorage, HeroIcons

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
