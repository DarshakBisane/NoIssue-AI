const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Read .env
const envContent = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
let apiKey = '';
envContent.split('\n').forEach(line => {
  if (line.startsWith('GEMINI_API_KEY=')) {
    apiKey = line.substring('GEMINI_API_KEY='.length).trim();
  }
});

console.log('Testing Gemini API key:', apiKey.substring(0, 8) + '...');

const genAI = new GoogleGenerativeAI(apiKey);

async function checkModels() {
  const modelsToTry = [
    'gemini-3.8-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
  ];

  for (const m of modelsToTry) {
    try {
      console.log(`Testing model "${m}"...`);
      const model = genAI.getGenerativeModel({ model: m });
      const res = await model.generateContent('Say "OK"');
      console.log(`✓ Model "${m}" WORKS! Response:`, res.response.text().trim());
      return m;
    } catch (err) {
      console.warn(`✗ Model "${m}" failed:`, err.message);
    }
  }
}

checkModels().then(workingModel => {
  console.log('Result working model:', workingModel);
  process.exit(0);
}).catch(err => {
  console.error('Check failed:', err);
  process.exit(1);
});
