class ResponseError {
    success = false
    message = ''
    data = null
    constructor(data: any, message?: string) {
        this.success = false // true / false
        this.message = message
        this.data = data
    }
}

class ResponseSuccess {
    success = true
    message = ''
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
