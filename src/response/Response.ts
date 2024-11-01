class ResponseError {
    readonly success = false
    message: string
    data = null
    constructor(data: any, message?: string) {
        this.success = false // true / false
        this.message = message
        this.data = data
    }
}

class ResponseSuccess {
    readonly success = true
    message: string
    data = null
    constructor(data: any, message?: string) {
        this.success = true // true / false
        this.message = message
        this.data = data
    }
}
export {
    ResponseSuccess, ResponseError
}
