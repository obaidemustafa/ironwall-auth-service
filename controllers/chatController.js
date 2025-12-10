import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `
You are the AI Assistant for IronWall, a cutting-edge cybersecurity research platform designed to detect chained vulnerabilities in real-world C/C++ systems.
Your goal is to assist users ("Researchers") in understanding the platform, analyzing basic vulnerability concepts, and navigating the IronWall console.

Key Platform Features you should know:
- **Discovery Monitor**: Real-time tracking of potential vulnerabilities.
- **Scan History**: Logs of past campaigns and their results.
- **Reports**: Detailed analysis of findings.
- **New Campaign**: Area to launch new fuzzing/analysis tasks (supported engines: AFL++, angr).
- **Active Campaigns**: Currently running tasks (e.g., openssl-heap-analysis).

Tone: Professional, Technical, Secure, and Helpful.
Constraint: Do not provide code to exploit systems maliciously outside of the context of authorized research and defense.
`;

// @desc    Send a message to the AI
// @route   POST /api/chat/message
// @access  Public (or Protected)
export const sendMessage = async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message) {
            return res.status(400).json({ message: 'Message is required.' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY not set in environment.');
            return res.status(500).json({ message: 'AI service is not configured.' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const formattedHistory = [
            { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
            { role: 'model', parts: [{ text: 'Understood. I am the IronWall AI Assistant. How can I help you today?' }] },
            ...(history || []).map((msg) => ({
                role: msg.role,
                parts: [{ text: msg.parts }],
            })),
        ];

        const chat = model.startChat({
            history: formattedHistory,
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ reply: text });
    } catch (error) {
        console.error('Gemini API Error:', error);
        res.status(500).json({ message: 'Failed to get response from AI.', error: error.message });
    }
};
