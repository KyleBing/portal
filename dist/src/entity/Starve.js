"use strict";
// ==================== Enums ====================
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobSizeEnum = exports.MobKindEnum = exports.CraftTierEnum = exports.CraftTabEnum = exports.VersionEnum = void 0;
/**
 * 游戏版本枚举
 */
var VersionEnum;
(function (VersionEnum) {
    VersionEnum["NORMAL"] = "NORMAL";
    VersionEnum["GIANT"] = "GIANT";
    VersionEnum["SEA"] = "SEA";
    VersionEnum["TOGETHER"] = "TOGETHER";
    VersionEnum["HAMLET"] = "HAMLET"; // 小镇版本
})(VersionEnum || (exports.VersionEnum = VersionEnum = {}));
/**
 * 制作标签枚举
 */
var CraftTabEnum;
(function (CraftTabEnum) {
    CraftTabEnum["Tools"] = "Tools";
    CraftTabEnum["Light"] = "Light";
    CraftTabEnum["Survival"] = "Survival";
    CraftTabEnum["Food"] = "Food";
    CraftTabEnum["Science"] = "Science";
    CraftTabEnum["Fight"] = "Fight";
    CraftTabEnum["Structures"] = "Structures";
    CraftTabEnum["Refine"] = "Refine";
    CraftTabEnum["Magic"] = "Magic";
    CraftTabEnum["Dress"] = "Dress";
    CraftTabEnum["Ancient"] = "Ancient";
    CraftTabEnum["Books"] = "Books";
    CraftTabEnum["Cartography"] = "Cartography";
    CraftTabEnum["Critters"] = "Critters";
    CraftTabEnum["Sculpt"] = "Sculpt";
    CraftTabEnum["Shadow"] = "Shadow";
    CraftTabEnum["Nautical"] = "Nautical";
    CraftTabEnum["Volcanic"] = "Volcanic";
    CraftTabEnum["Offering"] = "Offering";
    CraftTabEnum["Tinkering"] = "Tinkering"; // 修理
})(CraftTabEnum || (exports.CraftTabEnum = CraftTabEnum = {}));
/**
 * 制作等级枚举
 */
var CraftTierEnum;
(function (CraftTierEnum) {
    CraftTierEnum["AlwaysAvailable"] = "Always Available";
    CraftTierEnum["ScienceMachine"] = "Science Machine";
    CraftTierEnum["AlchemyEngine"] = "Alchemy Engine";
    CraftTierEnum["Prestihatitator"] = "Prestihatitator";
    CraftTierEnum["ShadowManipulator"] = "Shadow Manipulator";
    CraftTierEnum["AncientPseudoscienceStation"] = "Ancient Pseudoscience Station";
    CraftTierEnum["ObsidianWorkbench"] = "Obsidian Workbench";
    CraftTierEnum["CartographersDesk"] = "Cartographer's Desk";
    CraftTierEnum["RockDen"] = "Rock Den";
    CraftTierEnum["Sketch"] = "Sketch";
    CraftTierEnum["Blueprint"] = "Blueprint";
    CraftTierEnum["GobblerShrine"] = "Gobbler Shrine"; // 火鸡神龛
})(CraftTierEnum || (exports.CraftTierEnum = CraftTierEnum = {}));
/**
 * 生物类型枚举
 */
var MobKindEnum;
(function (MobKindEnum) {
    MobKindEnum["Neutral"] = "neutral";
    MobKindEnum["Friendly"] = "friendly";
    MobKindEnum["Hostile"] = "hostile"; // 敌对
})(MobKindEnum || (exports.MobKindEnum = MobKindEnum = {}));
/**
 * 生物大小枚举
 */
var MobSizeEnum;
(function (MobSizeEnum) {
    MobSizeEnum["Small"] = "small";
    MobSizeEnum["Middle"] = "middle";
    MobSizeEnum["Large"] = "large"; // 大型
})(MobSizeEnum || (exports.MobSizeEnum = MobSizeEnum = {}));
