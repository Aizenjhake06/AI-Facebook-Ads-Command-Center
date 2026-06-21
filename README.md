# 🚀 AdPilot AI - Facebook Ads Command Center

[![Production Ready](https://img.shields.io/badge/production-ready-brightgreen.svg)](https://github.com)
[![Test Coverage](https://img.shields.io/badge/coverage-85%25-green.svg)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com)

> **AI-powered Facebook Ads management platform with automated insights, recommendations, and predictive analytics.**

---

## ✨ Overview

AdPilot AI is a comprehensive Facebook Ads management platform that combines the power of Meta's Marketing API with advanced AI analytics to help businesses optimize their ad performance, detect issues early, and make data-driven decisions.

### 🎯 Key Features

- 🔐 **Secure Authentication** - Multi-workspace support with 2FA
- 🔗 **Meta Integration** - Official Facebook Marketing API connection
- 📊 **Real-time Sync** - Automatic campaign, ad set, and ad synchronization
- 🤖 **AI Insights** - Automated performance analysis and recommendations
- 📈 **Predictive Forecasting** - Spend, revenue, and ROAS predictions
- ⚡ **Smart Alerts** - Proactive anomaly detection (ROAS drops, CPA spikes, etc.)
- 📑 **Advanced Reporting** - CSV, Excel, and PDF exports
- 📧 **Email Notifications** - Alert and digest emails
- 💯 **Health Scoring** - Campaign performance grading
- 🎨 **Modern Dashboard** - Intuitive UI with interactive charts

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Next.js Frontend                       │
│          Dashboard | Analytics | Reports                 │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                  API Routes (Next.js)                    │
└─────┬──────────────────────────────────────────┬────────┘
      │                                          │
┌─────▼────────┐                    ┌───────────▼─────────┐
│   Supabase   │                    │   Redis (Cache)     │
│  PostgreSQL  │                    │   Bull (Queue)      │
└──────────────┘                    └───────────┬─────────┘
                                                │
                                    ┌───────────▼─────────┐
                                    │  Background Workers │
                                    │ Sync | Alert | etc. │
                                    └─────────────────────┘
```

### Technology Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: Next.js API Routes, Supabase Edge Functions
- **Database**: PostgreSQL (Supabase) with Row Level Security
- **Cache/Queue**: Redis + Bull
- **Email**: Nodemailer
- **Testing**: Jest + React Testing Library
- **Deployment**: Vercel, Docker

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ 
- PostgreSQL (or Supabase account)
- Redis server
- Meta/Facebook Developer App

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/adpilot-ai.git
cd adpilot-ai
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

4. **Run database migrations**
```bash
# Via Supabase CLI or run migrations in supabase/migrations/
```

5. **Start development server**
```bash
npm run dev
```

6. **Start background workers** (in separate terminals)
```bash
npm run worker:sync
npm run worker:alerts
npm run worker:reports
npm run worker:notifications
```

Visit `http://localhost:3000` to see the application.

📖 **For detailed setup instructions**, see [QUICK_START.md](QUICK_START.md)

---

## 📦 Project Structure

```
adpilot-ai/
├── src/
│   ├── app/                      # Next.js app router pages
│   │   ├── (dashboard)/         # Dashboard routes
│   │   └── api/                 # API endpoints
│   ├── components/              # React components
│   ├── lib/                     # Core business logic
│   │   ├── auth/               # Authentication (2FA)
│   │   ├── email/              # Email templates & sender
│   │   ├── jobs/               # Background workers
│   │   ├── meta/               # Meta API client
│   │   ├── reports/            # Report generators
│   │   ├── cache.ts            # Redis caching
│   │   ├── health-score.ts     # Health scoring
│   │   ├── recommendations.ts  # AI recommendations
│   │   ├── forecasting.ts      # Predictive analytics
│   │   └── logger.ts           # Structured logging
│   └── __tests__/              # Test files
├── supabase/
│   └── migrations/             # Database migrations
├── public/                     # Static assets
└── docs/                       # Documentation
```

---

## 🎯 Core Features

### 1. Meta Account Integration
- ✅ Official Meta OAuth 2.0 flow
- ✅ Automatic Business Manager discovery
- ✅ Multi-account support
- ✅ Secure token management with auto-refresh

### 2. Data Synchronization
- ✅ Initial full sync + incremental updates
- ✅ Campaign, Ad Set, Ad, and Insights sync
- ✅ Background job processing with retry logic
- ✅ Sync status monitoring

### 3. AI-Powered Insights
- ✅ **Health Score** - 0-100 performance rating
- ✅ **Recommendations** - Budget, targeting, creative actions
- ✅ **Forecasting** - 7, 14, 30-day predictions
- ✅ **Alerts** - 7 types of anomaly detection

### 4. Advanced Reporting
- ✅ CSV export (immediate)
- ✅ Excel export (ExcelJS, styled)
- ✅ PDF export (PDFKit, professional)
- ✅ Scheduled reports
- ✅ Shareable links

### 5. Notifications
- ✅ In-app notifications
- ✅ Email notifications (alerts, reports, digests)
- ✅ User preferences (quiet hours, digest frequency)
- ✅ Multiple channels

### 6. Security
- ✅ JWT authentication
- ✅ Two-factor authentication (TOTP)
- ✅ Row Level Security (RLS)
- ✅ Role-based access control
- ✅ Encrypted token storage

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

**Current Coverage**: 85% (unit + integration tests)

---

## 📊 Monitoring

### Health Endpoints

```bash
# Basic health check
GET /api/health

# Detailed status
GET /api/status

# Prometheus metrics
GET /api/metrics
```

### Logging

Structured JSON logs with levels: `debug`, `info`, `warn`, `error`

```bash
# Set log level
LOG_LEVEL=debug npm run dev
```

---

## 🔧 Configuration

### Environment Variables

See [`.env.example`](.env.example) for complete list. Key variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Meta/Facebook
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=
SMTP_PASS=
```

---

## 🚢 Deployment

### Option 1: Vercel (Recommended)

```bash
# Deploy to Vercel
vercel deploy --prod

# Set up workers on separate server or use Vercel Cron
```

### Option 2: Docker

```bash
# Development
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose up -d
```

### Option 3: Manual

See [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md) for detailed deployment instructions.

---

## 📚 Documentation

### User Documentation
- [QUICK_START.md](QUICK_START.md) - 15-minute setup guide
- [META_CONNECTION_GUIDE.md](META_CONNECTION_GUIDE.md) - Meta OAuth setup

### Developer Documentation  
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - REST API reference
- [SYSTEM_AUDIT.md](SYSTEM_AUDIT.md) - System architecture

### Operations
- [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md) - Deployment guide
- [PROD_CHECKLIST.md](PROD_CHECKLIST.md) - Launch checklist
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md) - Status report

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write tests for new features
- Follow existing code style
- Update documentation
- Add JSDoc comments to functions

---

## 📝 Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Testing
npm test                 # Run tests
npm run test:coverage    # Generate coverage report

# Workers
npm run worker:sync      # Start sync worker
npm run worker:alerts    # Start alert worker
npm run worker:reports   # Start report worker
npm run worker:notifications  # Start notification worker
npm run worker:all       # Start all workers

# Utilities
npm run lint             # Run ESLint
npm run setup            # Run setup validation
```

---

## 🐛 Troubleshooting

### Common Issues

**Meta OAuth fails**
- Verify `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET`
- Ensure redirect URI matches in Meta App settings
- Check app permissions and review status

**Workers not processing**
- Verify Redis is running (`redis-cli ping`)
- Check `REDIS_HOST` and `REDIS_PORT` configuration
- Review worker logs for errors

**Database connection issues**
- Verify Supabase credentials
- Check RLS policies are enabled
- Ensure migrations are applied

**Email not sending**
- Verify SMTP credentials
- Check SMTP port and security settings
- Test with Gmail App Password

For more help, see [QUICK_START.md](QUICK_START.md) or open an issue.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend platform
- [Meta Marketing API](https://developers.facebook.com/docs/marketing-apis/) - Facebook Ads API
- [Bull](https://github.com/OptimalBits/bull) - Job queue
- [ExcelJS](https://github.com/exceljs/exceljs) - Excel generation
- [PDFKit](https://pdfkit.org/) - PDF generation

---

## 📞 Support

- **Documentation**: See `/docs` folder
- **Issues**: Open a GitHub issue
- **Email**: support@adpilot.ai

---

## 🎉 Status

**Production Ready**: ✅  
**Test Coverage**: 85%  
**Last Updated**: June 21, 2026

---

<p align="center">
  <strong>Built with ❤️ for advertisers who want to work smarter, not harder</strong>
</p>

<p align="center">
  <a href="QUICK_START.md">Quick Start</a> •
  <a href="API_DOCUMENTATION.md">API Docs</a> •
  <a href="PRODUCTION_SETUP.md">Deploy Guide</a> •
  <a href="CHANGELOG.md">Changelog</a>
</p>
