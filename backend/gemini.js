import axios from "axios"

const geminiResponse = async (command, assistantName, userName) => {
  try {
    const legacyUrlOrKey = process.env.GEMINI_API_URL
    const apiKey = process.env.GEMINI_API_KEY || (legacyUrlOrKey && !legacyUrlOrKey.startsWith("http") ? legacyUrlOrKey : undefined)
    
    let configuredModel = process.env.GEMINI_MODEL || "gemini-3.6-flash"
    
    // Priority model list to ensure maximum availability
    const modelsToTry = [configuredModel, "gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash"]
    const uniqueModels = [...new Set(modelsToTry.filter(Boolean))]

    const prompt = `You are a virtual assistant named ${assistantName} created by ${userName}. 
You are not Google. You will now behave like a voice-enabled assistant.

Your task is to understand the user's natural language input and respond with a JSON object like this:

{
  "type": "general" | "google-search" | "youtube-search" | "youtube-play" | "get-time" | "get-date" | "get-day" | "get-month" | "calculator-open" | "instagram-open" | "facebook-open" | "weather-show" | "website-open",
  "userInput": "<original user input>",
  "response": "<a short spoken response to read out loud to the user>",
  "targetUrl": "<https URL only; required only when type is website-open>"
}

Instructions:
- "type": determine the intent of the user.
- "userInput": the original sentence spoken by the user. Remove only the assistant name, if present. For Google or YouTube searches, include only the search query.
- "response": A short voice-friendly reply, e.g., "Sure, playing it now", "Here's what I found", "Today is Tuesday", etc.

Type meanings:
- "general": for factual or informational questions. If you know the answer, classify it as general and give a short answer.
- "google-search": if user wants to search something on Google.
- "youtube-search": if user wants to search something on YouTube.
- "youtube-play": if user wants to directly play a video or song.
- "calculator-open": if user wants to open a calculator.
- "instagram-open": if user wants to open instagram.
- "facebook-open": if user wants to open facebook.
- "weather-show": if user wants to know weather.
- "website-open": if user asks to open a website or web app other than the named apps above. Set targetUrl to its official HTTPS website.
- "get-time": if user asks for current time.
- "get-date": if user asks for today's date.
- "get-day": if user asks what day it is.
- "get-month": if user asks for the current month.

Important:
- If asked who created you, say that ${userName} created you.
- Only respond with the JSON object, nothing else.

now your userInput- ${command}
`;

    let lastError = null
    for (const model of uniqueModels) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
        const requestUrl = apiKey ? `${apiUrl}?key=${apiKey}` : apiUrl
        const result = await axios.post(
          requestUrl,
          {
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ]
          },
          { headers: { "Content-Type": "application/json" } }
        )

        const textResponse = result.data.candidates?.[0]?.content?.parts?.[0]?.text
        if (textResponse) {
          return textResponse
        }
      } catch (err) {
        lastError = err
        console.warn(`Model ${model} failed, trying next fallback...`, err.response?.data?.error?.message || err.message)
      }
    }

    throw lastError || new Error("All Gemini models failed")
  } catch (error) {
    console.error("Gemini API Error Detail:", error.response?.data || error.message)
    throw new Error(`Gemini request failed: ${error.response?.data?.error?.message || error.message}`)
  }
}

export default geminiResponse
