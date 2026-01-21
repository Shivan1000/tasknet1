# TaskNet

A modern task management and earnings platform with Reddit integration and real-time tracking.

## Features

- 🔐 **User Authentication** - Secure login and account management
- 🎯 **Task Management** - Browse, claim, and complete tasks
- 💰 **Earnings Tracking** - Monitor your balance and withdrawal history
- 🔗 **Reddit Integration** - Link Reddit accounts and track karma in real-time
- 📊 **Admin Panel** - Comprehensive task and user management
- 🎨 **Modern UI** - Clean, responsive design with Tailwind CSS
- ⚡ **Real-time Updates** - Live status updates and notifications

## Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **API Integration**: Reddit Public API with CORS proxy fallback

## Prerequisites

Before you begin, ensure you have:

- Node.js 16+ and npm installed
- A Supabase account and project set up
- Discord webhook URL (for login monitoring)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tasknet.git
   cd tasknet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase database**
   
   Run the SQL commands from `sql_updates.sql` in your Supabase SQL editor to create the necessary tables, policies, and triggers.

## Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Build

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm preview
```

## Project Structure

```
tasknet/
├── src/
│   ├── components/
│   │   ├── Layout.tsx          # Main layout wrapper
│   │   └── Navbar.tsx          # Navigation with live stats
│   ├── lib/
│   │   └── supabase.ts         # Supabase client configuration
│   ├── pages/
│   │   ├── Account.tsx         # User profile and Reddit linking
│   │   ├── AdminPanel.tsx      # Admin task management
│   │   ├── Dashboard.tsx       # Main user dashboard
│   │   ├── Landing.tsx         # Landing page
│   │   ├── Login.tsx           # User login
│   │   ├── RedditLogin.tsx     # Reddit-style login capture
│   │   ├── TaskDetails.tsx     # Individual task view
│   │   ├── TaskTracking.tsx    # Task tracking and submission
│   │   └── WithdrawEarnings.tsx # Earnings management
│   ├── App.tsx                 # Main app component with routing
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── .env                        # Environment variables
├── sql_updates.sql             # Database schema
└── package.json                # Dependencies and scripts
```

## Features in Detail

### Reddit Integration

- Link Reddit accounts with real-time karma tracking
- Automatic validation of suspended accounts
- CORS proxy fallback for reliable API access
- Live karma updates in the navbar

### Task Management

Users can:
- Browse available tasks
- Claim tasks to work on
- Submit completed work with proof links
- Track task status (available, claimed, submitted, verified, approved, rejected)

Admins can:
- Create and manage tasks
- Review submissions
- Approve or reject completed work
- Monitor user activity

### Earnings System

- Track available balance
- View transaction history
- Manage payout methods
- Withdraw earnings (when balance threshold is met)

## Database Schema

Key tables:
- `profiles` - User profiles with social account links
- `tasks` - Task definitions and requirements
- `admin_alerts` - Admin notifications and alerts

See `sql_updates.sql` for the complete schema with Row Level Security policies.

## Deployment

### Netlify

The project is configured for Netlify deployment:

1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy settings are in `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`

### Other Platforms

The built files in `dist/` can be deployed to any static hosting service (Vercel, Cloudflare Pages, etc.).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@tasknet.com or join our Discord community.

## Acknowledgments

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
