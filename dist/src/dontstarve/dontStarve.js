"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Response_1 = require("../response/Response");
const utility_1 = require("../utility");
const router = express_1.default.Router();
// get list
function getDataList(tableName, path, searchFields, hasVersion) {
    router.get(path, (req, res) => {
        let whereConditions = [];
        // 处理 keyword 搜索
        if (req.query.keyword && searchFields && searchFields.length > 0) {
            let keyword = escapeMySQLString((0, utility_1.unicodeEncode)(String(req.query.keyword)));
            let keywordConditions = searchFields.map(field => `${field} LIKE '%${keyword}%' ESCAPE '/'`).join(' OR ');
            whereConditions.push(`(${keywordConditions})`);
        }
        // 处理 version 筛选
        if (hasVersion && req.query.version) {
            let version = escapeMySQLString(String(req.query.version));
            whereConditions.push(`version = '${version}'`);
        }
        // 处理 is_active 筛选（all=1 时获取所有，否则只获取 is_active=1）
        let all = req.query.all;
        if (all !== '1') {
            whereConditions.push(`is_active = 1`);
        }
        // 构建 WHERE 子句
        let whereClause = '';
        if (whereConditions.length > 0) {
            whereClause = `WHERE ${whereConditions.join(' AND ')}`;
        }
        // 处理分页参数（可选）
        let pageNo = req.query.pageNo ? Number(req.query.pageNo) : null;
        let pageSize = req.query.pageSize ? Number(req.query.pageSize) : null;
        let usePagination = pageNo !== null && pageSize !== null;
        if (usePagination) {
            // 使用分页：并行查询列表和总数
            let startPoint = (pageNo - 1) * pageSize;
            let promisesAll = [];
            // 查询列表数据
            promisesAll.push((0, utility_1.getDataFromDB)('starve', [
                `SELECT * FROM ${tableName} ${whereClause} LIMIT ${startPoint}, ${pageSize}`
            ]));
            // 查询总数
            promisesAll.push((0, utility_1.getDataFromDB)('starve', [
                `SELECT COUNT(*) as sum FROM ${tableName} ${whereClause}`
            ], true));
            Promise.all(promisesAll)
                .then(([dataList, dataSum]) => {
                res.send(new Response_1.ResponseSuccess({
                    list: dataList || [],
                    pager: {
                        pageSize: pageSize,
                        pageNo: pageNo,
                        total: (dataSum === null || dataSum === void 0 ? void 0 : dataSum.sum) || 0
                    }
                }, '请求成功'));
            })
                .catch(err => {
                res.send(new Response_1.ResponseError(err, err.message));
            });
        }
        else {
            // 不使用分页：返回所有数据
            (0, utility_1.getDataFromDB)('starve', [
                `SELECT * FROM ${tableName} ${whereClause}`
            ])
                .then(data => {
                if (data) {
                    res.send(new Response_1.ResponseSuccess(data));
                }
                else {
                    res.send(new Response_1.ResponseError('', '无数据'));
                }
            })
                .catch(err => {
                res.send(new Response_1.ResponseError(err, err.message));
            });
        }
    });
}
const ListGet = [
    {
        path: '/character/list',
        tableName: 'characters',
        searchFields: ['name', 'name_en'],
        hasVersion: true
    },
    {
        path: '/mob/list',
        tableName: 'mobs',
        searchFields: ['name', 'name_en'],
        hasVersion: true
    },
    {
        path: '/log/list',
        tableName: 'logs',
        searchFields: ['detail'], // logs 表没有 name/name_en，搜索 detail
        hasVersion: false
    },
    {
        path: '/plant/list',
        tableName: 'plants',
        searchFields: ['name', 'name_en'],
        hasVersion: true
    },
    {
        path: '/thing/list',
        tableName: 'things',
        searchFields: ['name', 'name_en'],
        hasVersion: true
    },
    {
        path: '/material/list',
        tableName: 'materials',
        searchFields: ['name', 'name_en'],
        hasVersion: true
    },
    {
        path: '/craft/list',
        tableName: 'crafts',
        searchFields: ['name', 'name_en'],
        hasVersion: true
    },
    {
        path: '/cookingrecipe/list',
        tableName: 'cookingrecipes',
        searchFields: ['name', 'name_en'],
        hasVersion: true
    },
    {
        path: '/coder/list',
        tableName: 'coders',
        searchFields: ['usage', 'code', 'note'], // coders 表没有 name/name_en，搜索其他字段
        hasVersion: false
    },
];
ListGet.forEach(item => {
    getDataList(item.tableName, item.path, item.searchFields, item.hasVersion);
});
// get infos
const ListGetInfo = [
    {
        path: '/character/info',
        tableName: 'characters'
    },
    {
        path: '/mob/info',
        tableName: 'mobs'
    },
    {
        path: '/log/info',
        tableName: 'logs'
    },
    {
        path: '/plant/info',
        tableName: 'plants'
    },
    {
        path: '/thing/info',
        tableName: 'things'
    },
    {
        path: '/material/info',
        tableName: 'materials'
    },
    {
        path: '/craft/info',
        tableName: 'crafts'
    },
    {
        path: '/cookreceipe/info',
        tableName: 'cookreceipes'
    },
    {
        path: '/coder/info',
        tableName: 'coders'
    },
];
ListGetInfo.forEach(item => {
    getDataInfo(item.tableName, item.path);
});
function getDataInfo(tableName, path) {
    router.get(path, (req, res) => {
        (0, utility_1.getDataFromDB)('starve', [`select * from ${tableName} where id = ${req.query.id}`], true)
            .then(data => {
            if (data) { // 没有记录时会返回  undefined
                res.send(new Response_1.ResponseSuccess(data));
            }
            else {
                res.send(new Response_1.ResponseError('', '无数据'));
            }
        })
            .catch(err => {
            res.send(new Response_1.ResponseError(err, err.message));
        });
    });
}
// SQL 转义函数
function escapeMySQLString(str) {
    if (!str)
        return '';
    return str
        .replace(/\\/g, '\\\\') // Backslash
        .replace(/'/g, "\\'") // Single quote
        .replace(/"/g, '\\"') // Double quote
        .replace(/\n/g, '\\n') // New line
        .replace(/\r/g, '\\r') // Carriage return
        .replace(/\t/g, '\\t') // Tab
        .replace(/\0/g, '\\0') // Null character
        .replace(/\x1a/g, '\\Z'); // Ctrl+Z
}
const DB_NAME = 'starve';
// 辅助函数：处理字符串值（转义和编码）
function processStringValue(value) {
    if (value === null || value === undefined || value === '') {
        return 'NULL'; // SQL NULL 值
    }
    const strValue = String(value);
    if (strValue.trim() === '') {
        return 'NULL'; // SQL NULL 值
    }
    return `'${escapeMySQLString((0, utility_1.unicodeEncode)(strValue))}'`;
}
// 辅助函数：处理数值（包括null）
function processNumberValue(value) {
    if (value === null || value === undefined || value === '') {
        return 'NULL';
    }
    return String(value);
}
// ==================== logs 表接口 ====================
const DATA_NAME_LOG = 'logs';
router.post('/log/add', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let sqlArray = [];
        let parsedDetail = escapeMySQLString((0, utility_1.unicodeEncode)(req.body.detail || ''));
        let date = req.body.date || '';
        if (!date || !req.body.detail) {
            res.send(new Response_1.ResponseError('', '日期和详情不能为空'));
            return;
        }
        sqlArray.push(`
                INSERT INTO logs(date, detail)
                VALUES('${date}', '${parsedDetail}')
            `);
        (0, utility_1.operate_db_and_return_added_id)(userInfo.uid, DB_NAME, DATA_NAME_LOG, sqlArray, '添加', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.put('/log/modify', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let sqlArray = [];
        let parsedDetail = escapeMySQLString((0, utility_1.unicodeEncode)(req.body.detail || ''));
        let date = req.body.date || '';
        let id = req.body.id;
        if (!id) {
            res.send(new Response_1.ResponseError('', 'ID不能为空'));
            return;
        }
        if (!date || !req.body.detail) {
            res.send(new Response_1.ResponseError('', '日期和详情不能为空'));
            return;
        }
        sqlArray.push(`
                UPDATE logs
                SET date = '${date}',
                    detail = '${parsedDetail}'
                WHERE id = ${id}
            `);
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME_LOG, sqlArray, '修改', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.delete('/log/delete', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let id = req.body.id || req.query.id;
        if (!id) {
            res.send(new Response_1.ResponseError('', 'ID不能为空'));
            return;
        }
        let sqlArray = [];
        sqlArray.push(`DELETE FROM logs WHERE id = ${id}`);
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME_LOG, sqlArray, '删除', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
// ==================== characters 表接口 ====================
const DATA_NAME_CHARACTER = 'characters';
router.post('/character/add', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (!req.body.health || !req.body.hunger || !req.body.sanity || !req.body.version) {
            res.send(new Response_1.ResponseError('', '生命值、饥饿值、理智值和版本不能为空'));
            return;
        }
        let sqlArray = [];
        sqlArray.push(`
                INSERT INTO characters(
                    name, name_en, nick_name, motto, perk, health, hunger, sanity,
                    hunger_modifier, sanity_modifier, wetness_modifier,
                    health_range, damage_range, hunger_range, sanity_range, speed_range,
                    debugspawn, pic, thumb, special_item, starting_item, version
                ) VALUES(
                    ${processStringValue(req.body.name)},
                    ${processStringValue(req.body.name_en)},
                    ${processStringValue(req.body.nick_name)},
                    ${processStringValue(req.body.motto)},
                    ${processStringValue(req.body.perk)},
                    '${escapeMySQLString(String(req.body.health))}',
                    '${escapeMySQLString(String(req.body.hunger))}',
                    '${escapeMySQLString(String(req.body.sanity))}',
                    ${processStringValue(req.body.hunger_modifier)},
                    ${processStringValue(req.body.sanity_modifier)},
                    ${processStringValue(req.body.wetness_modifier)},
                    ${processStringValue(req.body.health_range)},
                    ${processStringValue(req.body.damage_range)},
                    ${processStringValue(req.body.hunger_range)},
                    ${processStringValue(req.body.sanity_range)},
                    ${processStringValue(req.body.speed_range)},
                    ${processStringValue(req.body.debugspawn)},
                    ${processStringValue(req.body.pic)},
                    ${processStringValue(req.body.thumb)},
                    ${processStringValue(req.body.special_item)},
                    ${processStringValue(req.body.starting_item)},
                    '${escapeMySQLString(String(req.body.version))}'
                )
            `);
        (0, utility_1.operate_db_and_return_added_id)(userInfo.uid, DB_NAME, DATA_NAME_CHARACTER, sqlArray, '添加', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.put('/character/modify', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (!req.body.id) {
            res.send(new Response_1.ResponseError('', 'ID不能为空'));
            return;
        }
        let sqlArray = [];
        sqlArray.push(`
                UPDATE characters SET
                    name = ${processStringValue(req.body.name)},
                    name_en = ${processStringValue(req.body.name_en)},
                    nick_name = ${processStringValue(req.body.nick_name)},
                    motto = ${processStringValue(req.body.motto)},
                    perk = ${processStringValue(req.body.perk)},
                    health = '${escapeMySQLString(String(req.body.health || ''))}',
                    hunger = '${escapeMySQLString(String(req.body.hunger || ''))}',
                    sanity = '${escapeMySQLString(String(req.body.sanity || ''))}',
                    hunger_modifier = ${processStringValue(req.body.hunger_modifier)},
                    sanity_modifier = ${processStringValue(req.body.sanity_modifier)},
                    wetness_modifier = ${processStringValue(req.body.wetness_modifier)},
                    health_range = ${processStringValue(req.body.health_range)},
                    damage_range = ${processStringValue(req.body.damage_range)},
                    hunger_range = ${processStringValue(req.body.hunger_range)},
                    sanity_range = ${processStringValue(req.body.sanity_range)},
                    speed_range = ${processStringValue(req.body.speed_range)},
                    debugspawn = ${processStringValue(req.body.debugspawn)},
                    pic = ${processStringValue(req.body.pic)},
                    thumb = ${processStringValue(req.body.thumb)},
                    special_item = ${processStringValue(req.body.special_item)},
                    starting_item = ${processStringValue(req.body.starting_item)},
                    version = '${escapeMySQLString(String(req.body.version || ''))}'
                WHERE id = ${req.body.id}
            `);
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME_CHARACTER, sqlArray, '修改', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.delete('/character/delete', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let id = req.body.id || req.query.id;
        if (!id) {
            res.send(new Response_1.ResponseError('', 'ID不能为空'));
            return;
        }
        let sqlArray = [`DELETE FROM characters WHERE id = ${id}`];
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME_CHARACTER, sqlArray, '删除', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
// ==================== coders 表接口 ====================
const DATA_NAME_CODER = 'coders';
router.post('/coder/add', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (!req.body.usage || !req.body.code) {
            res.send(new Response_1.ResponseError('', '用途和代码不能为空'));
            return;
        }
        let sqlArray = [];
        sqlArray.push(`
                INSERT INTO coders(usage, code, note)
                VALUES(
                    ${processStringValue(req.body.usage)},
                    ${processStringValue(req.body.code)},
                    ${processStringValue(req.body.note)}
                )
            `);
        (0, utility_1.operate_db_and_return_added_id)(userInfo.uid, DB_NAME, DATA_NAME_CODER, sqlArray, '添加', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.put('/coder/modify', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (!req.body.id) {
            res.send(new Response_1.ResponseError('', 'ID不能为空'));
            return;
        }
        let sqlArray = [];
        sqlArray.push(`
                UPDATE coders SET
                    usage = ${processStringValue(req.body.usage)},
                    code = ${processStringValue(req.body.code)},
                    note = ${processStringValue(req.body.note)}
                WHERE id = ${req.body.id}
            `);
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME_CODER, sqlArray, '修改', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.delete('/coder/delete', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let id = req.body.id || req.query.id;
        if (!id) {
            res.send(new Response_1.ResponseError('', 'ID不能为空'));
            return;
        }
        let sqlArray = [`DELETE FROM coders WHERE id = ${id}`];
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME_CODER, sqlArray, '删除', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
// ==================== cookingrecipes 表接口 ====================
const DATA_NAME_COOKINGRECIPE = 'cookingrecipes';
router.post('/cookingrecipe/add', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (!req.body.name || !req.body.name_en || !req.body.version) {
            res.send(new Response_1.ResponseError('', '名称、英文名称和版本不能为空'));
            return;
        }
        let sqlArray = [];
        sqlArray.push(`
                INSERT INTO cookingrecipes(
                    name, name_en, version, health_value, hungry_value, sanity_value,
                    duration, cook_time, priority, requirements, restrictions,
                    perk, stacks, debugspawn, pic, thumb
                ) VALUES(
                    ${processStringValue(req.body.name)},
                    ${processStringValue(req.body.name_en)},
                    '${escapeMySQLString(String(req.body.version))}',
                    ${processNumberValue(req.body.health_value)},
                    ${processNumberValue(req.body.hungry_value)},
                    ${processNumberValue(req.body.sanity_value)},
                    ${processNumberValue(req.body.duration)},
                    ${processStringValue(req.body.cook_time)},
                    ${processStringValue(req.body.priority)},
                    ${processStringValue(req.body.requirements)},
                    ${processStringValue(req.body.restrictions)},
                    ${processStringValue(req.body.perk)},
                    ${processStringValue(req.body.stacks)},
                    ${processStringValue(req.body.debugspawn)},
                    ${processStringValue(req.body.pic)},
                    ${processStringValue(req.body.thumb)}
                )
            `);
        (0, utility_1.operate_db_and_return_added_id)(userInfo.uid, DB_NAME, DATA_NAME_COOKINGRECIPE, sqlArray, '添加', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.put('/cookingrecipe/modify', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (!req.body.id) {
            res.send(new Response_1.ResponseError('', 'ID不能为空'));
            return;
        }
        let sqlArray = [];
        sqlArray.push(`
                UPDATE cookingrecipes SET
                    name = ${processStringValue(req.body.name)},
                    name_en = ${processStringValue(req.body.name_en)},
                    version = '${escapeMySQLString(String(req.body.version || ''))}',
                    health_value = ${processNumberValue(req.body.health_value)},
                    hungry_value = ${processNumberValue(req.body.hungry_value)},
                    sanity_value = ${processNumberValue(req.body.sanity_value)},
                    duration = ${processNumberValue(req.body.duration)},
                    cook_time = ${processStringValue(req.body.cook_time)},
                    priority = ${processStringValue(req.body.priority)},
                    requirements = ${processStringValue(req.body.requirements)},
                    restrictions = ${processStringValue(req.body.restrictions)},
                    perk = ${processStringValue(req.body.perk)},
                    stacks = ${processStringValue(req.body.stacks)},
                    debugspawn = ${processStringValue(req.body.debugspawn)},
                    pic = ${processStringValue(req.body.pic)},
                    thumb = ${processStringValue(req.body.thumb)}
                WHERE id = ${req.body.id}
            `);
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME_COOKINGRECIPE, sqlArray, '修改', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.delete('/cookingrecipe/delete', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let id = req.body.id || req.query.id;
        if (!id) {
            res.send(new Response_1.ResponseError('', 'ID不能为空'));
            return;
        }
        let sqlArray = [`DELETE FROM cookingrecipes WHERE id = ${id}`];
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME_COOKINGRECIPE, sqlArray, '删除', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
// ==================== crafts 表接口 ====================
const DATA_NAME_CRAFT = 'crafts';
router.post('/craft/add', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (!req.body.name || !req.body.name_en || !req.body.version || !req.body.crafting) {
            res.send(new Response_1.ResponseError('', '名称、英文名称、版本和制作材料不能为空'));
            return;
        }
        let sqlArray = [];
        sqlArray.push(`
                INSERT INTO crafts(
                    name, name_en, sortid, version, tab, crafting, tier,
                    damage, sideeffect, durability, perk, stacks,
                    debugspawn, pic, thumb
                ) VALUES(
                    ${processStringValue(req.body.name)},
                    ${processStringValue(req.body.name_en)},
                    ${processNumberValue(req.body.sortid)},
                    '${escapeMySQLString(String(req.body.version))}',
                    ${processStringValue(req.body.tab)},
                    ${processStringValue(req.body.crafting)},
                    ${processStringValue(req.body.tier)},
                    ${processStringValue(req.body.damage)},
                    ${processStringValue(req.body.sideeffect)},
                    ${processStringValue(req.body.durability)},
                    ${processStringValue(req.body.perk)},
                    ${processStringValue(req.body.stacks)},
                    ${processStringValue(req.body.debugspawn)},
                    ${processStringValue(req.body.pic)},
                    ${processStringValue(req.body.thumb)}
                )
            `);
        (0, utility_1.operate_db_and_return_added_id)(userInfo.uid, DB_NAME, DATA_NAME_CRAFT, sqlArray, '添加', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.put('/craft/modify', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (!req.body.id) {
            res.send(new Response_1.ResponseError('', 'ID不能为空'));
            return;
        }
        let sqlArray = [];
        sqlArray.push(`
                UPDATE crafts SET
                    name = ${processStringValue(req.body.name)},
                    name_en = ${processStringValue(req.body.name_en)},
                    sortid = ${processNumberValue(req.body.sortid)},
                    version = '${escapeMySQLString(String(req.body.version || ''))}',
                    tab = ${processStringValue(req.body.tab)},
                    crafting = ${processStringValue(req.body.crafting)},
                    tier = ${processStringValue(req.body.tier)},
                    damage = ${processStringValue(req.body.damage)},
                    sideeffect = ${processStringValue(req.body.sideeffect)},
                    durability = ${processStringValue(req.body.durability)},
                    perk = ${processStringValue(req.body.perk)},
                    stacks = ${processStringValue(req.body.stacks)},
                    debugspawn = ${processStringValue(req.body.debugspawn)},
                    pic = ${processStringValue(req.body.pic)},
                    thumb = ${processStringValue(req.body.thumb)}
                WHERE id = ${req.body.id}
            `);
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME_CRAFT, sqlArray, '修改', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.delete('/craft/delete', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let id = req.body.id || req.query.id;
        if (!id) {
            res.send(new Response_1.ResponseError('', 'ID不能为空'));
            return;
        }
        let sqlArray = [`DELETE FROM crafts WHERE id = ${id}`];
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME_CRAFT, sqlArray, '删除', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
// ==================== materials 表接口 ====================
const DATA_NAME_MATERIAL = '材料';
router.post('/material/add', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (!req.body.name || !req.body.name_en || !req.body.version) {
            res.send(new Response_1.ResponseError('', '名称、英文名称和版本不能为空'));
            return;
        }
        let sqlArray = [];
        sqlArray.push(`
                INSERT INTO materials(name, name_en, pic, stack, debugspawn, version)
                VALUES(
                    ${processStringValue(req.body.name)},
                    ${processStringValue(req.body.name_en)},
                    ${processStringValue(req.body.pic)},
                    ${processStringValue(req.body.stack)},
                    ${processStringValue(req.body.debugspawn)},
                    '${escapeMySQLString(String(req.body.version))}'
                )
            `);
        (0, utility_1.operate_db_and_return_added_id)(userInfo.uid, DB_NAME, DATA_NAME_MATERIAL, sqlArray, '添加', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.put('/material/modify', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (!req.body.id) {
            res.send(new Response_1.ResponseError('', 'ID不能为空'));
            return;
        }
        let sqlArray = [];
        sqlArray.push(`
                UPDATE materials SET
                    name = ${processStringValue(req.body.name)},
                    name_en = ${processStringValue(req.body.name_en)},
                    pic = ${processStringValue(req.body.pic)},
                    stack = ${processStringValue(req.body.stack)},
                    debugspawn = ${processStringValue(req.body.debugspawn)},
                    version = '${escapeMySQLString(String(req.body.version || ''))}'
                WHERE id = ${req.body.id}
            `);
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME_MATERIAL, sqlArray, '修改', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.delete('/material/delete', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let id = req.body.id || req.query.id;
        if (!id) {
            res.send(new Response_1.ResponseError('', 'ID不能为空'));
            return;
        }
        let sqlArray = [`DELETE FROM materials WHERE id = ${id}`];
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME_MATERIAL, sqlArray, '删除', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
// ==================== mobs 表接口 ====================
const DATA_NAME_MOB = '生物';
router.post('/mob/add', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (!req.body.name || !req.body.name_en || !req.body.version || !req.body.kind || !req.body.size) {
            res.send(new Response_1.ResponseError('', '名称、英文名称、版本、类型和大小不能为空'));
            return;
        }
        let sqlArray = [];
        sqlArray.push(`
                INSERT INTO mobs(
                    name, name_en, health, damage, attack_period, attack_range,
                    walking_speed, running_speed, sanityaura, special_ability,
                    detail, loot, spawns_from, debugspawn, pic, thumb,
                    version, kind, size
                ) VALUES(
                    ${processStringValue(req.body.name)},
                    ${processStringValue(req.body.name_en)},
                    ${processStringValue(req.body.health)},
                    ${processStringValue(req.body.damage)},
                    ${processStringValue(req.body.attack_period)},
                    ${processStringValue(req.body.attack_range)},
                    ${processStringValue(req.body.walking_speed)},
                    ${processStringValue(req.body.running_speed)},
                    ${processStringValue(req.body.sanityaura)},
                    ${processStringValue(req.body.special_ability)},
                    ${processStringValue(req.body.detail)},
                    ${processStringValue(req.body.loot)},
                    ${processStringValue(req.body.spawns_from)},
                    ${processStringValue(req.body.debugspawn)},
                    ${processStringValue(req.body.pic)},
                    ${processStringValue(req.body.thumb)},
                    '${escapeMySQLString(String(req.body.version))}',
                    '${escapeMySQLString(String(req.body.kind))}',
                    '${escapeMySQLString(String(req.body.size))}'
                )
            `);
        (0, utility_1.operate_db_and_return_added_id)(userInfo.uid, DB_NAME, DATA_NAME_MOB, sqlArray, '添加', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.put('/mob/modify', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (!req.body.id) {
            res.send(new Response_1.ResponseError('', 'ID不能为空'));
            return;
        }
        let sqlArray = [];
        sqlArray.push(`
                UPDATE mobs SET
                    name = ${processStringValue(req.body.name)},
                    name_en = ${processStringValue(req.body.name_en)},
                    health = ${processStringValue(req.body.health)},
                    damage = ${processStringValue(req.body.damage)},
                    attack_period = ${processStringValue(req.body.attack_period)},
                    attack_range = ${processStringValue(req.body.attack_range)},
                    walking_speed = ${processStringValue(req.body.walking_speed)},
                    running_speed = ${processStringValue(req.body.running_speed)},
                    sanityaura = ${processStringValue(req.body.sanityaura)},
                    special_ability = ${processStringValue(req.body.special_ability)},
                    detail = ${processStringValue(req.body.detail)},
                    loot = ${processStringValue(req.body.loot)},
                    spawns_from = ${processStringValue(req.body.spawns_from)},
                    debugspawn = ${processStringValue(req.body.debugspawn)},
                    pic = ${processStringValue(req.body.pic)},
                    thumb = ${processStringValue(req.body.thumb)},
                    version = '${escapeMySQLString(String(req.body.version || ''))}',
                    kind = '${escapeMySQLString(String(req.body.kind || ''))}',
                    size = '${escapeMySQLString(String(req.body.size || ''))}'
                WHERE id = ${req.body.id}
            `);
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME_MOB, sqlArray, '修改', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.delete('/mob/delete', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let id = req.body.id || req.query.id;
        if (!id) {
            res.send(new Response_1.ResponseError('', 'ID不能为空'));
            return;
        }
        let sqlArray = [`DELETE FROM mobs WHERE id = ${id}`];
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME_MOB, sqlArray, '删除', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
// ==================== plants 表接口 ====================
const DATA_NAME_PLANT = '植物';
router.post('/plant/add', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (!req.body.name || !req.body.name_en || !req.body.version) {
            res.send(new Response_1.ResponseError('', '名称、英文名称和版本不能为空'));
            return;
        }
        let sqlArray = [];
        sqlArray.push(`
                INSERT INTO plants(
                    name, name_en, resources, spawns, debugspawn,
                    perk, pic, thumb, version
                ) VALUES(
                    ${processStringValue(req.body.name)},
                    ${processStringValue(req.body.name_en)},
                    ${processStringValue(req.body.resources)},
                    ${processStringValue(req.body.spawns)},
                    ${processStringValue(req.body.debugspawn)},
                    ${processStringValue(req.body.perk)},
                    ${processStringValue(req.body.pic)},
                    ${processStringValue(req.body.thumb)},
                    '${escapeMySQLString(String(req.body.version))}'
                )
            `);
        (0, utility_1.operate_db_and_return_added_id)(userInfo.uid, DB_NAME, DATA_NAME_PLANT, sqlArray, '添加', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.put('/plant/modify', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (!req.body.id) {
            res.send(new Response_1.ResponseError('', 'ID不能为空'));
            return;
        }
        let sqlArray = [];
        sqlArray.push(`
                UPDATE plants SET
                    name = ${processStringValue(req.body.name)},
                    name_en = ${processStringValue(req.body.name_en)},
                    resources = ${processStringValue(req.body.resources)},
                    spawns = ${processStringValue(req.body.spawns)},
                    debugspawn = ${processStringValue(req.body.debugspawn)},
                    perk = ${processStringValue(req.body.perk)},
                    pic = ${processStringValue(req.body.pic)},
                    thumb = ${processStringValue(req.body.thumb)},
                    version = '${escapeMySQLString(String(req.body.version || ''))}'
                WHERE id = ${req.body.id}
            `);
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME_PLANT, sqlArray, '修改', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.delete('/plant/delete', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let id = req.body.id || req.query.id;
        if (!id) {
            res.send(new Response_1.ResponseError('', 'ID不能为空'));
            return;
        }
        let sqlArray = [`DELETE FROM plants WHERE id = ${id}`];
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME_PLANT, sqlArray, '删除', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
// ==================== things 表接口 ====================
const DATA_NAME_THING = 'things';
router.post('/thing/add', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (!req.body.name || !req.body.name_en || !req.body.version) {
            res.send(new Response_1.ResponseError('', '名称、英文名称和版本不能为空'));
            return;
        }
        let sqlArray = [];
        sqlArray.push(`
                INSERT INTO things(
                    name, name_en, note, debugspawn, pic, thumb, version
                ) VALUES(
                    ${processStringValue(req.body.name)},
                    ${processStringValue(req.body.name_en)},
                    ${processStringValue(req.body.note)},
                    ${processStringValue(req.body.debugspawn)},
                    ${processStringValue(req.body.pic)},
                    ${processStringValue(req.body.thumb)},
                    '${escapeMySQLString(String(req.body.version))}'
                )
            `);
        (0, utility_1.operate_db_and_return_added_id)(userInfo.uid, DB_NAME, DATA_NAME_THING, sqlArray, '添加', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.put('/thing/modify', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (!req.body.id) {
            res.send(new Response_1.ResponseError('', 'ID不能为空'));
            return;
        }
        let sqlArray = [];
        sqlArray.push(`
                UPDATE things SET
                    name = ${processStringValue(req.body.name)},
                    name_en = ${processStringValue(req.body.name_en)},
                    note = ${processStringValue(req.body.note)},
                    debugspawn = ${processStringValue(req.body.debugspawn)},
                    pic = ${processStringValue(req.body.pic)},
                    thumb = ${processStringValue(req.body.thumb)},
                    version = '${escapeMySQLString(String(req.body.version || ''))}'
                WHERE id = ${req.body.id}
            `);
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME_THING, sqlArray, '修改', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.delete('/thing/delete', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let id = req.body.id || req.query.id;
        if (!id) {
            res.send(new Response_1.ResponseError('', 'ID不能为空'));
            return;
        }
        let sqlArray = [`DELETE FROM things WHERE id = ${id}`];
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME_THING, sqlArray, '删除', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
exports.default = router;
