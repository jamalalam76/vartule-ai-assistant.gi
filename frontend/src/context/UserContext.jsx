import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { userDataContext as UserDataContext } from './userDataContext'

function UserContext({children}) {
    const serverUrl = import.meta.env.VITE_API_URL || "https://vartule-ai-assistant-backend.onrender.com"
    const [userData, setUserData] = useState(null)
    const [frontendImage, setFrontendImage] = useState(null)
    const [backendImage, setBackendImage] = useState(null)
    const [selectedImage, setSelectedImage] = useState(null)
    const [authLoading, setAuthLoading] = useState(true)

    const handleCurrentUser = async () => {
        try {
            const result = await axios.get(`${serverUrl}/api/user/current`, { withCredentials: true })
            setUserData(result.data)
            console.log("Current user loaded:", result.data)
        } catch (error) {
            console.error("Unable to load the current user:", error)
        } finally {
            setAuthLoading(false)
        }
    }

    const getGeminiResponse = useCallback(async (command) => {
        try {
            const result = await axios.post(`${serverUrl}/api/user/asktoassistant`, { command }, { withCredentials: true })
            return result.data
        } catch (error) {
            const errorMsg = error.response?.data?.response || error.response?.data?.message || "Assistant service is unavailable. Please check backend connection & API keys."
            console.error("getGeminiResponse error:", errorMsg)
            throw new Error(errorMsg)
        }
    }, [serverUrl])

    useEffect(() => {
        handleCurrentUser()
    }, [])

    const value = {
        serverUrl, userData, setUserData, backendImage, setBackendImage, frontendImage, setFrontendImage, selectedImage, setSelectedImage, getGeminiResponse, authLoading
    }

    return (
        <UserDataContext.Provider value={value}>
            {children}
        </UserDataContext.Provider>
    )
}

export default UserContext
