# NIA Reminder System

> **Automated Task & Schedule Management for Operations and Maintenance**

A modern web application designed for the National Irrigation Administration to streamline employee task tracking, deadline management, and automated email reminders.

## ✨ Features

- **📅 Schedule Management** - Create recurring tasks with flexible deadlines (daily, weekly, monthly, custom)
- **👥 Employee Management** - Maintain team records and assign tasks efficiently
- **✅ Task Tracking** - Period-based completion tracking with visual indicators
- **📧 Smart Reminders** - Automated email notifications before deadlines
- **📊 Calendar Integration** - Visual schedule overview with intuitive interface
- **📈 Reporting & Analytics** - Generate comprehensive reports on task completion
- **📋 Data Export** - Export employees, schedules, and reports to Excel
- **⚡ Performance Optimized** - Intelligent caching system for fast data access

## 🚀 Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Firebase Admin SDK
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth (Email/Password + Passwordless)
- **Email:** Nodemailer with Gmail SMTP
- **Deployment:** Vercel

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+ 
- Firebase project with Firestore and Authentication enabled
- Gmail account for SMTP (or alternative email service)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/nia-reminder.git
   cd nia-reminder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Configure your Firebase and email credentials
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project
2. Enable Firestore and Authentication
3. Add your Firebase config to `.env`
4. Set up Firestore security rules

### Email Configuration
Configure SMTP settings in `.env` for automated reminders:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 📱 Usage

### For Administrators
- Create and manage employee records
- Set up recurring task schedules
- Configure reminder timing and frequency
- Monitor completion rates and generate reports
- Export data for external analysis

### For Employees
- View assigned tasks and deadlines
- Mark tasks as complete
- Receive automated email reminders
- Track personal completion history

## 🔒 Security Features

- **CSRF Protection** - Token-based security for state-changing requests
- **Rate Limiting** - Prevents abuse and ensures system stability
- **Input Validation** - Comprehensive data sanitization with Zod schemas
- **Secure Authentication** - Firebase Auth with session management
- **Security Headers** - HSTS, CSP, and other protective headers

## 📊 Performance

- **Intelligent Caching** - In-memory caching for frequently accessed data
- **Optimized Queries** - Efficient Firestore operations with batching
- **Responsive Design** - Mobile-first approach with PWA capabilities
- **Fast Loading** - Next.js optimization with SSR/SSG where appropriate

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏢 About

Developed for the **National Irrigation Administration** - Tambubong, San Rafael, Bulacan  
*Committed to sustainable irrigation development*

---

**Built with ❤️ for efficient operations and maintenance management**