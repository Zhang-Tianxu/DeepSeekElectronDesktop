const { app, BrowserWindow } = require('electron');
const {spawn} = require('child_process')
const path = require('path');

let deepSeekBackendHost
function createWindow() {
  const ramdomPortStart = 49152
  const ramdomPortEnd = 65535
  const randomPort = Math.floor(Math.random() * (ramdomPortEnd - ramdomPortStart + 1)) + ramdomPortStart
  ipcMain.handle('get-deepseek-backend-host', ()=>{
    return deepSeekBackendHost
  })
  // 启动 FastAPI 服务
  /*
  const scriptPath = path.join(__dirname, '../python_server/server.py');
  console.log(scriptPath)
  fastapiProcess = spawn('python', [scriptPath]);

  fastapiProcess.stdout.on('data', (data) => {
    console.log(`FastAPI: ${data}`);
  });

  fastapiProcess.stderr.on('data', (data) => {
    console.error(`FastAPI Error: ${data}`);
  });
  */
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // 预加载脚本
      contextIsolation: true, // 启用上下文隔离
      nodeIntegration: false // 禁用Node集成以增强安全
    }
  });

  // 开发环境加载Vite服务器，生产环境加载构建文件
  if (true || process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools(); // 打开开发者工具
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

// 处理窗口关闭和macOS应用退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});