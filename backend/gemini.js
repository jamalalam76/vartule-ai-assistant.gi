import axios from "axios"
const geminiResponse=async (command,assistantName,userName)=>{
try {
    const legacyUrlOrKey=process.env.GEMINI_API_URL
    const apiKey=process.env.GEMINI_API_KEY || (legacyUrlOrKey && !legacyUrlOrKey.startsWith("http") ? legacyUrlOrKey : undefined)
    const configuredModel=process.env.GEMINI_MODEL
    // Keep older .env files working with the currently supported Flash model.
    const model=configuredModel === "gemini-2.0-flash" ? "gemini-3.6-flash" : (configuredModel || "gemini-3.6-flash")
    // Prefer the explicit API key and model. Older projects may have a full
    // GEMINI_API_URL pointing at a retired or quota-exhausted model.
    const apiUrl=(apiKey && `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`) || (legacyUrlOrKey?.startsWith("http") ? legacyUrlOrKey : undefined)
    if (!apiUrl) {
        throw new Error("Gemini API is not configured. Add GEMINI_API_KEY or GEMINI_API_URL to backend/.env")
    }
    const prompt = `You are a virtual assistant named ${assistantName} created by ${userName}. 
You are not Google. You will now behave like a voice-enabled assistant.

Your task is to understand the user's natural language input and respond with a JSON object like this:

{
  "type": "general" | "google-search" | "youtube-search" | "youtube-play" | "get-time" | "get-date" | "get-day" | "get-month"|"calculator-open" | "instagram-open" |"facebook-open" |"weather-show" | "website-open"
  ,
  "userInput": "<original user input>" {only remove your name from userinput if exists} and agar kisi ne google ya youtube pe kuch search karne ko bola hai to userInput me only bo search baala text jaye,

  "response": "<a short spoken response to read out loud to the user>",
  "targetUrl": "<https URL only; required only when type is website-open>"
}

Instructions:
- "type": determine the intent of the user.
- "userinput": original sentence the user spoke.
- "response": A short voice-friendly reply, e.g., "Sure, playing it now", "Here's what I found", "Today is Tuesday", etc.

Type meanings:
- "general": if it's a factual or informational question. aur agar koi aisa question puchta hai jiska answer tume pata hai usko bhi general ki category me rakho bas short answer dena
- "google-search": if user wants to search something on Google .
- "youtube-search": if user wants to search something on YouTube.
- "youtube-play": if user wants to directly play a video or song.
- "calculator-open": if user wants to  open a calculator .
- "instagram-open": if user wants to  open instagram .
- "facebook-open": if user wants to open facebook.
-"weather-show": if user wants to know weather
- "website-open": if user asks to open a website or web app other than the named apps above. Set targetUrl to its official HTTPS website. Examples: Amazon -> https://www.amazon.in/, Gmail -> https://mail.google.com/, WhatsApp -> https://web.whatsapp.com/.
- "get-time": if user asks for current time.
- "get-date": if user asks for today's date.
- "get-day": if user asks what day it is.
- "get-month": if user asks for the current month.

Important:
- Use ${userName} agar koi puche tume kisne banaya 
- Only respond with the JSON object, nothing else.


now your userInput- ${command}
`;





    const result=await axios.post(apiUrl,{
    "contents": [{
    "parts":[{"text": prompt}]
    }]
    }, apiKey ? { headers: { "x-goog-api-key": apiKey } } : undefined)
return result.data.candidates[0].content.parts[0].text
} catch (error) {
    throw new Error(`Gemini request failed: ${error.response?.data?.error?.message || error.message}`)
}
}

export default geminiResponse
