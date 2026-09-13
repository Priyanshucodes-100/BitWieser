const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('chainwatchDesktop', { bundled: true })
