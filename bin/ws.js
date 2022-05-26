// 载入 ws 库
const WebSocketServer = require('ws')

const timers = require('timers')

// 创建一个 websocket 服务
const wss = new WebSocketServer.Server({ port: 9999 })

let timeIntervalHandle = null

// 创建连接
wss.on("connection", ws => {
    console.log("新客户端已连接")
    // 接收到 client 数据时
    ws.on("message", data => {
        console.log(`客户端返回信息: ${data}`)
        let receiveMessage = data.toString()
        wss.clients.forEach(client =>  {
            if (ws !== client){
                client.send(receiveMessage)
            }
        })

    })
    ws.on("close", () => {
        console.log("websocket server: 客户端已关闭连接")
    })
    ws.onerror = function () {
        console.log("websocket server: 出错了")
    }
})
console.log("websocket 服务已运行在端口 9999")
