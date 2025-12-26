# DR Thailand Hub 🇹🇭📈

ศูนย์ข้อมูล Depositary Receipt (DR) ครบวงจรในประเทศไทย - ค้นหา เปรียบเทียบ และติดตาม DR ทั้งหมดในตลาดหลักทรัพย์ไทย

## 🌟 Features

- **Dashboard** - ภาพรวม DR, Top Gainers, Top Volume
- **DR Catalog** - รายการ DR ทั้งหมด พร้อม Filter และ Search
- **Compare Tool** - เปรียบเทียบ DR สูงสุด 4 ตัว
- **DR Screener** - กรอง DR ตามเงื่อนไขที่ต้องการ
- **Broker Directory** - ข้อมูลโบรกเกอร์ผู้ออก DR

## 🛠️ Tech Stack

### Frontend (Vercel)
- React 18
- Vite
- Tailwind CSS

### Backend (Railway)
- Node.js + Express
- Cheerio (Web Scraping)
- node-cron (Scheduled Updates)

## 📁 Project Structure

```
dr-thailand-hub/
├── frontend/           # React Frontend (Deploy to Vercel)
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vercel.json
│
└── backend/            # Express Backend (Deploy to Railway)
    ├── src/
    │   ├── routes/
    │   ├── services/
    │   └── index.js
    ├── package.json
    └── Dockerfile
```

## 🚀 Deployment

### Step 1: Deploy Backend to Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Select the `backend` folder
4. Add environment variables:
   ```
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://your-vercel-domain.vercel.app
   ENABLE_AUTO_SCRAPE=true
   ```
5. Deploy!
6. Copy the Railway URL (e.g., `https://dr-hub-backend.railway.app`)

### Step 2: Deploy Frontend to Vercel

1. Create a new project on [Vercel](https://vercel.com)
2. Connect your GitHub repository
3. Set Root Directory to `frontend`
4. Add environment variables:
   ```
   VITE_API_URL=https://your-railway-backend.railway.app/api
   ```
5. Update `vercel.json` with your Railway URL
6. Deploy!

## 💻 Local Development

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your settings
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local - use http://localhost:3001/api for local dev
npm run dev
```

## 📡 API Endpoints

### DR Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dr` | Get all DRs |
| GET | `/api/dr/:symbol` | Get DR by symbol |
| GET | `/api/dr/search?q=` | Search DRs |
| GET | `/api/dr/top/gainers` | Top gainers |
| GET | `/api/dr/top/losers` | Top losers |
| GET | `/api/dr/top/volume` | Top volume |
| GET | `/api/dr/stats` | Get statistics |
| GET | `/api/dr/countries` | Get country list |
| GET | `/api/dr/sectors` | Get sector list |
| GET | `/api/dr/compare?symbols=` | Compare DRs |
| POST | `/api/dr/filter` | Filter with criteria |

### Broker Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/brokers` | Get all brokers |
| GET | `/api/brokers/:id` | Get broker by ID |
| GET | `/api/brokers/:id/dr` | Get DRs by broker |

## 📊 Data Sources

- **SET (Stock Exchange of Thailand)** - Primary source
- **SETTRADE** - Price data and trading info
- **Yahoo Finance** - Underlying stock data (supplementary)

## 🔄 Auto-Update Schedule

The backend automatically updates DR data:
- **Day Session**: Every 5 minutes (10:00-16:30 Thai time, Mon-Fri)
- **Night Session**: Every 5 minutes (19:00-03:00 Thai time, Mon-Fri)

## 📝 Environment Variables

### Backend (.env)

```env
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
ENABLE_AUTO_SCRAPE=true
```

### Frontend (.env.local)

```env
VITE_API_URL=https://your-backend.railway.app/api
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## ⚠️ Disclaimer

ข้อมูลในเว็บไซต์นี้มีไว้เพื่อการศึกษาและให้ข้อมูลเท่านั้น ไม่ใช่คำแนะนำในการลงทุน กรุณาศึกษาข้อมูลเพิ่มเติมและปรึกษาผู้เชี่ยวชาญก่อนตัดสินใจลงทุน

## 📄 License

MIT License - feel free to use this project for your own purposes.

---

Made with ❤️ for Thai investors
