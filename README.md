# 🛡️ CampusTrust - Anonymous Rumor Verification System (NUST Olympiad Hackathon)

A decentralized truth verification system using Bayesian inference, cryptographic anonymity, and game-theoretic incentives to separate fact from fiction on campus.

## 🎯 Features

- **🔒 Anonymous Voting** - No identity tracking, cryptographic vote hashing
- **📊 Bayesian Trust Scores** - Dynamic probability-based scoring
- **⚖️ Weighted Votes** - Reputation × Evidence Quality × Stake
- **🤖 Bot Detection** - Statistical analysis of voting patterns
- **🧠 AI Summarization** - Gemini API for content analysis
- **📸 Evidence Uploads** - Cloudinary integration for images
- **📈 Real-time Updates** - Live trust score recalculation

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Supabase account
- Google Gemini API key
- Cloudinary account (free tier)

### Installation

```bash
# Clone repository
git clone <your-repo>
cd hackathon

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
# See .env.example for required values

# Run database migration in Supabase SQL Editor
# Copy and run: RUN_THIS_IN_SUPABASE.sql

# Start development server
npm run dev
```

Visit `http://localhost:5000`

## 📦 Project Structure

```
├── api/                 # Vercel serverless functions
├── client/             # React frontend (Vite)
│   └── src/
│       ├── components/ # UI components
│       ├── pages/      # Route pages
│       └── hooks/      # React hooks
├── server/             # Express backend
│   ├── routes.ts       # API endpoints
│   ├── storage.ts      # Database layer
│   └── ai/            # AI integration
├── shared/            # Shared types/schemas
├── supabase/          # Database migrations
└── maths.md           # Mathematical proofs
```

## 🔧 Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run check
```

## 🌐 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

**Quick deploy to Vercel:**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## 📐 Mathematical Foundation

Our system uses:

1. **SHA-256 Hashing** - Collision probability < 10^-60
2. **Logarithmic Vote Scaling** - Caps mob influence by ~1000x
3. **Bayesian Updates** - Trust score = α / (α + β)
4. **Nash Equilibrium** - Truthful voting is optimal strategy
5. **Reputation Weighting** - r = (correct + 1) / (total + 2)

See [maths.md](maths.md) for complete proofs.

## 🎨 Tech Stack

**Frontend:**

- React 18
- Vite
- TailwindCSS
- Radix UI
- React Query

**Backend:**

- Express 5
- TypeScript
- Supabase (PostgreSQL)
- Drizzle ORM

**AI/ML:**

- Google Gemini Pro

**Infrastructure:**

- Vercel (hosting)
- Cloudinary (images)

## 📊 Database Schema

Key tables:

- `rumors` - Rumor content and trust scores
- `evidence` - Supporting/disputing evidence
- `evidence_votes` - Anonymous votes on evidence
- `users` - Anonymous user profiles (reputation)
- `audit_log` - Complete score history
- `vote_outcomes` - Resolution tracking

## 🔐 Security Features

- ✅ Cryptographic vote hashing
- ✅ No PII storage
- ✅ SQL injection prevention
- ✅ Rate limiting
- ✅ Environment variable protection
- ✅ HTTPS enforcement (production)

## 📝 Environment Variables

Required:

```env
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
DATABASE_URL=
GEMINI_API_KEY=
VOTE_SALT=
SESSION_SECRET=
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

See [.env.example](.env.example) for details.

## 🐛 Troubleshooting

**Build fails:**

- Check Node.js version (20+)
- Clear node_modules and reinstall
- Verify all env variables set

**Database connection issues:**

- Check Supabase project not paused
- Verify DATABASE_URL format
- Test connection in Supabase dashboard

**AI features not working:**

- Check GEMINI_API_KEY is valid
- Verify API quota not exceeded

## 📄 License

MIT

## 👥 Team

FYP Sprint Hackathon Project 2026

---

Built with ❤️ for transparent campus communication
