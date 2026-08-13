# Salon Expenses Analyser - Mobile App

A React Native mobile application for tracking and analyzing salon expenses.

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- Expo Go app on your Android/iOS device ([Download from Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Installation

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Scan the QR code with:
   - **Android**: Expo Go app
   - **iOS**: Camera app (will open in Expo Go)

## 🔑 Login Credentials

- **Username**: `admin`
- **Password**: `admin`

## ✨ Features

- 🔐 Secure login system
- 💰 Track expenses by category
- 📊 View monthly and total expense summaries
- 📱 Beautiful dark mode UI
- 💾 Offline data persistence
- ➕ Easy expense addition with modal
- 🗑️ Delete expenses with confirmation

## 📂 Project Structure

```
mobile/
├── screens/
│   ├── LoginScreen.js    # Login interface
│   └── HomeScreen.js     # Main dashboard
├── context/
│   ├── AuthContext.js    # Authentication state
│   └── ExpenseContext.js # Expense management
├── constants/
│   └── Colors.js         # App color palette
└── App.js                # Root component
```

## 🎨 Design

- Dark mode with `#121212` background
- Vibrant accent colors from nutrition app palette
- Smooth animations and transitions
- Responsive layout for all screen sizes

## 📱 Running on Physical Device

The easiest way to test is using **Expo Go**:
1. Install Expo Go from your app store
2. Run `npm start` in the mobile directory
3. Scan the QR code
4. The app will load on your device!

## 🛠️ Technologies

- React Native
- Expo
- AsyncStorage for data persistence
- Context API for state management
