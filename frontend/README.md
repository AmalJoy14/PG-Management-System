# PG Management System

A simple MVP PG (Paying Guest) Management System frontend built with React + Vite.

## Features

### Owner Dashboard
- View list of tenants
- Add new tenants
- View rent/payment status for each tenant
- View and manage maintenance complaints
- Update complaint status (pending/resolved)

### Tenant Dashboard
- View own profile details
- View rent/payment history
- Raise maintenance complaints
- View status of submitted complaints

## Tech Stack

- **Frontend Framework**: React 18 + Vite
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Styling**: CSS Modules

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure the API base URL in `src/api/axios.js`:
```javascript
const API_BASE_URL = 'http://localhost:5000/api' // Update with your backend URL
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## API Endpoints Expected

The frontend expects the following REST API endpoints from the backend:

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/signup` - Register new user

### Tenants (Owner only)
- `GET /api/tenants` - Get all tenants
- `POST /api/tenants` - Add new tenant

### Payments
- `GET /api/payments` - Get all payments (Owner)
- `GET /api/payments/my-payments` - Get own payment history (Tenant)

### Complaints
- `GET /api/complaints` - Get all complaints (Owner)
- `GET /api/complaints/my-complaints` - Get own complaints (Tenant)
- `POST /api/complaints` - Create new complaint (Tenant)
- `PATCH /api/complaints/:id` - Update complaint status (Owner)

## Project Structure

```
src/
├── api/
│   └── axios.js              # Axios instance with interceptors
├── components/
│   ├── ProtectedRoute.jsx    # Route protection component
│   └── Sidebar.jsx           # Navigation sidebar
├── context/
│   └── AuthContext.jsx       # Authentication context
├── pages/
│   ├── Login.jsx             # Login page
│   ├── Signup.jsx            # Signup page
│   ├── OwnerDashboard.jsx    # Owner dashboard
│   └── TenantDashboard.jsx   # Tenant dashboard
├── App.jsx                   # Main app component with routes
└── main.jsx                  # Application entry point
```

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Notes

- All API calls include JWT token in Authorization header
- Token and user data are stored in localStorage
- Role-based routing ensures users only access authorized pages
- Loading states and error handling are implemented throughout
