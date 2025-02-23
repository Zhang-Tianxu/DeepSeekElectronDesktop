const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process')
const path = require('path');
const { start } = require('repl');
const { create } = require('domain');

fastapiProcess = null
let deepSeekBackendHost
let win = null

const menus = [
  {
    label: "dev tool",
    accelerator: "Ctrl+D",
    click: () => {
      win.webContents.openDevTools(); // 打开开发者工具
    }
  },
  {
    label: "关于",
    submenu:[
      {
        label: "关于软件",
        accelerator: "Ctrl+A",
        click: () => {
          dialog.showMessageBox({
            type:"info",
            title:"关于",
            message:"软件主要用于DeepSeek R1的本地运行"
          })
        }
      },
      {
        label: "运行状态",
        click: async () => {
          let response = await fetch(deepSeekBackendHost + '/gpu_available/');
          const gpu_res = await response.json()
          response = await fetch(deepSeekBackendHost + '/current_model_name/');
          const model_name_res = await response.json()
          console.log(model_name_res)

          dialog.showMessageBox({
            type:"info",
            title:"关于",
            message:"GPU: " + (gpu_res ? "可用" : "不可用") + "\n当前模型：" + model_name_res
          })
        }
      }
    ]
  }
]

app.whenReady().then(() => {
  // 第一步：创建启动窗口
  splashWindow = new BrowserWindow({
    width: 800,
    height: 600,
    transparent: false, // 透明背景
    frame: true,      // 无边框
    alwaysOnTop: false, // 保持最前
    show:false,
    icon: path.join(__dirname, '../public/logo.ico'),
    title:"DeepSeek-R1 本地软件",
    webPreferences: {
      preload: path.join(__dirname, 'splash_preload.js'), // 预加载脚本
      nodeIntegration: false,
      contextIsolation:true
    }
  })
  splashWindow.maximize()
  Menu.setApplicationMenu(null)
  // 加载启动动画页面
  splashWindow.loadFile(path.join(__dirname, 'assets/splash.html'));
  splashWindow.show()
  // splashWindow.webContents.openDevTools(); // 打开开发者工具

  /*
  // run without backend
  createWindow()
  splashWindow.destroy()
  deepSeekBackendHost = "http:/localhost:" + "50055"
  ipcMain.handle('get-deepseek-backend-host', () => {
    return deepSeekBackendHost
  })
  return;
  */
  

  startBackend(
    (message)=>{
      createWindow()
      splashWindow.destroy()
    },
    async (error) => {
      console.log(typeof (error))
      console.log(error)
    }
  )

})

function startBackend(succeedCallbasck, errorCallback) {
  const ramdomPortStart = 8000
  const ramdomPortEnd = 20000
  const randomPort = Math.floor(Math.random() * (ramdomPortEnd - ramdomPortStart + 1)) + ramdomPortStart
  deepSeekBackendHost = "http:/localhost:" + randomPort
  // deepSeekBackendHost = "http:/localhost:" + "50055"
  ipcMain.handle('get-deepseek-backend-host', () => {
    return deepSeekBackendHost
  })
  // 启动 FastAPI 服务
  const scriptPath = path.join(__dirname, '../python_server/dist/server.exe');

  fastapiProcess = spawn(scriptPath, [randomPort]);
  /*
  setInterval(async ()=>{
    if(splashWindow) {
      splashWindow.webContents.send('task-update', "模型加载超时")
    }
  }, 5 * 60 * 1000)
  */

  fastapiProcess.stdout.on('data', (data) => {
    // 可以视为加载成功
    succeedCallbasck(data)
    console.log(`FastAPI: ${data}`);
  });

  fastapiProcess.stderr.on('data', (data) => {
    succeedCallbasck(data)
    errorCallback(data)
    console.error(`FastAPI Error: ${data}`);
  });

  fastapiProcess.on('error', (error)=>{
    console.log("on error: ", error)
  })
  fastapiProcess.on('exit', (code)=>{
    if (code != null && code != 0) {
      dialog.showMessageBoxSync({
        type: "error",
        title: "错误",
        message: "AI模型加载错误，重启后错误依然存在，请联系管理员"
      })
    }
    console.log("server exit: ", code)
  })
}


function createWindow() {
  if(win) {
    return;
  }
  win = new BrowserWindow({
    width: 800,
    height: 600,
    show:false,
    icon: path.join(__dirname, '../public/logo.ico'),
    title:"DeepSeek-R1 本地软件",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // 预加载脚本
      contextIsolation: true, // 启用上下文隔离
      nodeIntegration: false // 禁用Node集成以增强安全
    }
  });
  win.maximize()
  const menu = Menu.buildFromTemplate(menus)
  Menu.setApplicationMenu(menu)
  // Menu.setApplicationMenu(null)

  // 开发环境加载Vite服务器，生产环境加载构建文件
  // if (true || process.env.NODE_ENV === 'development') {
  if (false && process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools(); // 打开开发者工具
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}


// 处理窗口关闭和macOS应用退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on("before-quit", () => {
  dialog.showMessageBoxSync({
    type: "warning",
    title: "警告",
    message: "即将退出"
  })
  if (fastapiProcess) {

    fastapiProcess.kill('SIGINT')
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
})