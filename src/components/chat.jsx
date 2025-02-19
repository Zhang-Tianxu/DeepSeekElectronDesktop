
import { useState } from 'react'
import React, { useEffect } from 'react'

export default function DeepSeekChat() {
  const [count, setCount] = useState(0)
  const [chatHistory, setChatHistory] = useState([])
  const [userMsg, setUserMsg] = useState('1+1等于几？')
  const [answer, setAnwer] = useState('')

    /*
    useEffect(() =>{
        (
            async () => {
                const response = await fetch('http://127.0.0.1:8000/stream/在Electron中，如何让用户点击按钮调用main线程的function？');
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                const { done, value } = await reader.read();
                console.log(decoder.decode(value))
                setResponse(response + decoder.decode(value))
                if (done) {
                    console.log(done)
                };
            }
        )();

    }, [response])
    */


//   let chat_his = [
// ]

  return (
    <>
    {chatHistory.map((item, idx) => (
        <div key={idx} style={{alignContent: item['role'] == 'user' ? 'left' : 'right', textAlign:item['role'] == 'user' ? 'left': 'right', backgroundColor: item['role'] == 'user' ? 'red' : 'green', margin:'10px'}}>
            <div>{item['role']} : {item['content']}</div>
        </div>
    ))}
    <div>
    {answer}
    </div>
    <textarea value={userMsg} onInput={(e)=>{
        setUserMsg(e.target.value)
    }}></textarea>
    <button onClick={async ()=>{
              setChatHistory([...chatHistory, {'role':'user', 'content':userMsg}])
            //   const response = await fetch('http://localhost:8000/stream/' + userMsg);
              const response = await fetch('http://localhost:8002/stream/' + userMsg);
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
            //   let LLMAnswer = ""
              let newChat = {'role':'assistant', 'content': ''}

              while (true) {
                  await new Promise(r => setTimeout(r, 100))
                  const { done, value } = await reader.read();
                  if (done) 
                  {
                      console.log("done")
                      setChatHistory([...chatHistory, {'role':'user', 'content':userMsg},newChat])
                    break;
                  } else {
                    console.log(decoder.decode(value))
                    newChat['content'] = newChat['content'] + decoder.decode(value)
                    setChatHistory([...chatHistory,{'role':'user', 'content':userMsg} ,newChat])
                  }
              }
    }}>send</button>
    </>
  )
}