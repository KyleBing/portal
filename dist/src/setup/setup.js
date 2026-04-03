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
router.get('/status', (_req, res) => {
    res.send(new Response_1.ResponseSuccess((0, setupService_1.getSetupStatus)(), '请求成功'));
});
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
