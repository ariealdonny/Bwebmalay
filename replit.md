# BIMB Secure - Banking Transaction Authorization App

## Overview

This is a mobile-first banking transaction authorization application that simulates a secure fund transfer flow with Telegram notifications. The app mimics a Bank Islam Malaysia Berhad (BIMB) style interface with dark mode theming and red accent colors. Users can submit fund transfer requests through a form, which then redirects to an authorization page with a countdown timer for approve/reject actions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Styling**: Tailwind CSS with custom dark theme variables, shadcn/ui component library
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Form Handling**: React Hook Form with Zod validation via @hookform/resolvers

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ESM modules
- **API Pattern**: REST endpoints defined in shared/routes.ts with Zod schemas for type-safe request/response validation
- **Build Tool**: esbuild for server bundling, Vite for client bundling

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: shared/schema.ts (single transactions table)
- **Migrations**: Drizzle Kit with migrations output to ./migrations directory

### Key Design Patterns
- **Monorepo Structure**: Client, server, and shared code in single repository
- **Shared Types**: Schema and route definitions shared between frontend and backend via @shared alias
- **Type-Safe API**: Zod schemas validate both client requests and server responses
- **Storage Abstraction**: IStorage interface in server/storage.ts allows swapping database implementations

### Application Flow
1. User fills fund transfer form on home page (/)
2. Form submission creates transaction via POST /api/transactions
3. Transaction saved to localStorage and user redirected to /authorize/:id
4. Authorization page displays transaction details with 2-minute countdown
5. User can approve or reject, triggering POST /api/transactions/:id/status
6. Status update sends Telegram notification (if bot token configured)

## External Dependencies

### Database
- **PostgreSQL**: Required, connection via DATABASE_URL environment variable
- **Drizzle ORM**: Database queries and schema management

### Third-Party Services
- **Telegram Bot API**: Optional notification system via node-telegram-bot-api
  - Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables
  - Sends formatted transaction notifications on status updates

### UI Component Library
- **shadcn/ui**: Pre-built accessible components using Radix UI primitives
- **Radix UI**: Headless UI primitives for dialogs, forms, tooltips, etc.

### Development Tools
- **Vite**: Frontend dev server with HMR
- **Replit Plugins**: Runtime error overlay, cartographer, dev banner (development only)