// ==================== Enums ====================

/**
 * 游戏版本枚举
 */
export enum VersionEnum {
  NORMAL = 'NORMAL', // 普通版本
  GIANT = 'GIANT', // 巨人统治版本
  SEA = 'SEA', // 海难版本
  TOGETHER = 'TOGETHER', // 联机版
  HAMLET = 'HAMLET' // 小镇版本
}

/**
 * 制作标签枚举
 */
export enum CraftTabEnum {
  Tools = 'Tools', // 工具
  Light = 'Light', // 光源
  Survival = 'Survival', // 生存
  Food = 'Food', // 食物
  Science = 'Science', // 科学
  Fight = 'Fight', // 战斗
  Structures = 'Structures', // 建筑
  Refine = 'Refine', // 精炼
  Magic = 'Magic', // 魔法
  Dress = 'Dress', // 服装
  Ancient = 'Ancient', // 远古
  Books = 'Books', // 书籍
  Cartography = 'Cartography', // 制图
  Critters = 'Critters', // 生物
  Sculpt = 'Sculpt', // 雕塑
  Shadow = 'Shadow', // 暗影
  Nautical = 'Nautical', // 航海
  Volcanic = 'Volcanic', // 火山
  Offering = 'Offering', // 献祭
  Tinkering = 'Tinkering' // 修理
}

/**
 * 制作等级枚举
 */
export enum CraftTierEnum {
  AlwaysAvailable = 'Always Available', // 始终可用
  ScienceMachine = 'Science Machine', // 科学机器
  AlchemyEngine = 'Alchemy Engine', // 炼金引擎
  Prestihatitator = 'Prestihatitator', // 灵子分解器
  ShadowManipulator = 'Shadow Manipulator', // 暗影操纵者
  AncientPseudoscienceStation = 'Ancient Pseudoscience Station', // 远古伪科学站
  ObsidianWorkbench = 'Obsidian Workbench', // 黑曜石工作台
  CartographersDesk = "Cartographer's Desk", // 制图师的桌子
  RockDen = 'Rock Den', // 岩石巢穴
  Sketch = 'Sketch', // 草图
  Blueprint = 'Blueprint', // 蓝图
  GobblerShrine = 'Gobbler Shrine' // 火鸡神龛
}

/**
 * 生物类型枚举
 */
export enum MobKindEnum {
  Neutral = 'neutral', // 中立
  Friendly = 'friendly', // 友好
  Hostile = 'hostile' // 敌对
}

/**
 * 生物大小枚举
 */
export enum MobSizeEnum {
  Small = 'small', // 小型
  Middle = 'middle', // 中型
  Large = 'large' // 大型
}

// ==================== Types ====================

/**
 * 角色表
 */
export interface Character {
  id?: number; // 主键ID
  name?: string | null; // 角色名称（中文）
  name_en?: string | null; // 角色名称（英文）
  nick_name?: string | null; // 昵称
  motto?: string | null; // 座右铭
  perk?: string | null; // 特殊能力/特性
  health: string; // 生命值
  hunger: string; // 饥饿值
  sanity: string; // 理智值
  hunger_modifier?: string | null; // 饥饿值修正
  sanity_modifier?: string | null; // 理智值修正
  wetness_modifier?: string | null; // 湿度修正
  health_range?: string | null; // 生命值范围
  damage_range?: string | null; // 伤害范围
  hunger_range?: string | null; // 饥饿值范围
  sanity_range?: string | null; // 理智值范围
  speed_range?: string | null; // 速度范围
  debugspawn?: string | null; // 调试生成代码
  pic?: string | null; // 图片路径
  thumb?: string | null; // 缩略图路径
  special_item?: string | null; // 特殊物品
  starting_item?: string | null; // 起始物品
  version: VersionEnum; // 游戏版本
  is_active: number; // 1 | 0
}

/**
 * 代码表
 */
export interface Coder {
  id?: number; // 主键ID
  usage: string; // 用途说明
  code: string; // 代码内容
  note?: string | null; // 备注
  is_active: number; // 1 | 0
}

/**
 * 命令表
 */
export interface Command {
  id?: number; // 主键ID
  name: string; // 命令名称
  command: string; // 命令内容
  desc: string; // 描述（中文）
  desc_en: string; // 描述（英文）
  category: string; // 分类
  is_active: number; // 1 | 0
}

