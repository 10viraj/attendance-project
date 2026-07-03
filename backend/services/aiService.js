const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const getAiSummary = async (workLog, hoursWorked) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not defined in environment variables.');
      return 'AI Summary not available due to missing configuration.';
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let prompt = '';
    if (workLog && workLog.trim() !== '') {
      prompt = `You are an AI assistant for an employee attendance system. 
The employee has completed a ${hoursWorked} hour shift today. 
Here are their raw notes on what they did: "${workLog}"

Please generate a professional, concise, and structured daily work summary (max 3-4 sentences) based on these notes. Focus on accomplishments and use a professional tone.`;
    } else {
      prompt = `You are an AI assistant for an employee attendance system. 
The employee has completed a ${hoursWorked} hour shift today, but did not provide any specific tasks or work log.

Please generate a generic but professional sentence acknowledging the completion of their ${hoursWorked}-hour shift.`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating AI Summary:', error);
    return 'Error generating AI summary. Please check system logs.';
  }
};

module.exports = {
  getAiSummary
};
