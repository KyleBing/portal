"use strict";
/**
 * cron 任务，每个小时更新用户统计数据
 * ## 使用方法
 * ubuntu 使用 crontab -e 命令进入 crontab 的编辑页，添加如下命令。
 * 17 * * * * node /var/www/html/portal/routes/cron/updateUserInfo.js
 * 意思就是每个小时的 17 分刷新用户数据
 */
Object.defineProperty(exports, "__esModule", { value: true });
const utility_1 = require("../src/utility");
(0, utility_1.getDataFromDB)('diary', [`select * from users`])
    .then(data => {
    let sqlArray = [];
    data.forEach((user) => {
        sqlArray.push(`update users set count_diary = (SELECT count(*) from diaries where uid = ${user.uid}) where uid = ${user.uid};`);
        sqlArray.push(`update users set count_map_route = (SELECT count(*) from map_route where uid = ${user.uid}) where uid = ${user.uid};`);
        sqlArray.push(`update users set count_map_pointer = (SELECT count(*) from map_pointer where uid = ${user.uid}) where uid = ${user.uid};`);
        sqlArray.push(`update users set count_dict  = (SELECT count(*) from wubi.wubi_dict where uid = ${user.uid}) where uid = ${user.uid};`);
        sqlArray.push(`update users set count_qr    = (SELECT count(*) from qrs where uid = ${user.uid}) where uid = ${user.uid};`);
        sqlArray.push(`update users set count_words = (SELECT count(*) from wubi.wubi_words where user_init = ${user.uid} and category_id != 1) where uid = ${user.uid};`);
    });
    (0, utility_1.getDataFromDB)('diary', sqlArray, true)
        .then(() => {
        console.log(`success: user's count diary|dict has updated`);
    })
        .catch(() => {
        console.log(`error:  user count diary|dict update`);
    });
})
    .catch(() => {
    console.log('error: get users info');
});
