const fs = require('fs');
const path = require('path');

// Create new directory structure
const directories = [
  'src/components',
  'src/screens',
  'src/hooks',
  'src/services',
  'src/utils',
  'src/theme',
  'src/config',
  'src/navigation',
  'src/assets'
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Move files to their new locations
const moves = [
  // Move screens
  { from: 'screens/home.js', to: 'src/screens/HomeScreen.js' },
  { from: 'screens/freecredits.js', to: 'src/hooks/useFreeCredits.js' },
  { from: 'screens/main/GeneratorScreen.js', to: 'src/screens/GeneratorScreen.js' },
  { from: 'screens/main/GeneratorLogic.js', to: 'src/screens/GeneratorLogic.js' },
  { from: 'screens/main/UserDashboard.js', to: 'src/screens/UserDashboard.js' },
  { from: 'screens/user/PaymentScreen.js', to: 'src/screens/PaymentScreen.js' },
  { from: 'screens/user/ProfileScreen.js', to: 'src/screens/ProfileScreen.js' },
  { from: 'screens/auth/AuthScreen.js', to: 'src/screens/AuthScreen.js' },
  { from: 'screens/auth/authcontext.js', to: 'src/hooks/useAuth.js' },
  { from: 'screens/onboarding/OnboardingScreen.js', to: 'src/screens/OnboardingScreen.js' },

  // Move components
  { from: 'components/RazorpayButton.js', to: 'src/components/RazorpayButton.js' },

  // Move hooks
  { from: 'hooks/useCredits.js', to: 'src/hooks/useCredits.js' },

  // Move services
  { from: 'src/services/razorpay.ts', to: 'src/services/razorpay.js' },

  // Move theme
  { from: 'theme/colors.js', to: 'src/theme/colors.js' },

  // Move config
  { from: 'config/index.js', to: 'src/config/index.js' },
  { from: 'config/razorpay.js', to: 'src/config/razorpay.js' },

  // Move navigation
  { from: 'navigation/AppNavigator.js', to: 'src/navigation/AppNavigator.js' },

  // Move utils
  { from: 'tw-rn.js', to: 'src/utils/tw-rn.js' }
];

moves.forEach(({ from, to }) => {
  if (fs.existsSync(from)) {
    const content = fs.readFileSync(from, 'utf8');
    fs.writeFileSync(to, content);
    console.log(`Moved ${from} to ${to}`);
  }
});

// Update App.js
const appContent = fs.readFileSync('App.js', 'utf8');
const updatedAppContent = appContent
  .replace(/from ['"]\.\/screens\//g, 'from \'./src/screens/')
  .replace(/from ['"]\.\/components\//g, 'from \'./src/components/')
  .replace(/from ['"]\.\/hooks\//g, 'from \'./src/hooks/')
  .replace(/from ['"]\.\/services\//g, 'from \'./src/services/')
  .replace(/from ['"]\.\/utils\//g, 'from \'./src/utils/')
  .replace(/from ['"]\.\/theme\//g, 'from \'./src/theme/')
  .replace(/from ['"]\.\/config\//g, 'from \'./src/config/')
  .replace(/from ['"]\.\/navigation\//g, 'from \'./src/navigation/');

fs.writeFileSync('App.js', updatedAppContent);
console.log('Updated App.js with new import paths');

// Clean up old directories
const oldDirs = [
  'screens',
  'components',
  'hooks',
  'utils',
  'theme',
  'config',
  'navigation'
];

oldDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`Removed old directory: ${dir}`);
  }
}); 