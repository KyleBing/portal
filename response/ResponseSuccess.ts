class ResponseSuccess {
    success: boolean
    message: string
    data: any
    constructor(data: any, message?: string) {
        this.success = true
        this.message = message
        this.data = data
    }
}

export {
    ResponseSuccess
}
