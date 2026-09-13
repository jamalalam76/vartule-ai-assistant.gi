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
      console.log("========== ASSISTANT REQUEST ==========")
      console.log("Body:", req.body)
      console.log("User ID:", req.userId)

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

      console.log("User name:", userName)
      console.log("Assistant name:", assistantName)
      console.log("Sending command to Gemini:", command)

      const result = await geminiResponse(
         command,
         assistantName,
         userName
      )

      console.log("Gemini result:", result)

      let gemResult = null
      const jsonMatch = result?.match(/{[\s\S]*}/)
      
      if (jsonMatch) {
         try {
            gemResult = JSON.parse(jsonMatch[0])
         } catch (parseErr) {
            console.warn("JSON parse failed, using raw response fallback:", parseErr.message)
         }
      }

      // Safe fallback if Gemini returned non-JSON prose text
      if (!gemResult) {
         const cleanText = result ? result.replace(/```json|```/g, "").trim() : "I found some information for you."
         
         // Detect if command is asking to open a website
         const isWebsiteQuery = /open|khol|banao/i.test(command)
         const queryName = command.replace(/jarvis|open|khol|banao/gi, "").trim()
         
         gemResult = {
            type: isWebsiteQuery ? "website-open" : "general",
            userInput: command,
            response: `Opening ${queryName || "website"} for you.`,
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
            console.log("Fallback Gemini response for type:", type)
            return res.json({
               type: "general",
               userInput: gemResult.userInput || command,
               response: gemResult.response || "I am processing your command.",
               targetUrl: gemResult.targetUrl
            })
      }
   } catch (error) {
      console.error("========== ASSISTANT ERROR ==========")
      console.error(error.message)
      return res.status(500).json({
         response: "Assistant service is unavailable. Please try again."
      })
   }
}