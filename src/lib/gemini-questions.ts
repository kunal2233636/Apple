
'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. Define the structure for a single board exam question
export interface BoardQuestion {
  questionNumber: number;
  questionText: string;
  questionType: 'Long Answer' | 'Short Answer' | 'Numerical' | 'Derivation';
  marks: number;
  difficulty: 'Medium' | 'Hard';
  keyConceptsTested: string[];
  isPYQ: boolean;
  pyqYear?: number;
  correctAnswerPoints: string[];
  fullAnswerCBSE: string;
  commonMistakes: string[];
}

// 2. Define the structure for the API's JSON response
interface GeminiResponse {
  questions: BoardQuestion[];
}

// Helper function to create a delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retries an async function with exponential backoff.
 * @param fn The async function to retry.
 * @param retries Maximum number of retries.
 * @returns The result of the async function.
 */
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries = 3,
): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < retries; i++) {
        try {
            console.log(`[Gemini] Attempt ${i + 1} of ${retries}...`);
            return await fn();
        } catch (error: any) {
            lastError = error;
            console.error(`[Gemini] Attempt ${i + 1} failed:`, error.message);

            const isRateLimit = error.message?.includes('429');
            const isServiceUnavailable = error.message?.includes('503');

            if (isRateLimit || isServiceUnavailable) {
                if (i < retries - 1) {
                    const waitTime = Math.pow(2, i + 1) * 1000; // 2s, 4s, 8s
                    console.log(`[Gemini] API busy. Retrying in ${waitTime / 1000} seconds...`);
                    await sleep(waitTime);
                }
            } else {
                // For other errors (like parsing, invalid args), don't retry.
                throw error;
            }
        }
    }
    console.error(`[Gemini] All ${retries} retry attempts failed.`);
    throw lastError;
}


/**
 * Generates 10 CBSE board exam style questions for a given chapter using the Gemini API.
 * @param params - The parameters for question generation.
 * @param params.chapterName - The name of the chapter.
 * @param params.subjectName - The name of the subject.
 * @param params.chapterDetails - Optional details about the chapter topics.
 * @returns A promise that resolves to an array of 10 BoardQuestion objects.
 */
export async function generateBoardQuestions(params: {
  chapterName: string;
  subjectName: string;
  chapterDetails?: string;
}): Promise<BoardQuestion[]> {
  const { chapterName, subjectName, chapterDetails } = params;

  const apiKey = process.env.NEXT_PUBLIC_GEMINI_QUESTIONS_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Gemini API key not found. Please set NEXT_PUBLIC_GEMINI_QUESTIONS_API_KEY in your environment variables.'
    );
  }

  // Initialize the Google Generative AI client
  const genAI = new GoogleGenerativeAI(apiKey);


  // 3. Select the Gemini model
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  // 4. Construct the detailed prompt for the AI
  const prompt = `
    You are an expert question paper creator for the Indian CBSE Class 12 Board Exams for the subject ${subjectName}.
    Your task is to generate 10 high-quality, challenging questions for the chapter "${chapterName}".

    Question Requirements:
    - All questions must be in the style of the latest 2026 CBSE board exam patterns and marking schemes.
    - Follow the most recent CBSE Class 12 syllabus for 2026 board examinations.
    - Focus on conceptual, application-based, and numerical problems. Avoid simple recall-based questions.
    - The set of 10 questions must cover all major topics within the chapter.
    - Do not include any "Easy" difficulty questions. Only "Medium" and "Hard".
    - Marks should be 2, 3, or 5, reflecting the 2026 CBSE pattern.
    - For questions marked as PYQ (Previous Year Question), the pyqYear must be between 2020 and 2025.
    - For any mathematical equations or symbols, use LaTeX format enclosed in single dollar signs. For example: $E = mc^2$.

    ${chapterDetails ? `Chapter Topics to cover: ${chapterDetails}` : ''}

    Return the output as a single JSON object with a key "questions" which is an array of 10 question objects.
    Each object must strictly follow this TypeScript interface:

    interface BoardQuestion {
      questionNumber: number; // 1 to 10
      questionText: string; // The full question text, with LaTeX for math.
      questionType: "Long Answer" | "Short Answer" | "Numerical" | "Derivation";
      marks: number; // 2, 3, or 5
      difficulty: "Medium" | "Hard";
      keyConceptsTested: string[]; // Array of key concepts
      isPYQ: boolean; // true if it's a previous year question
      pyqYear?: number; // Year if isPYQ is true
      correctAnswerPoints: string[]; // Key points for a full-mark answer
      fullAnswerCBSE: string; // A complete, ideal answer written in CBSE marking scheme style
      commonMistakes: string[]; // Common mistakes students make
    }

    Do not include any other text or explanations outside of the JSON object.
  `;

  const apiCall = async () => {
    console.log('Generating questions for:', { chapterName, subjectName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = response.text();
    
    // Clean the response before parsing
    // Gemini can sometimes wrap the JSON in ```json ... ```
    jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');

    try {
        const parsedResponse: GeminiResponse = JSON.parse(jsonText);
        if (parsedResponse.questions && parsedResponse.questions.length > 0) {
          console.log('[Gemini] Successfully generated and parsed questions.');
          return parsedResponse.questions;
        } else {
          throw new Error('API did not return questions in the expected format.');
        }
    } catch (error: any) {
        console.error('[Gemini] JSON Parsing Error:', error.message);
        console.error('[Gemini] Raw Text:', jsonText);
        throw new Error('Failed to parse the response from the AI. The format was invalid.');
    }
  };

  try {
    return await retryWithBackoff(apiCall, 3);
  } catch (error: any) {
    console.error('[Gemini] Failed to generate questions after multiple retries.', error);
    throw new Error(
      `Could not generate questions. Please try again later. Final error: ${error.message}`
    );
  }
}
