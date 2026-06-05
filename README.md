# Hullu Gym - Customer Management System

A modern, professional gym management system for Hullu Gym with customer management, payment tracking, and membership management.

![Hullu Gym](https://img.shields.io/badge/Hullu%20Gym-v1.0.0-gym?style=for-the-badge)

## Features

✅ **Secure Authentication** - JWT-based login system with password protection

✅ **Customer Management**
- Add, edit, and delete customers
- Photo upload from computer
- Customer search and filtering
- Smart sorting (active members first, then by expiration)

✅ **Membership Types**
- 1 Month
- 2 Months
- 3 Months
- 6 Months
- 1 Year

✅ **Payment Tracking**
- Record payments with amount and method
- Auto-calculate new expiration date
- Payment history per customer
- Revenue tracking

✅ **Smart Customer Arrangement**
- **Active** - Currently paying members
- **Expiring Soon** - Within 7 days of expiration
- **Expired** - Membership ended
- **Inactive** - No activity for 30+ days

✅ **Advanced Features**
- Full-screen photo view on click
- Delete confirmation with security code
- Check-in/Check-out attendance tracking
- Customer notes and emergency contacts
- Multiple view modes (Grid/List)

## Tech Stack

- **Backend**: Node.js + Express + SQLite
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: SQLite (local file-based)
- **Authentication**: JWT

## Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Installation

1. **Install Backend Dependencies**
```bash
cd server
npm install
```

2. **Install Frontend Dependencies**
```bash
cd client
npm install
```

3. **Start Backend Server**
```bash
cd server
npm start
```
Server will run on `http://localhost:3000`

4. **Start Frontend (in new terminal)**
```bash
cd client
npm run dev
```
Frontend will run on `http://localhost:5173`

## Default Login Credentials

| Username | Password |
|----------|----------|
| admin | HulluGym2024! |

## Delete Security Code

When deleting a customer, you'll need to enter the security code:
```
DELETE123
```

## Project Structure

```
D:\Hullu Ceramics\Gym\
├── server/                 # Backend API
│   ├── src/
│   │   ├── server.js      # Express server
│   │   ├── models/        # Database models
│   │   ├── routes/       # API routes
│   │   └── middleware/    # Auth middleware
│   ├── uploads/           # Customer photos
│   └── data/              # SQLite database
│
└── client/                 # React frontend
    ├── src/
    │   ├── components/    # Reusable components
    │   ├── pages/         # Page components
    │   ├── context/       # React context
    │   └── utils/         # Utility functions
    └── public/            # Static assets
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Customers
- `GET /api/customers` - List all customers
- `GET /api/customers/:id` - Get customer details
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer (requires security code)
- `POST /api/customers/:id/extend` - Extend membership
- `POST /api/customers/:id/check-in` - Check in
- `POST /api/customers/:id/check-out` - Check out

### Payments
- `GET /api/payments` - List payments
- `POST /api/payments` - Record payment

### Stats
- `GET /api/stats/dashboard` - Dashboard statistics

## License

© 2024 Hullu Gym. All rights reserved.
