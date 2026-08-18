#!/bin/bash

echo "🚀 Setting up StoreHub Monitor..."
echo ""

# Navigate to the project directory
cd /Users/jangbersahaja/Website/storehub-monitor

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "⚙️  Configuration Steps:"
echo "1. Edit .env.local and add your StoreHub credentials"
echo "   - STOREHUB_USERNAME: Your store name"
echo "   - STOREHUB_PASSWORD: Your API token"
echo ""
echo "2. Run the development server:"
echo "   cd storehub-monitor"
echo "   npm run dev"
echo ""
echo "3. Open http://localhost:3001 in your browser"
echo ""
echo "✨ Setup complete!"
