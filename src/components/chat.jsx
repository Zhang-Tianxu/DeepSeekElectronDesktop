
import { useState } from 'react'
import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Spin, Button } from 'antd'
import {UpCircleOutlined} from '@ant-design/icons';
function spliteAIAnswer(str) {
    console.log(str)

    const regx1 = /((.|\n|\t|\r)*)(<think>((.|\n|\t|\r)*)<\/think>)((.|\n|\t|\r)*)/;

    const regx2 = /((.|\n|\t|\r)*)(<think>((.|\n|\t|\r)*)(<\/think>)?)((.|\n|\t|\r)*)/;

    // Regular expression to match the three parts, with the closing </think> tag optional

    // Apply regex to the string
    const match1 = str.match(regx1); // 123<think>456</think>789
    const match2 = str.match(regx2); // 123<think>456
    if(match1) {
        // question<think>think</think>answer
        return [str, match1[1].trim(), match1[4].trim(),match1[6].trim()]
    }
    if(match2) {
        // question<think>think
        return [str,match2[1].trim(), match2[4].trim(), ""]
    }
    // question
    return [str, str, "", ""]

}

export default function DeepSeekChat() {
    const [chatHistory, setChatHistory] = useState([])
    const [userMsg, setUserMsg] = useState('')


    return (
        <div style={{ height: "100%", alignItems: "center", justifyContent: "flex-end", display: "flex", flexDirection: "column", marginBottom: "2vh" }}>
            <div style={{ overflowY: "auto", scrollbarWidth: "none", height: "90%", width:"100%" }}>
                {chatHistory.map((item, idx) => (
                    <div key={idx} style={{
                    justifySelf: item['role'] == 'user' ? 'right' : 'left',
                    textAlign: item['role'] == 'user' ? 'right' : 'left',
                    display: "flex", justifyContent: "flex-end" }}>
                        <div style={{
                        border: item['role'] == 'user' ? "1px solid" : "none",
                        backgroundColor: item['role'] == 'user' ? "darkgray" : "",
                        color: item['role'] == 'user' ? "white" : "black",
                        borderRadius: "10px", padding: "5px" }}>
                            { !item['finish'] &&
                                <Spin style={{paddingBottom:"1rem"}}></Spin>
                            }
                            {item['role'] == 'user' && <div>{spliteAIAnswer(item['content'])[0]}</div>}
                            {item['role'] != 'user' && <div style={{backgroundColor:"gray", border:"none", borderRadius:"20px", padding:"1rem", color:"white"}}>
                                <div>
                                    <b>思考：</b>
                                </div>
                                {spliteAIAnswer(item['content'])[2]}
                            </div>}
                            <ReactMarkdown className="react-markdown">
                                {/* newChat['content'] = spliteAIAnswer(newChat['content']) */}
                            {spliteAIAnswer(item['content'])[3]}
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
                <Button
                type='primary'
                disabled={userMsg.length == 0}
                icon={<UpCircleOutlined/>}
                    // style={{ padding: "0.5rem 1rem 0.5rem 1rem", backgroundColor: "green", color: "white" }}
                    onClick={async () => {
                        setUserMsg("")
                        setChatHistory([...chatHistory, { 'role': 'user', 'content': userMsg, 'finish':true }])

                        const deepSeekHost = await window.globalVariables.getDeepSeekBackendHost()
                        //   const response = await fetch('http://localhost:8000/stream/' + userMsg);
                        //   const response = await fetch('http://localhost:8002/stream/' + userMsg);
                        const response = await fetch(deepSeekHost + '/chat_dynamic/', {
                            method:"POST",
                            headers: {
                                'Content-Type':"application/json"
                            },
                            body:JSON.stringify({"qustion": userMsg})
                        });
                        const reader = response.body.getReader();
                        const decoder = new TextDecoder();
                        let newChat = { 'role': 'assistant', 'content': '' , 'finish':false}

                        while (true) {
                            await new Promise(r => setTimeout(r, 100))
                            const { done, value } = await reader.read();
                            if (done) {
                                newChat['finish'] = true
                                setChatHistory([...chatHistory, { 'role': 'user', 'content': userMsg, 'finish':true }, newChat])
                                break;
                            } else {
                                console.log(decoder.decode(value))
                                newChat['content'] = newChat['content'] + decoder.decode(value)
                                setChatHistory([...chatHistory, { 'role': 'user', 'content': userMsg,'finish':true }, newChat])
                            }
                        }
                    }}>发送</Button>
            </div>
        </div>
    )
}