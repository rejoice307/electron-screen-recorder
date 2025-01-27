import { app, BrowserWindow, desktopCapturer, dialog, ipcMain } from 'electron'
import { writeFile } from 'fs'
import path from 'path'
import squirrel from "electron-squirrel-startup"
import { ENVS } from './envs'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (squirrel) {
  app.quit()
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      nodeIntegrationInSubFrames: true,
    },
  })

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
  }

  // Open the DevTools.
  if (ENVS.ENVIRONMENT_MODE === 'development') {
    mainWindow.webContents.openDevTools()
  } else if (ENVS.ENVIRONMENT_MODE === 'production') {
    mainWindow.setMenuBarVisibility(false)
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
ipcMain.handle('GET_INPUT_SOURCES', async () => {
  const inputSources = await desktopCapturer.getSources({ types: ['window', 'screen'], fetchWindowIcons: true, thumbnailSize: { height: 256, width: 256 } })
  return inputSources.map((source) => ({ ...source, thumbnail: source.thumbnail.toDataURL() }))
})

ipcMain.handle('STOP_SCREEN_RECORDING', async (_event, newSource: string, newBlob: Blob) => {
  const source: Electron.DesktopCapturerSource = JSON.parse(newSource)
  const { filePath } = await dialog.showSaveDialog({
    buttonLabel: 'Save video',
    defaultPath: `${source.name}-recording-${Date.now()}.webm`
  })
  const blob = await (new Blob([newBlob], { type: 'video/webm; codecs=vp9' })).arrayBuffer()
  if (filePath) {
    writeFile(filePath, Buffer.from(blob), () => true)
    return true
  }
  return false
})