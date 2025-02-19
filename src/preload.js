const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
});


contextBridge.exposeInMainWorld('deepseek', {
	chat: (id) =>{
		fetchStream(id)
		console.log('deepseek')
	}
})

contextBridge.exposeInMainWorld('versions', {
	node: ()=>process.versions.node,
	chrome: ()=>process.versions.chrome,
	electron: ()=>process.versions.electron,
	stream: () => ipcRenderer.invoke('stream')

})

async function fetchStream(id) {
	const response = await fetch('http://127.0.0.1:8000/stream/在Electron中，如何让用户点击按钮调用main线程的function？');
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	const information = document.getElementById(id)

	while(true) {
	  const { done, value } = await reader.read();
	  if(done) break;
        information.innerText = information.innerText + decoder.decode(value)
	//   console.log(decoder.decode(value)); // 逐词输出
	}
  }
// fetchData()