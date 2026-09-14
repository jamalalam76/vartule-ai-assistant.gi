import uploadOnCloudinary from "../config/cloudinary.js"
import geminiResponse from "../gemini.js"
import User from "../models/user.model.js"
import moment from "moment"

// ================= GET CURRENT USER =================

export const getCurrentUser = async (req, res) => {
   try {
      const userId = req.userId
      const user = await User.findById(userId).select("-password")

      if (!user) {
         return res.status(400).json({
            message: "user not found"
         })
      }

      return res.status(200).json(user)
   } catch (error) {
      console.error("Get current user error:", error)
      return res.status(400).json({
         message: "get current user error"
      })
   }
}

// ================= UPDATE ASSISTANT =================

export const updateAssistant = async (req, res) => {
   try {
      const { assistantName, imageUrl } = req.body
      let assistantImage

      if (req.file) {
         assistantImage = await uploadOnCloudinary(req.file.path)
      } else {
         assistantImage = imageUrl
      }

      const user = await User.findByIdAndUpdate(
         req.userId,
         {
            assistantName,
            assistantImage
         },
         {
            new: true
         }
      ).select("-password")

      return res.status(200).json(user)
   } catch (error) {
      console.error("Update assistant error:", error)
      return res.status(400).json({
         message: "updateAssistantError user error"
      })
   }
}

// ================= ASK TO ASSISTANT =================

export const askToAssistant = async (req, res) => {
   try {
      const { command } = req.body
      const user = await User.findById(req.userId)

      if (!user) {
         return res.status(404).json({
            response: "User not found"
         })
      }

      user.history.push(command)
      await user.save()

      const userName = user.name
      const assistantName = user.assistantName || "Jarvis"
      const lowerCmd = (command || "").toLowerCase().trim()

      // ================= INSTANT 0ms SHORTCUT ROUTING =================
      if (/youtube|युटुब|यूट्यूब/i.test(lowerCmd) && /open|khol|khola|play|chala/i.test(lowerCmd)) {
         const searchQuery = command.replace(/jarvis|open|khol|khola|play|chala|youtube|युटुब|यूट्यूब/gi, "").trim()
         return res.json({
            type: searchQuery ? "youtube-search" : "website-open",
            userInput: searchQuery || command,
            response: searchQuery ? `Playing ${searchQuery} on YouTube.` : "Opening YouTube for you.",
            targetUrl: "https://www.youtube.com"
         })
      }
      if (/google|गूगल/i.test(lowerCmd) && /open|khol|khola/i.test(lowerCmd)) {
         return res.json({
            type: "website-open",
            userInput: command,
            response: "Opening Google for you.",
            targetUrl: "https://www.google.com"
         })
      }
      if (/instagram/i.test(lowerCmd) && /open|khol|khola/i.test(lowerCmd)) {
         return res.json({
            type: "instagram-open",
            userInput: command,
            response: "Opening Instagram."
         })
      }
      if (/facebook/i.test(lowerCmd) && /open|khol|khola/i.test(lowerCmd)) {
         return res.json({
            type: "facebook-open",
            userInput: command,
            response: "Opening Facebook."
         })
      }
      if (/calculator/i.test(lowerCmd) && /open|khol|khola/i.test(lowerCmd)) {
         return res.json({
            type: "calculator-open",
            userInput: command,
            response: "Opening Calculator."
         })
      }
      if (/weather|mausam/i.test(lowerCmd)) {
         return res.json({
            type: "weather-show",
            userInput: command,
            response: "Showing current weather."
         })
      }
      if (/time|samay|waqt/i.test(lowerCmd) && /what|batao|kya|kya hai/i.test(lowerCmd)) {
         return res.json({
            type: "get-time",
            userInput: command,
            response: `Current time is ${moment().format("hh:mm A")}`
         })
      }
      if (/date|tareekh/i.test(lowerCmd) && /what|batao|kya|kya hai/i.test(lowerCmd)) {
         return res.json({
            type: "get-date",
            userInput: command,
            response: `Current date is ${moment().format("YYYY-MM-DD")}`
         })
      }

      // ================= AI GENERATION (SPEED OPTIMIZED) =================
      const result = await geminiResponse(command, assistantName, userName)

      let gemResult = null
      const jsonMatch = result?.match(/{[\s\S]*}/)
      
      if (jsonMatch) {
         try {
            gemResult = JSON.parse(jsonMatch[0])
         } catch {
            // fallback
         }
      }

      if (!gemResult) {
         const isWebsiteQuery = /open|khol|khola/i.test(command)
         const queryName = command.replace(/jarvis|open|khol|khola/gi, "").trim()
         
         gemResult = {
            type: isWebsiteQuery ? "website-open" : "general",
            userInput: command,
            response: result ? result.replace(/```json|```/g, "").trim() : `Opening ${queryName || "website"} for you.`,
            targetUrl: `https://www.google.com/search?q=${encodeURIComponent(queryName || command)}`
         }
      }

      const type = gemResult.type || "general"

      switch (type) {
         case "get-date":
            return res.json({
               type,
               userInput: gemResult.userInput || command,
               response: `Current date is ${moment().format("YYYY-MM-DD")}`
            })

         case "get-time":
            return res.json({
               type,
               userInput: gemResult.userInput || command,
               response: `Current time is ${moment().format("hh:mm A")}`
            })

         case "get-day":
            return res.json({
               type,
               userInput: gemResult.userInput || command,
               response: `Today is ${moment().format("dddd")}`
            })

         case "get-month":
            return res.json({
               type,
               userInput: gemResult.userInput || command,
               response: `Current month is ${moment().format("MMMM")}`
            })

         case "google-search":
         case "youtube-search":
         case "youtube-play":
         case "general":
         case "calculator-open":
         case "instagram-open":
         case "facebook-open":
         case "weather-show":
         case "website-open":
            return res.json({
               type,
               userInput: gemResult.userInput || command,
               response: gemResult.response || "Sure, processing your request.",
               targetUrl: gemResult.targetUrl || (type === "website-open" ? `https://www.google.com/search?q=${encodeURIComponent(gemResult.userInput || command)}` : undefined)
            })

         default:
            return res.json({
               type: "general",
               userInput: gemResult.userInput || command,
               response: gemResult.response || "I am processing your command.",
               targetUrl: gemResult.targetUrl
            })
      }
   } catch (error) {
      console.error("Assistant Error:", error.message)
      return res.status(500).json({
         response: "Assistant service is unavailable. Please try again."
      })
   }
}