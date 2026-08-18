# StoreHub Transaction Monitor

A lightweight Next.js application for monitoring StoreHub transactions in real-time.

## Features

- 🔄 Live transaction monitoring
- 📊 Real-time sales data
- 🔐 Secure StoreHub API integration
- 📱 Responsive dashboard

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Add your StoreHub credentials:
     - `STOREHUB_USERNAME`: Your store name (subdomain)
     - `STOREHUB_PASSWORD`: Your API token from StoreHub

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3001](http://localhost:3001)

## StoreHub API

This app connects to StoreHub API to fetch:

- Transactions/Sales data
- Product information
- Store details

See the [StoreHub API Documentation](https://api.storehubhq.com/docs) for more information.

## Rate Limiting

StoreHub API allows 3 calls per second. This app automatically handles rate limiting to prevent errors.

## Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **StoreHub API** - Data source
