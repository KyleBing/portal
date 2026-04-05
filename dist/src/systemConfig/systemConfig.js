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
const utility_1 = require("../utility");
const systemConfigService_1 = require("./systemConfigService");
const router = express_1.default.Router();
// GET 供全站读取展示信息；写入仅 PUT 且需管理员（verifyAdmin）
router.get('/', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, systemConfigService_1.getSystemConfig)();
        res.send(new Response_1.ResponseSuccess(data, '请求成功'));
    }
    catch (err) {
        const message = err instanceof Error ? err.message : '读取系统配置失败';
        res.send(new Response_1.ResponseError(err, message));
    }
}));
router.get('/admin', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userInfo = yield (0, utility_1.verifyAuthorization)(req);
        (0, systemConfigService_1.verifyAdmin)(userInfo);
        const data = yield (0, systemConfigService_1.getAdminSystemConfig)();
        res.send(new Response_1.ResponseSuccess(data, '请求成功'));
    }
    catch (err) {
        if (err instanceof Response_1.ResponseError) {
            res.send(err);
            return;
        }
        const message = err instanceof Error ? err.message : '读取系统配置失败';
        res.send(new Response_1.ResponseError(err, message));
    }
}));
router.put('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userInfo = yield (0, utility_1.verifyAuthorization)(req);
        (0, systemConfigService_1.verifyAdmin)(userInfo);
        const data = yield (0, systemConfigService_1.saveSystemConfig)(req.body || {});
        res.send(new Response_1.ResponseSuccess(data, '系统配置已保存'));
    }
    catch (err) {
        if (err instanceof Response_1.ResponseError) {
            res.send(err);
            return;
        }
        const message = err instanceof Error ? err.message : '保存系统配置失败';
        res.send(new Response_1.ResponseError(err, message));
    }
}));
exports.default = router;
