class ResponseError {
    success: boolean
    message: string
    data: any
    constructor(data: any, message?: string) {
        this.success = false
        this.message = message
        this.data = data
    }
}

export {
    ResponseError
}
