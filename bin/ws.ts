import {
    dateFormatter,
    getDataFromDB,
} from "../src/utility";

// 载入 ws 库
import WebSocketServer from 'ws'


// 只接收 {key: "ipad"} 这样的数据

// 创建一个 websocket 服务
const wss = new WebSocketServer.Server({port: 9999})

class WSMessage {
    type = EnumWSMsgType["heart-beat"]
    content = ''

    constructor(type: EnumWSMsgType, content: any) {
        this.type = type
        this.content = content
    }
}

enum EnumWSMsgType {
    'thumbs-up' = 'thumbs-up',
    'heart-beat' = 'heart-beat'
}


// 创建连接
wss.on("connection", ws => {
    console.log(`${dateFormatter(new Date())} 新客户端已连接`)
    // 接收到 client 数据时
    ws.on("message", (data: string) => {
        // console.log(`客户端返回信息: ${data}`)
        let receiveMessage = JSON.parse(data)
        switch (receiveMessage.type) {
            case EnumWSMsgType["heart-beat"]:
                ws.send(JSON.stringify(new WSMessage(EnumWSMsgType["heart-beat"], 'pong')))
                break;
            case EnumWSMsgType["thumbs-up"]:
                getDataFromDB('diary', [`UPDATE thumbs_up SET count = count + 1 WHERE name = '${receiveMessage.content.key}'`])
                    .then(() => {
                        getDataFromDB('diary', [`select count from thumbs_up where name = '${receiveMessage.content.key}'`], true)
                            .then(result => {
                                if (result) {
                                    let sendMessage = new WSMessage(EnumWSMsgType["thumbs-up"], {
                                        key: receiveMessage.content.key,
                                        count: result.count
                                    })
                                    wss.clients.forEach(client => {
                                        client.send(JSON.stringify(sendMessage))
                                    })
                                }
                            })
                    })
                break;
        }
    })
    ws.on("close", () => {
        console.log(`${dateFormatter(new Date())} websocket server: 客户端已关闭连接`)
    })
    ws.onerror = function () {
        console.log(`${dateFormatter(new Date())} websocket server: 出错了`)
    }
})


console.log(`${dateFormatter(new Date())} websocket 服务已运行在端口 9999`)
