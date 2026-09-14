import axios from "axios"

const geminiResponse = async (command, assistantName, userName) => {
  try {
    const legacyUrlOrKey = process.env.GEMINI_API_URL
    const apiKey = process.env.GEMINI_API_KEY || (legacyUrlOrKey && !legacyUrlOrKey.startsWith("http") ? legacyUrlOrKey : undefined)
    
    let configuredModel = process.env.GEMINI_MODEL || "gemini-3.6-flash"
    const modelsToTry = [
      configuredModel,
      "gemini-3.6-flash",
      "gemini-flash-latest",
      "gemini-2.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash"
    ]
    const uniqueModels = [...new Set(modelsToTry.filter(Boolean))]

    const prompt = `You are a voice assistant named ${assistantName} created by ${userName}.
Classify the intent and respond in JSON format ONLY:
{
  "type": "general" | "google-search" | "youtube-search" | "youtube-play" | "get-time" | "get-date" | "get-day" | "get-month" | "calculator-open" | "instagram-open" | "facebook-open" | "weather-show" | "website-open",
  "userInput": "${command}",
  "response": "<short spoken response>",
  "targetUrl": "<https URL if website-open>"
}

User input: ${command}`

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
            ],
            generationConfig: {
              responseMimeType: "application/json",
              maxOutputTokens: 350,
              temperature: 0.2
            }
          },
          { headers: { "Content-Type": "application/json" }, timeout: 8000 }
        )

        const textResponse = result.data.candidates?.[0]?.content?.parts?.[0]?.text
        if (textResponse) {
          return textResponse
        }
      } catch (err) {
        lastError = err
        console.warn(`Model ${model} rate-limited/failed, trying next model...`, err.response?.data?.error?.message || err.message)
      }
    }

    throw lastError || new Error("All Gemini models rate limited")
  } catch (error) {
    console.error("Gemini API Error Detail:", error.response?.data || error.message)
    throw new Error(`Gemini request failed: ${error.response?.data?.error?.message || error.message}`)
  }
}

export default geminiResponse
