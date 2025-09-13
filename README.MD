# 🛒 Advanced Order & Shop Bot - Complete Business Solution

The most advanced Discord bot for managing orders, shop systems, and real item trading with Railway deployment support.

## ✨ **Latest Features**

### 🎯 **Smart Order System**
- **Form Examples**: Customers see helpful examples in order forms
- **Ongoing Orders**: Shows only unclaimed orders (disappears when claimed)
- **Order Tracking**: Orders → Ongoing → Claimed → Received workflow
- **User-Based Naming**: Channels named `order-customername`

### 🛍️ **Real Item Marketplace**
- **Real Trading**: Buy/sell actual Roblox items, game accounts, skins
- **Shop Categories**: Roblox, Fortnite, Minecraft, Steam, etc.
- **Purchase Channels**: Private channels for each purchase
- **Trade System**: Player-to-player trading with middleman protection

### 💾 **Persistent Database**
- **PostgreSQL**: When deployed to Railway (data survives redeploys)
- **JSON Fallback**: When running locally
- **Auto-Detection**: Bot chooses best storage automatically

### 🎛️ **Admin Customization**
- **Panel Templates**: Gaming, Digital, Services presets
- **Custom Panels**: Fully customizable order panels
- **Shop Management**: Add/remove items with commands

## 🆔 **Understanding IDs**

### **CLIENT_ID**
- **What**: Your Discord Application ID
- **Where**: Discord Developer Portal → Your App → General Information → Application ID
- **Example**: `1234567890123456789`

### **GUILD_ID** 
- **What**: Your Discord Server ID
- **Where**: Right-click your Discord server → Copy ID (need Developer Mode on)
- **Example**: `9876543210987654321`

## 🚀 **Railway Deployment**

### **Step 1: Setup Bot**
1. Go to https://discord.com/developers/applications
2. Create application → Create bot
3. Copy **Bot Token** and **Application ID**

### **Step 2: Deploy to Railway**
1. Fork this GitHub repository
2. Connect to Railway.app
3. Create project → Deploy from GitHub
4. Add environment variables:
   ```
   DISCORD_TOKEN=your_bot_token
   CLIENT_ID=your_application_id
   GUILD_ID=your_server_id
   OWNER_ID=730629579533844512
   ```

### **Step 3: Setup in Discord**
```bash
!setup status                           # Check configuration
!setup category 123456789012345678      # Ticket category
!setup support 123456789012345678       # Support role
!setup logs 123456789012345678          # Log channel
!setup orders 123456789012345678        # New orders channel
!setup received 123456789012345678      # Completed orders
!setup ongoing 123456789012345678       # Unclaimed orders
!setup admin add 123456789012345678     # Add staff
!panel template gaming                  # Choose template
!panel create                           # Create order panel
!shop panel                             # Create shop panel
```

## 📁 **File Structure**

```
advanced-order-bot/
├── index.js                          # Main bot file
├── config.json                       # Configuration
├── package.json                      # Dependencies
├── railway.json                      # Railway settings
├── deploy-commands.js                # Command deployment
├── .env.example                      # Environment template
├── Dockerfile                        # Docker support
├── README.md                         # This file
├── commands/
│   ├── setup.js                      # Bot setup
│   ├── ticket.js                     # Order management
│   ├── admin.js                      # Admin utilities
│   ├── panel.js                      # Panel customization
│   └── shop.js                       # Shop management
├── events/
│   ├── ready.js                      # Bot startup
│   └── interactionCreate.js          # Interactions
├── systems/
│   ├── ticketSystem.js               # Order system
│   ├── database.js                   # Database system
│   └── shopSystem.js                 # Shop & trading
└── data/ (auto-created)
    ├── tickets.json                  # Active tickets
    ├── orders.json                   # Order history
    └── shop_items.json               # Shop items
```

## 🎮 **Commands**

### 🔧 **Setup (Owner Only)**
```bash
!setup category <id>        # Set ticket category
!setup support <id>         # Set support role
!setup logs <id>           # Set log channel
!setup orders <id>         # Set orders channel
!setup received <id>       # Set received channel
!setup ongoing <id>        # Set ongoing channel
!setup admin add <id>      # Add admin
!setup status              # Show config
```

### 🎛️ **Panel Management (Admins)**
```bash
!panel create [channel]     # Create order panel
!panel template gaming     # Use gaming template
!panel template digital    # Use digital template
!panel template services   # Use services template
!panel preview             # Preview panel
!panel reset              # Reset to default
```

