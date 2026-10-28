import * as fs from 'fs';
import * as path from 'path';

function getApiKey() {
  const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
  const match = envContent.match(/GEMINI_API_KEY="?([^"\n]+)"?/);
  return match ? match[1] : '';
}

async function checkModels() {
  const apiKey = getApiKey();
  console.log('Using API key starting with:', apiKey.slice(0, 10));
  
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await res.json();
  
  if (data.models) {
    console.log('Available models:');
    data.models.forEach((m: any) => {
      if (m.supportedGenerationMethods?.includes('generateContent')) {
        console.log(`- ${m.name.replace('models/', '')}`);
      }
    });
  } else {
    console.log('Response error/details:', data);
  }
}

checkModels();
