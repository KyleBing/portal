// 载入 ws 库
const WebSocketServer = require('ws')
const utility = require("../config/utility")

// 只接收 {key: "ipad"} 这样的数据


// 创建一个 websocket 服务
const wss = new WebSocketServer.Server({ port: 9999 })

let timeIntervalHandle = null

// 创建连接
wss.on("connection", ws => {
    console.log("新客户端已连接")
    // 接收到 client 数据时
    ws.on("message", data => {
        console.log(`客户端返回信息: ${data}`)
        let receiveMessage = JSON.parse(data.toString())
        if (receiveMessage.key){
            utility.getDataFromDB([`UPDATE thumbs_up SET up_count=up_count + 1 WHERE up_key = '${receiveMessage.key}'`])
                .then(resultUpdate => {
                    utility.getDataFromDB([`select up_count from thumbs_up where up_key = '${receiveMessage.key}'`], true)
                        .then(result => {
                            if (result){
                                let sendMessage = JSON.stringify({
                                    key: receiveMessage.key,
                                    count: result.up_count
                                })
                                console.log(sendMessage)
                                wss.clients.forEach(client =>  {
                                    console.log('111')
                                    client.send(sendMessage)
                                })
                            }
                        })
                })
        }
    })
    ws.on("close", () => {
        console.log("websocket server: 客户端已关闭连接")
    })
    ws.onerror = function () {
        console.log("websocket server: 出错了")
    }
})


console.log("websocket 服务已运行在端口 9999")
