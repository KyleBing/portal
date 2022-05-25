// 载入 ws 库
const WebSocketServer = require('ws')

const timers = require('timers')

// 创建一个 websocket 服务
const wss = new WebSocketServer.Server({ port: 9999 })

let timeIntervalHandle = null
let dataIndex = 0

// 创建连接
wss.on("connection", ws => {
    console.log("新客户端已连接" + ws)
    // 接收到 client 数据时
    ws.on("message", data => {
        console.log(JSON.stringify(data))
        console.log(`客户端返回信息: ${data}`);
        let receiveMessage = data.toString()
        switch (receiveMessage){
            case 'start':
                console.log('inside switch case start');
                timeIntervalHandle = timers.setInterval(()=>{
                    ws.send(dataIndex)
                    dataIndex = dataIndex + 1
                    console.log(dataIndex)
                },1000)
                break;
            case 'end':
                timers.clearInterval(timeIntervalHandle)
                timeIntervalHandle = null
                ws.send('已停止循环')
                break
        }

/*        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(data)
            }
        })*/
    })
    ws.on("close", () => {
        console.log("websocket server: 客户端已关闭连接")
    })
    ws.onerror = function () {
        console.log("websocket server: 出错了")
    }
})
console.log("websocket 服务已运行在端口 9999")
