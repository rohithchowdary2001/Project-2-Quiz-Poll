const { CohereClientV2 } = require('cohere-ai');

class AIService {
    constructor() {
        this.cohere = new CohereClientV2({
            token: process.env.COHERE_API_KEY,
        });
    }

    async generateQuiz(topic, numQuestions = 5, difficulty = 'medium') {
        try {
            const prompt = `Generate ${numQuestions} multiple choice questions about "${topic}" with difficulty level "${difficulty}".
            
Format the response as a JSON array where each question has:
- questionText: The question text
- options: Array of 4 options with text and isCorrect properties
- points: Points for the question (1-5 based on difficulty)

Requirements:
- Each question should have exactly 4 options
- Only one option should be correct (isCorrect: true)
- Questions should be educational and appropriate
- Vary the difficulty appropriately
- Make questions clear and unambiguous

Example format:
[
  {
    "questionText": "What is the capital of France?",
    "options": [
      {"text": "London", "isCorrect": false},
      {"text": "Berlin", "isCorrect": false},
      {"text": "Paris", "isCorrect": true},
      {"text": "Madrid", "isCorrect": false}
    ],
    "points": 2
  }
]

Topic: ${topic}
Number of questions: ${numQuestions}
Difficulty: ${difficulty}

Please respond with only the JSON array, no additional text.`;

            const response = await this.cohere.chat({
                model: 'command-r-plus',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                maxTokens: 2000
            });

            const generatedText = response.message.content[0].text;
            
            // Try to extract JSON from the response
            let jsonMatch = generatedText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('Could not find JSON array in AI response');
            }

            const questions = JSON.parse(jsonMatch[0]);
            
            // Validate the structure
            if (!Array.isArray(questions)) {
                throw new Error('AI response is not an array');
            }

            // Validate each question
            const validatedQuestions = questions.map((q, index) => {
                if (!q.questionText || !Array.isArray(q.options)) {
                    throw new Error(`Invalid question structure at index ${index}`);
                }

                if (q.options.length !== 4) {
                    throw new Error(`Question ${index + 1} must have exactly 4 options`);
                }

                const correctAnswers = q.options.filter(opt => opt.isCorrect);
                if (correctAnswers.length !== 1) {
                    throw new Error(`Question ${index + 1} must have exactly one correct answer`);
                }

                return {
                    questionText: q.questionText.trim(),
                    questionType: 'single_choice',
                    points: q.points || (difficulty === 'easy' ? 1 : difficulty === 'hard' ? 3 : 2),
                    options: q.options.map(opt => ({
                        text: opt.text.trim(),
                        isCorrect: Boolean(opt.isCorrect)
                    }))
                };
            });

            return validatedQuestions;

        } catch (error) {
            console.error('AI Service Error:', error);
            
            // Fallback questions if AI fails
            return this.getFallbackQuestions(topic, numQuestions);
        }
    }

    getFallbackQuestions(topic, numQuestions) {
        const fallbackQuestions = [
            {
                questionText: `What is a key concept related to ${topic}?`,
                questionType: 'single_choice',
                points: 2,
                options: [
                    { text: 'Option A', isCorrect: true },
                    { text: 'Option B', isCorrect: false },
                    { text: 'Option C', isCorrect: false },
                    { text: 'Option D', isCorrect: false }
                ]
            },
            {
                questionText: `Which statement is true about ${topic}?`,
                questionType: 'single_choice',
                points: 2,
                options: [
                    { text: 'Statement 1', isCorrect: false },
                    { text: 'Statement 2', isCorrect: true },
                    { text: 'Statement 3', isCorrect: false },
                    { text: 'Statement 4', isCorrect: false }
                ]
            }
        ];

        // Return the requested number of questions (repeat if necessary)
        const questions = [];
        for (let i = 0; i < numQuestions; i++) {
            questions.push({
                ...fallbackQuestions[i % fallbackQuestions.length],
                questionText: `${fallbackQuestions[i % fallbackQuestions.length].questionText} (Question ${i + 1})`
            });
        }

        return questions;
    }

    async testConnection() {
        try {
            const response = await this.cohere.chat({
                model: 'command-r-plus',
                messages: [
                    {
                        role: 'user',
                        content: 'Hello, are you working?'
                    }
                ],
                maxTokens: 50
            });
            
            return {
                success: true,
                message: 'Cohere AI connection successful',
                response: response.message.content[0].text
            };
        } catch (error) {
            return {
                success: false,
                message: 'Cohere AI connection failed',
                error: error.message
            };
        }
    }
}

module.exports = new AIService();
