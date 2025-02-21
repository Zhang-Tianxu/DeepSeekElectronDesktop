
import { useState } from 'react'
import React from 'react'
import ReactMarkdown from 'react-markdown'

export default function DeepSeekChat() {
    const [chatHistory, setChatHistory] = useState([])
    const [userMsg, setUserMsg] = useState('1+1等于几？')

    return (
        <div style={{ height: "100%", alignItems: "center", justifyContent: "flex-end", display: "flex", flexDirection: "column", marginBottom: "2vh" }}>
            <div style={{ overflowY: "auto", scrollbarWidth: "none", height: "90%" }}>
                {chatHistory.map((item, idx) => (
                    <div key={idx} style={{ width: "100%", margin: '10px', justifySelf: item['role'] == 'user' ? 'right' : 'left', textAlign: item['role'] == 'user' ? 'right' : 'left', display: "flex", justifyContent: "flex-end" }}>
                        <div style={{ width: "fit-content", border: "1px solid", borderRadius: "10px", padding: "5px" }}>
                            <ReactMarkdown>
                                {item['content']}
                            </ReactMarkdown>
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ width: "100%", height: "10%", padding: "1rem 0 1rem 0", justifyContent: "space-around", alignItems: "center", display: "flex" }}>
                <textarea
                    style={{ width: "80%", height: "5rem", borderRadius: "20px", padding: "10px" }}
                    value={userMsg} onInput={(e) => {
                        setUserMsg(e.target.value)
                    }}></textarea>
                <button
                    style={{ padding: "0.5rem 1rem 0.5rem 1rem", backgroundColor: "green", color: "white" }}
                    onClick={async () => {
                        setChatHistory([...chatHistory, { 'role': 'user', 'content': userMsg }])
                        const gpu = await fetch('http://localhost:50055/gpu_available/');
                        const gpu_res = await gpu.json()

                        const deepSeekHost = await window.globalVariables.getDeepSeekBackendHost()
                        //   const response = await fetch('http://localhost:8000/stream/' + userMsg);
                        //   const response = await fetch('http://localhost:8002/stream/' + userMsg);
                        const response = await fetch(deepSeekHost + '/stream/' + userMsg);
                        const reader = response.body.getReader();
                        const decoder = new TextDecoder();
                        let newChat = { 'role': 'assistant', 'content': '' }

                        while (true) {
                            await new Promise(r => setTimeout(r, 100))
                            const { done, value } = await reader.read();
                            if (done) {
                                console.log("done")
                                setChatHistory([...chatHistory, { 'role': 'user', 'content': userMsg }, newChat])
                                break;
                            } else {
                                console.log(decoder.decode(value))
                                newChat['content'] = newChat['content'] + decoder.decode(value)
                                setChatHistory([...chatHistory, { 'role': 'user', 'content': userMsg }, newChat])
                            }
                        }
                    }}>发送</button>
            </div>
        </div>
    )
}