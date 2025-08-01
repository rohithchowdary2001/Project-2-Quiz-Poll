# Setting Up Cohere AI for Quiz Generation

## Get Your Free Cohere API Key

1. **Visit Cohere Website**: Go to [https://cohere.ai](https://cohere.ai)

2. **Sign Up**: Click "Get Started" or "Sign Up" to create a free account

3. **Verify Email**: Check your email and verify your account

4. **Access Dashboard**: Once logged in, go to your dashboard

5. **Generate API Key**: 
   - Click on "API Keys" in the left sidebar
   - Click "Create new key" or "Generate API Key"
   - Copy the generated API key

6. **Add to Environment**: 
   - Open `backend/.env` file
   - Replace `your-cohere-api-key-here` with your actual API key:
   ```
   COHERE_API_KEY=your-actual-api-key-here
   ```

7. **Restart Backend**: Restart your backend server to load the new environment variable

## Free Tier Limits

Cohere's free tier includes:
- 100 API calls per month for the Command model
- Perfect for testing and small projects
- No credit card required

## Usage in Your Quiz App

Once configured, you can:
1. Click the "AI Generate" button in Quiz Management
2. Enter a topic (e.g., "JavaScript arrays", "World War II", "Photosynthesis")
3. Choose number of questions (3-20)
4. Select difficulty level (easy/medium/hard)
5. AI will generate multiple choice questions with 4 options each
6. Review and edit the generated questions before saving

## Example Topics That Work Well

- **Programming**: "React hooks", "Python functions", "SQL joins"
- **Science**: "Cell biology", "Newton's laws", "Periodic table"
- **History**: "American Revolution", "Ancient Rome", "Industrial Revolution"
- **Math**: "Algebra basics", "Geometry formulas", "Statistics"
- **Literature**: "Shakespeare plays", "Poetry analysis", "Novel themes"

## Troubleshooting

- **API Key Error**: Make sure your API key is correct and the backend is restarted
- **Generation Fails**: Try a more specific topic or simpler language
- **Questions Not Good**: The AI does its best, but always review and edit the generated content
- **Rate Limits**: Free tier has monthly limits, upgrade if you need more

## Tips for Better Results

1. **Be Specific**: Instead of "history", use "American Civil War battles"
2. **Use Clear Language**: Avoid jargon or overly complex topics
3. **Check Academic Level**: Specify if it's for beginners or advanced students
4. **Review Everything**: Always review AI-generated content before using it with students
