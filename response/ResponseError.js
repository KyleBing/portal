class ResponseError {
    constructor(data, message) {
        this.success = false // true / false
        this.message = message
        this.data = data
    }
}

module.exports = ResponseError
