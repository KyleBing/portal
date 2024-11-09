"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseError = exports.ResponseSuccess = void 0;
class ResponseError {
    constructor(data, message) {
        this.success = false;
        this.data = null;
        this.success = false; // true / false
        this.message = message;
        this.data = data;
    }
}
exports.ResponseError = ResponseError;
class ResponseSuccess {
    constructor(data, message) {
        this.success = true;
        this.data = null;
        this.success = true; // true / false
        this.message = message;
        this.data = data;
    }
}
exports.ResponseSuccess = ResponseSuccess;
