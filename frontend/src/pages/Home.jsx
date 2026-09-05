import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { userDataContext } from '../context/userDataContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import aiImg from "../assets/ai.gif"
import { CgMenuRight } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";
import userImg from "../assets/user.gif"
function Home() {
  const {userData,serverUrl,setUserData,getGeminiResponse}=useContext(userDataContext)
  const navigate=useNavigate()
  const [listening,setListening]=useState(false)
  const [userText,setUserText]=useState("")
  const [aiText,setAiText]=useState("")
  const [assistantStarted,setAssistantStarted]=useState(false)
  const isSpeakingRef=useRef(false)
  const recognitionRef=useRef(null)
  const isProcessingRef=useRef(false)
  const restartTimeoutRef=useRef(null)
  const speechRequestRef=useRef(0)
  const assistantStartedRef=useRef(false)
  const [ham,setHam]=useState(false)
  const isRecognizingRef=useRef(false)
  const stoppingRecognitionRef=useRef(false)
  const synth=window.speechSynthesis

  const handleLogOut=async ()=>{
    try {
      await axios.get(`${serverUrl}/api/auth/logout`,{withCredentials:true})
      setUserData(null)
      navigate("/signin")
    } catch (error) {
      setUserData(null)
      console.log(error)
    }
  }

  const startRecognition = useCallback(() => {
    
   if (assistantStartedRef.current && !isSpeakingRef.current && !isProcessingRef.current && !isRecognizingRef.current) {
    try {
      recognitionRef.current?.start();
      console.log("Recognition requested to start");
    } catch (error) {
      if (error.name !== "InvalidStateError") {
        console.error("Start error:", error);
      }
    }
  }
    
  }, [])

  const speak = useCallback((text) => {
    const requestId = ++speechRequestRef.current;
    const utterence=new SpeechSynthesisUtterance(text)
    utterence.lang = 'hi-IN';
    const voices =window.speechSynthesis.getVoices()
    const hindiVoice = voices.find(v => v.lang === 'hi-IN');
    if (hindiVoice) {
      utterence.voice = hindiVoice;
    }


    isSpeakingRef.current=true
    utterence.onend=()=>{
      if (requestId !== speechRequestRef.current) return;
        setAiText("");
  isSpeakingRef.current = false;
  isProcessingRef.current = false;
  restartTimeoutRef.current = setTimeout(() => {
    startRecognition(); // ⏳ Delay se race condition avoid hoti hai
  }, 800);
    }
   synth.cancel(); // 🛑 pehle se koi speech ho to band karo
synth.speak(utterence);
  }, [startRecognition, synth])

  const startAssistant = useCallback(() => {
    assistantStartedRef.current = true;
    setAssistantStarted(true);
    speak(`Hello ${userData?.name || "there"}, what can I help you with?`);
  }, [speak, userData?.name])

  const openExternal = useCallback((url) => {
    const newTab = window.open(url, '_blank');
    if (newTab) newTab.opener = null;
    // Speech-recognition callbacks are not always treated as a browser user
    // gesture, so popup blockers can reject window.open. Still open the command.
    if (!newTab) window.location.assign(url);
  }, [])

  const handleCommand = useCallback((data, spokenCommand = "") => {
    const {type,userInput,response,targetUrl}=data
    const normalizedCommand = spokenCommand.toLowerCase();
    const wantsToOpenYouTube = /youtube|you tube|यूट्यूब|युटुब/.test(normalizedCommand)
      && /open|खोल|ओपन/.test(normalizedCommand);
    const wantsToOpenGoogle = /google|गूगल/.test(normalizedCommand)
      && /open|खोल|ओपन/.test(normalizedCommand);

    speak(response);

    if (wantsToOpenYouTube) {
      openExternal('https://www.youtube.com/');
      return;
    }
    if (wantsToOpenGoogle) {
      openExternal('https://www.google.com/');
      return;
    }

    if (type === 'website-open') {
      try {
        const url = new URL(targetUrl);
        if (url.protocol === 'https:') openExternal(url.href);
        else throw new Error('Only HTTPS URLs are allowed');
      } catch {
        setAiText('I could not find a safe website link for that service.');
      }
      return;
    }
    
    if (type === 'google-search') {
      const query = encodeURIComponent(userInput);
      openExternal(`https://www.google.com/search?q=${query}`);
    }
     if (type === 'calculator-open') {
  
      openExternal(`https://www.google.com/search?q=calculator`);
    }
     if (type === "instagram-open") {
      openExternal(`https://www.instagram.com/`);
    }
    if (type ==="facebook-open") {
      openExternal(`https://www.facebook.com/`);
    }
     if (type ==="weather-show") {
      openExternal(`https://www.google.com/search?q=weather`);
    }

    if (type === 'youtube-search' || type === 'youtube-play') {
      const query = encodeURIComponent(userInput);
      openExternal(`https://www.youtube.com/results?search_query=${query}`);
    }

  }, [openExternal, speak])

useEffect(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setAiText("Voice recognition is not supported in this browser. Please use Chrome or Edge.");
    return undefined;
  }
  const recognition = new SpeechRecognition();

  recognition.continuous = true;
  // The assistant is primarily used with Hindi/Hinglish voice commands.
  recognition.lang = 'hi-IN';
  recognition.interimResults = false;

  recognitionRef.current = recognition;

  let isMounted = true;

  const scheduleRestart = () => {
    clearTimeout(restartTimeoutRef.current);
    if (!isMounted || isSpeakingRef.current || isProcessingRef.current) return;
    restartTimeoutRef.current = setTimeout(startRecognition, 800);
  };

  recognition.onstart = () => {
    isRecognizingRef.current = true;
    setListening(true);
  };

  recognition.onend = () => {
    isRecognizingRef.current = false;
    setListening(false);
    const wasIntentionalStop = stoppingRecognitionRef.current;
    stoppingRecognitionRef.current = false;
    // A final command deliberately stops recognition while the response is
    // processed/spoken. Speech completion restarts it at the right time.
    if (wasIntentionalStop) return;
    scheduleRestart();
  };

  recognition.onerror = (event) => {
    isRecognizingRef.current = false;
    setListening(false);
    // Chrome emits "aborted" after our own recognition.stop(). It is expected
    // and must not trigger another competing restart.
    if (event.error === "aborted") return;
    console.warn("Recognition error:", event.error);
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      setAiText("Microphone access is blocked. Please allow microphone permission and reload the page.");
      return;
    }
    if (event.error !== "aborted") scheduleRestart();
  };

  recognition.onresult = async (e) => {
    const result = e.results[e.resultIndex];
    if (!result?.isFinal) return;

    const transcript = result[0].transcript.trim();
    if (!transcript || isProcessingRef.current) return;

    console.log("Voice command received:", transcript);
    // Respond to every final command. Requiring an exact wake-word made normal
    // Hindi/Hinglish requests appear to be ignored.
    isProcessingRef.current = true;
      clearTimeout(restartTimeoutRef.current);
      setAiText("");
      setUserText(transcript);
      stoppingRecognitionRef.current = true;
      recognition.stop();
      setListening(false);
      try {
        // Gemini handles every spoken request so the assistant can understand
        // open-ended Hindi/Hinglish instructions, not just fixed commands.
        const data = await getGeminiResponse(transcript);
        if (!data?.response) throw new Error("Invalid assistant response");
        handleCommand(data, transcript);
        setAiText(data.response);
      } catch (error) {
        setAiText(error.message || "Assistant service is unavailable. Please try again.");
        isProcessingRef.current = false;
        scheduleRestart();
      }
    setUserText("");
  };


  return () => {
    isMounted = false;
    clearTimeout(restartTimeoutRef.current);
    stoppingRecognitionRef.current = true;
    recognition.stop();
    setListening(false);
    isRecognizingRef.current = false;
  };
}, [getGeminiResponse, handleCommand, startRecognition]);




  return (
    <div className='w-full h-[100vh] bg-gradient-to-t from-[black] to-[#02023d] flex justify-center items-center flex-col gap-[15px] overflow-hidden'>
      <CgMenuRight className='lg:hidden text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]' onClick={()=>setHam(true)}/>
      <div className={`absolute lg:hidden top-0 w-full h-full bg-[#00000053] backdrop-blur-lg p-[20px] flex flex-col gap-[20px] items-start ${ham?"translate-x-0":"translate-x-full"} transition-transform`}>
 <RxCross1 className=' text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]' onClick={()=>setHam(false)}/>
 <button className='min-w-[150px] h-[60px]  text-black font-semibold   bg-white rounded-full cursor-pointer text-[19px] ' onClick={handleLogOut}>Log Out</button>
      <button className='min-w-[150px] h-[60px]  text-black font-semibold  bg-white  rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] ' onClick={()=>navigate("/customize")}>Customize your Assistant</button>

<div className='w-full h-[2px] bg-gray-400'></div>
<h1 className='text-white font-semibold text-[19px]'>History</h1>

<div className='w-full h-[400px] gap-[20px] overflow-y-auto flex flex-col truncate'>
  {userData?.history?.map((his,index)=>(
    <div key={`${his}-${index}`} className='text-gray-200 text-[18px] w-full h-[30px]  '>{his}</div>
  ))}

</div>

      </div>
      <button className='min-w-[150px] h-[60px] mt-[30px] text-black font-semibold absolute hidden lg:block top-[20px] right-[20px]  bg-white rounded-full cursor-pointer text-[19px] ' onClick={handleLogOut}>Log Out</button>
      <button className='min-w-[150px] h-[60px] mt-[30px] text-black font-semibold  bg-white absolute top-[100px] right-[20px] rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] hidden lg:block ' onClick={()=>navigate("/customize")}>Customize your Assistant</button>
      <div className='w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg'>
<img src={userData?.assistantImage} alt="" className='h-full object-cover'/>
      </div>
      <h1 className='text-white text-[18px] font-semibold'>I'm {userData?.assistantName}</h1>
      <p className='text-gray-300 text-sm'>{listening ? "Listening..." : assistantStarted ? "Waiting for your command" : "Start the assistant to enable voice commands"}</p>
      {!assistantStarted && <button className='min-w-[180px] h-[52px] text-black font-semibold bg-white rounded-full cursor-pointer text-[17px]' onClick={startAssistant}>Start Assistant</button>}
      {!aiText && <img src={userImg} alt="" className='w-[200px]'/>}
      {aiText && <img src={aiImg} alt="" className='w-[200px]'/>}
    
    <h1 className='text-white text-[18px] font-semibold text-wrap'>{userText?userText:aiText?aiText:null}</h1>
      
    </div>
  )
}

export default Home
