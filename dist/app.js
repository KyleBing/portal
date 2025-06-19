"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("module-alias/register");
const http_errors_1 = __importDefault(require("http-errors"));
const path_1 = __importDefault(require("path"));
const morgan_1 = __importDefault(require("morgan"));
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
// view engine setup
// app.set('views', path.join(__dirname, 'views'))
// app.set('view engine', 'pug')
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json({ limit: '50mb' })); // 上传文件内容的大小限制
app.use(express_1.default.urlencoded({ extended: false }));
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
// 基础相关
const index_1 = __importDefault(require("./src/index"));
app.use('/', index_1.default);
// 用户
const user_1 = __importDefault(require("./src/user/user"));
app.use('/user', user_1.default);
// 初始化
const init_1 = __importDefault(require("./src/init/init"));
app.use('/init', init_1.default);
// 邀请码
const invitation_1 = __importDefault(require("./src/user/invitation"));
app.use('/invitation', invitation_1.default);
// 二维码-前端
const qrFront_1 = __importDefault(require("./src/qr/qrFront"));
app.use('/qr-front', qrFront_1.default);
// 二维码-后台
const qrManager_1 = __importDefault(require("./src/qr/qrManager"));
app.use('/qr-manager', qrManager_1.default);
// 地图 - 路线
const mapRoute_1 = __importDefault(require("./src/map/mapRoute"));
app.use('/map-route', mapRoute_1.default);
// 地图 - 点图
const mapPointer_1 = __importDefault(require("./src/map/mapPointer"));
app.use('/map-pointer', mapPointer_1.default);
// 统计
const statistic_1 = __importDefault(require("./src/statistic/statistic"));
app.use('/statistic', statistic_1.default);
// 日记
const diary_1 = __importDefault(require("./src/diary/diary"));
app.use('/diary', diary_1.default);
// 日记 - 类别
const diaryCategory_1 = __importDefault(require("./src/diary/diaryCategory"));
app.use('/diary-category', diaryCategory_1.default);
// 日记 - 银行卡
const bankCard_1 = __importDefault(require("./src/diary/bankCard"));
app.use('/bank-card', bankCard_1.default);
// 日记 - 账单
const bill_1 = __importDefault(require("./src/diary/bill"));
app.use('/bill', bill_1.default);
// 点赞管理
const thumbsUp_1 = __importDefault(require("./src/thumbsUp/thumbsUp"));
app.use('/thumbs-up', thumbsUp_1.default);
// 图片、文件操作
const fileManager_1 = __importDefault(require("./src/file/fileManager"));
app.use('/file-manager', fileManager_1.default);
// 七牛云图片
const imageQiniu_1 = __importDefault(require("./src/imageQiniu/imageQiniu"));
app.use('/image-qiniu', imageQiniu_1.default);
// 五笔相关
const wubiDict_1 = __importDefault(require("./src/wubi/wubiDict"));
const wubiWord_1 = __importDefault(require("./src/wubi/wubiWord"));
const wubiCategory_1 = __importDefault(require("./src/wubi/wubiCategory"));
// app.use('/dict', routerWubiDict)      // 词库保存 // 保留是因为之前助手需要这个接口路径
app.use('/wubi/dict', wubiDict_1.default); // 词条操作
app.use('/wubi/word', wubiWord_1.default); // 词条操作
app.use('/wubi/category', wubiCategory_1.default); // 词条类别
// 饥荒
const dontStarve_1 = __importDefault(require("./src/dontstarve/dontStarve"));
app.use('/starve', dontStarve_1.default);
// catch 404 and forward to error handler
app.use((req, res, next) => {
    next((0, http_errors_1.default)(404));
});
// ERROR HANDLER
app.use((err, req, res, next) => {
    // set locals, only providing error in development
    const error = req.app.get('env') === 'development' ? err : {};
    // return JSON error response
    res.status(err.status || 500);
    res.json({
        status: 'error',
        message: err.message,
        error: error
    });
});
exports.default = app;
