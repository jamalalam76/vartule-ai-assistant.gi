import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { userDataContext as UserDataContext } from './userDataContext'
function UserContext({children}) {
    const serverUrl="http://localhost:8080"
    const [userData,setUserData]=useState(null)
    const [frontendImage,setFrontendImage]=useState(null)
     const [backendImage,setBackendImage]=useState(null)
    const [selectedImage,setSelectedImage]=useState(null)
    const [authLoading, setAuthLoading] = useState(true)
    const handleCurrentUser=async ()=>{
        try {
            const result=await axios.get(`${serverUrl}/api/user/current`,{withCredentials:true})
            setUserData(result.data)
            console.log(result.data)
        } catch (error) {
            // An unauthenticated user is expected here; keep the UI usable when the API is unavailable.
            console.error("Unable to load the current user:", error)
        } finally {
            setAuthLoading(false)
        }
    }

    const getGeminiResponse = useCallback(async (command) => {
try {
  const result=await axios.post(`${serverUrl}/api/user/asktoassistant`,{command},{withCredentials:true})
  return result.data
} catch (error) {
  throw new Error(error.response?.data?.response || "Assistant service is unavailable")
}
    }, [serverUrl])

    useEffect(()=>{
handleCurrentUser()
    },[])
    const value={
serverUrl,userData,setUserData,backendImage,setBackendImage,frontendImage,setFrontendImage,selectedImage,setSelectedImage,getGeminiResponse,authLoading
    }
  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  )
}

export default UserContext