/**
 * 烹饪食谱表
 */
export interface CookingRecipe {
  id?: number; // 主键ID
  name: string; // 食谱名称（中文）
  name_en: string; // 食谱名称（英文）
  version: VersionEnum; // 游戏版本
  health_value?: number | null; // 生命值
  hungry_value?: number | null; // 饥饿值
  sanity_value?: number | null; // 理智值
  duration?: number | null; // 持续时间（0 为永久）
  cook_time?: string | null; // 烹饪时间
  priority?: string | null; // 优先级
  requirements?: string | null; // 需求材料
  restrictions?: string | null; // 限制条件
  perk?: string | null; // 特殊效果
  stacks?: string | null; // 堆叠数量
  debugspawn?: string | null; // 调试生成代码
  pic?: string | null; // 图片路径
  thumb?: string | null; // 缩略图路径
  is_active: number; // 1 | 0
}

/**
 * 制作表
 */
export interface Craft {
  id?: number; // 主键ID
  name: string; // 物品名称（中文）
  name_en: string; // 物品名称（英文）
  sortid?: number | null; // 排序ID
  version: VersionEnum; // 游戏版本
  tab?: CraftTabEnum | null; // 制作标签
  crafting: string; // 制作材料
  tier?: CraftTierEnum; // 制作等级
  damage?: string | null; // 伤害值
  sideeffect?: string | null; // 副作用
  durability?: string | null; // 耐久度
  perk?: string | null; // 特殊效果
  stacks?: string | null; // 堆叠数量
  debugspawn?: string | null; // 调试生成代码
  pic?: string | null; // 图片路径
  thumb?: string | null; // 缩略图路径
  is_active: number; // 1 | 0
}

/**
 * 日志表
 */
export interface Log {
  id?: number; // 主键ID
  date: string; // 日期
  detail: string; // 详情
}

/**
 * 材料表
 */
export interface Material {
  id?: number; // 主键ID
  name: string; // 材料名称（中文）
  name_en: string; // 材料名称（英文）
  pic?: string; // 图片路径
  stack?: string; // 堆叠数量
  debugspawn?: string | null; // 调试生成代码
  version: VersionEnum; // 游戏版本
  is_active: number; // 1 | 0
}

/**
 * 生物表
 */
export interface Mob {
  id?: number; // 主键ID
  name: string; // 生物名称（中文）
  name_en: string; // 生物名称（英文）
  health?: string | null; // 生命值
  damage?: string | null; // 伤害值
  attack_period?: string | null; // 攻击周期
  attack_range?: string | null; // 攻击范围
  walking_speed?: string | null; // 行走速度
  running_speed?: string | null; // 奔跑速度
  sanityaura?: string | null; // 理智光环
  special_ability?: string | null; // 特殊能力
  detail?: string | null; // 详细信息
  loot?: string | null; // 掉落物品
  spawns_from?: string | null; // 生成来源
  debugspawn?: string | null; // 调试生成代码
  pic?: string | null; // 图片路径
  thumb?: string | null; // 缩略图路径
  version: VersionEnum; // 游戏版本
  kind: MobKindEnum; // 生物类型
  size: MobSizeEnum; // 生物大小
  is_active: number; // 1 | 0
}

/**
 * 植物表
 */
export interface Plant {
  id?: number; // 主键ID
  name: string; // 植物名称（中文）
  name_en: string; // 植物名称（英文）
  resources?: string | null; // 资源产出
  spawns?: string | null; // 生成位置
  debugspawn?: string | null; // 调试生成代码
  perk?: string | null; // 特殊效果
  pic?: string | null; // 图片路径
  thumb?: string | null; // 缩略图路径
  version: VersionEnum; // 游戏版本
  is_active: number; // 1 | 0
}

/**
 * 物品表
 */
export interface Thing {
  id?: number; // 主键ID
  name: string; // 物品名称（中文）
  name_en: string; // 物品名称（英文）
  note?: string | null; // 备注
  debugspawn?: string | null; // 调试生成代码
  pic?: string | null; // 图片路径
  thumb?: string | null; // 缩略图路径
  version: VersionEnum; // 游戏版本
  is_active: number; // 1 | 0
}
