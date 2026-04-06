"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Response_1 = require("../response/Response");
const initService_1 = require("./initService");
const router = express_1.default.Router();
router.get('/', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const initResult = yield (0, initService_1.initializeDatabase)();
        res.send((0, initService_1.formatInitResultHtml)(initResult));
    }
    catch (err) {
        const message = err instanceof Error ? err.message : '初始化失败';
        const data = err instanceof initService_1.InitDatabaseError ? err.data : err;
        res.send(new Response_1.ResponseError(data, message));
    }
}));
exports.default = router;
