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

      console.log("User found:", !!user)

      if (!user) {
         return res.status(404).json({
            response: "User not found"
         })
      }

      user.history.push(command)

      await user.save()

      console.log("History saved")

      const userName = user.name
      const assistantName = user.assistantName

      console.log("User name:", userName)
      console.log("Assistant name:", assistantName)
      console.log("Sending command to Gemini:", command)

      const result = await geminiResponse(
         command,
         assistantName,
         userName
      )

      console.log("Gemini result:", result)

      const jsonMatch = result?.match(/{[\s\S]*}/)

      if (!jsonMatch) {
         return res.status(400).json({
            response: "Sorry, I couldn't understand that command."
         })
      }

      let gemResult

      try {
         gemResult = JSON.parse(jsonMatch[0])
      } catch (error) {

         console.error("JSON Parse Error:", error)

         return res.status(400).json({
            response: "Sorry, I couldn't understand that command."
         })
      }

      console.log("Gemini JSON:", gemResult)

      const type = gemResult.type

      switch (type) {

         case "get-date":
            return res.json({
               type,
               userInput: gemResult.userInput,
               response: `current date is ${moment().format("YYYY-MM-DD")}`
            })

         case "get-time":
            return res.json({
               type,
               userInput: gemResult.userInput,
               response: `current time is ${moment().format("hh:mm A")}`
            })

         case "get-day":
            return res.json({
               type,
               userInput: gemResult.userInput,
               response: `today is ${moment().format("dddd")}`
            })

         case "get-month":
            return res.json({
               type,
               userInput: gemResult.userInput,
               response: `today is ${moment().format("MMMM")}`
            })

         case "google-search":
         case "youtube-search":
         case "youtube-play":
         case "general":
         case "calculator-open":
         case "instagram-open":
         case "facebook-open":
         case "weather-show":

            return res.json({
               type,
               userInput: gemResult.userInput,
               response: gemResult.response
            })

         default:

            console.log("Unknown Gemini type:", type)

            return res.status(400).json({
               response: "I didn't understand that command."
            })
      }

   } catch (error) {

      console.error("========== ASSISTANT ERROR ==========")
      console.error(error)
      console.error("Message:", error.message)
      console.error("Stack:", error.stack)

      return res.status(500).json({
         response: "Assistant service is unavailable. Please try again."
      })
   }
}