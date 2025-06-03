const config = {
  googleAI: {
    apiKey: process.env.REACT_APP_GOOGLE_AI_API_KEY || '',
    model: process.env.REACT_APP_GOOGLE_AI_MODEL || 'gemini-1.5-flash' // Updated to match App.js
  },
  celestrak: {
    fallbackTleUrl: process.env.REACT_APP_FALLBACK_TLE_URL || '/assets/active.txt'
  }
};

// 開發環境檢查
if (process.env.NODE_ENV === 'development' && !config.googleAI.apiKey) {
  console.warn(
    'Google AI API key not configured. Please create a .env file with REACT_APP_GOOGLE_AI_API_KEY'
  );
}

export default config;
/*
// 在App組件中初始化AI
initAI = async () => {
  if (!config.googleAI.apiKey) {
    console.warn('Google AI API key not configured');
    return;
  }

  try {
    const { GoogleGenAI } = await import('@google/generative-ai');
    this.attackLogger.aiClient = new GoogleGenAI({ 
      apiKey: config.googleAI.apiKey 
    });
    this.attackLogger.aiEnabled = true;
  } catch (error) {
    console.error('Failed to initialize AI:', error);
  }
};
*/
