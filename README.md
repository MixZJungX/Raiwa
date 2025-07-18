# Thai Robux Redemption System

## Technology Stack

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (for authentication and database)

## Features

- **User Redemption**: Allows users to redeem Robux codes
- **Status Check**: Users can check their redemption status
- **Admin Dashboard**: Admins can manage codes and redemption requests
- **Thai Language**: Fully localized in Thai language

## Setup Instructions

### Prerequisites

- Node.js (v16 or later)
- pnpm

### Installation

```bash
# Install dependencies
pnpm install
```

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
VITE_SUPABASE_URL=https://yvactofmmdiauewmkqnk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2YWN0b2ZtbWRpYXVld21rcW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTM1MDcsImV4cCI6MjA2ODA2OTUwN30.JnejY9s6rRR75O3h7FqkGzWDkSQTmJ8W4R0cA_MME34
```

### Initial Admin Setup

To create the initial admin account, you can make a POST request to the edge function with the following curl command:

```bash
curl -X POST "https://yvactofmmdiauewmkqnk.functions.supabase.co/app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_create_admin" \
-H "Content-Type: application/json" \
-d '{"email": "admin@example.com", "password": "your-secure-password", "secret": "admin-setup-secret-key"}'
```

Or use a tool like Postman or Insomnia with this JSON body:

```json
{
  "email": "admin@example.com",
  "password": "your-secure-password",
  "secret": "admin-setup-secret-key"
}
```

The secret key can be changed in the Supabase environment variables by setting `APP_9C8F2CF91BF942B2A7F12FC4C7EE9DC6_ADMIN_SECRET`.

### Development

```bash
# Start development server
pnpm run dev
```

### Build

```bash
# Build for production
pnpm run build
```

## Application Structure

- `/src/pages`: Contains all page components (Home, Admin, Status, Login, ChangePassword)
- `/src/components`: Contains reusable components
- `/src/lib`: Contains utilities like Supabase client setup
- `/src/contexts`: Contains context providers like AuthContext
- `/src/types`: Contains TypeScript type definitions

## Database Schema

The application uses two main tables in Supabase:

### Redeem Codes Table

```sql
CREATE TABLE app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_redeem_codes (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  value INTEGER NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
```

### Redemption Requests Table

```sql
CREATE TABLE app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_redemption_requests (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL,
  roblox_username TEXT NOT NULL,
  contact_info TEXT NOT NULL,
  phone TEXT,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
```