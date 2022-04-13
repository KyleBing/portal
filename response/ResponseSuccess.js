class ResponseSuccess {
    constructor(data, message) {
        this.success = true // true / false
        this.message = message
        this.data = data
    }
}

module.exports = ResponseSuccess
