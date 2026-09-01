# 🚀 RemindNotes — Fullstack Notes & Reminder Web App

A production-ready, fullstack Notes & Reminder application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS v4**, **Prisma ORM**, **Supabase PostgreSQL**, and **Auth.js (NextAuth)**.

---

## 🌟 Key Features

- **⚡ Modern Next.js Architecture**: App Router with TurboPack, TypeScript, and Server/Client Component optimization.
- **🔐 Secure Authentication**: Auth.js with credentials provider, bcrypt (12 rounds) password hashing, and stateless JWT sessions.
- **🛡️ Route Protection Middleware**: Automatic route guard (`middleware.ts`) that protects authenticated pages and seamlessly redirects unauthenticated users to `/login`.
- **🗄️ PostgreSQL Database**: Cloud-hosted Supabase PostgreSQL integrated via Prisma ORM with connection pooling support.
- **📱 Ultra-Responsive App Shell**:
  - **Desktop**: Collapsible sticky sidebar, global search, notification center, and user profile popover.
  - **Mobile**: Glassmorphism top bar, slide-out drawer navigation, and a floating bottom navigation bar with one-thumb quick actions.
- **📝 Auth Pages**: Form validation powered by **Zod** and **React Hook Form** with real-time feedback on `/login`, `/signup`, and `/forgot-password`.
- **⚙️ Profile & Cross-Device Preferences**:
  - Custom display name and avatar URL editor with live preview.
  - **Theme Sync**: Light, Dark, and System Match toggle that immediately applies UI changes and persists to the PostgreSQL database (`User.theme`) for cross-device consistency.
  - **Timezone Selector**: Accurate reminder scheduling with automatic browser detection and manual override.

---

## 📂 Project Structure

```
├── app/
│   ├── (auth)/                  # Public authentication routes
│   │   ├── layout.tsx           # Ambient showcase split layout
│   │   ├── login/page.tsx       # Sign in page with Zod validation
│   │   ├── signup/page.tsx      # Registration with auto timezone & auto-login
│   │   └── forgot-password/     # Password reset request flow
│   ├── (dashboard)/             # Protected authenticated routes
│   │   ├── layout.tsx           # AppShell wrapper
│   │   ├── dashboard/page.tsx   # Dashboard with metrics, notes & reminders
│   │   └── settings/page.tsx    # Profile, timezone & DB-synced theme settings
│   ├── api/
│   │   ├── auth/                # NextAuth & Signup API endpoints
│   │   └── user/profile/        # User profile & preferences API
│   ├── globals.css              # Tailwind CSS v4 & theme variables
│   ├── layout.tsx               # Root layout with Session & Theme Providers
│   └── page.tsx                 # Root redirect to /dashboard
├── components/
│   ├── layout/                  # AppShell, Sidebar, and MobileNav
│   ├── providers/               # NextAuth Session & Theme Providers
│   ├── theme-toggle.tsx         # Dark/Light/System mode switcher
│   └── user-nav.tsx             # User profile avatar & sign out popover
├── lib/
│   ├── auth.ts                  # Auth.js NextAuth configuration
│   ├── prisma.ts                # Singleton Prisma Client instance
│   └── utils.ts                 # Formatting & helper utilities
├── prisma/
│   └── schema.prisma            # PostgreSQL schema (User & Note models)
├── middleware.ts                # Next.js Route protection middleware
└── types/
    └── next-auth.d.ts           # Extended NextAuth session types
```

---

## 🛠️ Getting Started

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (see `.env.example`):
```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"

NEXTAUTH_SECRET="your-secret-key-at-least-32-characters"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Synchronize Database Schema
```bash
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.
