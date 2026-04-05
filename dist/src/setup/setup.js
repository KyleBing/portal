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
const initService_1 = require("../init/initService");
const setupService_1 = require("./setupService");
const router = express_1.default.Router();
// 安装向导首页先读取当前状态，决定是继续配置、执行初始化还是直接提示已完成。
router.get('/status', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, setupService_1.getSetupStatus)();
        res.send(new Response_1.ResponseSuccess(data, '请求成功'));
    }
    catch (err) {
        const message = err instanceof Error ? err.message : '读取安装状态失败';
        res.send(new Response_1.ResponseError(err, message));
    }
}));
// 写入数据库配置和项目配置，但只允许在初始化前执行。
router.post('/config', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, setupService_1.saveSetupConfig)(req.body || {});
        res.send(new Response_1.ResponseSuccess(data, '配置已保存，当前服务已同步新配置，建议随后重启服务'));
    }
    catch (err) {
        const message = err instanceof Error ? err.message : '保存配置失败';
        res.send(new Response_1.ResponseError(err, message));
    }
}));
// 初始化接口复用旧逻辑服务，便于页面调用和后续扩展。
router.post('/init', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const initResult = yield (0, initService_1.initializeDatabase)();
        if (initResult.alreadyInitialized) {
            res.send(new Response_1.ResponseError(initResult.data, initResult.message));
            return;
        }
        res.send(new Response_1.ResponseSuccess(initResult.data, initResult.message));
    }
    catch (err) {
        const message = err instanceof Error ? err.message : '初始化失败';
        res.send(new Response_1.ResponseError(err, message));
    }
}));
exports.default = router;
