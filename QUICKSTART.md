# Quick Start Guide - StoreHub Monitor

## What is this?

A lightweight Next.js app that connects to StoreHub API to monitor transactions in real-time. Perfect for a second business with different StoreHub credentials.

## Features

- ✅ Live transaction monitoring
- ✅ Auto-refresh every 30 seconds
- ✅ Today's sales statistics
- ✅ Real-time connection status
- ✅ Clean, responsive dashboard
- ✅ No public pages - purely for data monitoring

## Quick Setup (3 steps)

### 1. Install Dependencies

```bash
cd storehub-monitor
npm install
```

### 2. Configure StoreHub Credentials

Edit `.env.local` and add your StoreHub credentials:

```env
STOREHUB_USERNAME=yourstorename
STOREHUB_PASSWORD=your-api-token-here
```

**How to get your credentials:**

- `STOREHUB_USERNAME`: Your store subdomain (e.g., if your back-office URL is `https://mystorename.storehubhq.com`, use `mystorename`)
- `STOREHUB_PASSWORD`: Contact StoreHub support to get your API token

### 3. Run the App

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

## What You'll See

### Dashboard Features:

1. **Connection Status** - Green dot = connected to StoreHub API
2. **Today's Statistics**:
   - Total Sales
   - Transaction Count
   - Average Transaction Value
   - Last Updated Time
3. **Live Transaction Table** - Shows recent transactions with:
   - Time
   - Receipt Number
   - Items Purchased
   - Payment Method
   - Total Amount
   - Status

### Controls:

- **Auto-refresh ON/OFF** - Toggle automatic data refresh
- **Refresh Now** - Manual refresh button

## API Endpoints

The app includes these API routes:

- `GET /api/test` - Test StoreHub API connection
- `GET /api/transactions` - Fetch transactions with filters

### Example API Usage:

```bash
# Test connection
curl http://localhost:3001/api/test

# Get today's transactions
curl "http://localhost:3001/api/transactions?startDate=2026-08-18&limit=50"
```

## File Structure

```
storehub-monitor/
├── app/
│   ├── api/
│   │   ├── test/route.ts          # Connection test endpoint
│   │   └── transactions/route.ts   # Transactions API
│   ├── globals.css                 # Styles
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Main dashboard
├── lib/
│   └── storehubApi.ts              # StoreHub API integration
├── .env.local                      # Your credentials (DO NOT COMMIT)
├── package.json
├── tsconfig.json
└── README.md
```

## Customization

### Change Port Number

Edit `package.json`:

```json
"scripts": {
  "dev": "next dev -p 3002",  // Change 3001 to your preferred port
}
```

### Adjust Refresh Interval

In `app/page.tsx`, find this line:

```typescript
}, 30000);  // Change 30000 (30 seconds) to your preferred interval
```

### Filter Transactions

The API supports these query parameters:

- `startDate` - YYYY-MM-DD format
- `endDate` - YYYY-MM-DD format
- `employeeId` - Filter by employee
- `status` - completed, cancelled, or pending
- `limit` - Maximum number of results (default: 100)

## Troubleshooting

### "Connection Disconnected" Error

1. Check your `.env.local` credentials
2. Verify StoreHub API token is valid
3. Test connection manually:
   ```bash
   curl http://localhost:3001/api/test
   ```

### "No transactions found"

- The app only shows today's transactions by default
- Make sure there are actual sales in your StoreHub account today
- Try a different date range by modifying the API call

### Type Errors During Development

These are just TypeScript compilation warnings and won't affect the app's functionality. They'll be resolved when you run `npm install`.

## Production Deployment

### Deploy to Vercel:

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `STOREHUB_USERNAME`
   - `STOREHUB_PASSWORD`
   - `NEXT_PUBLIC_STOREHUB_API_BASE`
4. Deploy

### Build for Production:

```bash
npm run build
npm start
```

## Rate Limiting

StoreHub API allows **3 requests per second**. This app automatically:

- Queues requests to respect the limit
- Implements exponential backoff for retries
- Shows connection status in the UI

## Security Notes

⚠️ **Important:**

- Never commit `.env.local` to Git
- Keep your API token secure
- Use HTTPS in production
- Consider adding authentication for production deployment

## Support

For StoreHub API issues:

- Contact StoreHub support
- API Documentation: https://api.storehubhq.com/docs

For app issues:

- Check the browser console for errors
- Verify your credentials in `.env.local`
- Ensure you're running Node.js 18+

## Next Steps

Once the live monitor is working, you can extend it with:

- Historical data views
- Product-level analytics
- Employee performance tracking
- Custom date range filters
- Export functionality
- Email/SMS alerts for large transactions

All these features can be built using the existing StoreHub API integration in `lib/storehubApi.ts`.
