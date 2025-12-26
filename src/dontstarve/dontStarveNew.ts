import express from "express"
import {ResponseError, ResponseSuccess} from "../response/Response";
import {
    getDataFromDB,
    verifyAuthorization,
    operate_db_and_return_added_id,
    operate_db_without_return,
    unicodeEncode,
    updateUserLastLoginTime
} from "../utility";
import {
    CharacterNew,
    CoderNew,
    CommandNew,
    CookingRecipeNew,
    CraftNew,
    LogNew,
    MaterialNew,
    MobNew,
    PlantNew,
    ThingNew,
    VersionNew,
    CraftTabNew,
    CraftTierEnum,
    MobKindEnum,
    MobSizeEnum
} from "../entity/StarveNew";
const router = express.Router()

// SQL 转义函数
function escapeMySQLString(str: string): string {
    if (!str) return '';
    return str
        .replace(/\\/g, '\\\\')  // Backslash
        .replace(/'/g, "\\'")    // Single quote
        .replace(/"/g, '\\"')    // Double quote
        .replace(/\n/g, '\\n')   // New line
        .replace(/\r/g, '\\r')   // Carriage return
        .replace(/\t/g, '\\t')   // Tab
        .replace(/\0/g, '\\0')   // Null character
        .replace(/\x1a/g, '\\Z'); // Ctrl+Z
}

const DB_NAME = 'starve_advance'

// 辅助函数：处理字符串值（转义和编码）
function processStringValue(value: any): string {
    if (value === null || value === undefined || value === '') {
        return 'NULL'  // SQL NULL 值
    }
    const strValue = String(value)
    if (strValue.trim() === '') {
        return 'NULL'  // SQL NULL 值
    }
    return `'${escapeMySQLString(unicodeEncode(strValue))}'`
}

// 辅助函数：处理数值（包括null）
function processNumberValue(value: any): string {
    if (value === null || value === undefined || value === '') {
        return 'NULL'
    }
    return String(value)
}

// 辅助函数：获取版本ID（通过版本代码）
async function getVersionId(versionCode: string): Promise<number | null> {
    try {
        const result = await getDataFromDB(DB_NAME, [
            `SELECT id FROM versions WHERE code = '${escapeMySQLString(versionCode)}' AND is_active = 1`
        ], true)
        return result?.id || null
    } catch (err) {
        return null
    }
}

// 辅助函数：获取标签ID（通过标签代码）
async function getTabId(tabCode: string): Promise<number | null> {
    try {
        const result = await getDataFromDB(DB_NAME, [
            `SELECT id FROM craft_tabs WHERE code = '${escapeMySQLString(tabCode)}' AND is_active = 1`
        ], true)
        return result?.id || null
    } catch (err) {
        return null
    }
}

// 辅助函数：获取实体的所有版本信息（包含 id, code, name, name_en）
async function getEntityVersions(tableName: string, entityId: number): Promise<any[]> {
    const versionTableMap: { [key: string]: string } = {
        'characters': 'character_versions',
        'mobs': 'mob_versions',
        'plants': 'plant_versions',
        'things': 'thing_versions',
        'crafts': 'craft_versions'
    }
    const versionIdFieldMap: { [key: string]: string } = {
        'characters': 'character_id',
        'mobs': 'mob_id',
        'plants': 'plant_id',
        'things': 'thing_id',
        'crafts': 'craft_id'
    }
    const versionTable = versionTableMap[tableName]
    const versionIdField = versionIdFieldMap[tableName]
    
    if (!versionTable || !versionIdField) {
        return []
    }
    
    try {
        const results = await getDataFromDB(DB_NAME, [
            `SELECT v.id, v.code, v.name, v.name_en 
             FROM ${versionTable} cv
             INNER JOIN versions v ON cv.version_id = v.id
             WHERE cv.${versionIdField} = ${entityId}
             ORDER BY cv.is_primary DESC, v.sort_order ASC`
        ])
        return results ? results.map((r: any) => ({
            id: r.id,
            code: r.code,
            name: r.name,
            name_en: r.name_en
        })) : []
    } catch (err) {
        return []
    }
}

// 辅助函数：获取craft的所有标签信息（包含 id, code, name, name_en）
async function getCraftTabs(craftId: number): Promise<any[]> {
    try {
        const results = await getDataFromDB(DB_NAME, [
            `SELECT t.id, t.code, t.name, t.name_en 
             FROM craft_tab_relations ctr
             INNER JOIN craft_tabs t ON ctr.tab_id = t.id
             WHERE ctr.craft_id = ${craftId}
             ORDER BY ctr.is_primary DESC, t.sort_order ASC`
        ])
        return results ? results.map((r: any) => ({
            id: r.id,
            code: r.code,
            name: r.name,
            name_en: r.name_en
        })) : []
    } catch (err) {
        return []
    }
}

// 辅助函数：批量获取多个实体的版本信息（包含 id, code, name, name_en）
async function getBatchEntityVersions(tableName: string, entityIds: number[]): Promise<{ [key: number]: any[] }> {
    if (entityIds.length === 0) {
        return {}
    }
    
    const versionTableMap: { [key: string]: string } = {
        'characters': 'character_versions',
        'mobs': 'mob_versions',
        'plants': 'plant_versions',
        'things': 'thing_versions',
        'crafts': 'craft_versions'
    }
    const versionIdFieldMap: { [key: string]: string } = {
        'characters': 'character_id',
        'mobs': 'mob_id',
        'plants': 'plant_id',
        'things': 'thing_id',
        'crafts': 'craft_id'
    }
    const versionTable = versionTableMap[tableName]
    const versionIdField = versionIdFieldMap[tableName]
    
    if (!versionTable || !versionIdField) {
        return {}
    }
    
    try {
        const results = await getDataFromDB(DB_NAME, [
            `SELECT cv.${versionIdField}, v.id, v.code, v.name, v.name_en, cv.is_primary
             FROM ${versionTable} cv
             INNER JOIN versions v ON cv.version_id = v.id
             WHERE cv.${versionIdField} IN (${entityIds.join(',')})
             ORDER BY cv.${versionIdField}, cv.is_primary DESC, v.sort_order ASC`
        ])
        
        const versionMap: { [key: number]: any[] } = {}
        entityIds.forEach(id => {
            versionMap[id] = []
        })
        
        if (results) {
            results.forEach((r: any) => {
                const entityId = r[versionIdField]
                if (!versionMap[entityId]) {
                    versionMap[entityId] = []
                }
                versionMap[entityId].push({
                    id: r.id,
                    code: r.code,
                    name: r.name,
                    name_en: r.name_en
                })
            })
        }
        
        return versionMap
    } catch (err) {
        return {}
    }
}

// 辅助函数：批量获取多个craft的标签信息（包含 id, code, name, name_en）
async function getBatchCraftTabs(craftIds: number[]): Promise<{ [key: number]: any[] }> {
    if (craftIds.length === 0) {
        return {}
    }
    
    try {
        const results = await getDataFromDB(DB_NAME, [
            `SELECT ctr.craft_id, t.id, t.code, t.name, t.name_en, ctr.is_primary
             FROM craft_tab_relations ctr
             INNER JOIN craft_tabs t ON ctr.tab_id = t.id
             WHERE ctr.craft_id IN (${craftIds.join(',')})
             ORDER BY ctr.craft_id, ctr.is_primary DESC, t.sort_order ASC`
        ])
        
        const tabMap: { [key: number]: any[] } = {}
        craftIds.forEach(id => {
            tabMap[id] = []
        })
        
        if (results) {
            results.forEach((r: any) => {
                const craftId = r.craft_id
                if (!tabMap[craftId]) {
                    tabMap[craftId] = []
                }
                tabMap[craftId].push({
                    id: r.id,
                    code: r.code,
                    name: r.name,
                    name_en: r.name_en
                })
            })
        }
        
        return tabMap
    } catch (err) {
        return {}
    }
}

// 辅助函数：将 Buffer 类型的 is_active 转换为数字
function convertIsActive(item: any): any {
    if (item && item.is_active) {
        // 如果是 Buffer 类型，转换为数字
        if (Buffer.isBuffer(item.is_active)) {
            item.is_active = item.is_active[0] || 0
        } else if (item.is_active.type === 'Buffer' && Array.isArray(item.is_active.data)) {
            item.is_active = item.is_active.data[0] || 0
        }
    }
    return item
}

// 辅助函数：处理列表数据，添加版本和标签数组（使用批量查询优化）
async function enrichListData(tableName: string, dataList: any[]): Promise<any[]> {
    if (!dataList || dataList.length === 0) {
        return dataList
    }
    
    const entityIds = dataList.map(item => item.id).filter(id => id != null)
    
    // 批量获取版本和标签
    let versionMap: { [key: number]: number[] } = {}
    let tabMap: { [key: number]: number[] } = {}
    
    if (['characters', 'mobs', 'plants', 'things', 'crafts'].includes(tableName) && entityIds.length > 0) {
        versionMap = await getBatchEntityVersions(tableName, entityIds)
    }
    
    if (tableName === 'crafts' && entityIds.length > 0) {
        tabMap = await getBatchCraftTabs(entityIds)
    }
    
    // 组装数据
    const enrichedList = dataList.map((item) => {
        const enriched = { ...item }
        
        // 转换 is_active Buffer 为数字
        convertIsActive(enriched)
        
        // 添加版本数组
        if (['characters', 'mobs', 'plants', 'things', 'crafts'].includes(tableName)) {
            enriched.version = versionMap[item.id] || []
        }
        
        // 对于crafts，添加标签数组
        if (tableName === 'crafts') {
            enriched.tab = tabMap[item.id] || []
        }
        
        // 移除临时的version字段（如果存在）
        delete enriched.version_name
        delete enriched.version_name_en
        
        return enriched
    })
    
    return enrichedList
}

// get list
function getDataList(tableName: string, path: string, searchFields?: string[], hasVersion?: boolean, hasTab?: boolean) {
    router.get(path, (req, res) => {
        let whereConditions: string[] = []
        let joinClause = ''
        let selectFields = `${tableName}.*`
        
        // 处理 version 筛选和 JOIN
        if (hasVersion) {
            // 映射表名到版本关系表名
            const versionTableMap: { [key: string]: string } = {
                'characters': 'character_versions',
                'mobs': 'mob_versions',
                'plants': 'plant_versions',
                'things': 'thing_versions',
                'crafts': 'craft_versions'
            }
            // 映射表名到版本关系表的ID字段名
            const versionIdFieldMap: { [key: string]: string } = {
                'characters': 'character_id',
                'mobs': 'mob_id',
                'plants': 'plant_id',
                'things': 'thing_id',
                'crafts': 'craft_id'
            }
            const versionTable = versionTableMap[tableName] || `${tableName}_versions`
            const versionIdField = versionIdFieldMap[tableName] || `${tableName.slice(0, -1)}_id`
            
            // 如果指定了版本筛选，JOIN versions 表
            if (req.query.version) {
                let version = escapeMySQLString(String(req.query.version))
                joinClause = `
                    INNER JOIN ${versionTable} ON ${tableName}.id = ${versionTable}.${versionIdField}
                    INNER JOIN versions ON ${versionTable}.version_id = versions.id
                `
                whereConditions.push(`versions.code = '${version}'`)
                selectFields = `${tableName}.*, versions.code as version, versions.name as version_name, versions.name_en as version_name_en`
            } else {
                // 即使没有版本筛选，也JOIN以获取版本信息
                joinClause = `
                    LEFT JOIN ${versionTable} ON ${tableName}.id = ${versionTable}.${versionIdField} AND ${versionTable}.is_primary = 1
                    LEFT JOIN versions ON ${versionTable}.version_id = versions.id
                `
                selectFields = `${tableName}.*, versions.code as version, versions.name as version_name, versions.name_en as version_name_en`
            }
        }
        
        // 处理 tab 筛选（仅对 crafts 表）
        if (hasTab && tableName === 'crafts') {
            if (req.query.tab) {
                let tab = escapeMySQLString(String(req.query.tab))
                // 如果已经有 JOIN，追加 tab 的 JOIN
                if (joinClause) {
                    joinClause += `
                        INNER JOIN craft_tab_relations ctr ON crafts.id = ctr.craft_id
                        INNER JOIN craft_tabs ct ON ctr.tab_id = ct.id
                    `
                } else {
                    joinClause = `
                        INNER JOIN craft_tab_relations ctr ON crafts.id = ctr.craft_id
                        INNER JOIN craft_tabs ct ON ctr.tab_id = ct.id
                    `
                }
                whereConditions.push(`ct.code = '${tab}'`)
            }
        }
        
        // 处理 keyword 搜索
        if (req.query.keyword && searchFields && searchFields.length > 0) {
            let keyword = escapeMySQLString(unicodeEncode(String(req.query.keyword)))
            let keywordConditions = searchFields.map(field => 
                `${tableName}.${field} LIKE '%${keyword}%' ESCAPE '/'`
            ).join(' OR ')
            whereConditions.push(`(${keywordConditions})`)
        }
        
        // 处理 is_active 筛选（all=1 时获取所有，否则只获取 is_active=1）
        let all = req.query.all
        if (all !== '1') {
            whereConditions.push(`${tableName}.is_active = 1`)
        }
        
        // 构建 WHERE 子句
        let whereClause = ''
        if (whereConditions.length > 0) {
            whereClause = `WHERE ${whereConditions.join(' AND ')}`
        }
        
        // 处理分页参数（可选）
        let pageNo = req.query.pageNo ? Number(req.query.pageNo) : null
        let pageSize = req.query.pageSize ? Number(req.query.pageSize) : null
        let usePagination = pageNo !== null && pageSize !== null
        
        if (usePagination) {
            // 使用分页：并行查询列表和总数
            let startPoint = (pageNo - 1) * pageSize
            let promisesAll = []
            
            // 查询列表数据
            promisesAll.push(
                getDataFromDB(DB_NAME, [
                    `SELECT ${selectFields} FROM ${tableName} ${joinClause} ${whereClause} LIMIT ${startPoint}, ${pageSize}`
                ])
            )
            
            // 查询总数
            promisesAll.push(
                getDataFromDB(DB_NAME, [
                    `SELECT COUNT(*) as sum FROM ${tableName} ${joinClause} ${whereClause}`
                ], true)
            )
            
            Promise.all(promisesAll)
                .then(async ([dataList, dataSum]) => {
                    // 处理数据，添加版本和标签数组
                    const enrichedList = await enrichListData(tableName, dataList || [])
                    res.send(new ResponseSuccess({
                        list: enrichedList,
                        pager: {
                            pageSize: pageSize,
                            pageNo: pageNo,
                            total: dataSum?.sum || 0
                        }
                    }, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        } else {
            // 不使用分页：返回所有数据
            getDataFromDB(DB_NAME, [
                `SELECT ${selectFields} FROM ${tableName} ${joinClause} ${whereClause}`
            ])
                .then(async (data) => {
                    if (data) {
                        // 处理数据，添加版本和标签数组
                        const enrichedList = await enrichListData(tableName, data)
                        res.send(new ResponseSuccess(enrichedList))
                    } else {
                        res.send(new ResponseError('', '无数据'))
                    }
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        }
    })
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
        searchFields: ['detail'],
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
        hasVersion: false  // materials 表在新结构中可能没有版本关系表
    },
    {
        path: '/craft/list',
        tableName: 'crafts',
        searchFields: ['name', 'name_en'],
        hasVersion: true,
        hasTab: true  // 支持 tab 筛选
    },
    {
        path: '/cookingrecipe/list',
        tableName: 'cookingrecipes',
        searchFields: ['name', 'name_en'],
        hasVersion: false  // cookingrecipes 表在新结构中可能没有版本关系表
    },
    {
        path: '/coder/list',
        tableName: 'coders',
        searchFields: ['usage', 'code', 'note'],
        hasVersion: false
    },
]

ListGet.forEach(item => {
    getDataList(item.tableName, item.path, item.searchFields, item.hasVersion, item.hasTab)
})

// get infos
const ListGetInfo = [
    {
        path: '/character/info',
        tableName: 'characters',
        hasVersion: true
    },
    {
        path: '/mob/info',
        tableName: 'mobs',
        hasVersion: true
    },
    {
        path: '/log/info',
        tableName: 'logs',
        hasVersion: false
    },
    {
        path: '/plant/info',
        tableName: 'plants',
        hasVersion: true
    },
    {
        path: '/thing/info',
        tableName: 'things',
        hasVersion: true
    },
    {
        path: '/material/info',
        tableName: 'materials',
        hasVersion: false  // materials 表在新结构中可能没有版本关系表
    },
    {
        path: '/craft/info',
        tableName: 'crafts',
        hasVersion: true
    },
    {
        path: '/cookingrecipe/info',
        tableName: 'cookingrecipes',
        hasVersion: false
    },
    {
        path: '/coder/info',
        tableName: 'coders',
        hasVersion: false
    },
]

ListGetInfo.forEach(item => {
    getDataInfo(item.tableName, item.path, item.hasVersion)
})

function getDataInfo(tableName: string, path: string, hasVersion?: boolean) {
    router.get(path, async (req, res) => {
        let joinClause = ''
        let selectFields = `${tableName}.*`
        
        if (hasVersion) {
            // 映射表名到版本关系表名
            const versionTableMap: { [key: string]: string } = {
                'characters': 'character_versions',
                'mobs': 'mob_versions',
                'plants': 'plant_versions',
                'things': 'thing_versions',
                'crafts': 'craft_versions'
            }
            // 映射表名到版本关系表的ID字段名
            const versionIdFieldMap: { [key: string]: string } = {
                'characters': 'character_id',
                'mobs': 'mob_id',
                'plants': 'plant_id',
                'things': 'thing_id',
                'crafts': 'craft_id'
            }
            const versionTable = versionTableMap[tableName] || `${tableName}_versions`
            const versionIdField = versionIdFieldMap[tableName] || `${tableName.slice(0, -1)}_id`
            joinClause = `
                LEFT JOIN ${versionTable} ON ${tableName}.id = ${versionTable}.${versionIdField} AND ${versionTable}.is_primary = 1
                LEFT JOIN versions ON ${versionTable}.version_id = versions.id
            `
            selectFields = `${tableName}.*, versions.code as version, versions.name as version_name, versions.name_en as version_name_en`
        }
        
            try {
                const data = await getDataFromDB(
                    DB_NAME,
                    [`SELECT ${selectFields} FROM ${tableName} ${joinClause} WHERE ${tableName}.id = ${req.query.id}`],
                    true
                )
                
                if (data) {
                    const enriched = { ...data }
                    
                    // 转换 is_active Buffer 为数字
                    convertIsActive(enriched)
                    
                    // 添加版本数组
                    if (hasVersion && data.id) {
                        enriched.version = await getEntityVersions(tableName, data.id)
                    }
                    
                    // 对于crafts，添加标签数组
                    if (tableName === 'crafts' && data.id) {
                        enriched.tab = await getCraftTabs(data.id)
                    }
                    
                    // 移除临时的version字段（如果存在）
                    delete enriched.version_name
                    delete enriched.version_name_en
                    
                    res.send(new ResponseSuccess(enriched))
                } else {
                    res.send(new ResponseError('', '无数据'))
                }
            } catch (err) {
                res.send(new ResponseError(err, err.message))
            }
    })
}

// ==================== logs 表接口 ====================
const DATA_NAME_LOG = 'logs'

router.post('/log/add', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            let parsedDetail = escapeMySQLString(unicodeEncode(req.body.detail || ''))
            let date = req.body.date || ''
            
            if (!date || !req.body.detail) {
                res.send(new ResponseError('', '日期和详情不能为空'))
                return
            }
            
            sqlArray.push(`
                INSERT INTO logs(date, detail)
                VALUES('${date}', '${parsedDetail}')
            `)
            
            operate_db_and_return_added_id(userInfo.uid, DB_NAME, DATA_NAME_LOG, sqlArray, '添加', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.put('/log/modify', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            let parsedDetail = escapeMySQLString(unicodeEncode(req.body.detail || ''))
            let date = req.body.date || ''
            let id = req.body.id
            
            if (!id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            
            if (!date || !req.body.detail) {
                res.send(new ResponseError('', '日期和详情不能为空'))
                return
            }
            
            sqlArray.push(`
                UPDATE logs
                SET date = '${date}',
                    detail = '${parsedDetail}'
                WHERE id = ${id}
            `)
            
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_LOG, sqlArray, '修改', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.delete('/log/delete', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let id = req.body.id || req.query.id
            
            if (!id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            
            let sqlArray = []
            sqlArray.push(`DELETE FROM logs WHERE id = ${id}`)
            
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_LOG, sqlArray, '删除', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// ==================== characters 表接口 ====================
const DATA_NAME_CHARACTER = 'characters'

router.post('/character/add', (req, res) => {
    verifyAuthorization(req)
        .then(async userInfo => {
            if (!req.body.health || !req.body.hunger || !req.body.sanity || !req.body.version) {
                res.send(new ResponseError('', '生命值、饥饿值、理智值和版本不能为空'))
                return
            }
            
            // 处理版本数组：支持 number[] 或单个 number
            const versionIds: number[] = Array.isArray(req.body.version) 
                ? req.body.version 
                : [req.body.version].filter(v => v != null)
            
            if (versionIds.length === 0) {
                res.send(new ResponseError('', '版本不能为空'))
                return
            }
            
            let sqlArray = []
            // 插入角色数据
            sqlArray.push(`
                INSERT INTO characters(
                    name, name_en, nick_name, motto, perk, health, hunger, sanity,
                    hunger_modifier, sanity_modifier, wetness_modifier,
                    health_range, damage_range, hunger_range, sanity_range, speed_range,
                    debugspawn, pic, thumb, special_item, starting_item, is_active
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
                    ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 0}
                )
            `)
            
            // 获取插入的ID并创建版本关系
            getDataFromDB(DB_NAME, sqlArray)
                .then(async (result: any) => {
                    const characterId = result.insertId
                    if (!characterId) {
                        res.send(new ResponseError('', '插入失败'))
                        return
                    }
                    
                    // 插入所有版本关系（第一个作为主版本）
                    let relationSqls: string[] = []
                    versionIds.forEach((versionId, index) => {
                        relationSqls.push(`
                            INSERT INTO character_versions(character_id, version_id, is_primary)
                            VALUES(${characterId}, ${versionId}, ${index === 0 ? 1 : 0})
                        `)
                    })
                    
                    getDataFromDB(DB_NAME, relationSqls)
                        .then(() => {
                            updateUserLastLoginTime(userInfo.uid)
                            res.send(new ResponseSuccess({ id: characterId }, '添加成功'))
                        })
                        .catch(err => {
                            res.send(new ResponseError(err, '添加版本关系失败'))
                        })
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.put('/character/modify', (req, res) => {
    verifyAuthorization(req)
        .then(async userInfo => {
            if (!req.body.id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            
            let sqlArray = []
            // 更新角色数据
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
                    is_active = ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 0}
                WHERE id = ${req.body.id}
            `)
            
            // 如果提供了版本，更新版本关系（支持数组形式）
            if (req.body.version) {
                const versionIds: number[] = Array.isArray(req.body.version) 
                    ? req.body.version 
                    : [req.body.version].filter(v => v != null)
                
                if (versionIds.length > 0) {
                    // 先删除所有旧的关系
                    sqlArray.push(`
                        DELETE FROM character_versions WHERE character_id = ${req.body.id}
                    `)
                    
                    // 插入新的版本关系（第一个作为主版本）
                    versionIds.forEach((versionId, index) => {
                        sqlArray.push(`
                            INSERT INTO character_versions(character_id, version_id, is_primary)
                            VALUES(${req.body.id}, ${versionId}, ${index === 0 ? 1 : 0})
                        `)
                    })
                }
            }
            
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_CHARACTER, sqlArray, '修改', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.delete('/character/delete', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let id = req.body.id || req.query.id
            if (!id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            // CASCADE 会自动删除关联的版本关系
            let sqlArray = [`DELETE FROM characters WHERE id = ${id}`]
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_CHARACTER, sqlArray, '删除', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// ==================== coders 表接口 ====================
const DATA_NAME_CODER = 'coders'

router.post('/coder/add', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (!req.body.usage || !req.body.code) {
                res.send(new ResponseError('', '用途和代码不能为空'))
                return
            }
            
            let sqlArray = []
            sqlArray.push(`
                INSERT INTO coders(usage, code, note, is_active)
                VALUES(
                    ${processStringValue(req.body.usage)},
                    ${processStringValue(req.body.code)},
                    ${processStringValue(req.body.note)},
                    ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 0}
                )
            `)
            
            operate_db_and_return_added_id(userInfo.uid, DB_NAME, DATA_NAME_CODER, sqlArray, '添加', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.put('/coder/modify', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (!req.body.id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            
            let sqlArray = []
            sqlArray.push(`
                UPDATE coders SET
                    usage = ${processStringValue(req.body.usage)},
                    code = ${processStringValue(req.body.code)},
                    note = ${processStringValue(req.body.note)},
                    is_active = ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 0}
                WHERE id = ${req.body.id}
            `)
            
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_CODER, sqlArray, '修改', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.delete('/coder/delete', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let id = req.body.id || req.query.id
            if (!id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            let sqlArray = [`DELETE FROM coders WHERE id = ${id}`]
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_CODER, sqlArray, '删除', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// ==================== cookingrecipes 表接口 ====================
const DATA_NAME_COOKINGRECIPE = 'cookingrecipes'

router.post('/cookingrecipe/add', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (!req.body.name || !req.body.name_en) {
                res.send(new ResponseError('', '名称和英文名称不能为空'))
                return
            }
            
            let sqlArray = []
            sqlArray.push(`
                INSERT INTO cookingrecipes(
                    name, name_en, health_value, hungry_value, sanity_value,
                    duration, cook_time, priority, requirements, restrictions,
                    perk, stacks, debugspawn, pic, thumb, is_active
                ) VALUES(
                    ${processStringValue(req.body.name)},
                    ${processStringValue(req.body.name_en)},
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
                    ${processStringValue(req.body.thumb)},
                    ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 0}
                )
            `)
            
            operate_db_and_return_added_id(userInfo.uid, DB_NAME, DATA_NAME_COOKINGRECIPE, sqlArray, '添加', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.put('/cookingrecipe/modify', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (!req.body.id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            
            let sqlArray = []
            sqlArray.push(`
                UPDATE cookingrecipes SET
                    name = ${processStringValue(req.body.name)},
                    name_en = ${processStringValue(req.body.name_en)},
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
                    thumb = ${processStringValue(req.body.thumb)},
                    is_active = ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 0}
                WHERE id = ${req.body.id}
            `)
            
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_COOKINGRECIPE, sqlArray, '修改', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.delete('/cookingrecipe/delete', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let id = req.body.id || req.query.id
            if (!id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            let sqlArray = [`DELETE FROM cookingrecipes WHERE id = ${id}`]
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_COOKINGRECIPE, sqlArray, '删除', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// ==================== crafts 表接口 ====================
const DATA_NAME_CRAFT = 'crafts'

router.post('/craft/add', (req, res) => {
    verifyAuthorization(req)
        .then(async userInfo => {
            if (!req.body.name || !req.body.name_en || !req.body.crafting) {
                res.send(new ResponseError('', '名称、英文名称和制作材料不能为空'))
                return
            }
            
            // 处理版本数组：支持 number[] 或单个 number
            const versionIds: number[] = req.body.version 
                ? (Array.isArray(req.body.version) ? req.body.version : [req.body.version]).filter(v => v != null)
                : []
            
            // 处理标签数组：支持 number[] 或单个 number
            const tabIds: number[] = req.body.tab 
                ? (Array.isArray(req.body.tab) ? req.body.tab : [req.body.tab]).filter(v => v != null)
                : []
            
            let sqlArray = []
            // 插入制作数据
            sqlArray.push(`
                INSERT INTO crafts(
                    name, name_en, sortid, crafting, tier,
                    damage, sideeffect, durability, perk, stacks,
                    debugspawn, pic, thumb, is_active
                ) VALUES(
                    ${processStringValue(req.body.name)},
                    ${processStringValue(req.body.name_en)},
                    ${processNumberValue(req.body.sortid)},
                    ${processStringValue(req.body.crafting)},
                    ${processStringValue(req.body.tier)},
                    ${processStringValue(req.body.damage)},
                    ${processStringValue(req.body.sideeffect)},
                    ${processStringValue(req.body.durability)},
                    ${processStringValue(req.body.perk)},
                    ${processStringValue(req.body.stacks)},
                    ${processStringValue(req.body.debugspawn)},
                    ${processStringValue(req.body.pic)},
                    ${processStringValue(req.body.thumb)},
                    ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 0}
                )
            `)
            
            // 获取插入的ID并创建版本和标签关系
            getDataFromDB(DB_NAME, sqlArray)
                .then(async (result: any) => {
                    const craftId = result.insertId
                    if (!craftId) {
                        res.send(new ResponseError('', '插入失败'))
                        return
                    }
                    
                    let relationSqls: string[] = []
                    
                    // 插入所有版本关系（第一个作为主版本）
                    versionIds.forEach((versionId, index) => {
                        relationSqls.push(`
                            INSERT INTO craft_versions(craft_id, version_id, is_primary)
                            VALUES(${craftId}, ${versionId}, ${index === 0 ? 1 : 0})
                        `)
                    })
                    
                    // 插入所有标签关系（第一个作为主标签）
                    tabIds.forEach((tabId, index) => {
                        relationSqls.push(`
                            INSERT INTO craft_tab_relations(craft_id, tab_id, is_primary)
                            VALUES(${craftId}, ${tabId}, ${index === 0 ? 1 : 0})
                        `)
                    })
                    
                    if (relationSqls.length > 0) {
                        getDataFromDB(DB_NAME, relationSqls)
                            .then(() => {
                                updateUserLastLoginTime(userInfo.uid)
                                res.send(new ResponseSuccess({ id: craftId }, '添加成功'))
                            })
                            .catch(err => {
                                res.send(new ResponseError(err, '添加关系失败'))
                            })
                    } else {
                        updateUserLastLoginTime(userInfo.uid)
                        res.send(new ResponseSuccess({ id: craftId }, '添加成功'))
                    }
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.put('/craft/modify', (req, res) => {
    verifyAuthorization(req)
        .then(async userInfo => {
            if (!req.body.id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            
            let sqlArray = []
            // 更新制作数据
            sqlArray.push(`
                UPDATE crafts SET
                    name = ${processStringValue(req.body.name)},
                    name_en = ${processStringValue(req.body.name_en)},
                    sortid = ${processNumberValue(req.body.sortid)},
                    crafting = ${processStringValue(req.body.crafting)},
                    tier = ${processStringValue(req.body.tier)},
                    damage = ${processStringValue(req.body.damage)},
                    sideeffect = ${processStringValue(req.body.sideeffect)},
                    durability = ${processStringValue(req.body.durability)},
                    perk = ${processStringValue(req.body.perk)},
                    stacks = ${processStringValue(req.body.stacks)},
                    debugspawn = ${processStringValue(req.body.debugspawn)},
                    pic = ${processStringValue(req.body.pic)},
                    thumb = ${processStringValue(req.body.thumb)},
                    is_active = ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 0}
                WHERE id = ${req.body.id}
            `)
            
            // 如果提供了版本，更新版本关系（支持数组形式）
            if (req.body.version !== undefined) {
                const versionIds: number[] = Array.isArray(req.body.version) 
                    ? req.body.version 
                    : req.body.version ? [req.body.version].filter(v => v != null) : []
                
                // 先删除所有旧的版本关系
                sqlArray.push(`
                    DELETE FROM craft_versions WHERE craft_id = ${req.body.id}
                `)
                
                // 插入新的版本关系（第一个作为主版本）
                versionIds.forEach((versionId, index) => {
                    sqlArray.push(`
                        INSERT INTO craft_versions(craft_id, version_id, is_primary)
                        VALUES(${req.body.id}, ${versionId}, ${index === 0 ? 1 : 0})
                    `)
                })
            }
            
            // 如果提供了标签，更新标签关系（支持数组形式）
            if (req.body.tab !== undefined) {
                const tabIds: number[] = Array.isArray(req.body.tab) 
                    ? req.body.tab 
                    : req.body.tab ? [req.body.tab].filter(v => v != null) : []
                
                // 先删除所有旧的标签关系
                sqlArray.push(`
                    DELETE FROM craft_tab_relations WHERE craft_id = ${req.body.id}
                `)
                
                // 插入新的标签关系（第一个作为主标签）
                tabIds.forEach((tabId, index) => {
                    sqlArray.push(`
                        INSERT INTO craft_tab_relations(craft_id, tab_id, is_primary)
                        VALUES(${req.body.id}, ${tabId}, ${index === 0 ? 1 : 0})
                    `)
                })
            }
            
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_CRAFT, sqlArray, '修改', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.delete('/craft/delete', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let id = req.body.id || req.query.id
            if (!id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            // CASCADE 会自动删除关联的版本和标签关系
            let sqlArray = [`DELETE FROM crafts WHERE id = ${id}`]
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_CRAFT, sqlArray, '删除', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// ==================== materials 表接口 ====================
const DATA_NAME_MATERIAL = 'materials'

router.post('/material/add', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (!req.body.name || !req.body.name_en) {
                res.send(new ResponseError('', '名称和英文名称不能为空'))
                return
            }
            
            let sqlArray = []
            sqlArray.push(`
                INSERT INTO materials(name, name_en, pic, stack, debugspawn, is_active)
                VALUES(
                    ${processStringValue(req.body.name)},
                    ${processStringValue(req.body.name_en)},
                    ${processStringValue(req.body.pic)},
                    ${processStringValue(req.body.stack)},
                    ${processStringValue(req.body.debugspawn)},
                    ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 0}
                )
            `)
            
            operate_db_and_return_added_id(userInfo.uid, DB_NAME, DATA_NAME_MATERIAL, sqlArray, '添加', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.put('/material/modify', (req, res) => {
    verifyAuthorization(req)
        .then(async userInfo => {
            if (!req.body.id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            
            let sqlArray = []
            sqlArray.push(`
                UPDATE materials SET
                    name = ${processStringValue(req.body.name)},
                    name_en = ${processStringValue(req.body.name_en)},
                    pic = ${processStringValue(req.body.pic)},
                    stack = ${processStringValue(req.body.stack)},
                    debugspawn = ${processStringValue(req.body.debugspawn)},
                    is_active = ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 0}
                WHERE id = ${req.body.id}
            `)
            
            // 如果提供了版本，更新版本关系（注意：materials可能没有自己的版本表，需要确认）
            // 这里假设materials使用thing_versions表，实际需要根据数据库结构调整
            
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_MATERIAL, sqlArray, '修改', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.delete('/material/delete', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let id = req.body.id || req.query.id
            if (!id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            let sqlArray = [`DELETE FROM materials WHERE id = ${id}`]
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_MATERIAL, sqlArray, '删除', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// ==================== mobs 表接口 ====================
const DATA_NAME_MOB = 'mobs'

router.post('/mob/add', (req, res) => {
    verifyAuthorization(req)
        .then(async userInfo => {
            if (!req.body.name || !req.body.name_en || !req.body.kind || !req.body.size) {
                res.send(new ResponseError('', '名称、英文名称、类型和大小不能为空'))
                return
            }
            
            // 处理版本数组：支持 number[] 或单个 number
            const versionIds: number[] = req.body.version 
                ? (Array.isArray(req.body.version) ? req.body.version : [req.body.version]).filter(v => v != null)
                : []
            
            let sqlArray = []
            sqlArray.push(`
                INSERT INTO mobs(
                    name, name_en, health, damage, attack_period, attack_range,
                    walking_speed, running_speed, sanityaura, special_ability,
                    detail, loot, spawns_from, debugspawn, pic, thumb,
                    kind, size, is_active
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
                    '${escapeMySQLString(String(req.body.kind))}',
                    '${escapeMySQLString(String(req.body.size))}',
                    ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 0}
                )
            `)
            
            // 获取插入的ID并创建版本关系
            getDataFromDB(DB_NAME, sqlArray)
                .then(async (result: any) => {
                    const mobId = result.insertId
                    if (!mobId) {
                        res.send(new ResponseError('', '插入失败'))
                        return
                    }
                    
                    // 插入所有版本关系（第一个作为主版本）
                    if (versionIds.length > 0) {
                        let relationSqls: string[] = []
                        versionIds.forEach((versionId, index) => {
                            relationSqls.push(`
                                INSERT INTO mob_versions(mob_id, version_id, is_primary)
                                VALUES(${mobId}, ${versionId}, ${index === 0 ? 1 : 0})
                            `)
                        })
                        
                        getDataFromDB(DB_NAME, relationSqls)
                            .then(() => {
                                updateUserLastLoginTime(userInfo.uid)
                                res.send(new ResponseSuccess({ id: mobId }, '添加成功'))
                            })
                            .catch(err => {
                                res.send(new ResponseError(err, '添加版本关系失败'))
                            })
                    } else {
                        updateUserLastLoginTime(userInfo.uid)
                        res.send(new ResponseSuccess({ id: mobId }, '添加成功'))
                    }
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.put('/mob/modify', (req, res) => {
    verifyAuthorization(req)
        .then(async userInfo => {
            if (!req.body.id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            
            let sqlArray = []
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
                    kind = '${escapeMySQLString(String(req.body.kind || ''))}',
                    size = '${escapeMySQLString(String(req.body.size || ''))}',
                    is_active = ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 0}
                WHERE id = ${req.body.id}
            `)
            
            // 如果提供了版本，更新版本关系（支持数组形式）
            if (req.body.version !== undefined) {
                const versionIds: number[] = Array.isArray(req.body.version) 
                    ? req.body.version 
                    : req.body.version ? [req.body.version].filter(v => v != null) : []
                
                // 先删除所有旧的版本关系
                sqlArray.push(`
                    DELETE FROM mob_versions WHERE mob_id = ${req.body.id}
                `)
                
                // 插入新的版本关系（第一个作为主版本）
                versionIds.forEach((versionId, index) => {
                    sqlArray.push(`
                        INSERT INTO mob_versions(mob_id, version_id, is_primary)
                        VALUES(${req.body.id}, ${versionId}, ${index === 0 ? 1 : 0})
                    `)
                })
            }
            
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_MOB, sqlArray, '修改', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.delete('/mob/delete', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let id = req.body.id || req.query.id
            if (!id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            // CASCADE 会自动删除关联的版本关系
            let sqlArray = [`DELETE FROM mobs WHERE id = ${id}`]
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_MOB, sqlArray, '删除', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// ==================== plants 表接口 ====================
const DATA_NAME_PLANT = 'plants'

router.post('/plant/add', (req, res) => {
    verifyAuthorization(req)
        .then(async userInfo => {
            if (!req.body.name || !req.body.name_en) {
                res.send(new ResponseError('', '名称和英文名称不能为空'))
                return
            }
            
            // 处理版本数组：支持 number[] 或单个 number
            const versionIds: number[] = req.body.version 
                ? (Array.isArray(req.body.version) ? req.body.version : [req.body.version]).filter(v => v != null)
                : []
            
            let sqlArray = []
            sqlArray.push(`
                INSERT INTO plants(
                    name, name_en, resources, spawns, debugspawn,
                    perk, pic, thumb, is_active
                ) VALUES(
                    ${processStringValue(req.body.name)},
                    ${processStringValue(req.body.name_en)},
                    ${processStringValue(req.body.resources)},
                    ${processStringValue(req.body.spawns)},
                    ${processStringValue(req.body.debugspawn)},
                    ${processStringValue(req.body.perk)},
                    ${processStringValue(req.body.pic)},
                    ${processStringValue(req.body.thumb)},
                    ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 0}
                )
            `)
            
            // 获取插入的ID并创建版本关系
            getDataFromDB(DB_NAME, sqlArray)
                .then(async (result: any) => {
                    const plantId = result.insertId
                    if (!plantId) {
                        res.send(new ResponseError('', '插入失败'))
                        return
                    }
                    
                    // 插入所有版本关系（第一个作为主版本）
                    if (versionIds.length > 0) {
                        let relationSqls: string[] = []
                        versionIds.forEach((versionId, index) => {
                            relationSqls.push(`
                                INSERT INTO plant_versions(plant_id, version_id, is_primary)
                                VALUES(${plantId}, ${versionId}, ${index === 0 ? 1 : 0})
                            `)
                        })
                        
                        getDataFromDB(DB_NAME, relationSqls)
                            .then(() => {
                                updateUserLastLoginTime(userInfo.uid)
                                res.send(new ResponseSuccess({ id: plantId }, '添加成功'))
                            })
                            .catch(err => {
                                res.send(new ResponseError(err, '添加版本关系失败'))
                            })
                    } else {
                        updateUserLastLoginTime(userInfo.uid)
                        res.send(new ResponseSuccess({ id: plantId }, '添加成功'))
                    }
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.put('/plant/modify', (req, res) => {
    verifyAuthorization(req)
        .then(async userInfo => {
            if (!req.body.id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            
            let sqlArray = []
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
                    is_active = ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 0}
                WHERE id = ${req.body.id}
            `)
            
            // 如果提供了版本，更新版本关系（支持数组形式）
            if (req.body.version !== undefined) {
                const versionIds: number[] = Array.isArray(req.body.version) 
                    ? req.body.version 
                    : req.body.version ? [req.body.version].filter(v => v != null) : []
                
                // 先删除所有旧的版本关系
                sqlArray.push(`
                    DELETE FROM plant_versions WHERE plant_id = ${req.body.id}
                `)
                
                // 插入新的版本关系（第一个作为主版本）
                versionIds.forEach((versionId, index) => {
                    sqlArray.push(`
                        INSERT INTO plant_versions(plant_id, version_id, is_primary)
                        VALUES(${req.body.id}, ${versionId}, ${index === 0 ? 1 : 0})
                    `)
                })
            }
            
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_PLANT, sqlArray, '修改', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.delete('/plant/delete', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let id = req.body.id || req.query.id
            if (!id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            // CASCADE 会自动删除关联的版本关系
            let sqlArray = [`DELETE FROM plants WHERE id = ${id}`]
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_PLANT, sqlArray, '删除', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// ==================== things 表接口 ====================
const DATA_NAME_THING = 'things'

router.post('/thing/add', (req, res) => {
    verifyAuthorization(req)
        .then(async userInfo => {
            if (!req.body.name || !req.body.name_en) {
                res.send(new ResponseError('', '名称和英文名称不能为空'))
                return
            }
            
            // 处理版本数组：支持 number[] 或单个 number
            const versionIds: number[] = req.body.version 
                ? (Array.isArray(req.body.version) ? req.body.version : [req.body.version]).filter(v => v != null)
                : []
            
            let sqlArray = []
            sqlArray.push(`
                INSERT INTO things(
                    name, name_en, note, debugspawn, pic, thumb, is_active
                ) VALUES(
                    ${processStringValue(req.body.name)},
                    ${processStringValue(req.body.name_en)},
                    ${processStringValue(req.body.note)},
                    ${processStringValue(req.body.debugspawn)},
                    ${processStringValue(req.body.pic)},
                    ${processStringValue(req.body.thumb)},
                    ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 0}
                )
            `)
            
            // 获取插入的ID并创建版本关系
            getDataFromDB(DB_NAME, sqlArray)
                .then(async (result: any) => {
                    const thingId = result.insertId
                    if (!thingId) {
                        res.send(new ResponseError('', '插入失败'))
                        return
                    }
                    
                    // 插入所有版本关系（第一个作为主版本）
                    if (versionIds.length > 0) {
                        let relationSqls: string[] = []
                        versionIds.forEach((versionId, index) => {
                            relationSqls.push(`
                                INSERT INTO thing_versions(thing_id, version_id, is_primary)
                                VALUES(${thingId}, ${versionId}, ${index === 0 ? 1 : 0})
                            `)
                        })
                        
                        getDataFromDB(DB_NAME, relationSqls)
                            .then(() => {
                                updateUserLastLoginTime(userInfo.uid)
                                res.send(new ResponseSuccess({ id: thingId }, '添加成功'))
                            })
                            .catch(err => {
                                res.send(new ResponseError(err, '添加版本关系失败'))
                            })
                    } else {
                        updateUserLastLoginTime(userInfo.uid)
                        res.send(new ResponseSuccess({ id: thingId }, '添加成功'))
                    }
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.put('/thing/modify', (req, res) => {
    verifyAuthorization(req)
        .then(async userInfo => {
            if (!req.body.id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            
            let sqlArray = []
            sqlArray.push(`
                UPDATE things SET
                    name = ${processStringValue(req.body.name)},
                    name_en = ${processStringValue(req.body.name_en)},
                    note = ${processStringValue(req.body.note)},
                    debugspawn = ${processStringValue(req.body.debugspawn)},
                    pic = ${processStringValue(req.body.pic)},
                    thumb = ${processStringValue(req.body.thumb)},
                    is_active = ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 0}
                WHERE id = ${req.body.id}
            `)
            
            // 如果提供了版本，更新版本关系（支持数组形式）
            if (req.body.version !== undefined) {
                const versionIds: number[] = Array.isArray(req.body.version) 
                    ? req.body.version 
                    : req.body.version ? [req.body.version].filter(v => v != null) : []
                
                // 先删除所有旧的版本关系
                sqlArray.push(`
                    DELETE FROM thing_versions WHERE thing_id = ${req.body.id}
                `)
                
                // 插入新的版本关系（第一个作为主版本）
                versionIds.forEach((versionId, index) => {
                    sqlArray.push(`
                        INSERT INTO thing_versions(thing_id, version_id, is_primary)
                        VALUES(${req.body.id}, ${versionId}, ${index === 0 ? 1 : 0})
                    `)
                })
            }
            
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_THING, sqlArray, '修改', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.delete('/thing/delete', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let id = req.body.id || req.query.id
            if (!id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            // CASCADE 会自动删除关联的版本关系
            let sqlArray = [`DELETE FROM things WHERE id = ${id}`]
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_THING, sqlArray, '删除', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// ==================== versions 表接口 ====================
const DATA_NAME_VERSION = 'versions'

// 列表
router.get('/version/list', (req, res) => {
    let whereConditions: string[] = []
    let whereClause = ''
    
    // 处理 keyword 搜索
    if (req.query.keyword) {
        let keyword = escapeMySQLString(unicodeEncode(String(req.query.keyword)))
        whereConditions.push(`(code LIKE '%${keyword}%' OR name LIKE '%${keyword}%' OR name_en LIKE '%${keyword}%' ESCAPE '/')`)
    }
    
    // 处理 is_active 筛选
    let all = req.query.all
    if (all !== '1') {
        whereConditions.push(`is_active = 1`)
    }
    
    if (whereConditions.length > 0) {
        whereClause = `WHERE ${whereConditions.join(' AND ')}`
    }
    
    // 处理分页
    let pageNo = req.query.pageNo ? Number(req.query.pageNo) : null
    let pageSize = req.query.pageSize ? Number(req.query.pageSize) : null
    let usePagination = pageNo !== null && pageSize !== null
    
    if (usePagination) {
        let startPoint = (pageNo - 1) * pageSize
        let promisesAll = [
            getDataFromDB(DB_NAME, [
                `SELECT * FROM versions ${whereClause} ORDER BY sort_order ASC, id ASC LIMIT ${startPoint}, ${pageSize}`
            ]),
            getDataFromDB(DB_NAME, [
                `SELECT COUNT(*) as sum FROM versions ${whereClause}`
            ], true)
        ]
        
        Promise.all(promisesAll)
            .then(async ([dataList, dataSum]) => {
                const enrichedList = (dataList || []).map((item: any) => {
                    const enriched = { ...item }
                    convertIsActive(enriched)
                    return enriched
                })
                res.send(new ResponseSuccess({
                    list: enrichedList,
                    pager: {
                        pageSize: pageSize,
                        pageNo: pageNo,
                        total: dataSum?.sum || 0
                    }
                }, '请求成功'))
            })
            .catch(err => {
                res.send(new ResponseError(err, err.message))
            })
    } else {
        getDataFromDB(DB_NAME, [
            `SELECT * FROM versions ${whereClause} ORDER BY sort_order ASC, id ASC`
        ])
            .then(async (data) => {
                if (data) {
                    const enrichedList = data.map((item: any) => {
                        const enriched = { ...item }
                        convertIsActive(enriched)
                        return enriched
                    })
                    res.send(new ResponseSuccess(enrichedList))
                } else {
                    res.send(new ResponseError('', '无数据'))
                }
            })
            .catch(err => {
                res.send(new ResponseError(err, err.message))
            })
    }
})

// 详情
router.get('/version/info', (req, res) => {
    getDataFromDB(DB_NAME, [
        `SELECT * FROM versions WHERE id = ${req.query.id}`
    ], true)
        .then((data) => {
            if (data) {
                const enriched = { ...data }
                convertIsActive(enriched)
                res.send(new ResponseSuccess(enriched))
            } else {
                res.send(new ResponseError('', '无数据'))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})

// 添加
router.post('/version/add', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (!req.body.code || !req.body.name) {
                res.send(new ResponseError('', '版本代码和名称不能为空'))
                return
            }
            
            let sqlArray = []
            sqlArray.push(`
                INSERT INTO versions(code, name, name_en, description, sort_order, is_active)
                VALUES(
                    ${processStringValue(req.body.code)},
                    ${processStringValue(req.body.name)},
                    ${processStringValue(req.body.name_en)},
                    ${processStringValue(req.body.description)},
                    ${processNumberValue(req.body.sort_order)},
                    ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 1}
                )
            `)
            
            operate_db_and_return_added_id(userInfo.uid, DB_NAME, DATA_NAME_VERSION, sqlArray, '添加', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// 修改
router.put('/version/modify', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (!req.body.id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            
            let sqlArray = []
            sqlArray.push(`
                UPDATE versions SET
                    code = ${processStringValue(req.body.code)},
                    name = ${processStringValue(req.body.name)},
                    name_en = ${processStringValue(req.body.name_en)},
                    description = ${processStringValue(req.body.description)},
                    sort_order = ${processNumberValue(req.body.sort_order)},
                    is_active = ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 1}
                WHERE id = ${req.body.id}
            `)
            
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_VERSION, sqlArray, '修改', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// 删除
router.delete('/version/delete', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let id = req.body.id || req.query.id
            if (!id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            let sqlArray = [`DELETE FROM versions WHERE id = ${id}`]
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_VERSION, sqlArray, '删除', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// ==================== craft_tabs 表接口 ====================
const DATA_NAME_CRAFT_TAB = 'craft_tabs'

// 列表
router.get('/craft-tab/list', (req, res) => {
    let whereConditions: string[] = []
    let whereClause = ''
    
    // 处理 keyword 搜索
    if (req.query.keyword) {
        let keyword = escapeMySQLString(unicodeEncode(String(req.query.keyword)))
        whereConditions.push(`(code LIKE '%${keyword}%' OR name LIKE '%${keyword}%' OR name_en LIKE '%${keyword}%' ESCAPE '/')`)
    }
    
    // 处理 is_active 筛选
    let all = req.query.all
    if (all !== '1') {
        whereConditions.push(`is_active = 1`)
    }
    
    if (whereConditions.length > 0) {
        whereClause = `WHERE ${whereConditions.join(' AND ')}`
    }
    
    // 处理分页
    let pageNo = req.query.pageNo ? Number(req.query.pageNo) : null
    let pageSize = req.query.pageSize ? Number(req.query.pageSize) : null
    let usePagination = pageNo !== null && pageSize !== null
    
    if (usePagination) {
        let startPoint = (pageNo - 1) * pageSize
        let promisesAll = [
            getDataFromDB(DB_NAME, [
                `SELECT * FROM craft_tabs ${whereClause} ORDER BY sort_order ASC, id ASC LIMIT ${startPoint}, ${pageSize}`
            ]),
            getDataFromDB(DB_NAME, [
                `SELECT COUNT(*) as sum FROM craft_tabs ${whereClause}`
            ], true)
        ]
        
        Promise.all(promisesAll)
            .then(async ([dataList, dataSum]) => {
                const enrichedList = (dataList || []).map((item: any) => {
                    const enriched = { ...item }
                    convertIsActive(enriched)
                    return enriched
                })
                res.send(new ResponseSuccess({
                    list: enrichedList,
                    pager: {
                        pageSize: pageSize,
                        pageNo: pageNo,
                        total: dataSum?.sum || 0
                    }
                }, '请求成功'))
            })
            .catch(err => {
                res.send(new ResponseError(err, err.message))
            })
    } else {
        getDataFromDB(DB_NAME, [
            `SELECT * FROM craft_tabs ${whereClause} ORDER BY sort_order ASC, id ASC`
        ])
            .then(async (data) => {
                if (data) {
                    const enrichedList = data.map((item: any) => {
                        const enriched = { ...item }
                        convertIsActive(enriched)
                        return enriched
                    })
                    res.send(new ResponseSuccess(enrichedList))
                } else {
                    res.send(new ResponseError('', '无数据'))
                }
            })
            .catch(err => {
                res.send(new ResponseError(err, err.message))
            })
    }
})

// 详情
router.get('/craft-tab/info', (req, res) => {
    getDataFromDB(DB_NAME, [
        `SELECT * FROM craft_tabs WHERE id = ${req.query.id}`
    ], true)
        .then((data) => {
            if (data) {
                const enriched = { ...data }
                convertIsActive(enriched)
                res.send(new ResponseSuccess(enriched))
            } else {
                res.send(new ResponseError('', '无数据'))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})

// 添加
router.post('/craft-tab/add', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (!req.body.code || !req.body.name) {
                res.send(new ResponseError('', '标签代码和名称不能为空'))
                return
            }
            
            let sqlArray = []
            sqlArray.push(`
                INSERT INTO craft_tabs(code, name, name_en, sort_order, is_active)
                VALUES(
                    ${processStringValue(req.body.code)},
                    ${processStringValue(req.body.name)},
                    ${processStringValue(req.body.name_en)},
                    ${processNumberValue(req.body.sort_order)},
                    ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 1}
                )
            `)
            
            operate_db_and_return_added_id(userInfo.uid, DB_NAME, DATA_NAME_CRAFT_TAB, sqlArray, '添加', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// 修改
router.put('/craft-tab/modify', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (!req.body.id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            
            let sqlArray = []
            sqlArray.push(`
                UPDATE craft_tabs SET
                    code = ${processStringValue(req.body.code)},
                    name = ${processStringValue(req.body.name)},
                    name_en = ${processStringValue(req.body.name_en)},
                    sort_order = ${processNumberValue(req.body.sort_order)},
                    is_active = ${req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 1}
                WHERE id = ${req.body.id}
            `)
            
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_CRAFT_TAB, sqlArray, '修改', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// 删除
router.delete('/craft-tab/delete', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let id = req.body.id || req.query.id
            if (!id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            let sqlArray = [`DELETE FROM craft_tabs WHERE id = ${id}`]
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME_CRAFT_TAB, sqlArray, '删除', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

export default router

