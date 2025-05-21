const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Run tailwindcss CLI to generate the CSS file
execSync('npx tailwindcss -i ./index.css -o ./tailwind.generated.css', { stdio: 'inherit' });

console.log('Tailwind CSS file generated successfully!'); 