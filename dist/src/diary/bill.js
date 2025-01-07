"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Response_1 = require("../response/Response");
const utility_1 = require("../utility");
const router = express_1.default.Router();
const DB_NAME = 'diary';
router.get('/', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        // let startPoint = (req.query.pageNo - 1) * req.query.pageSize // 日记起点
        let sqlArray = [];
        sqlArray.push(`SELECT *from diaries where uid='${userInfo.uid}' and category = 'bill' order by date asc`);
        (0, utility_1.getDataFromDB)(DB_NAME, sqlArray)
            .then(billDiaryList => {
            (0, utility_1.updateUserLastLoginTime)(userInfo.uid);
            let billResponse = [];
            billDiaryList.forEach((diary) => {
                // decode unicode
                billResponse.push((0, utility_1.processBillOfDay)(diary, []));
            });
            res.send(new Response_1.ResponseSuccess(billResponse, '请求成功'));
        })
            .catch(err => {
            res.send(new Response_1.ResponseError(err, err.message));
        });
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.get('/sorted', (req, res) => {
    let yearsStr = String(req.query.years);
    if (!yearsStr) {
        res.send(new Response_1.ResponseError('', '未选择年份'));
        return;
    }
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let sqlRequests = [];
        let sqlArray = [];
        yearsStr
            .split(',')
            .forEach((year) => {
            for (let month = 1; month <= 12; month++) {
                sqlArray.push(`
                                select *,
                                date_format(date,'%Y%m') as month_id,
                                date_format(date,'%m') as month
                                from diaries 
                                where year(date) = ${year}
                                and month(date) = ${month}
                                and category = 'bill'
                                and uid = ${userInfo.uid}
                                order by date asc;
                            `);
            }
        });
        sqlRequests.push((0, utility_1.getDataFromDB)(DB_NAME, sqlArray));
        // 这里有个异步运算的弊端，所有结果返回之后，我需要重新给他们排序，因为他们的返回顺序是不定的。难搞哦
        Promise
            .all(sqlRequests)
            .then(yearDataArray => {
            let responseData = [];
            let afterValues = yearDataArray[0].filter(item => item.length > 0); // 去掉内容为 0 的年份数据
            afterValues.forEach(daysArray => {
                let daysData = [];
                let monthSum = 0;
                let monthSumIncome = 0;
                let monthSumOutput = 0;
                let food = {
                    breakfast: 0, // 早餐
                    launch: 0, // 午餐
                    dinner: 0, // 晚饭
                    supermarket: 0, // 超市
                    fruit: 0, // 水果
                    sum: 0, // sum
                };
                // 用一次循环处理完所有需要在循环中处理的事：合总额、map DayArray
                let keywords = [];
                if (req.query.keyword) {
                    keywords = req.query.keyword.split(' ');
                }
                daysArray.forEach(diaryDay => {
                    let processedDayData = (0, utility_1.processBillOfDay)(diaryDay, keywords);
                    // 当内容 items 的数量大于 0 时
                    if (processedDayData.items.length > 0) {
                        daysData.push(processedDayData);
                        monthSum = monthSum + processedDayData.sum;
                        monthSumIncome = monthSumIncome + processedDayData.sumIncome;
                        monthSumOutput = monthSumOutput + processedDayData.sumOutput;
                        food.breakfast = food.breakfast + processedDayData.items
                            .filter(item => item.item.indexOf('早餐') > -1)
                            .reduce((sum, b) => sum || b.price || 0, 0);
                        food.launch = food.launch + processedDayData.items
                            .filter(item => item.item.indexOf('午餐') > -1)
                            .reduce((sum, b) => sum || b.price || 0, 0);
                        food.dinner = food.dinner + processedDayData.items
                            .filter(item => item.item.indexOf('晚餐') > -1)
                            .reduce((sum, b) => sum || b.price || 0, 0);
                        food.supermarket = food.supermarket + processedDayData.items
                            .filter(item => item.item.indexOf('超市') > -1)
                            .reduce((sum, b) => sum || b.price || 0, 0);
                        food.fruit = food.fruit + processedDayData.items
                            .filter(item => item.item.indexOf('水果') > -1)
                            .reduce((sum, b) => sum || b.price || 0, 0);
                    }
                });
                let billMonthTop5 = getBillMonthTop5(daysData);
                if (daysData.length > 0) {
                    responseData.push({
                        id: daysArray[0].id,
                        month_id: daysArray[0].month_id,
                        month: daysArray[0].month,
                        count: daysArray.length,
                        days: daysData,
                        sum: (0, utility_1.formatMoney)(monthSum),
                        sumIncome: (0, utility_1.formatMoney)(monthSumIncome),
                        sumOutput: (0, utility_1.formatMoney)(monthSumOutput),
                        incomeTop5: billMonthTop5.income,
                        outcomeTop5: billMonthTop5.outcome,
                        food: {
                            breakfast: (0, utility_1.formatMoney)(food.breakfast),
                            launch: (0, utility_1.formatMoney)(food.launch),
                            dinner: (0, utility_1.formatMoney)(food.dinner),
                            supermarket: (0, utility_1.formatMoney)(food.supermarket),
                            fruit: (0, utility_1.formatMoney)(food.fruit),
                            sum: (0, utility_1.formatMoney)(food.breakfast + food.launch + food.dinner + food.supermarket + food.fruit)
                        }
                    });
                }
            });
            // responseData.sort((a, b) => a.year > b.year ? 1 : -1)
            res.send(new Response_1.ResponseSuccess(responseData.reverse()));
        })
            .catch(err => {
            res.send(new Response_1.ResponseError(err, err.message));
        });
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
// 获取每月账单最高的前5个消费项目
function getBillMonthTop5(billDays) {
    let tempMonthBillItems = []; // 当前月份的所有 bill[]
    billDays.forEach(billDay => {
        billDay.items.forEach(billItem => {
            tempMonthBillItems.push(billItem);
        });
    });
    tempMonthBillItems.sort((a, b) => a.price > b.price ? 1 : -1);
    let billItemsIncome = tempMonthBillItems.filter(item => item.price > 0).sort((a, b) => a.price < b.price ? 1 : -1);
    return {
        outcome: tempMonthBillItems.splice(0, 5),
        income: billItemsIncome.splice(0, 5)
    };
}
router.get('/keys', (req, res) => {
    let currentYear = new Date().getFullYear();
    let years = [];
    for (let i = 0; i < 5; i++) {
        years.push(currentYear - i);
    }
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let sqlRequests = [];
        let sqlArray = [];
        years.forEach(year => {
            for (let month = 1; month <= 12; month++) {
                sqlArray.push(`
                        select *,
                        date_format(date,'%Y%m') as month_id,
                        date_format(date,'%m') as month
                        from diaries 
                        where year(date) = ${year}
                        and month(date) = ${month}
                        and category = 'bill'
                        and uid = ${userInfo.uid}
                        order by date asc;
                    `);
            }
        });
        sqlRequests.push((0, utility_1.getDataFromDB)(DB_NAME, sqlArray));
        // 这里有个异步运算的弊端，所有结果返回之后，我需要重新给他们排序，因为他们的返回顺序是不定的。难搞哦
        let BillKeyMap = new Map();
        Promise
            .all(sqlRequests)
            .then(yearDataArray => {
            // let responseData = []
            let afterValues = yearDataArray[0].filter(item => item.length > 0); // 去年内容为 0 的年价数据
            afterValues.forEach(daysArray => {
                daysArray.forEach(item => {
                    let processedDayData = (0, utility_1.processBillOfDay)(item, []);
                    // 当内容 items 的数量大于 0 时
                    if (processedDayData.items.length > 0) {
                        processedDayData.items.forEach(billItem => {
                            if (BillKeyMap.has(billItem.item)) { // 如果已存在账单项
                                let count = BillKeyMap.get(billItem.item);
                                BillKeyMap.set(billItem.item, count + 1);
                            }
                            else {
                                BillKeyMap.set(billItem.item, 1); // 初始化为1
                            }
                        });
                    }
                });
            });
            let billKeyArray = [];
            BillKeyMap.forEach((_value, key) => {
                if (BillKeyMap.get(key) >= 1) {
                    billKeyArray.push({
                        key: key,
                        count: BillKeyMap.get(key),
                    });
                }
            });
            billKeyArray.sort((a, b) => b.count - a.count);
            console.log(billKeyArray);
            res.send(new Response_1.ResponseSuccess(billKeyArray));
        })
            .catch(err => {
            res.send(new Response_1.ResponseError(err, err.message));
        });
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.get('/day-sum', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        (0, utility_1.getDataFromDB)(DB_NAME, [`select content, date  from diaries where category = 'bill' and uid = '${userInfo.uid}'`])
            .then(billData => {
            let finalData = billData.map(item => {
                let originalData = (0, utility_1.processBillOfDay)(item);
                delete originalData.items;
                delete originalData.sum;
                return originalData;
            });
            res.send(new Response_1.ResponseSuccess(finalData, '获取成功'));
        });
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.get('/month-sum', (req, res) => {
    let yearNow = new Date().getFullYear();
    let yearStart = 2018;
    let years = [];
    for (let i = yearStart; i <= yearNow; i++) {
        years.push(i);
    }
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        // let yearNow = new Date().getFullYear()
        let sqlRequests = [];
        let sqlArray = [];
        years.forEach(year => {
            for (let month = 1; month <= 12; month++) {
                sqlArray.push(`
                        select content, date,
                        date_format(date,'%Y%m') as month_id,
                        date_format(date,'%m') as month
                        from diaries 
                        where year(date) = ${year}
                        and month(date) = ${month}
                        and category = 'bill'
                        and uid = ${userInfo.uid}
                        order by date asc;
                    `);
            }
        });
        sqlRequests.push((0, utility_1.getDataFromDB)(DB_NAME, sqlArray));
        // 这里有个异步运算的弊端，所有结果返回之后，我需要重新给他们排序，因为他们的返回顺序是不定的。难搞哦
        Promise.all(sqlRequests)
            .then(yearDataArray => {
            let responseData = [];
            let afterValues = yearDataArray[0].filter(item => item.length > 0); // 去年内容为 0 的年价数据
            afterValues.forEach(daysArray => {
                let daysData = [];
                let monthSum = 0;
                let monthSumIncome = 0;
                let monthSumOutput = 0;
                // 用一次循环处理完所有需要在循环中处理的事：合总额、map DayArray
                let keywords = [];
                if (req.query.keyword) {
                    keywords = req.query.keyword.split(' ');
                }
                daysArray.forEach(item => {
                    let processedDayData = (0, utility_1.processBillOfDay)(item, keywords);
                    // 当内容 items 的数量大于 0 时
                    if (processedDayData.items.length > 0) {
                        daysData.push(processedDayData);
                        monthSum = monthSum + processedDayData.sum;
                        monthSumIncome = monthSumIncome + processedDayData.sumIncome;
                        monthSumOutput = monthSumOutput + processedDayData.sumOutput;
                    }
                });
                if (daysData.length > 0) {
                    responseData.push({
                        id: daysArray[0].id,
                        month_id: daysArray[0].month_id,
                        month: daysArray[0].month,
                        count: daysArray.length,
                        sum: (0, utility_1.formatMoney)(monthSum),
                        sumIncome: (0, utility_1.formatMoney)(monthSumIncome),
                        sumOutput: (0, utility_1.formatMoney)(monthSumOutput),
                    });
                }
            });
            responseData.sort((a, b) => a.year > b.year ? 1 : -1);
            res.send(new Response_1.ResponseSuccess(responseData));
        })
            .catch(err => {
            res.send(new Response_1.ResponseError(err, err.message));
        });
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.get('/borrow', (req, res) => {
    // 1. 验证 token
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let sqlArray = [];
        sqlArray.push(`select * from diaries where title = '借还记录' and uid = ${userInfo.uid}`); // 固定 '借还记录' 为标题的日记作为存储借还记录
        // 2. 查询出日记结果
        (0, utility_1.getDataFromDB)(DB_NAME, sqlArray, true)
            .then(dataDiary => {
            if (dataDiary) {
                // decode unicode
                dataDiary.title = (0, utility_1.unicodeDecode)(dataDiary.title || '');
                dataDiary.content = (0, utility_1.unicodeDecode)(dataDiary.content || '');
                // 记录最后访问时间
                (0, utility_1.updateUserLastLoginTime)(userInfo.uid);
                res.send(new Response_1.ResponseSuccess(dataDiary.content));
            }
            else {
                res.send(new Response_1.ResponseSuccess('', ''));
            }
        })
            .catch(err => {
            res.send(new Response_1.ResponseError(err, err.message));
        });
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
exports.default = router;