### 🛍️ **Shop Management (Admins)**
```bash
!shop panel [channel]                                    # Create shop panel
!shop add-item Name | 50 | Roblox | Description | 5 | URL  # Add item
!shop list                                              # List items
!shop stats                                             # Shop statistics
```

### 🎫 **Order Management (Admins)**
```bash
!ticket panel [channel]    # Create ticket panel
!ticket close             # Force close order
!ticket add @user         # Add user to order
!ticket remove @user      # Remove user
```

### 👑 **Admin Utilities**
```bash
!admin info               # Bot statistics
!admin say <message>      # Make bot speak
!admin embed Title | Desc # Create embed
!admin clean <amount>     # Delete messages
```

## 🎯 **How It Works**

### **Order Workflow**
1. **Customer** clicks "Place Your Order" 
2. **Form** appears with helpful examples
3. **Private channel** created as `order-customername`
4. **Ongoing channel** shows unclaimed order
5. **Staff** clicks "Claim Order" 
6. **Order disappears** from ongoing
7. **Orders channel** shows "being processed"
8. **Staff** clicks "Mark Completed"
9. **Received channel** celebrates completion

### **Shop System** 
1. **Browse shop** by categories
2. **Select item** to purchase
3. **Purchase channel** created automatically
4. **Staff** processes payment
5. **Item delivered** securely

### **Trading System**
1. **Create trade** request with forms
2. **Trade channel** created for both users
3. **Middleman service** available
4. **Secure trading** environment

## 💼 **Perfect For**

### **🎮 Gaming Services**
- Roblox Limiteds trading
- Game account sales
- In-game currency
- Rank boosting services

### **💻 Digital Products**
- Software licenses
- Social media accounts  
- Streaming subscriptions
- Digital downloads

### **🎨 Professional Services**
- Graphic design
- Website development
- Content creation
- Custom programming

## 🔒 **Security Features**

- **Private Channels**: Each order gets private discussion
- **Role Permissions**: Only staff can manage orders
- **Data Persistence**: Orders saved even if bot restarts
- **Middleman Trading**: Safe trading with staff oversight
- **Audit Logs**: Complete activity tracking

## 📊 **Business Benefits**

- **Professional Image**: Custom branded panels
- **Automated Workflow**: Orders processed efficiently  
- **Customer Tracking**: Complete order history
- **Staff Management**: Clear role assignments
- **Social Proof**: Public completion celebrations
- **Scalable System**: Handles high order volumes

## 🛠️ **Environment Variables**

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | ✅ | Bot token from Discord Developer Portal |
| `CLIENT_ID` | ✅ | Discord Application ID |
| `GUILD_ID` | ✅ | Discord Server ID |
| `OWNER_ID` | ✅ | Your Discord User ID |
| `DATABASE_URL` | ❌ | PostgreSQL URL (Railway provides automatically) |

## 🐛 **Troubleshooting**

### **❌ "Bot is not configured yet!"**
```bash
!setup status    # See what's missing
# Configure all 6 channels + support role
```

### **❌ CLIENT_ID/GUILD_ID Issues**
- CLIENT_ID = Application ID from Developer Portal
- GUILD_ID = Server ID (right-click server, Copy ID)
- Both are 18-19 digit numbers

### **❌ Ongoing orders not updating**
- Fixed: Now shows only unclaimed orders
- Orders disappear when claimed by staff
- Check !setup status for missing channels

### **❌ Railway deployment fails**
- Check all environment variables are set
- Verify GitHub repository has all files
- Check Railway logs for specific errors

## 🎉 **Success Tips**

### **📈 Optimize Your Business**
- Use appropriate panel template for your niche
- Set up all 6 channels for complete tracking
- Train staff on claim/complete workflow
- Monitor ongoing orders regularly

### **💰 Maximize Revenue**
- Showcase completed orders in received channel
- Use shop system for instant purchases
- Offer middleman trading services
- Maintain professional customer service

### **⚡ Scale Efficiently**  
- Add multiple admins for coverage
- Use admin commands for quick management
- Leverage persistent database for reliability
- Monitor shop statistics for insights

## 📞 **Support**

- **Issues**: Create GitHub issues for bugs
- **Features**: Request new features via issues
- **Setup Help**: Follow this README step-by-step
- **Custom Development**: Available for hire

---

## 🚀 **Ready to Launch?**

1. **Deploy to Railway** (10 minutes)
2. **Setup Discord channels** (15 minutes)
3. **Configure panels & shop** (10 minutes)
4. **Start taking orders!** (immediately)

**💰 Complete business system ready in under 45 minutes!**

**🎯 Most advanced Discord order & shop bot available - start your business today!**
