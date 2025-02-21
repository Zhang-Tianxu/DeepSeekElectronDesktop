const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('splashAPI', {
  onTaskUpdate:(callback) =>{
    ipcRenderer.on('task-update', (event, data) => {
      callback(data)
    })
  }
});