# Hashly AI

Hashly AI is a cross-platform, AI-powered meme and caption generator app built with React Native. It helps users create engaging social media content, generate viral memes, smart captions, and trending hashtags, and manage credits with seamless payment integration.

## Features

- **AI-Powered Content Generation**: Generate smart captions, hashtags, and memes using advanced AI models (Google Gemini).
- **Meme Generator**: Instantly turn any topic or image into a viral meme with trending templates.
- **Smart Captions & Hashtags**: Get authentic, engaging captions and discover trending hashtags for your posts.
- **User Dashboard**: Track your generation history, credits, and transactions.
- **Credits & Payments**: Purchase credits securely via Razorpay integration.
- **Modern UI/UX**: Minimal, professional, and mobile-friendly design.
- **Cross-Platform**: Works on both Android and iOS.

## Screenshots

> _Add screenshots of the app here for better presentation._

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/) or npm
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Android Studio](https://developer.android.com/studio) or Xcode (for iOS)

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/codebylalit/hashly-ai.git
   cd hashly-ai
   ```
2. **Install dependencies:**
   ```sh
   yarn install
   # or
   npm install
   ```
3. **Set up environment variables:**
   - Copy `.env.example` to `.env` and fill in your API keys (Google Gemini, Razorpay, Supabase, etc.)

4. **Start the development server:**
   ```sh
   expo start
   ```

5. **Run on device/emulator:**
   - For Android: `a`
   - For iOS: `i`

## Project Structure

```
Hashly AI/
├── android/           # Native Android project
├── ios/               # Native iOS project
├── src/
│   ├── components/    # Reusable UI components
│   ├── screens/       # App screens (Home, Generator, Meme, Payment, etc.)
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API and payment integrations
│   ├── theme/         # Colors and styles
│   └── utils/         # Utility functions
├── assets/            # Images, fonts, icons
├── supabase/          # Supabase functions and config
├── App.js             # App entry point
├── package.json
└── ...
```

## Environment Variables

Create a `.env` file in the root directory and add your keys:

```
GOOGLE_GEMINI_API_KEY=your_gemini_key
RAZORPAY_KEY_ID=your_razorpay_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Create a Pull Request

## License

This project is licensed under the MIT License.

---

**Hashly AI** — Create, Caption, Meme, and Go Viral 🚀 